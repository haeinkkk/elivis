import { generateTeamId, Prisma } from "@repo/database";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { t } from "@repo/i18n";
import sharp from "sharp";

import { storageService } from "../index";
import { MSG } from "../utils/messages";
import {
    type ProjectRowForMemberDisplay,
    withProjectDisplayMemberCounts,
} from "../utils/project-display-member-count";
import { badRequest, conflict, created, forbidden, notFound, ok } from "../utils/response";

/** 팀 배너 가로형 썸네일 (px) */
const TEAM_BANNER_W = 1200;
const TEAM_BANNER_H = 320;

async function compressTeamBanner(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
        .resize(TEAM_BANNER_W, TEAM_BANNER_H, { fit: "cover", position: "centre" })
        .webp({ quality: 85 })
        .toBuffer();
}

/** 팀 목록 카드용 배너 썸네일 (px) */
const TEAM_BANNER_THUMB_W = 560;
const TEAM_BANNER_THUMB_H = 280;

async function compressTeamBannerThumb(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
        .resize(TEAM_BANNER_THUMB_W, TEAM_BANNER_THUMB_H, { fit: "cover", position: "centre" })
        .webp({ quality: 80 })
        .toBuffer();
}

export interface CreateTeamBody {
    name: string;
    /** 목록·헤더용 짧은 설명 */
    shortDescription?: string;
    /** 소개 탭 마크다운 본문 */
    introMessage?: string;
    /** true면 일반 사용자에게 팀 목록·검색에서 숨김 */
    hiddenFromUsers?: boolean;
    /** 생성자 본인 제외, 추가로 초대할 사용자 ID */
    memberUserIds?: string[];
}

export interface AddTeamMemberBody {
    userId: string;
}

export interface UpdateMyTeamPinsBody {
    /** 내 팀 정렬: 상단 고정 순서대로 팀 ID 배열 */
    teamIds: string[];
}

/** PUT/PATCH /teams/:id — name·shortDescription·introMessage·introLayoutJson·hiddenFromUsers 중 하나 이상 포함 */
export interface UpdateTeamBody {
    name?: string;
    shortDescription?: string | null;
    introMessage?: string | null;
    /** 소개 탭 블록 레이아웃 JSON (null이면 기본 레이아웃으로 되돌림) */
    introLayoutJson?: string | null;
    /** true면 일반 사용자 전체 목록에서 숨김(SUPER_ADMIN 제외) */
    hiddenFromUsers?: boolean;
}

export interface DeleteTeamBody {
    /** 삭제 확인용 — 현재 팀 이름과 정확히 일치해야 함 */
    confirmName: string;
}

export interface DelegateLeaderBody {
    /** 팀장을 위임받을 팀원의 userId */
    userId: string;
}

const INTRO_LAYOUT_JSON_MAX = 65536;

function isValidIntroLayoutJsonString(s: string): boolean {
    try {
        const x = JSON.parse(s) as unknown;
        if (!x || typeof x !== "object") return false;
        const o = x as { v?: unknown; blocks?: unknown };
        if (o.v !== 1) return false;
        if (!Array.isArray(o.blocks) || o.blocks.length !== 4) return false;
        const seen = new Set<string>();
        const types = new Set(["banner", "intro", "metaCreated", "metaCreator"]);
        const spans = new Set([4, 6, 8, 12]);
        for (const b of o.blocks) {
            if (!b || typeof b !== "object") return false;
            const bb = b as { id?: unknown; type?: unknown; colSpan?: unknown };
            if (typeof bb.id !== "string") return false;
            if (typeof bb.type !== "string" || !types.has(bb.type)) return false;
            if (seen.has(bb.type)) return false;
            seen.add(bb.type);
            if (typeof bb.colSpan !== "number" || !spans.has(bb.colSpan)) return false;
        }
        return seen.size === 4;
    } catch {
        return false;
    }
}

function normalizeOptionalText(raw: unknown): string | null {
    if (raw === null || raw === undefined) return null;
    const s = String(raw).trim();
    return s === "" ? null : s;
}

