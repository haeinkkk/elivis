import type { AuthSettings, Prisma } from "@prisma/client";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { t } from "@repo/i18n";

import {
    buildLdapConfigFromRow,
    getAuthSettingsRow,
} from "../services/auth-config.service";
import { authenticateLdap } from "../services/ldap.service";
import { MSG } from "../utils/messages";
import { badRequest, ok } from "../utils/response";

const ROW_ID = "default";

export interface PatchAuthSettingsBody {
    publicSignupEnabled?: boolean;
    ldapEnabled?: boolean;
    ldapUrl?: string;
    ldapUserDnTemplate?: string;
    ldapBindDn?: string;
    /** 비어 있지 않을 때만 적용 */
    ldapBindPassword?: string;
    clearLdapBindPassword?: boolean;
    ldapSearchBase?: string;
    ldapSearchFilter?: string;
    ldapNameAttribute?: string;
    ldapTimeoutMs?: number;
}

export interface LdapTestBody {
    email: string;
    password: string;
}

export type ApiAdminAuthSettingsPublic = {
    publicSignupEnabled: boolean;
    updatedAt: string;
    ldap: {
        enabled: boolean;
        url: string;
        userDnTemplate: string;
        bindDn: string;
        hasBindPassword: boolean;
        searchBase: string;
        searchFilter: string;
        nameAttribute: string;
        timeoutMs: number;
    };
};

function toPublic(row: AuthSettings): ApiAdminAuthSettingsPublic {
    return {
        publicSignupEnabled: row.publicSignupEnabled,
        updatedAt: row.updatedAt.toISOString(),
        ldap: {
            enabled: row.ldapEnabled,
            url: row.ldapUrl,
            userDnTemplate: row.ldapUserDnTemplate,
            bindDn: row.ldapBindDn,
            hasBindPassword: row.ldapBindPassword.length > 0,
            searchBase: row.ldapSearchBase,
            searchFilter: row.ldapSearchFilter,
            nameAttribute: row.ldapNameAttribute,
            timeoutMs: row.ldapTimeoutMs,
        },
    };
}

function mergeAuthPatch(row: AuthSettings, body: PatchAuthSettingsBody): AuthSettings {
    const next = { ...row };
    if (body.publicSignupEnabled !== undefined) next.publicSignupEnabled = Boolean(body.publicSignupEnabled);
    if (body.ldapEnabled !== undefined) next.ldapEnabled = Boolean(body.ldapEnabled);
    if (body.ldapUrl !== undefined) next.ldapUrl = String(body.ldapUrl).trim();
    if (body.ldapUserDnTemplate !== undefined) next.ldapUserDnTemplate = String(body.ldapUserDnTemplate).trim();
    if (body.ldapBindDn !== undefined) next.ldapBindDn = String(body.ldapBindDn).trim();
    if (body.clearLdapBindPassword === true) {
        next.ldapBindPassword = "";
    } else if (typeof body.ldapBindPassword === "string" && body.ldapBindPassword.length > 0) {
        next.ldapBindPassword = body.ldapBindPassword;
    }
    if (body.ldapSearchBase !== undefined) next.ldapSearchBase = String(body.ldapSearchBase).trim();
    if (body.ldapSearchFilter !== undefined) {
        const f = String(body.ldapSearchFilter).trim();
        next.ldapSearchFilter = f || "(mail={{email}})";
    }
    if (body.ldapNameAttribute !== undefined) {
        const a = String(body.ldapNameAttribute).trim();
        next.ldapNameAttribute = a || "cn";
    }
    if (body.ldapTimeoutMs !== undefined) {
        next.ldapTimeoutMs = Number(body.ldapTimeoutMs);
    }
    return next;
}

function validateLdapForEnabled(merged: AuthSettings): (typeof MSG)[keyof typeof MSG] | null {
    if (!merged.ldapEnabled) return null;
    if (!merged.ldapUrl.trim()) return MSG.ADMIN_AUTH_LDAP_INCOMPLETE;

    const template = merged.ldapUserDnTemplate.trim();
    if (!template && !merged.ldapSearchBase.trim()) return MSG.ADMIN_AUTH_LDAP_INCOMPLETE;

    const bindDn = merged.ldapBindDn.trim();
    if (!template && bindDn) {
        const hasPass = merged.ldapBindPassword.length > 0;
        if (!hasPass) return MSG.ADMIN_AUTH_LDAP_BIND_PASSWORD_REQUIRED;
    }

    const tm = merged.ldapTimeoutMs;
    if (!Number.isInteger(tm) || tm < 1000 || tm > 120_000) return MSG.ADMIN_AUTH_LDAP_TIMEOUT_INVALID;

    return null;
}

