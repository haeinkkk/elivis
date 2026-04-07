import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { generatePublicId } from "@repo/database";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { t } from "@repo/i18n";

import { revokeAllRefreshTokens } from "../services/token.service";
import { MSG } from "../utils/messages";
import { badRequest, conflict, created, notFound, ok } from "../utils/response";

export interface UserParams {
    userId: string;
}

export interface UpdateRoleParams {
    userId: string;
}

export interface UpdateRoleBody {
    systemRole: "SUPER_ADMIN" | "USER";
}

export interface CreateUserBody {
    email: string;
    password: string;
    name?: string;
    systemRole?: "SUPER_ADMIN" | "USER";
}

const ACCESS_BLOCK_REASON_MAX_LEN = 2000;

export interface UpdateUserBody {
    name?: string;
    systemRole?: "SUPER_ADMIN" | "USER";
    password?: string;
    /** true면 접근 차단 + 모든 기기 refresh 토큰 폐기 */
    accessBlocked?: boolean;
    /** 차단 시 또는 이미 차단된 계정의 사유 수정. 빈 문자열은 null 저장 */
    accessBlockReason?: string | null;
}

function normalizeAccessBlockReason(raw: string | null | undefined): string | null {
    if (raw === undefined || raw === null) return null;
    const s = String(raw).trim();
    return s.length > 0 ? s : null;
}

/** `canAccessProject` / GET projects 목록과 동일 — 연결 팀 팀원이면 공개 프로젝트 접근 */
function adminProjectWhereUserInLinkedTeams(userId: string) {
    return {
        OR: [
            { team: { members: { some: { userId } } } },
            {
                projectTeams: {
                    some: {
                        team: { members: { some: { userId } } },
                    },
                },
            },
        ],
    };
}

