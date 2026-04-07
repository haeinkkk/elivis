import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { t } from "@repo/i18n";

import { checkProjectPermission, isSuperAdmin } from "@repo/database";
import { MSG } from "../utils/messages";
import { forbidden, forbiddenAccessBlocked, unauthorized } from "../utils/response";

// ─────────────────────────────────────────────────────────────────────────────
// 요청 컨텍스트 타입 확장
// ─────────────────────────────────────────────────────────────────────────────

declare module "fastify" {
    interface FastifyRequest {
        /** 인증된 유저 ID — authenticateUser 미들웨어 실행 이후 세팅됨 */
        userId: string;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

function extractBearerToken(request: FastifyRequest): string | null {
    const auth = request.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return null;
    return auth.slice(7).trim() || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 미들웨어 (preHandler)
// ─────────────────────────────────────────────────────────────────────────────

export async function authenticateUser(
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<void> {
    const token = extractBearerToken(request);
    if (!token) {
        return reply.code(401).send(unauthorized(t(request.lang, MSG.AUTH_TOKEN_MISSING)));
    }

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error("JWT_ACCESS_SECRET 환경변수가 설정되지 않았습니다.");

    try {
        const payload = jwt.verify(token, secret) as { sub: string; type: string };
        if (payload.type !== "access") {
            return reply.code(401).send(unauthorized(t(request.lang, MSG.AUTH_TOKEN_WRONG_TYPE)));
        }

        const row = await request.server.prisma.user.findUnique({
            where: { id: payload.sub },
            select: { accessBlocked: true, accessBlockReason: true },
        });
        if (!row) {
            return reply.code(401).send(unauthorized(t(request.lang, MSG.AUTH_TOKEN_INVALID)));
        }
        if (row.accessBlocked) {
            return reply.code(403).send(
                forbiddenAccessBlocked(t(request.lang, MSG.AUTH_ACCESS_BLOCKED), row.accessBlockReason),
            );
        }

        request.userId = payload.sub;
    } catch {
        return reply.code(401).send(unauthorized(t(request.lang, MSG.AUTH_TOKEN_INVALID)));
    }
}

export async function authenticateAdmin(
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<void> {
    const admin = await isSuperAdmin(request.userId);
    if (!admin) {
        return reply.code(403).send(forbidden(t(request.lang, MSG.FORBIDDEN_ADMIN_ONLY)));
    }
}

export async function authenticateProjectManager(
    request: FastifyRequest<{ Params: { projectId: string } }>,
    reply: FastifyReply,
): Promise<void> {
    const { projectId } = request.params;
    const perm = await checkProjectPermission(request.userId, projectId);

    if (!perm.isMember) {
        return reply.code(403).send(forbidden(t(request.lang, MSG.FORBIDDEN_NOT_MEMBER)));
    }
    if (!perm.isManager) {
        return reply.code(403).send(forbidden(t(request.lang, MSG.FORBIDDEN_MANAGER_ONLY)));
    }
}

export async function authenticateProjectMember(
    request: FastifyRequest<{ Params: { projectId: string } }>,
    reply: FastifyReply,
): Promise<void> {
    const { projectId } = request.params;
    const perm = await checkProjectPermission(request.userId, projectId);

    if (!perm.isMember) {
        return reply.code(403).send(forbidden(t(request.lang, MSG.FORBIDDEN_NOT_MEMBER)));
    }
}
