import { randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import { generatePublicId } from "@repo/database";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { t } from "@repo/i18n";

import {
    getLdapRuntimeConfig,
    getPublicAuthConfig,
    isLdapAuthEnabled,
    isPublicSignupEnabled,
} from "../services/auth-config.service";
import { authenticateLdap } from "../services/ldap.service";
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
    forbidden,
    forbiddenAccessBlocked,
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
    /**
     * 생략 또는 `auto`: 기존과 동일(LDAP이 켜져 있으면 LDAP 우선 시도 후 로컬).
     * `local` / `ldap`: 각 탭 전용(해당 방식만 시도).
     */
    mode?: "auto" | "local" | "ldap";
}

export interface RefreshBody {
    refreshToken: string;
}

const loginUserSelect = {
    id: true,
    email: true,
    name: true,
    systemRole: true,
    password: true,
    authProvider: true,
    accessBlocked: true,
    accessBlockReason: true,
} as const;

type LoginUserRow = {
    id: string;
    email: string;
    name: string | null;
    systemRole: "SUPER_ADMIN" | "USER";
    password: string;
    authProvider: "LOCAL" | "LDAP";
    accessBlocked: boolean;
    accessBlockReason: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// 컨트롤러 팩토리
// ─────────────────────────────────────────────────────────────────────────────

export function createAuthController(app: FastifyInstance) {
    function publicUser(u: Pick<LoginUserRow, "id" | "email" | "name" | "systemRole">) {
        return {
            id: u.id,
            email: u.email,
            name: u.name,
            systemRole: u.systemRole,
        };
    }

    async function sendTokenLogin(
        reply: FastifyReply,
        lang: string,
        user: LoginUserRow,
    ): Promise<FastifyReply> {
        if (user.accessBlocked) {
            return reply.code(403).send(
                forbiddenAccessBlocked(t(lang, MSG.AUTH_ACCESS_BLOCKED), user.accessBlockReason),
            );
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
                    user: publicUser(user),
                },
                t(lang, MSG.AUTH_LOGIN),
            ),
        );
    }

    async function getAuthConfig(request: FastifyRequest, reply: FastifyReply) {
        const cfg = await getPublicAuthConfig(app.prisma);
        return reply.send(ok(cfg, t(request.lang, MSG.AUTH_CONFIG_FETCHED)));
    }

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
        } else if (!(await isPublicSignupEnabled(app.prisma))) {
            return reply.code(403).send(forbidden(t(lang, MSG.AUTH_SIGNUP_DISABLED)));
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
                authProvider: "LOCAL",
                systemRole: isFirstUser ? "SUPER_ADMIN" : "USER",
            },
            select: loginUserSelect,
        });

        if (isFirstUser) {
            clearSetupToken();
            app.log.info("SUPER_ADMIN 계정이 생성되었습니다. Setup 토큰이 비활성화됩니다.");
        }

        const [accessToken, refreshToken] = await Promise.all([
            generateAccessToken(user.id),
            generateRefreshToken(user.id, app.redis),
        ]);

        return reply.code(201).send(
            created(
                {
                    accessToken,
                    refreshToken,
                    user: publicUser(user),
                },
                t(lang, MSG.AUTH_SIGNUP),
            ),
        );
    }

    async function login(request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) {
        const { email, password, mode: rawMode } = request.body;
        const lang = request.lang;
        const mode: "auto" | "local" | "ldap" =
            rawMode === "local" || rawMode === "ldap" || rawMode === "auto" ? rawMode : "auto";

        const user = await app.prisma.user.findUnique({
            where: { email },
            select: loginUserSelect,
        });

        const ldapCfg = await getLdapRuntimeConfig(app.prisma);
        const ldapFlagOn = await isLdapAuthEnabled(app.prisma);

        async function finishLdapLogin(ldapOk: { displayName: string | null }): Promise<FastifyReply> {
            if (user?.authProvider === "LOCAL") {
                const msg =
                    mode === "ldap"
                        ? t(lang, MSG.AUTH_USE_LOCAL_TAB)
                        : t(lang, MSG.AUTH_INVALID_CREDENTIALS);
                return reply.code(401).send(unauthorized(msg));
            }

            let effective: LoginUserRow;

            if (!user) {
                const placeholder = await bcrypt.hash(randomBytes(48).toString("hex"), 12);
                effective = await app.prisma.user.create({
                    data: {
                        id: generatePublicId(),
                        email,
                        password: placeholder,
                        name: ldapOk.displayName ?? null,
                        authProvider: "LDAP",
                        systemRole: "USER",
                    },
                    select: loginUserSelect,
                });
            } else {
                const namePatch =
                    ldapOk.displayName && ldapOk.displayName !== user.name ? { name: ldapOk.displayName } : {};
                effective =
                    Object.keys(namePatch).length > 0
                        ? await app.prisma.user.update({
                              where: { id: user.id },
                              data: namePatch,
                              select: loginUserSelect,
                          })
                        : user;
            }

            return sendTokenLogin(reply, lang, effective);
        }

        if (mode === "ldap") {
            if (!ldapFlagOn) {
                return reply.code(400).send(badRequest(t(lang, MSG.AUTH_LDAP_MODE_DISABLED)));
            }
            if (!ldapCfg) {
                return reply.code(400).send(badRequest(t(lang, MSG.AUTH_LDAP_NOT_CONFIGURED)));
            }
            const ldapOk = await authenticateLdap(email, password, ldapCfg);
            if (ldapOk) {
                return finishLdapLogin(ldapOk);
            }
            if (user?.authProvider === "LOCAL") {
                return reply.code(401).send(unauthorized(t(lang, MSG.AUTH_USE_LOCAL_TAB)));
            }
            return reply.code(401).send(unauthorized(t(lang, MSG.AUTH_INVALID_CREDENTIALS)));
        }

        if (mode === "local") {
            if (user?.authProvider === "LDAP") {
                if (!ldapFlagOn) {
                    return reply.code(401).send(unauthorized(t(lang, MSG.AUTH_LDAP_DISABLED)));
                }
                return reply.code(401).send(unauthorized(t(lang, MSG.AUTH_USE_LDAP_TAB)));
            }

            const valid = user && (await bcrypt.compare(password, user.password));

            if (!user || !valid) {
                return reply.code(401).send(unauthorized(t(lang, MSG.AUTH_INVALID_CREDENTIALS)));
            }

            return sendTokenLogin(reply, lang, user);
        }

        // mode === "auto" (기본·하위 호환)
        if (ldapCfg) {
            const ldapOk = await authenticateLdap(email, password, ldapCfg);
            if (ldapOk) {
                return finishLdapLogin(ldapOk);
            }
        }

        if (user?.authProvider === "LDAP") {
            if (!ldapFlagOn) {
                return reply.code(401).send(unauthorized(t(lang, MSG.AUTH_LDAP_DISABLED)));
            }
            return reply.code(401).send(unauthorized(t(lang, MSG.AUTH_INVALID_CREDENTIALS)));
        }

        const valid = user && (await bcrypt.compare(password, user.password));

        if (!user || !valid) {
            return reply.code(401).send(unauthorized(t(lang, MSG.AUTH_INVALID_CREDENTIALS)));
        }

        return sendTokenLogin(reply, lang, user);
    }

    async function refresh(request: FastifyRequest<{ Body: RefreshBody }>, reply: FastifyReply) {
        const { refreshToken } = request.body;
        const lang = request.lang;

        if (!refreshToken) {
            return reply.code(400).send(badRequest(t(lang, MSG.AUTH_REFRESH_TOKEN_REQUIRED)));
        }

        try {
            const payload = await verifyRefreshToken(refreshToken, app.redis);
            const row = await app.prisma.user.findUnique({
                where: { id: payload.sub },
                select: { accessBlocked: true, accessBlockReason: true },
            });
            if (!row) {
                await revokeRefreshToken(payload.sub, payload.jti, app.redis);
                return reply.code(401).send(unauthorized(t(lang, MSG.AUTH_REFRESH_TOKEN_INVALID)));
            }
            if (row.accessBlocked) {
                await revokeRefreshToken(payload.sub, payload.jti, app.redis);
                return reply.code(403).send(
                    forbiddenAccessBlocked(t(lang, MSG.AUTH_ACCESS_BLOCKED), row.accessBlockReason),
                );
            }

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

    return { getAuthConfig, signup, login, refresh, logout, logoutAll };
}
