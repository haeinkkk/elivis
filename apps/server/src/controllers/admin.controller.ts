import bcrypt from "bcryptjs";
import { generatePublicId } from "@repo/database";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { t } from "@repo/i18n";

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

export interface UpdateUserBody {
    name?: string;
    systemRole?: "SUPER_ADMIN" | "USER";
    password?: string;
}

export function createAdminController(app: FastifyInstance) {
    async function listUsers(request: FastifyRequest, reply: FastifyReply) {
        const users = await app.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                systemRole: true,
                createdAt: true,
                _count: { select: { memberships: true } },
                memberships: {
                    select: {
                        project: { select: { name: true } },
                    },
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
            data: { id: generatePublicId(), email, password: hashed, name, systemRole },
            select: {
                id: true,
                email: true,
                name: true,
                systemRole: true,
                createdAt: true,
                _count: { select: { memberships: true } },
                memberships: {
                    select: {
                        project: { select: { name: true } },
                    },
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
                createdAt: true,
                memberships: {
                    select: {
                        role: true,
                        joinedAt: true,
                        project: { select: { id: true, name: true, description: true } },
                    },
                    orderBy: { joinedAt: "desc" },
                },
                _count: { select: { memberships: true } },
            },
        });

        if (!user) {
            return reply.code(404).send(notFound(t(request.lang, MSG.ADMIN_USER_NOT_FOUND)));
        }

        return reply.send(ok(user, t(request.lang, MSG.ADMIN_USER_FETCHED)));
    }

    async function updateUser(
        request: FastifyRequest<{ Params: UserParams; Body: UpdateUserBody }>,
        reply: FastifyReply,
    ) {
        const { userId } = request.params;
        const { name, systemRole, password } = request.body;
        const lang = request.lang;

        const exists = await app.prisma.user.findUnique({ where: { id: userId } });
        if (!exists) {
            return reply.code(404).send(notFound(t(lang, MSG.ADMIN_USER_NOT_FOUND)));
        }

        const data: Record<string, unknown> = {};
        if (name !== undefined) data.name = name;
        if (systemRole !== undefined) data.systemRole = systemRole;
        if (password) data.password = await bcrypt.hash(password, 12);

        const updated = await app.prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                email: true,
                name: true,
                systemRole: true,
                createdAt: true,
                _count: { select: { memberships: true } },
                memberships: {
                    select: {
                        project: { select: { name: true } },
                    },
                },
            },
        });

        return reply.send(ok(updated, t(lang, MSG.ADMIN_USER_UPDATED)));
    }

    return { listUsers, createUser, getUser, updateUser, updateUserRole };
}