function isTeamNameUniqueViolation(e: unknown): boolean {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") {
        return false;
    }
    const target = e.meta?.target;
    if (Array.isArray(target)) {
        return target.includes("name");
    }
    if (typeof target === "string") {
        return target === "name" || target.includes("name");
    }
    return false;
}

function teamListSearchSql(q: string | undefined): Prisma.Sql | null {
    const p = q ? `%${q}%` : null;
    if (p == null) return null;
    return Prisma.sql`(t.name ILIKE ${p} OR t."shortDescription" ILIKE ${p} OR t."introMessage" ILIKE ${p})`;
}

/** 내가 속한 팀만 */
function teamListWhereSqlMyTeams(userId: string, q: string | undefined): Prisma.Sql {
    const searchPart = teamListSearchSql(q);
    const memberPart = Prisma.sql`EXISTS (
      SELECT 1 FROM "TeamMember" m0 WHERE m0."teamId" = t.id AND m0."userId" = ${userId}
    )`;
    if (searchPart) return Prisma.sql`WHERE ${memberPart} AND ${searchPart}`;
    return Prisma.sql`WHERE ${memberPart}`;
}

/** 전체 공개 팀: 숨김(`hiddenFromUsers`)이 아닌 팀 전부 (위 «내 팀»과 중복될 수 있음) */
function teamListWhereSqlPublic(q: string | undefined): Prisma.Sql {
    const searchPart = teamListSearchSql(q);
    const pubPart = Prisma.sql`t."hiddenFromUsers" = false`;
    if (searchPart) return Prisma.sql`WHERE ${pubPart} AND ${searchPart}`;
    return Prisma.sql`WHERE ${pubPart}`;
}

/** 내 팀 목록: 팀장 역할 우선, 그다음 생성일 */
function teamListOrderSqlMyTeams(userId: string): Prisma.Sql {
    return Prisma.sql`ORDER BY
    COALESCE((
      SELECT m2."pinnedOrder"
      FROM "TeamMember" m2
      WHERE m2."teamId" = t.id AND m2."userId" = ${userId}
      LIMIT 1
    ), 2147483647) ASC,
    COALESCE((
      SELECT CASE m2."role"::text WHEN 'LEADER' THEN 0 ELSE 1 END
      FROM "TeamMember" m2
      WHERE m2."teamId" = t.id AND m2."userId" = ${userId}
      LIMIT 1
    ), 1) ASC,
    t."createdAt" DESC`;
}

function teamListOrderSqlPublic(): Prisma.Sql {
    return Prisma.sql`ORDER BY t."createdAt" DESC`;
}