export function createAdminAuthSettingsController(app: FastifyInstance) {
    async function getAuthSettings(request: FastifyRequest, reply: FastifyReply) {
        const row = await getAuthSettingsRow(app.prisma);
        return reply.send(ok(toPublic(row), t(request.lang, MSG.ADMIN_AUTH_SETTINGS_FETCHED)));
    }

    async function patchAuthSettings(
        request: FastifyRequest<{ Body: PatchAuthSettingsBody }>,
        reply: FastifyReply,
    ) {
        const lang = request.lang;
        const body = request.body ?? {};

        if (Object.keys(body).length === 0) {
            const row = await getAuthSettingsRow(app.prisma);
            return reply.send(ok(toPublic(row), t(lang, MSG.ADMIN_AUTH_SETTINGS_FETCHED)));
        }

        const row = await getAuthSettingsRow(app.prisma);
        const merged = mergeAuthPatch(row, body);

        const ldapTouched =
            body.ldapEnabled !== undefined ||
            body.ldapUrl !== undefined ||
            body.ldapUserDnTemplate !== undefined ||
            body.ldapBindDn !== undefined ||
            body.ldapSearchBase !== undefined ||
            body.ldapSearchFilter !== undefined ||
            body.ldapNameAttribute !== undefined ||
            body.ldapTimeoutMs !== undefined ||
            body.clearLdapBindPassword === true ||
            (typeof body.ldapBindPassword === "string" && body.ldapBindPassword.length > 0);

        if (ldapTouched) {
            const ldapErr = validateLdapForEnabled(merged);
            if (ldapErr) {
                return reply.code(400).send(badRequest(t(lang, ldapErr)));
            }
        }

        const data: Prisma.AuthSettingsUpdateInput = {};

        if (body.publicSignupEnabled !== undefined) data.publicSignupEnabled = merged.publicSignupEnabled;
        if (body.ldapEnabled !== undefined) data.ldapEnabled = merged.ldapEnabled;
        if (body.ldapUrl !== undefined) data.ldapUrl = merged.ldapUrl;
        if (body.ldapUserDnTemplate !== undefined) data.ldapUserDnTemplate = merged.ldapUserDnTemplate;
        if (body.ldapBindDn !== undefined) data.ldapBindDn = merged.ldapBindDn;
        if (body.ldapSearchBase !== undefined) data.ldapSearchBase = merged.ldapSearchBase;
        if (body.ldapSearchFilter !== undefined) data.ldapSearchFilter = merged.ldapSearchFilter;
        if (body.ldapNameAttribute !== undefined) data.ldapNameAttribute = merged.ldapNameAttribute;
        if (body.ldapTimeoutMs !== undefined) data.ldapTimeoutMs = merged.ldapTimeoutMs;

        if (body.clearLdapBindPassword === true) {
            data.ldapBindPassword = "";
        } else if (typeof body.ldapBindPassword === "string" && body.ldapBindPassword.length > 0) {
            data.ldapBindPassword = body.ldapBindPassword;
        }

        const updated =
            Object.keys(data).length > 0
                ? await app.prisma.authSettings.update({
                      where: { id: ROW_ID },
                      data,
                  })
                : row;

        return reply.send(ok(toPublic(updated), t(lang, MSG.ADMIN_AUTH_SETTINGS_UPDATED)));
    }

    async function postLdapTest(request: FastifyRequest<{ Body: LdapTestBody }>, reply: FastifyReply) {
        const lang = request.lang;
        const email = String(request.body?.email ?? "").trim();
        const password = request.body?.password ?? "";
        if (!email || !password) {
            return reply.code(400).send(badRequest(t(lang, MSG.ADMIN_AUTH_LDAP_TEST_EMAIL_REQUIRED)));
        }

        const row = await getAuthSettingsRow(app.prisma);
        const cfg = buildLdapConfigFromRow(row);
        if (!cfg) {
            return reply.code(400).send(badRequest(t(lang, MSG.AUTH_LDAP_NOT_CONFIGURED)));
        }

        const okAuth = await authenticateLdap(email, password, cfg);
        if (!okAuth) {
            return reply.code(400).send(badRequest(t(lang, MSG.ADMIN_AUTH_LDAP_TEST_FAIL)));
        }

        return reply.send(ok({ ok: true }, t(lang, MSG.ADMIN_AUTH_LDAP_TEST_OK)));
    }

    return { getAuthSettings, patchAuthSettings, postLdapTest };
}