/** 관리자 사용자 상세 — 직접 멤버 + 팀 연결만으로 보이는 공개 프로젝트(멤버 행 없음) */
async function fetchAdminUserParticipatingProjects(prisma: PrismaClient, userId: string) {
    const [memberRows, teamPublicRows] = await Promise.all([
        prisma.projectMember.findMany({
            where: { userId },
            select: {
                role: true,
                joinedAt: true,
                project: { select: { id: true, name: true, description: true } },
            },
            orderBy: { joinedAt: "desc" },
        }),
        prisma.project.findMany({
            where: {
                isPublic: true,
                members: { none: { userId } },
                ...adminProjectWhereUserInLinkedTeams(userId),
            },
            select: { id: true, name: true, description: true, createdAt: true },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    const memberProjectIds = new Set(memberRows.map((m) => m.project.id));
    const fromTeamOnly = teamPublicRows.filter((p) => !memberProjectIds.has(p.id));

    const merged = [
        ...memberRows.map((m) => ({
            role: m.role,
            joinedAt: m.joinedAt,
            project: m.project,
            participationSource: "member" as const,
        })),
        ...fromTeamOnly.map((p) => ({
            role: "MEMBER" as const,
            joinedAt: p.createdAt,
            project: {
                id: p.id,
                name: p.name,
                description: p.description,
            },
            participationSource: "team_public" as const,
        })),
    ];

    merged.sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime());
    return merged;
}

export function createAdminController(app: FastifyInstance) {
    async function listUsers(request: FastifyRequest, reply: FastifyReply) {
        const users = await app.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                systemRole: true,
                accessBlocked: true,
                createdAt: true,
                _count: { select: { memberships: true } },
                memberships: {
                    select: {
                        project: { select: { name: true } },
                    },
                },
                teamMemberships: {
                    select: {
                        role: true,
                        team: { select: { id: true, name: true } },
                    },
                    orderBy: { joinedAt: "desc" },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return reply.send(ok(users, t(request.lang, MSG.ADMIN_USERS_FETCHED)));
    }

    async function createUser(
        request: FastifyRequest<{ Body: CreateUserBody }>,
        reply: FastifyReply,
    ) {
        const { email, password, name, systemRole = "USER" } = request.body;
        const lang = request.lang;

        if (!email || !password) {
            return reply.code(400).send(badRequest(t(lang, MSG.AUTH_EMAIL_REQUIRED)));
        }

        const exists = await app.prisma.user.findUnique({ where: { email } });
        if (exists) {
            return reply.code(409).send(conflict(t(lang, MSG.AUTH_EMAIL_CONFLICT)));
        }

        const hashed = await bcrypt.hash(password, 12);
        const user = await app.prisma.user.create({
            data: {
                id: generatePublicId(),
                email,
                password: hashed,
                name,
                systemRole,
                authProvider: "LOCAL",
            },
            select: {
                id: true,
                email: true,
                name: true,
                systemRole: true,
                accessBlocked: true,
                accessBlockReason: true,
                accessBlockedAt: true,
                createdAt: true,
                _count: { select: { memberships: true } },
                memberships: {
                    select: {
                        project: { select: { name: true } },
                    },
                },
                teamMemberships: {
                    select: {
                        role: true,
                        team: { select: { id: true, name: true } },
                    },
                    orderBy: { joinedAt: "desc" },
                },
            },
        });

        return reply.code(201).send(created(user, t(lang, MSG.ADMIN_USER_CREATED)));
    }

    async function updateUserRole(
        request: FastifyRequest<{ Params: UpdateRoleParams; Body: UpdateRoleBody }>,
        reply: FastifyReply,
    ) {
        const { userId } = request.params;
        const { systemRole } = request.body;

        const updated = await app.prisma.user.update({
            where: { id: userId },
            data: { systemRole },
            select: { id: true, email: true, systemRole: true },
        });

        return reply.send(ok(updated, t(request.lang, MSG.ADMIN_USER_ROLE_UPDATED)));
    }

    async function getUser(
        request: FastifyRequest<{ Params: UserParams }>,
        reply: FastifyReply,
    ) {
        const { userId } = request.params;
        const user = await app.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                systemRole: true,
                accessBlocked: true,
                accessBlockReason: true,
                accessBlockedAt: true,
                createdAt: true,
                teamMemberships: {
                    select: {
                        role: true,
                        joinedAt: true,
                        team: {
                            select: { id: true, name: true, shortDescription: true },
                        },
                    },
                    orderBy: { joinedAt: "desc" },
                },
                _count: { select: { memberships: true } },
            },
        });

        if (!user) {
            return reply.code(404).send(notFound(t(request.lang, MSG.ADMIN_USER_NOT_FOUND)));
        }

        const memberships = await fetchAdminUserParticipatingProjects(app.prisma, userId);
        return reply.send(ok({ ...user, memberships }, t(request.lang, MSG.ADMIN_USER_FETCHED)));
    }

    async function updateUser(
        request: FastifyRequest<{ Params: UserParams; Body: UpdateUserBody }>,
        reply: FastifyReply,
    ) {
        const { userId } = request.params;
        const { name, systemRole, password, accessBlocked, accessBlockReason } = request.body;
        const lang = request.lang;

        const exists = await app.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, accessBlocked: true },
        });
        if (!exists) {
            return reply.code(404).send(notFound(t(lang, MSG.ADMIN_USER_NOT_FOUND)));
        }

        if (accessBlockReason !== undefined && accessBlockReason !== null) {
            const len = String(accessBlockReason).trim().length;
            if (len > ACCESS_BLOCK_REASON_MAX_LEN) {
                return reply
                    .code(400)
                    .send(badRequest(t(lang, MSG.ADMIN_USER_BLOCK_REASON_TOO_LONG)));
            }
        }

        if (accessBlocked === true && userId === request.userId) {
            return reply.code(400).send(badRequest(t(lang, MSG.ADMIN_USER_SELF_BLOCK)));
        }

        if (
            accessBlockReason !== undefined &&
            accessBlocked === undefined &&
            !exists.accessBlocked
        ) {
            return reply.code(400).send(badRequest(t(lang, MSG.ADMIN_USER_BLOCK_REASON_NO_BLOCK)));
        }

        const data: Record<string, unknown> = {};
        if (name !== undefined) data.name = name;
        if (systemRole !== undefined) data.systemRole = systemRole;
        if (password) data.password = await bcrypt.hash(password, 12);

        if (accessBlocked === true) {
            data.accessBlocked = true;
            data.accessBlockedAt = new Date();
            if (accessBlockReason !== undefined) {
                data.accessBlockReason = normalizeAccessBlockReason(accessBlockReason);
            }
            await revokeAllRefreshTokens(userId, app.redis);
        }
        if (accessBlocked === false) {
            data.accessBlocked = false;
            data.accessBlockReason = null;
            data.accessBlockedAt = null;
        }
        if (accessBlockReason !== undefined && accessBlocked === undefined && exists.accessBlocked) {
            data.accessBlockReason = normalizeAccessBlockReason(accessBlockReason);
        }

        const updated = await app.prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                email: true,
                name: true,
                systemRole: true,
                accessBlocked: true,
                accessBlockReason: true,
                accessBlockedAt: true,
                createdAt: true,
                _count: { select: { memberships: true } },
                teamMemberships: {
                    select: {
                        role: true,
                        joinedAt: true,
                        team: {
                            select: { id: true, name: true, shortDescription: true },
                        },
                    },
                    orderBy: { joinedAt: "desc" },
                },
            },
        });

        const memberships = await fetchAdminUserParticipatingProjects(app.prisma, userId);
        return reply.send(ok({ ...updated, memberships }, t(lang, MSG.ADMIN_USER_UPDATED)));
    }

    return { listUsers, createUser, getUser, updateUser, updateUserRole };
}