export function createTeamController(app: FastifyInstance) {
    async function createTeam(
        request: FastifyRequest<{ Body: CreateTeamBody }>,
        reply: FastifyReply,
    ) {
        const { name, shortDescription, introMessage, hiddenFromUsers, memberUserIds = [] } =
            request.body;
        const lang = request.lang;

        if (!name?.trim()) {
            return reply.code(400).send(badRequest(t(lang, MSG.TEAM_NAME_REQUIRED)));
        }

        const extraIds = [...new Set(memberUserIds)].filter((id) => id && id !== request.userId);

        if (extraIds.length > 0) {
            const found = await app.prisma.user.findMany({
                where: { id: { in: extraIds } },
                select: { id: true },
            });
            if (found.length !== extraIds.length) {
                return reply.code(400).send(badRequest(t(lang, MSG.TEAM_MEMBER_INVALID)));
            }
        }

        let team;
        try {
            team = await app.prisma.$transaction(async (tx) => {
                const createdTeam = await tx.team.create({
                    data: {
                        id: generateTeamId(),
                        name: name.trim(),
                        shortDescription: shortDescription?.trim() ? shortDescription.trim() : null,
                        introMessage: introMessage?.trim() ? introMessage.trim() : null,
                        hiddenFromUsers: Boolean(hiddenFromUsers),
                        createdById: request.userId,
                        members: {
                            create: {
                                userId: request.userId,
                                role: "LEADER",
                            } as never,
                        },
                    },
                });

                if (extraIds.length > 0) {
                    await tx.teamMember.createMany({
                        data: extraIds.map((userId) => ({
                            teamId: createdTeam.id,
                            userId,
                            role: "MEMBER" as const,
                        })) as never,
                    });
                }

                return tx.team.findUnique({
                    where: { id: createdTeam.id },
                    select: {
                        id: true,
                        name: true,
                        shortDescription: true,
                        introMessage: true,
                        bannerUrl: true,
                        introLayoutJson: true,
                        createdById: true,
                        createdAt: true,
                        updatedAt: true,
                        _count: { select: { members: true } },
                    },
                });
            });
        } catch (e) {
            if (isTeamNameUniqueViolation(e)) {
                return reply.code(409).send(conflict(t(lang, MSG.TEAM_NAME_DUPLICATE)));
            }
            throw e;
        }

        return reply.code(201).send(created(team, t(lang, MSG.TEAM_CREATED)));
    }

    async function listTeams(
        request: FastifyRequest<{
            Querystring: {
                q?: string;
                take?: string;
                skip?: string;
                kind?: string;
                leaderOnly?: string;
                myRole?: string;
            };
        }>,
        reply: FastifyReply,
    ) {
        const q = request.query.q?.trim();
        const take = Math.min(100, Math.max(1, Number.parseInt(request.query.take ?? "50", 10) || 50));
        const skip = Math.max(0, Number.parseInt(request.query.skip ?? "0", 10) || 0);
        const kindRaw = String((request.query as { kind?: unknown }).kind ?? "").trim();
        const kind: "my" | "public" | null =
            kindRaw === "my" ? "my" : kindRaw === "public" ? "public" : null;

        const leaderOnlyRaw = String(
            (request.query as { leaderOnly?: unknown }).leaderOnly ?? "",
        ).trim();
        const myRoleRaw = String((request.query as { myRole?: unknown }).myRole ?? "").trim();
        const leaderOnly =
            leaderOnlyRaw === "1" ||
            leaderOnlyRaw === "true" ||
            myRoleRaw.toLowerCase() === "leader";

        const userId = request.userId;
        const whereMySql = teamListWhereSqlMyTeams(userId, q);
        const wherePub = teamListWhereSqlPublic(q);
        const orderMy = teamListOrderSqlMyTeams(userId);
        const orderPub = teamListOrderSqlPublic();

        /** 프로젝트 생성 등 `leaderOnly` — raw SQL enum 비교 대신 Prisma로 팀장 멤버십을 확정 */
        const loadMyTeamsAsLeaderWithPrisma = async () => {
            const search: Prisma.TeamWhereInput | undefined = q
                ? {
                      OR: [
                          { name: { contains: q, mode: "insensitive" } },
                          { shortDescription: { contains: q, mode: "insensitive" } },
                          { introMessage: { contains: q, mode: "insensitive" } },
                      ],
                  }
                : undefined;
            const whereLeader: Prisma.TeamWhereInput = {
                AND: [
                    { members: { some: { userId, role: "LEADER" } } },
                    ...(search ? [search] : []),
                ],
            };
            const [pageRows, cnt] = await Promise.all([
                app.prisma.team.findMany({
                    where: whereLeader,
                    orderBy: { createdAt: "desc" },
                    take,
                    skip,
                    select: { id: true },
                }),
                app.prisma.team.count({ where: whereLeader }),
            ]);
            return {
                idRowsMy: pageRows.map((r) => ({ id: r.id })),
                countRowsMy: [{ c: BigInt(cnt) }] as [{ c: bigint }],
            };
        };

        let idRowsMy: { id: string }[];
        let countRowsMy: [{ c: bigint }];

        if (kind === "public") {
            idRowsMy = [];
            countRowsMy = [{ c: 0n }];
        } else if (leaderOnly) {
            ({ idRowsMy, countRowsMy } = await loadMyTeamsAsLeaderWithPrisma());
        } else {
            [idRowsMy, countRowsMy] = await Promise.all([
                app.prisma.$queryRaw<{ id: string }[]>`
                    SELECT t.id FROM "Team" t
                    ${whereMySql}
                    ${orderMy}
                    LIMIT ${take} OFFSET ${skip}
                `,
                app.prisma.$queryRaw<[{ c: bigint }]>`
                    SELECT COUNT(*)::bigint AS c FROM "Team" t
                    ${whereMySql}
                `,
            ]);
        }

        const [idRowsPub, countRowsPub] = await Promise.all([
            kind === "my"
                ? Promise.resolve([] as { id: string }[])
                : app.prisma.$queryRaw<{ id: string }[]>`
                    SELECT t.id FROM "Team" t
                    ${wherePub}
                    ${orderPub}
                    LIMIT ${take} OFFSET ${skip}
                `,
            kind === "my"
                ? Promise.resolve([{ c: 0n }] as [{ c: bigint }])
                : app.prisma.$queryRaw<[{ c: bigint }]>`
                    SELECT COUNT(*)::bigint AS c FROM "Team" t
                    ${wherePub}
                `,
        ]);

        const myTotal = Number(countRowsMy[0]?.c ?? 0n);
        const publicTotal = Number(countRowsPub[0]?.c ?? 0n);
        const idsMy = idRowsMy.map((r) => r.id);
        const idsPub = idRowsPub.map((r) => r.id);

        const teamSelect = {
            id: true,
            name: true,
            shortDescription: true,
            introMessage: true,
            bannerUrl: true,
            hiddenFromUsers: true,
            createdById: true,
            createdBy: { select: { id: true, email: true, name: true, avatarUrl: true } },
            createdAt: true,
            updatedAt: true,
            _count: { select: { members: true } },
        } as const;

        const loadOrdered = async (ids: string[]) => {
            if (ids.length === 0) return [];
            const rows = await app.prisma.team.findMany({
                where: { id: { in: ids } },
                select: teamSelect,
            });
            const byId = new Map(rows.map((r) => [r.id, r]));
            return ids
                .map((id) => byId.get(id))
                .filter((x): x is NonNullable<typeof x> => x != null);
        };

        const [myTeams, publicTeams] = await Promise.all([loadOrdered(idsMy), loadOrdered(idsPub)]);

        return reply.send(
            ok(
                { myTeams, publicTeams, myTotal, publicTotal, take, skip },
                t(request.lang, MSG.TEAM_LIST_FETCHED),
            ),
        );
    }

    async function updateMyTeamPins(
        request: FastifyRequest<{ Body: UpdateMyTeamPinsBody }>,
        reply: FastifyReply,
    ) {
        const lang = request.lang;
        const teamIdsRaw = request.body?.teamIds;
        if (!Array.isArray(teamIdsRaw)) {
            return reply.code(400).send(badRequest(t(lang, MSG.TEAM_UPDATE_FIELDS_REQUIRED)));
        }

        const teamIds = teamIdsRaw.map((x) => String(x).trim()).filter(Boolean);
        const unique = [...new Set(teamIds)];
        if (unique.length !== teamIds.length) {
            return reply.code(400).send(badRequest(t(lang, MSG.TEAM_MEMBER_INVALID)));
        }
        if (teamIds.length > 100) {
            return reply.code(400).send(badRequest(t(lang, MSG.TEAM_MEMBER_INVALID)));
        }

        const memberships = await app.prisma.teamMember.findMany({
            where: { userId: request.userId },
            select: { teamId: true },
        });
        const myTeamSet = new Set(memberships.map((m) => m.teamId));
        if (!teamIds.every((id) => myTeamSet.has(id))) {
            return reply.code(403).send(forbidden(t(lang, MSG.TEAM_EDIT_FORBIDDEN)));
        }

        await app.prisma.$transaction(async (tx) => {
            // reset
            await tx.teamMember.updateMany({
                where: { userId: request.userId },
                data: { pinnedOrder: null },
            });
            // apply
            for (let i = 0; i < teamIds.length; i += 1) {
                const teamId = teamIds[i]!;
                await tx.teamMember.update({
                    where: { teamId_userId: { teamId, userId: request.userId } },
                    data: { pinnedOrder: i + 1 },
                });
            }
        });

        return reply.send(ok({ teamIds }, t(lang, MSG.TEAM_UPDATED)));
    }

    async function getTeam(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        const teamId = request.params.id;
        const lang = request.lang;

        const memberTeam = await app.prisma.team.findFirst({
            where: {
                id: teamId,
                members: { some: { userId: request.userId } },
            },
            select: {
                id: true,
                name: true,
                shortDescription: true,
                introMessage: true,
                bannerUrl: true,
                introLayoutJson: true,
                hiddenFromUsers: true,
                createdById: true,
                createdAt: true,
                updatedAt: true,
                createdBy: { select: { id: true, email: true, name: true, avatarUrl: true } },
                members: {
                    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
                    select: {
                        role: true,
                        joinedAt: true,
                        user: {
                            select: { id: true, email: true, name: true, avatarUrl: true },
                        },
                    },
                },
            },
        });

        if (memberTeam) {
            const viewerRole = memberTeam.members.find((m) => m.user.id === request.userId)?.role;
            if (!viewerRole) {
                return reply.code(404).send(notFound(t(lang, MSG.TEAM_NOT_FOUND)));
            }

            /** 스키마의 `projectTeams`와 동기화된 Prisma 클라이언트 기준 (일부 환경에서 생성 타입이 뒤처질 수 있음) */
            const projectRows = (await app.prisma.project.findMany({
                where: {
                    OR: [{ teamId }, { projectTeams: { some: { teamId } } }],
                },
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    createdAt: true,
                    teamId: true,
                    projectTeams: {
                        select: {
                            team: { select: { id: true } },
                        },
                    },
                    members: { select: { userId: true } },
                    _count: { select: { tasks: true } },
                },
            } as never)) as unknown as (ProjectRowForMemberDisplay & {
                id: string;
                name: string;
                description: string | null;
                createdAt: Date;
            })[];

            const projects = await withProjectDisplayMemberCounts(app.prisma, projectRows);

            return reply.send(
                ok({ ...memberTeam, projects, viewerRole }, t(lang, MSG.TEAM_DETAIL_FETCHED)),
            );
        }

        const publicTeam = await app.prisma.team.findFirst({
            where: { id: teamId, hiddenFromUsers: false },
            select: {
                id: true,
                name: true,
                shortDescription: true,
                introMessage: true,
                bannerUrl: true,
                introLayoutJson: true,
                hiddenFromUsers: true,
                createdById: true,
                createdAt: true,
                updatedAt: true,
                createdBy: { select: { id: true, email: true, name: true, avatarUrl: true } },
                _count: { select: { members: true } },
            },
        });

        if (!publicTeam) {
            return reply.code(404).send(notFound(t(lang, MSG.TEAM_NOT_FOUND)));
        }

        return reply.send(
            ok(
                {
                    ...publicTeam,
                    members: [],
                    projects: [],
                    viewerRole: null,
                },
                t(lang, MSG.TEAM_DETAIL_FETCHED),
            ),
        );
    }

    async function addTeamMember(
        request: FastifyRequest<{ Params: { id: string }; Body: AddTeamMemberBody }>,
        reply: FastifyReply,
    ) {
        const teamId = request.params.id;
        const targetUserId = request.body.userId?.trim();
        const lang = request.lang;

        if (!targetUserId) {
            return reply.code(400).send(badRequest(t(lang, MSG.TEAM_MEMBER_INVALID)));
        }

        const leader = await app.prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId: request.userId } },
        });
        if (!leader || leader.role !== "LEADER") {
            return reply.code(403).send(forbidden(t(lang, MSG.TEAM_MEMBER_ADD_FORBIDDEN)));
        }

        const targetUser = await app.prisma.user.findUnique({
            where: { id: targetUserId },
            select: { id: true },
        });
        if (!targetUser) {
            return reply.code(400).send(badRequest(t(lang, MSG.TEAM_MEMBER_INVALID)));
        }

        try {
            await app.prisma.teamMember.create({
                data: {
                    teamId,
                    userId: targetUserId,
                    role: "MEMBER",
                } as never,
            });
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
                return reply.code(409).send(conflict(t(lang, MSG.TEAM_MEMBER_ALREADY)));
            }
            throw e;
        }

        return reply
            .code(201)
            .send(created({ teamId, userId: targetUserId }, t(lang, MSG.TEAM_MEMBER_ADDED)));
    }

    async function removeTeamMember(
        request: FastifyRequest<{ Params: { id: string; userId: string } }>,
        reply: FastifyReply,
    ) {
        const teamId = request.params.id;
        const targetUserId = request.params.userId?.trim();
        const lang = request.lang;

        // 본인 제외 불가
        if (targetUserId === request.userId) {
            return reply.code(400).send(badRequest(t(lang, MSG.TEAM_MEMBER_REMOVE_SELF)));
        }

        // 요청자가 팀장인지 확인
        const leader = await app.prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId: request.userId } },
        });
        if (!leader || leader.role !== "LEADER") {
            return reply.code(403).send(forbidden(t(lang, MSG.TEAM_MEMBER_REMOVE_FORBIDDEN)));
        }

        // 대상 멤버 존재 확인
        const target = await app.prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId: targetUserId } },
        });
        if (!target) {
            return reply.code(404).send(notFound(t(lang, MSG.TEAM_MEMBER_NOT_FOUND)));
        }

        // 팀장은 제외 불가 (팀장 위임 후 제외해야 함)
        if (target.role === "LEADER") {
            return reply.code(400).send(badRequest(t(lang, MSG.TEAM_MEMBER_REMOVE_LEADER)));
        }

        // TeamMember만 삭제 (Workspace는 보존)
        await app.prisma.teamMember.delete({
            where: { teamId_userId: { teamId, userId: targetUserId } },
        });

        return reply.send(ok({ teamId, userId: targetUserId }, t(lang, MSG.TEAM_MEMBER_REMOVED)));
    }

    async function delegateLeader(
        request: FastifyRequest<{ Params: { id: string }; Body: DelegateLeaderBody }>,
        reply: FastifyReply,
    ) {
        const teamId = request.params.id;
        const targetUserId = request.body.userId?.trim();
        const lang = request.lang;

        if (!targetUserId) {
            return reply.code(400).send(badRequest(t(lang, MSG.TEAM_MEMBER_INVALID)));
        }

        if (targetUserId === request.userId) {
            return reply.code(400).send(badRequest(t(lang, MSG.TEAM_LEADER_DELEGATE_SELF)));
        }

        const currentMember = await app.prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId: request.userId } },
        });
        if (!currentMember || currentMember.role !== "LEADER") {
            return reply.code(403).send(forbidden(t(lang, MSG.TEAM_EDIT_FORBIDDEN)));
        }

        const target = await app.prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId: targetUserId } },
        });
        if (!target) {
            return reply.code(404).send(notFound(t(lang, MSG.TEAM_MEMBER_NOT_FOUND)));
        }
        if (target.role === "LEADER") {
            return reply.code(400).send(badRequest(t(lang, MSG.TEAM_LEADER_ALREADY)));
        }

        await app.prisma.$transaction([
            app.prisma.teamMember.update({
                where: { teamId_userId: { teamId, userId: targetUserId } },
                data: { role: "LEADER" },
            }),
            app.prisma.teamMember.update({
                where: { teamId_userId: { teamId, userId: request.userId } },
                data: { role: "MEMBER" },
            }),
        ]);

        return reply.send(ok({ teamId, newLeaderId: targetUserId }, t(lang, MSG.TEAM_LEADER_DELEGATED)));
    }

    async function updateTeam(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateTeamBody }>,
        reply: FastifyReply,
    ) {
        const teamId = request.params.id;
        const lang = request.lang;
        const body = request.body as Record<string, unknown>;

        if (body == null || typeof body !== "object") {
            return reply.code(400).send(badRequest(t(lang, MSG.TEAM_UPDATE_FIELDS_REQUIRED)));
        }

        const hasName = Object.prototype.hasOwnProperty.call(body, "name");
        const hasShort = Object.prototype.hasOwnProperty.call(body, "shortDescription");
        const hasIntro = Object.prototype.hasOwnProperty.call(body, "introMessage");
        const hasIntroLayout = Object.prototype.hasOwnProperty.call(body, "introLayoutJson");
        const hasHidden = Object.prototype.hasOwnProperty.call(body, "hiddenFromUsers");
        if (!hasName && !hasShort && !hasIntro && !hasIntroLayout && !hasHidden) {
            return reply.code(400).send(badRequest(t(lang, MSG.TEAM_UPDATE_FIELDS_REQUIRED)));
        }

        const leader = await app.prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId: request.userId } },
        });
        if (!leader || leader.role !== "LEADER") {
            return reply.code(403).send(forbidden(t(lang, MSG.TEAM_EDIT_FORBIDDEN)));
        }

        const data: Prisma.TeamUpdateInput = {};
        if (hasName) {
            const rawName = body.name;
            const trimmed =
                rawName === null || rawName === undefined ? "" : String(rawName).trim();
            if (!trimmed) {
                return reply.code(400).send(badRequest(t(lang, MSG.TEAM_NAME_REQUIRED)));
            }
            data.name = trimmed;
        }
        if (hasShort) data.shortDescription = normalizeOptionalText(body.shortDescription);
        if (hasIntro) data.introMessage = normalizeOptionalText(body.introMessage);
        if (hasIntroLayout) {
            const raw = body.introLayoutJson;
            if (raw === null || raw === undefined) {
                data.introLayoutJson = null;
            } else {
                const s = String(raw).trim();
                if (s === "") {
                    data.introLayoutJson = null;
                } else if (s.length > INTRO_LAYOUT_JSON_MAX) {
                    return reply.code(400).send(badRequest(t(lang, MSG.TEAM_INTRO_LAYOUT_INVALID)));
                } else if (!isValidIntroLayoutJsonString(s)) {
                    return reply.code(400).send(badRequest(t(lang, MSG.TEAM_INTRO_LAYOUT_INVALID)));
                } else {
                    data.introLayoutJson = s;
                }
            }
        }
        if (hasHidden) {
            const raw = body.hiddenFromUsers;
            data.hiddenFromUsers = Boolean(raw);
        }

        let team;
        try {
            team = await app.prisma.team.update({
                where: { id: teamId },
                data,
                select: {
                    id: true,
                    name: true,
                    shortDescription: true,
                    introMessage: true,
                    bannerUrl: true,
                    introLayoutJson: true,
                    hiddenFromUsers: true,
                    createdById: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        } catch (e) {
            if (isTeamNameUniqueViolation(e)) {
                return reply.code(409).send(conflict(t(lang, MSG.TEAM_NAME_DUPLICATE)));
            }
            throw e;
        }

        return reply.send(ok(team, t(lang, MSG.TEAM_UPDATED)));
    }

    async function deleteTeam(
        request: FastifyRequest<{ Params: { id: string }; Body: DeleteTeamBody }>,
        reply: FastifyReply,
    ) {
        const teamId = request.params.id;
        const lang = request.lang;
        const confirmName = String(request.body?.confirmName ?? "").trim();

        const leader = await app.prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId: request.userId } },
        });
        if (!leader || leader.role !== "LEADER") {
            return reply.code(403).send(forbidden(t(lang, MSG.TEAM_EDIT_FORBIDDEN)));
        }

        const existing = await app.prisma.team.findUnique({
            where: { id: teamId },
            select: { name: true, bannerUrl: true, bannerThumbUrl: true },
        });
        if (!existing) {
            return reply.code(404).send(notFound(t(lang, MSG.TEAM_NOT_FOUND)));
        }
        if (confirmName !== existing.name) {
            return reply.code(400).send(badRequest(t(lang, MSG.TEAM_DELETE_NAME_MISMATCH)));
        }

        if (existing.bannerUrl) {
            await storageService.remove(existing.bannerUrl).catch(() => {});
        }
        if (existing.bannerThumbUrl) {
            await storageService.remove(existing.bannerThumbUrl).catch(() => {});
        }

        await app.prisma.team.delete({ where: { id: teamId } });

        return reply.send(ok({ id: teamId }, t(lang, MSG.TEAM_DELETED)));
    }

    async function uploadTeamBanner(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        const teamId = request.params.id;
        const lang = request.lang;

        const leader = await app.prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId: request.userId } },
        });
        if (!leader || leader.role !== "LEADER") {
            return reply.code(403).send(forbidden(t(lang, MSG.TEAM_EDIT_FORBIDDEN)));
        }

        const data = await request.file();
        if (!data) {
            return reply.code(400).send(badRequest(t(lang, MSG.TEAM_BANNER_REQUIRED)));
        }

        const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (!allowed.includes(data.mimetype)) {
            return reply.code(400).send(badRequest(t(lang, MSG.TEAM_BANNER_INVALID)));
        }

        const existing = await app.prisma.team.findUnique({
            where: { id: teamId },
            select: { bannerUrl: true, bannerThumbUrl: true },
        });
        if (!existing) {
            return reply.code(404).send(notFound(t(lang, MSG.TEAM_NOT_FOUND)));
        }

        const rawBuffer = await data.toBuffer();
        const [compressed, thumb] = await Promise.all([
            compressTeamBanner(rawBuffer),
            compressTeamBannerThumb(rawBuffer),
        ]);
        const key = `team-banners/${teamId}.webp`;
        const thumbKey = `team-banners/${teamId}.thumb.webp`;
        const [url, thumbUrl] = await Promise.all([
            storageService.upload(key, compressed, "image/webp"),
            storageService.upload(thumbKey, thumb, "image/webp"),
        ]);

        if (existing.bannerUrl && existing.bannerUrl !== url) {
            await storageService.remove(existing.bannerUrl).catch(() => {});
        }
        if (existing.bannerThumbUrl && existing.bannerThumbUrl !== thumbUrl) {
            await storageService.remove(existing.bannerThumbUrl).catch(() => {});
        }

        const team = await app.prisma.team.update({
            where: { id: teamId },
            data: { bannerUrl: url, bannerThumbUrl: thumbUrl },
            select: {
                id: true,
                name: true,
                shortDescription: true,
                introMessage: true,
                bannerUrl: true,
                bannerThumbUrl: true,
                introLayoutJson: true,
                hiddenFromUsers: true,
                createdById: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return reply.send(ok(team, t(lang, MSG.TEAM_BANNER_UPDATED)));
    }

    async function deleteTeamBanner(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        const teamId = request.params.id;
        const lang = request.lang;

        const leader = await app.prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId: request.userId } },
        });
        if (!leader || leader.role !== "LEADER") {
            return reply.code(403).send(forbidden(t(lang, MSG.TEAM_EDIT_FORBIDDEN)));
        }

        const existing = await app.prisma.team.findUnique({
            where: { id: teamId },
            select: { bannerUrl: true, bannerThumbUrl: true },
        });
        if (!existing) {
            return reply.code(404).send(notFound(t(lang, MSG.TEAM_NOT_FOUND)));
        }

        if (existing.bannerUrl) {
            await storageService.remove(existing.bannerUrl).catch(() => {});
        }
        if (existing.bannerThumbUrl) {
            await storageService.remove(existing.bannerThumbUrl).catch(() => {});
        }

        const team = await app.prisma.team.update({
            where: { id: teamId },
            data: { bannerUrl: null, bannerThumbUrl: null },
            select: {
                id: true,
                name: true,
                shortDescription: true,
                introMessage: true,
                bannerUrl: true,
                bannerThumbUrl: true,
                introLayoutJson: true,
                hiddenFromUsers: true,
                createdById: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return reply.send(ok(team, t(lang, MSG.TEAM_BANNER_REMOVED)));
    }

    return {
        createTeam,
        listTeams,
        updateMyTeamPins,
        getTeam,
        addTeamMember,
        removeTeamMember,
        delegateLeader,
        updateTeam,
        deleteTeam,
        uploadTeamBanner,
        deleteTeamBanner,
    };
}
