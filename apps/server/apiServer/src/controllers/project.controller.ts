import {
    canAccessProject,
    checkProjectPermission,
    generatePublicId,
    generateProjectId,
    generateWorkspaceId,
    isSuperAdmin,
} from "@repo/database";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import path from "node:path";
import { t } from "@repo/i18n";

import { recordHistory } from "../services/history.service";
import { MSG } from "../utils/messages";
import { badRequest, created, forbidden, notFound, ok } from "../utils/response";

export interface CreateProjectBody {
    name: string;
    description?: string;
    /** 연결할 팀 ID 목록. 요청자가 각 팀의 팀장(LEADER)이어야 함. 첫 번째가 `Project.teamId`(호환)와 동기화됩니다. */
    teamIds?: string[];
    /** YYYY-MM-DD */
    startDate?: string;
    endDate?: string;
    noEndDate?: boolean;
    /** 추가 참여자(프로젝트장은 항상 요청자) */
    participantUserIds?: string[];
}

export interface ProjectParams {
    projectId: string;
}

export interface AddMemberBody {
    userId: string;
    role?: "DEPUTY_LEADER" | "MEMBER";
}

export interface UpdateProjectBody {
    name?: string;
    description?: string | null;
    isPublic?: boolean;
    /** YYYY-MM-DD */
    startDate?: string;
    endDate?: string;
    noEndDate?: boolean;
}

export interface DeleteProjectBody {
    confirmName: string;
}

export interface ProjectWikiCreateBody {
    slug: string;
    title: string;
    contentMd?: string;
}

export interface ProjectWikiUpdateBody {
    title?: string;
    contentMd?: string | null;
}

export interface ProjectWikiReorderBody {
    /** 프로젝트 내 전체 문서 slug를 새 순서대로 나열 */
    slugs: string[];
}

export interface WikiPageParams {
    projectId: string;
    wikiSlug: string;
}

const MAX_PROJECT_WIKI_MD = 400_000;
const MAX_WIKI_TITLE_LEN = 200;
const WIKI_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;

const WIKI_MEDIA_IMAGE_MIMES = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
]);
const WIKI_MEDIA_VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const WIKI_MEDIA_IMAGE_MAX_BYTES = 20 * 1024 * 1024;
const WIKI_MEDIA_VIDEO_MAX_BYTES =
    (Number(process.env.WIKI_UPLOAD_MAX_FILE_SIZE_MB) || 50) * 1024 * 1024;

function wikiMediaFileExtension(mime: string, filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    if (ext && /^\.[a-z0-9.]+$/i.test(ext)) return ext;
    const map: Record<string, string> = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
        "video/mp4": ".mp4",
        "video/webm": ".webm",
        "video/quicktime": ".mov",
    };
    return map[mime] ?? ".bin";
}

function normalizeWikiSlug(raw: string): string {
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
}

const WIKI_USER_SELECT = {
    id: true,
    name: true,
    email: true,
    avatarUrl: true,
} as const;

const PROJECT_DETAIL_INCLUDE = {
    team: { select: { id: true, name: true } },
    projectTeams: {
        orderBy: { createdAt: "asc" as const },
        include: {
            team: { select: { id: true, name: true } },
        },
    },
    members: {
        include: {
            user: { select: { id: true, email: true, name: true, avatarUrl: true } },
        },
    },
} as const;

/** GET /api/teams/:id 의 `members[]`와 동일 select — 웹 `ApiTeamMemberRow`와 맞춤 */
const LINKED_TEAM_MEMBER_SELECT = {
    role: true,
    joinedAt: true,
    user: { select: { id: true, email: true, name: true, avatarUrl: true } },
} as const;

async function linkedTeamMembersForProject(
    app: FastifyInstance,
    teamId: string | null,
    projectTeams: { teamId: string }[],
) {
    const teamIds = new Set<string>();
    if (teamId) teamIds.add(teamId);
    for (const pt of projectTeams) teamIds.add(pt.teamId);
    if (teamIds.size === 0) return [];

    const rows = await app.prisma.teamMember.findMany({
        where: { teamId: { in: [...teamIds] } },
        select: LINKED_TEAM_MEMBER_SELECT,
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });

    const seenUser = new Set<string>();
    const out: typeof rows = [];
    for (const r of rows) {
        if (seenUser.has(r.user.id)) continue;
        seenUser.add(r.user.id);
        out.push(r);
    }
    out.sort((a, b) => {
        const na = a.user.name?.trim() || a.user.email;
        const nb = b.user.name?.trim() || b.user.email;
        return na.localeCompare(nb, "ko");
    });
    return out;
}

/** YYYY-MM-DD → UTC 정오 (저장·비교용) */
function parseYmdToUtcNoon(s: string | undefined): Date | null {
    if (!s?.trim()) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    if (Number.isNaN(y) || mo < 0 || mo > 11 || d < 1 || d > 31) return null;
    const dt = new Date(Date.UTC(y, mo, d, 12, 0, 0));
    return Number.isNaN(dt.getTime()) ? null : dt;
}

