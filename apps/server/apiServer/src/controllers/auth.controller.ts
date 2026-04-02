import bcrypt from "bcryptjs";
import { generatePublicId } from "@repo/database";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { t } from "@repo/i18n";

import {
    generateAccessToken,
    generateRefreshToken,
    revokeAllRefreshTokens,
    revokeRefreshToken,
    rotateTokens,
    verifyRefreshToken,
} from "../services/token.service";
import { clearSetupToken, isSetupModeActive, validateSetupToken } from "../services/setup.service";
import { MSG } from "../utils/messages";
import {
    badRequest,
    conflict,
    created,
    noContent,
    ok,
    serviceUnavailable,
    unauthorized,
} from "../utils/response";

// ─────────────────────────────────────────────────────────────────────────────
// 요청 타입
// ─────────────────────────────────────────────────────────────────────────────

export interface SignupBody {
    email: string;
    password: string;
    name?: string;
    setupToken?: string;
}

export interface LoginBody {
    email: string;
    password: string;
}

export interface RefreshBody {
    refreshToken: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 컨트롤러 팩토리
// ─────────────────────────────────────────────────────────────────────────────

export function createAuthController(app: FastifyInstance) {
    async function signup(request: FastifyRequest<{ Body: SignupBody }>, reply: FastifyReply) {
        const { email, password, name, setupToken } = request.body;
        const lang = request.lang;

        if (!email || !password) {
            return reply.code(400).send(badRequest(t(lang, MSG.AUTH_EMAIL_REQUIRED)));
        }

        const userCount = await app.prisma.user.count();
        const isFirstUser = userCount === 0;

        if (isFirstUser) {
            if (!isSetupModeActive()) {
                return reply.code(503).send(serviceUnavailable(t(lang, MSG.SETUP_TOKEN_EXPIRED)));
            }
            if (!setupToken || !validateSetupToken(setupToken)) {
                return reply.code(401).send(unauthorized(t(lang, MSG.SETUP_TOKEN_INVALID)));
            }
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
                systemRole: isFirstUser ? "SUPER_ADMIN" : "USER",
            },
            select: {
                id: true,
                email: true,
                name: true,
                systemRole: true,
                createdAt: true,
            },
        });

        if (isFirstUser) {
            clearSetupToken();
            app.log.info("SUPER_ADMIN 계정이 생성되었습니다. Setup 토큰이 비활성화됩니다.");
        }

        return reply.code(201).send(created(user, t(lang, MSG.AUTH_SIGNUP)));
    }

    async function login(request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) {
        const { email, password } = request.body;
        const lang = request.lang;

        const user = await app.prisma.user.findUnique({ where: { email } });
        const valid = user && (await bcrypt.compare(password, user.password));

        if (!user || !valid) {
            return reply.code(401).send(unauthorized(t(lang, MSG.AUTH_INVALID_CREDENTIALS)));
        }

        const [accessToken, refreshToken] = await Promise.all([
            generateAccessToken(user.id),
            generateRefreshToken(user.id, app.redis),
        ]);

        return reply.send(
            ok(
                {
                    accessToken,
                    refreshToken,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        systemRole: user.systemRole,
                    },
                },
                t(lang, MSG.AUTH_LOGIN),
            ),
        );
    }

    async function refresh(request: FastifyRequest<{ Body: RefreshBody }>, reply: FastifyReply) {
        const { refreshToken } = request.body;
        const lang = request.lang;

        if (!refreshToken) {
            return reply.code(400).send(badRequest(t(lang, MSG.AUTH_REFRESH_TOKEN_REQUIRED)));
        }

        try {
            const tokens = await rotateTokens(refreshToken, app.redis);
            return reply.send(ok(tokens, t(lang, MSG.AUTH_TOKEN_REFRESHED)));
        } catch {
            return reply.code(401).send(unauthorized(t(lang, MSG.AUTH_REFRESH_TOKEN_INVALID)));
        }
    }

    async function logout(request: FastifyRequest<{ Body: RefreshBody }>, reply: FastifyReply) {
        const { refreshToken } = request.body;
        const lang = request.lang;

        if (!refreshToken) {
            return reply.code(400).send(badRequest(t(lang, MSG.AUTH_REFRESH_TOKEN_REQUIRED)));
        }

        try {
            const payload = await verifyRefreshToken(refreshToken, app.redis);
            await revokeRefreshToken(payload.sub, payload.jti, app.redis);
        } catch {
            // 이미 만료됐어도 로그아웃은 성공으로 처리
        }

        return reply.code(200).send(noContent(t(lang, MSG.AUTH_LOGOUT)));
    }

    async function logoutAll(request: FastifyRequest, reply: FastifyReply) {
        await revokeAllRefreshTokens(request.userId, app.redis);
        return reply.code(200).send(noContent(t(request.lang, MSG.AUTH_LOGOUT_ALL)));
    }

    return { signup, login, refresh, logout, logoutAll };
}