export function createProjectController(app: FastifyInstance) {
    async function createProject(
        request: FastifyRequest<{ Body: CreateProjectBody }>,
        reply: FastifyReply,
    ) {
        const {
            name,
            description,
            teamIds: rawTeamIds,
            startDate: rawStart,
            endDate: rawEnd,
            noEndDate: rawNoEnd,
            participantUserIds: rawParticipantIds,
        } = request.body;
        const lang = request.lang;

        if (!name?.trim()) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_NAME_REQUIRED)));
        }

        const noEndDate = Boolean(rawNoEnd);
        const isPublic = true;

        const startTrim = rawStart?.trim() ?? "";
        const endTrim = rawEnd?.trim() ?? "";

        if (!startTrim) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_START_DATE_REQUIRED)));
        }

        const startParsed = parseYmdToUtcNoon(startTrim);
        if (!startParsed) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_DATE_INVALID)));
        }
        const startDate = startParsed;

        let endDate: Date | undefined;
        if (!noEndDate) {
            if (!endTrim) {
                return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_END_DATE_REQUIRED)));
            }
            const endParsed = parseYmdToUtcNoon(endTrim);
            if (!endParsed) {
                return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_DATE_INVALID)));
            }
            endDate = endParsed;
        }

        if (endDate && endDate < startDate) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_INVALID_DATES)));
        }

        const fromArray = Array.isArray(rawTeamIds)
            ? rawTeamIds.map((x) => String(x).trim()).filter(Boolean)
            : [];
        const teamIdsUnique = [...new Set(fromArray)];

        for (const tid of teamIdsUnique) {
            const canLink = await app.prisma.team.findFirst({
                where: {
                    id: tid,
                    members: {
                        some: { userId: request.userId, role: "LEADER" },
                    },
                },
                select: { id: true },
            });
            if (!canLink) {
                return reply.code(403).send(forbidden(t(lang, MSG.PROJECT_TEAM_LEADER_ONLY)));
            }
        }

        const primaryTeamId = teamIdsUnique[0];
        // teamId(주 팀 FK)에 이미 저장되므로 projectTeams에서는 제외해 중복 방지
        const extraTeamIds = teamIdsUnique.slice(1);

        const participantIds = [
            ...new Set(
                (rawParticipantIds ?? [])
                    .map((id) => (typeof id === "string" ? id.trim() : ""))
                    .filter(Boolean),
            ),
        ].filter((id) => id !== request.userId);

        if (participantIds.length > 0) {
            const found = await app.prisma.user.findMany({
                where: { id: { in: participantIds } },
                select: { id: true },
            });
            if (found.length !== participantIds.length) {
                return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_PARTICIPANTS_INVALID)));
            }
        }

        const memberCreates = [
            { id: generatePublicId(), userId: request.userId, role: "LEADER" as const },
            ...participantIds.map((userId) => ({
                id: generatePublicId(),
                userId,
                role: "MEMBER" as const,
            })),
        ];

        const projectId = generateProjectId();

        // 연결된 모든 팀의 팀원 userId 수집 (워크스페이스 자동 생성용)
        const linkedTeamMemberIds = new Set<string>();
        linkedTeamMemberIds.add(request.userId);

        if (teamIdsUnique.length > 0) {
            const teamMembers = await app.prisma.teamMember.findMany({
                where: { teamId: { in: teamIdsUnique } },
                select: { userId: true },
            });
            for (const m of teamMembers) linkedTeamMemberIds.add(m.userId);
        }

        // 개인 프로젝트 등에서 직접 초대한 참여자 — 팀 연결 없이도 멤버이므로 워크스페이스 생성 대상에 포함
        for (const uid of participantIds) {
            linkedTeamMemberIds.add(uid);
        }

        const project = await app.prisma.$transaction(async (tx) => {
            const created_ = await tx.project.create({
                data: {
                    id: projectId,
                    name: name.trim(),
                    description: description?.trim() || undefined,
                    teamId: primaryTeamId,
                    startDate,
                    endDate: noEndDate ? undefined : endDate,
                    noEndDate,
                    isPublic,
                    members: { create: memberCreates },
                    ...(extraTeamIds.length > 0
                        ? {
                              projectTeams: {
                                  create: extraTeamIds.map((tid) => ({
                                      id: generatePublicId(),
                                      teamId: tid,
                                  })),
                              },
                          }
                        : {}),
                },
                include: {
                    members: {
                        where: { userId: request.userId },
                        select: { role: true },
                    },
                },
            });

            // 프로젝트 생성자 + 연결 팀 전원 + 직접 초대 참여자 워크스페이스 자동 생성
            await tx.workspace.createMany({
                data: [...linkedTeamMemberIds].map((userId) => ({
                    id: generateWorkspaceId(),
                    projectId,
                    userId,
                })),
                skipDuplicates: true,
            });

            // 새로 생성된 워크스페이스에 기본 상태 3개 시드
            const newWorkspaces = await tx.workspace.findMany({
                where: { projectId },
                select: { id: true },
            });
            const defaultStatuses = newWorkspaces.flatMap((ws) => [
                {
                    id: generatePublicId(),
                    workspaceId: ws.id,
                    name: "할 일",
                    color: "gray",
                    order: 0,
                    semantic: "WAITING" as const,
                },
                {
                    id: generatePublicId(),
                    workspaceId: ws.id,
                    name: "진행 중",
                    color: "blue",
                    order: 1,
                    semantic: "IN_PROGRESS" as const,
                },
                {
                    id: generatePublicId(),
                    workspaceId: ws.id,
                    name: "완료",
                    color: "green",
                    order: 2,
                    semantic: "DONE" as const,
                },
            ]);
            await (tx as any).workspaceStatus.createMany({
                data: defaultStatuses,
                skipDuplicates: true,
            });

            const defaultPriorities = newWorkspaces.flatMap((ws) => [
                {
                    id: generatePublicId(),
                    workspaceId: ws.id,
                    name: "긴급",
                    color: "red",
                    order: 0,
                },
                {
                    id: generatePublicId(),
                    workspaceId: ws.id,
                    name: "높음",
                    color: "orange",
                    order: 1,
                },
                {
                    id: generatePublicId(),
                    workspaceId: ws.id,
                    name: "보통",
                    color: "blue",
                    order: 2,
                },
                {
                    id: generatePublicId(),
                    workspaceId: ws.id,
                    name: "낮음",
                    color: "gray",
                    order: 3,
                },
            ]);
            await (tx as any).workspacePriority.createMany({
                data: defaultPriorities,
                skipDuplicates: true,
            });

            return created_;
        });

        recordHistory(app, {
            projectId,
            userId: request.userId,
            action: "CREATED",
            resourceType: "PROJECT",
            resourceId: projectId,
            resourceName: name.trim(),
        });

        if (participantIds.length > 0) {
            const invitedUsers = await app.prisma.user.findMany({
                where: { id: { in: participantIds } },
                select: { id: true, name: true, email: true },
            });
            const byId = new Map(invitedUsers.map((u) => [u.id, u]));
            for (const uid of participantIds) {
                const u = byId.get(uid);
                recordHistory(app, {
                    projectId,
                    userId: request.userId,
                    action: "CREATED",
                    resourceType: "PROJECT_MEMBER",
                    resourceId: uid,
                    resourceName: u?.name?.trim() || u?.email || uid,
                    after: { atProjectCreation: true },
                });
            }
        }

        return reply.code(201).send(created(project, t(lang, MSG.PROJECT_CREATED)));
    }

    async function getProject(
        request: FastifyRequest<{ Params: ProjectParams }>,
        reply: FastifyReply,
    ) {
        const { projectId } = request.params;
        const lang = request.lang;

        const project = await app.prisma.project.findUnique({
            where: { id: projectId },
            include: PROJECT_DETAIL_INCLUDE,
        });

        if (!project) {
            return reply.code(404).send(notFound(t(lang, MSG.PROJECT_NOT_FOUND)));
        }

        const allowed = await canAccessProject(request.userId, projectId);
        if (!allowed) {
            return reply.code(403).send(forbidden(t(lang, MSG.FORBIDDEN_NOT_MEMBER)));
        }

        const memberRow = project.members.find((m) => m.userId === request.userId);
        const viewerRole =
            memberRow?.role ?? ((await isSuperAdmin(request.userId)) ? null : "MEMBER");

        const linkedTeamMembers = await linkedTeamMembersForProject(
            app,
            project.teamId,
            project.projectTeams,
        );

        return reply.send(
            ok({ ...project, linkedTeamMembers, viewerRole }, t(lang, MSG.PROJECT_FETCHED)),
        );
    }

    async function updateProject(
        request: FastifyRequest<{ Params: ProjectParams; Body: UpdateProjectBody }>,
        reply: FastifyReply,
    ) {
        const { projectId } = request.params;
        const lang = request.lang;
        const body = request.body ?? {};

        const existing = await app.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!existing) {
            return reply.code(404).send(notFound(t(lang, MSG.PROJECT_NOT_FOUND)));
        }

        const perm = await checkProjectPermission(request.userId, projectId);
        if (!perm.isMember) {
            return reply.code(403).send(forbidden(t(lang, MSG.FORBIDDEN_NOT_MEMBER)));
        }
        if (!perm.isLeader) {
            return reply.code(403).send(forbidden(t(lang, MSG.PROJECT_LEADER_ONLY)));
        }

        const nextName = body.name !== undefined ? String(body.name).trim() : existing.name;
        if (!nextName) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_NAME_REQUIRED)));
        }

        const nextDesc =
            body.description !== undefined
                ? body.description === null || String(body.description).trim() === ""
                    ? null
                    : String(body.description).trim()
                : existing.description;

        const nextIsPublic =
            body.isPublic !== undefined ? body.isPublic !== false : existing.isPublic;

        const nextNoEnd =
            body.noEndDate !== undefined ? Boolean(body.noEndDate) : existing.noEndDate;

        let nextStartDate: Date;
        if (body.startDate !== undefined) {
            const p = parseYmdToUtcNoon(body.startDate);
            if (!p) {
                return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_DATE_INVALID)));
            }
            nextStartDate = p;
        } else if (existing.startDate) {
            nextStartDate = existing.startDate;
        } else {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_START_DATE_REQUIRED)));
        }

        let nextEndDate: Date | null;
        if (nextNoEnd) {
            nextEndDate = null;
        } else if (body.endDate !== undefined) {
            const p = parseYmdToUtcNoon(body.endDate);
            if (!p) {
                return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_DATE_INVALID)));
            }
            nextEndDate = p;
        } else if (existing.endDate) {
            nextEndDate = existing.endDate;
        } else {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_END_DATE_REQUIRED)));
        }

        if (nextEndDate && nextEndDate < nextStartDate) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_INVALID_DATES)));
        }

        const updated = await app.prisma.project.update({
            where: { id: projectId },
            data: {
                name: nextName,
                description: nextDesc,
                isPublic: nextIsPublic,
                startDate: nextStartDate,
                endDate: nextNoEnd ? null : nextEndDate,
                noEndDate: nextNoEnd,
            },
            include: PROJECT_DETAIL_INCLUDE,
        });

        const viewerRole = updated.members.find((m) => m.userId === request.userId)?.role ?? null;

        const linkedTeamMembers = await linkedTeamMembersForProject(
            app,
            updated.teamId,
            updated.projectTeams,
        );

        return reply.send(
            ok({ ...updated, linkedTeamMembers, viewerRole }, t(lang, MSG.PROJECT_UPDATED)),
        );
    }

    async function deleteProject(
        request: FastifyRequest<{ Params: ProjectParams; Body: DeleteProjectBody }>,
        reply: FastifyReply,
    ) {
        const { projectId } = request.params;
        const lang = request.lang;
        const confirmName = String(request.body?.confirmName ?? "").trim();

        const perm = await checkProjectPermission(request.userId, projectId);
        if (!perm.isMember) {
            return reply.code(403).send(forbidden(t(lang, MSG.FORBIDDEN_NOT_MEMBER)));
        }
        if (!perm.isLeader) {
            return reply.code(403).send(forbidden(t(lang, MSG.PROJECT_LEADER_ONLY)));
        }

        const existing = await app.prisma.project.findUnique({
            where: { id: projectId },
            select: { name: true },
        });
        if (!existing) {
            return reply.code(404).send(notFound(t(lang, MSG.PROJECT_NOT_FOUND)));
        }
        if (confirmName !== existing.name) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_DELETE_NAME_MISMATCH)));
        }

        await app.prisma.project.delete({ where: { id: projectId } });

        return reply.send(ok({ id: projectId }, t(lang, MSG.PROJECT_DELETED)));
    }

    async function addMember(
        request: FastifyRequest<{ Params: ProjectParams; Body: AddMemberBody }>,
        reply: FastifyReply,
    ) {
        const { projectId } = request.params;
        const { userId, role = "MEMBER" } = request.body;
        const lang = request.lang;

        const { m: member, before: memberBefore } = await app.prisma.$transaction(async (tx) => {
            const before = await tx.projectMember.findUnique({
                where: { userId_projectId: { userId, projectId } },
                select: { role: true },
            });
            const m = await tx.projectMember.upsert({
                where: { userId_projectId: { userId, projectId } },
                update: { role },
                create: { id: generatePublicId(), userId, projectId, role },
            });

            // 해당 사용자의 워크스페이스가 없을 때만 생성 후 기본 상태/우선순위 시드
            const existingWs = await tx.workspace.findFirst({
                where: { userId, projectId },
                select: { id: true },
            });

            if (!existingWs) {
                const wsId = generateWorkspaceId();
                await tx.workspace.create({
                    data: { id: wsId, projectId, userId },
                });

                await (tx as any).workspaceStatus.createMany({
                    data: [
                        {
                            id: generatePublicId(),
                            workspaceId: wsId,
                            name: "할 일",
                            color: "gray",
                            order: 0,
                            semantic: "WAITING",
                        },
                        {
                            id: generatePublicId(),
                            workspaceId: wsId,
                            name: "진행 중",
                            color: "blue",
                            order: 1,
                            semantic: "IN_PROGRESS",
                        },
                        {
                            id: generatePublicId(),
                            workspaceId: wsId,
                            name: "완료",
                            color: "green",
                            order: 2,
                            semantic: "DONE",
                        },
                    ],
                    skipDuplicates: true,
                });

                await (tx as any).workspacePriority.createMany({
                    data: [
                        {
                            id: generatePublicId(),
                            workspaceId: wsId,
                            name: "긴급",
                            color: "red",
                            order: 0,
                        },
                        {
                            id: generatePublicId(),
                            workspaceId: wsId,
                            name: "높음",
                            color: "orange",
                            order: 1,
                        },
                        {
                            id: generatePublicId(),
                            workspaceId: wsId,
                            name: "보통",
                            color: "blue",
                            order: 2,
                        },
                        {
                            id: generatePublicId(),
                            workspaceId: wsId,
                            name: "낮음",
                            color: "gray",
                            order: 3,
                        },
                    ],
                    skipDuplicates: true,
                });
            }

            return { m, before };
        });

        const targetUser = await app.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true },
        });
        const targetLabel = targetUser?.name?.trim() || targetUser?.email || userId;

        if (!memberBefore) {
            recordHistory(app, {
                projectId,
                userId: request.userId,
                action: "CREATED",
                resourceType: "PROJECT_MEMBER",
                resourceId: userId,
                resourceName: targetLabel,
            });
        } else if (memberBefore.role !== role) {
            recordHistory(app, {
                projectId,
                userId: request.userId,
                action: "UPDATED",
                resourceType: "PROJECT_MEMBER",
                resourceId: userId,
                resourceName: targetLabel,
                before: { role: memberBefore.role },
                after: { role },
            });
        }

        return reply.code(201).send(created(member, t(lang, MSG.PROJECT_MEMBER_ADDED)));
    }

    /** GET /api/projects/:projectId/activity — 프로젝트 활동 로그 (리더 전용) */
    async function getProjectActivity(
        request: FastifyRequest<{ Params: ProjectParams }>,
        reply: FastifyReply,
    ) {
        const { projectId } = request.params;
        const lang = request.lang;

        const project = await app.prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true },
        });
        if (!project) {
            return reply.code(404).send(notFound(t(lang, MSG.PROJECT_NOT_FOUND)));
        }

        const perm = await checkProjectPermission(request.userId, projectId);
        const admin = await isSuperAdmin(request.userId);
        if (!perm.isMember) {
            return reply.code(403).send(forbidden(t(lang, MSG.FORBIDDEN_NOT_MEMBER)));
        }
        if (!admin && !perm.isLeader) {
            return reply.code(403).send(forbidden(t(lang, MSG.PROJECT_LEADER_ONLY)));
        }

        const rows = await app.prisma.projectHistory.findMany({
            where: {
                projectId,
                OR: [
                    { AND: [{ resourceType: "PROJECT" }, { action: "CREATED" }] },
                    {
                        AND: [
                            { resourceType: "PROJECT_MEMBER" },
                            { action: { in: ["CREATED", "UPDATED"] } },
                        ],
                    },
                    { resourceType: "WIKI_PAGE" },
                    { AND: [{ resourceType: "TASK" }, { action: { in: ["CREATED", "DELETED"] } }] },
                ],
            },
            orderBy: { createdAt: "desc" },
            take: 200,
            include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
        });

        const items = rows.map((row) => ({
            id: row.id,
            action: row.action,
            resourceType: row.resourceType,
            resourceId: row.resourceId,
            resourceName: row.resourceName,
            before: row.before,
            after: row.after,
            createdAt: row.createdAt.toISOString(),
            actor: {
                id: row.user.id,
                name: row.user.name,
                email: row.user.email,
                avatarUrl: row.user.avatarUrl,
            },
        }));

        return reply.send(ok({ items }, t(lang, MSG.PROJECT_ACTIVITY_FETCHED)));
    }

    /** GET /api/projects/:projectId/tasks — 프로젝트 소속 모든 팀원의 업무 목록 */
    async function getProjectTasks(
        request: FastifyRequest<{ Params: ProjectParams }>,
        reply: FastifyReply,
    ) {
        const { projectId } = request.params;
        const lang = request.lang;

        const project = await app.prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true },
        });
        if (!project) {
            return reply.code(404).send(notFound(t(lang, MSG.PROJECT_NOT_FOUND)));
        }

        const allowed = await canAccessProject(request.userId, projectId);
        if (!allowed) {
            return reply.code(403).send(forbidden(t(lang, MSG.FORBIDDEN_NOT_MEMBER)));
        }

        // 이 프로젝트에 연결된 모든 워크스페이스(소유자 포함)
        const workspaces = await (app.prisma as any).workspace.findMany({
            where: { projectId },
            select: {
                id: true,
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
            orderBy: { createdAt: "asc" },
        });

        const TASK_SELECT = {
            id: true,
            title: true,
            description: true,
            statusId: true,
            priorityId: true,
            order: true,
            startDate: true,
            dueDate: true,
            parentId: true,
            createdAt: true,
            updatedAt: true,
            assignee: {
                select: { id: true, name: true, email: true, avatarUrl: true },
            },
        } as const;

        const result = await Promise.all(
            workspaces.map(
                async (ws: {
                    id: string;
                    user: {
                        id: string;
                        name: string | null;
                        email: string;
                        avatarUrl: string | null;
                    };
                }) => {
                    const [rawTasks, statuses, priorities] = await Promise.all([
                        (app.prisma as any).workspaceTask.findMany({
                            where: { workspaceId: ws.id },
                            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
                            select: TASK_SELECT,
                        }),
                        (app.prisma as any).workspaceStatus.findMany({
                            where: { workspaceId: ws.id },
                            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
                            select: {
                                id: true,
                                workspaceId: true,
                                name: true,
                                color: true,
                                order: true,
                                notifyOnChange: true,
                                createdAt: true,
                                updatedAt: true,
                            },
                        }),
                        (app.prisma as any).workspacePriority.findMany({
                            where: { workspaceId: ws.id },
                            orderBy: [{ order: "asc" }],
                            select: {
                                id: true,
                                workspaceId: true,
                                name: true,
                                color: true,
                                order: true,
                                value: true,
                                createdAt: true,
                                updatedAt: true,
                            },
                        }),
                    ]);

                    // status/priority 객체 인라인 resolve
                    const statusIds = [
                        ...new Set((rawTasks as { statusId: string }[]).map((t) => t.statusId)),
                    ];
                    const priorityIds = [
                        ...new Set(
                            (rawTasks as { priorityId?: string | null }[])
                                .map((t) => t.priorityId)
                                .filter(Boolean),
                        ),
                    ] as string[];

                    const [statusRows, priorityRows] = await Promise.all([
                        statusIds.length > 0
                            ? (app.prisma as any).workspaceStatus.findMany({
                                  where: { id: { in: statusIds } },
                                  select: { id: true, name: true, color: true, order: true },
                              })
                            : [],
                        priorityIds.length > 0
                            ? (app.prisma as any).workspacePriority.findMany({
                                  where: { id: { in: priorityIds } },
                                  select: {
                                      id: true,
                                      name: true,
                                      color: true,
                                      order: true,
                                      value: true,
                                  },
                              })
                            : [],
                    ]);

                    const statusMap = new Map(
                        (statusRows as { id: string }[]).map((s) => [s.id, s]),
                    );
                    const priorityMap = new Map(
                        (priorityRows as { id: string }[]).map((p) => [p.id, p]),
                    );

                    const tasks = (
                        rawTasks as Array<{
                            statusId: string;
                            priorityId?: string | null;
                            [key: string]: unknown;
                        }>
                    ).map((task) => ({
                        ...task,
                        status: statusMap.get(task.statusId) ?? {
                            id: task.statusId,
                            name: "—",
                            color: "gray",
                            order: 0,
                        },
                        priority: task.priorityId
                            ? (priorityMap.get(task.priorityId as string) ?? null)
                            : null,
                    }));

                    return {
                        workspace: { id: ws.id, user: ws.user },
                        tasks,
                        statuses,
                        priorities,
                    };
                },
            ),
        );

        return reply.send(ok(result, t(lang, MSG.WORKSPACE_TASKS_FETCHED)));
    }

    async function assertTeamWikiReadable(
        userId: string,
        projectId: string,
        lang: string,
        reply: FastifyReply,
    ): Promise<
        | { ok: false }
        | {
              ok: true;
              canWrite: boolean;
          }
    > {
        const project = await app.prisma.project.findUnique({
            where: { id: projectId },
            select: {
                id: true,
                teamId: true,
                _count: { select: { projectTeams: true } },
            },
        });
        if (!project) {
            reply.code(404).send(notFound(t(lang, MSG.PROJECT_NOT_FOUND)));
            return { ok: false };
        }
        const isTeamProject = Boolean(project.teamId || project._count.projectTeams > 0);
        if (!isTeamProject) {
            reply.code(404).send(notFound(t(lang, MSG.PROJECT_WIKI_TEAM_ONLY)));
            return { ok: false };
        }

        const allowed = await canAccessProject(userId, projectId);
        if (!allowed) {
            reply.code(403).send(forbidden(t(lang, MSG.FORBIDDEN_NOT_MEMBER)));
            return { ok: false };
        }

        const [admin, perm] = await Promise.all([
            isSuperAdmin(userId),
            checkProjectPermission(userId, projectId),
        ]);
        const canWrite = admin || perm.isMember;

        return { ok: true, canWrite };
    }

    async function maybeSeedWikiHome(projectId: string, userId: string) {
        const count = await app.prisma.projectWikiPage.count({ where: { projectId } });
        if (count === 0) {
            const pageId = generatePublicId();
            await app.prisma.projectWikiPage.create({
                data: {
                    id: pageId,
                    projectId,
                    slug: "home",
                    title: "홈",
                    contentMd: "",
                    order: 0,
                    updatedById: userId,
                },
            });
            recordHistory(app, {
                projectId,
                userId,
                action: "CREATED",
                resourceType: "WIKI_PAGE",
                resourceId: pageId,
                resourceName: "홈",
                after: { slug: "home" },
            });
        }
    }

    async function listProjectWikiPages(
        request: FastifyRequest<{ Params: ProjectParams }>,
        reply: FastifyReply,
    ) {
        const { projectId } = request.params;
        const lang = request.lang;

        const gate = await assertTeamWikiReadable(request.userId, projectId, lang, reply);
        if (!gate.ok) return;

        if (gate.canWrite) {
            await maybeSeedWikiHome(projectId, request.userId);
        }

        const rows = await app.prisma.projectWikiPage.findMany({
            where: { projectId },
            include: { updatedBy: { select: WIKI_USER_SELECT } },
            orderBy: [{ order: "asc" }, { slug: "asc" }],
        });

        const pages = rows.map((p) => ({
            slug: p.slug,
            title: p.title,
            updatedAt: p.updatedAt.toISOString(),
            updatedBy: p.updatedBy,
        }));

        return reply.send(ok({ pages }, t(lang, MSG.PROJECT_WIKI_PAGES_FETCHED)));
    }

    async function getProjectWikiPage(
        request: FastifyRequest<{ Params: WikiPageParams }>,
        reply: FastifyReply,
    ) {
        const { projectId } = request.params;
        const slug = normalizeWikiSlug(request.params.wikiSlug);
        const lang = request.lang;

        const gate = await assertTeamWikiReadable(request.userId, projectId, lang, reply);
        if (!gate.ok) return;

        if (gate.canWrite) {
            await maybeSeedWikiHome(projectId, request.userId);
        }

        const page = await app.prisma.projectWikiPage.findUnique({
            where: { projectId_slug: { projectId, slug } },
            include: { updatedBy: { select: WIKI_USER_SELECT } },
        });

        if (!page) {
            return reply.code(404).send(notFound(t(lang, MSG.PROJECT_WIKI_PAGE_NOT_FOUND)));
        }

        return reply.send(
            ok(
                {
                    slug: page.slug,
                    title: page.title,
                    contentMd: page.contentMd,
                    updatedAt: page.updatedAt.toISOString(),
                    updatedBy: page.updatedBy,
                },
                t(lang, MSG.PROJECT_WIKI_PAGE_FETCHED),
            ),
        );
    }

    async function createProjectWikiPage(
        request: FastifyRequest<{ Params: ProjectParams; Body: ProjectWikiCreateBody }>,
        reply: FastifyReply,
    ) {
        const { projectId } = request.params;
        const lang = request.lang;
        const body = request.body ?? {};

        const gate = await assertTeamWikiReadable(request.userId, projectId, lang, reply);
        if (!gate.ok) return;
        if (!gate.canWrite) {
            return reply.code(403).send(forbidden(t(lang, MSG.FORBIDDEN_NOT_MEMBER)));
        }

        const slugRaw = String(body.slug ?? "").trim().toLowerCase();
        if (!WIKI_SLUG_RE.test(slugRaw)) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_WIKI_SLUG_INVALID)));
        }

        const title = String(body.title ?? "").trim();
        if (!title) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_WIKI_TITLE_REQUIRED)));
        }
        if (title.length > MAX_WIKI_TITLE_LEN) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_WIKI_TITLE_REQUIRED)));
        }

        const md = body.contentMd !== undefined && body.contentMd !== null ? String(body.contentMd) : "";
        if (md.length > MAX_PROJECT_WIKI_MD) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_WIKI_BODY_TOO_LARGE)));
        }

        const existing = await app.prisma.projectWikiPage.findUnique({
            where: { projectId_slug: { projectId, slug: slugRaw } },
            select: { id: true },
        });
        if (existing) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_WIKI_SLUG_DUPLICATE)));
        }

        const maxRow = await app.prisma.projectWikiPage.aggregate({
            where: { projectId },
            _max: { order: true },
        });
        const nextOrder = (maxRow._max.order ?? -1) + 1;

        const page = await app.prisma.projectWikiPage.create({
            data: {
                id: generatePublicId(),
                projectId,
                slug: slugRaw,
                title,
                contentMd: md,
                order: nextOrder,
                updatedById: request.userId,
            },
            include: { updatedBy: { select: WIKI_USER_SELECT } },
        });

        recordHistory(app, {
            projectId,
            userId: request.userId,
            action: "CREATED",
            resourceType: "WIKI_PAGE",
            resourceId: page.id,
            resourceName: title,
            after: { slug: slugRaw },
        });

        return reply.code(201).send(
            created(
                {
                    slug: page.slug,
                    title: page.title,
                    contentMd: page.contentMd,
                    updatedAt: page.updatedAt.toISOString(),
                    updatedBy: page.updatedBy,
                },
                t(lang, MSG.PROJECT_WIKI_PAGE_CREATED),
            ),
        );
    }

    async function patchProjectWikiPage(
        request: FastifyRequest<{ Params: WikiPageParams; Body: ProjectWikiUpdateBody }>,
        reply: FastifyReply,
    ) {
        const { projectId } = request.params;
        const slug = normalizeWikiSlug(request.params.wikiSlug);
        const lang = request.lang;
        const body = request.body ?? {};

        const gate = await assertTeamWikiReadable(request.userId, projectId, lang, reply);
        if (!gate.ok) return;
        if (!gate.canWrite) {
            return reply.code(403).send(forbidden(t(lang, MSG.FORBIDDEN_NOT_MEMBER)));
        }

        const existing = await app.prisma.projectWikiPage.findUnique({
            where: { projectId_slug: { projectId, slug } },
        });
        if (!existing) {
            return reply.code(404).send(notFound(t(lang, MSG.PROJECT_WIKI_PAGE_NOT_FOUND)));
        }

        const nextTitle =
            body.title !== undefined ? String(body.title).trim() : existing.title;
        if (body.title !== undefined && !nextTitle) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_WIKI_TITLE_REQUIRED)));
        }
        if (nextTitle.length > MAX_WIKI_TITLE_LEN) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_WIKI_TITLE_REQUIRED)));
        }

        let nextMd = existing.contentMd;
        if (body.contentMd !== undefined) {
            nextMd = body.contentMd === null ? "" : String(body.contentMd);
        }
        if (nextMd.length > MAX_PROJECT_WIKI_MD) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_WIKI_BODY_TOO_LARGE)));
        }

        const page = await app.prisma.projectWikiPage.update({
            where: { projectId_slug: { projectId, slug } },
            data: {
                title: nextTitle,
                contentMd: nextMd,
                updatedById: request.userId,
            },
            include: { updatedBy: { select: WIKI_USER_SELECT } },
        });

        const changed =
            nextTitle !== existing.title || nextMd !== existing.contentMd;
        if (changed) {
            recordHistory(app, {
                projectId,
                userId: request.userId,
                action: "UPDATED",
                resourceType: "WIKI_PAGE",
                resourceId: page.id,
                resourceName: nextTitle,
                before: { title: existing.title, slug: existing.slug },
                after: { title: nextTitle, slug: page.slug },
            });
        }

        return reply.send(
            ok(
                {
                    slug: page.slug,
                    title: page.title,
                    contentMd: page.contentMd,
                    updatedAt: page.updatedAt.toISOString(),
                    updatedBy: page.updatedBy,
                },
                t(lang, MSG.PROJECT_WIKI_PAGE_SAVED),
            ),
        );
    }

    async function deleteProjectWikiPage(
        request: FastifyRequest<{ Params: WikiPageParams }>,
        reply: FastifyReply,
    ) {
        const { projectId } = request.params;
        const slug = normalizeWikiSlug(request.params.wikiSlug);
        const lang = request.lang;

        const gate = await assertTeamWikiReadable(request.userId, projectId, lang, reply);
        if (!gate.ok) return;
        if (!gate.canWrite) {
            return reply.code(403).send(forbidden(t(lang, MSG.FORBIDDEN_NOT_MEMBER)));
        }

        const existing = await app.prisma.projectWikiPage.findUnique({
            where: { projectId_slug: { projectId, slug } },
            select: { id: true, title: true, slug: true },
        });
        if (!existing) {
            return reply.code(404).send(notFound(t(lang, MSG.PROJECT_WIKI_PAGE_NOT_FOUND)));
        }

        const total = await app.prisma.projectWikiPage.count({ where: { projectId } });
        if (total <= 1) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_WIKI_LAST_PAGE)));
        }

        await app.prisma.projectWikiPage.delete({
            where: { projectId_slug: { projectId, slug } },
        });

        recordHistory(app, {
            projectId,
            userId: request.userId,
            action: "DELETED",
            resourceType: "WIKI_PAGE",
            resourceId: existing.id,
            resourceName: existing.title,
            before: { slug: existing.slug, title: existing.title },
        });

        return reply.send(ok({ slug }, t(lang, MSG.PROJECT_WIKI_PAGE_DELETED)));
    }

    async function reorderProjectWikiPages(
        request: FastifyRequest<{ Params: ProjectParams; Body: ProjectWikiReorderBody }>,
        reply: FastifyReply,
    ) {
        const { projectId } = request.params;
        const lang = request.lang;
        const raw = request.body?.slugs;

        const gate = await assertTeamWikiReadable(request.userId, projectId, lang, reply);
        if (!gate.ok) return;
        if (!gate.canWrite) {
            return reply.code(403).send(forbidden(t(lang, MSG.FORBIDDEN_NOT_MEMBER)));
        }

        if (!Array.isArray(raw) || raw.length === 0) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_WIKI_REORDER_INVALID)));
        }

        const normalized = raw.map((s) => String(s ?? "").trim().toLowerCase());
        const seen = new Set<string>();
        for (const s of normalized) {
            if (!s || !WIKI_SLUG_RE.test(s) || seen.has(s)) {
                return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_WIKI_REORDER_INVALID)));
            }
            seen.add(s);
        }

        const existing = await app.prisma.projectWikiPage.findMany({
            where: { projectId },
            select: { slug: true },
        });
        if (existing.length !== normalized.length) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_WIKI_REORDER_INVALID)));
        }
        const dbSet = new Set(existing.map((r) => r.slug));
        for (const s of normalized) {
            if (!dbSet.has(s)) {
                return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_WIKI_REORDER_INVALID)));
            }
        }
        for (const s of dbSet) {
            if (!seen.has(s)) {
                return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_WIKI_REORDER_INVALID)));
            }
        }

        await app.prisma.$transaction(
            normalized.map((slug, index) =>
                app.prisma.projectWikiPage.update({
                    where: { projectId_slug: { projectId, slug } },
                    data: { order: index },
                }),
            ),
        );

        return reply.send(ok({ slugs: normalized }, t(lang, MSG.PROJECT_WIKI_REORDERED)));
    }

    /** POST /api/projects/:projectId/wiki/media (multipart, field `file`) */
    async function uploadProjectWikiMedia(
        request: FastifyRequest<{ Params: ProjectParams }>,
        reply: FastifyReply,
    ) {
        const { projectId } = request.params;
        const lang = request.lang;

        const gate = await assertTeamWikiReadable(request.userId, projectId, lang, reply);
        if (!gate.ok) return;
        if (!gate.canWrite) {
            return reply.code(403).send(forbidden(t(lang, MSG.PROJECT_WIKI_MEDIA_FORBIDDEN)));
        }

        const file = await request.file();
        if (!file) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_WIKI_MEDIA_NO_FILE)));
        }

        const buf = await file.toBuffer();
        const mime = file.mimetype;
        if (!WIKI_MEDIA_IMAGE_MIMES.has(mime) && !WIKI_MEDIA_VIDEO_MIMES.has(mime)) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_WIKI_MEDIA_TYPE)));
        }

        const max = WIKI_MEDIA_IMAGE_MIMES.has(mime)
            ? WIKI_MEDIA_IMAGE_MAX_BYTES
            : WIKI_MEDIA_VIDEO_MAX_BYTES;
        if (buf.length > max) {
            return reply.code(413).send(badRequest(t(lang, MSG.PROJECT_WIKI_MEDIA_TOO_LARGE)));
        }

        const { storageService } = await import("../index.js");
        const id = generatePublicId();
        const ext = wikiMediaFileExtension(mime, file.filename);
        const key = `wiki/${projectId}/${id}${ext}`;
        const url = await storageService.upload(key, buf, mime);

        return reply.code(201).send(
            created(
                {
                    url,
                    mimeType: mime,
                    fileName: file.filename,
                    size: buf.length,
                },
                t(lang, MSG.PROJECT_WIKI_MEDIA_UPLOADED),
            ),
        );
    }

    return {
        createProject,
        getProject,
        updateProject,
        deleteProject,
        addMember,
        getProjectActivity,
        getProjectTasks,
        listProjectWikiPages,
        getProjectWikiPage,
        createProjectWikiPage,
        patchProjectWikiPage,
        deleteProjectWikiPage,
        reorderProjectWikiPages,
        uploadProjectWikiMedia,
    };
}
