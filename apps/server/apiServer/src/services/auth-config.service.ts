/**
 * 공개 인증 정책
 *
 * - 공개 회원가입: DB `AuthSettings.publicSignupEnabled` (관리자 UI). 행이 없을 때 생성 시에만 `PUBLIC_SIGNUP_ENABLED` 시드.
 * - LDAP: DB `AuthSettings` (관리자 UI). 행이 없을 때 생성 시에만 관련 `LDAP_*` 환경 변수로 시드.
 */

import type { AuthSettings, PrismaClient } from "@prisma/client";

import type { LdapAuthenticateConfig } from "./ldap.service";

const ROW_ID = "default";

function isTruthyEnv(raw: string | undefined): boolean {
    const v = raw?.trim().toLowerCase();
    return v === "true" || v === "1" || v === "yes";
}

function seedLdapFromEnv() {
    return {
        ldapEnabled: isTruthyEnv(process.env.LDAP_ENABLED),
        ldapUrl: process.env.LDAP_URL?.trim() ?? "",
        ldapUserDnTemplate: process.env.LDAP_USER_DN_TEMPLATE?.trim() ?? "",
        ldapBindDn: process.env.LDAP_BIND_DN?.trim() ?? "",
        ldapBindPassword: process.env.LDAP_BIND_PASSWORD ?? "",
        ldapSearchBase: process.env.LDAP_SEARCH_BASE?.trim() ?? "",
        ldapSearchFilter: process.env.LDAP_SEARCH_FILTER?.trim() || "(mail={{email}})",
        ldapNameAttribute: process.env.LDAP_NAME_ATTRIBUTE?.trim() || "cn",
    };
}

export async function getAuthSettingsRow(prisma: PrismaClient) {
    const row = await prisma.authSettings.findUnique({ where: { id: ROW_ID } });
    if (row) return row;
    return prisma.authSettings.create({
        data: {
            id: ROW_ID,
            publicSignupEnabled: isTruthyEnv(process.env.PUBLIC_SIGNUP_ENABLED),
            ...seedLdapFromEnv(),
        },
    });
}

export async function isPublicSignupEnabled(prisma: PrismaClient): Promise<boolean> {
    const row = await getAuthSettingsRow(prisma);
    return row.publicSignupEnabled;
}

/** DB 플래그 (로그인 UI 탭 등). URL·검색 설정이 비어 있으면 실제 바인드는 실패할 수 있음 */
export async function isLdapAuthEnabled(prisma: PrismaClient): Promise<boolean> {
    const row = await getAuthSettingsRow(prisma);
    return row.ldapEnabled;
}

/** 로그인·공개 config용: 켜져 있고 서버 URL이 있어야 LDAP 탭·시도有意義 */
export function isLdapOfferedInPublicUi(row: AuthSettings): boolean {
    return row.ldapEnabled && row.ldapUrl.trim().length > 0;
}

export function buildLdapConfigFromRow(row: AuthSettings): LdapAuthenticateConfig | null {
    if (!row.ldapEnabled) return null;
    const url = row.ldapUrl.trim();
    if (!url) return null;

    const userDnTemplate = row.ldapUserDnTemplate.trim();
    const searchBase = row.ldapSearchBase.trim();
    if (!userDnTemplate && !searchBase) return null;

    const t = row.ldapTimeoutMs;
    const timeoutMs = Number.isInteger(t) && t >= 1000 && t <= 120_000 ? t : 15_000;

    return {
        url,
        userDnTemplate,
        bindDn: row.ldapBindDn.trim(),
        bindPassword: row.ldapBindPassword ?? "",
        searchBase,
        searchFilter: row.ldapSearchFilter.trim() || "(mail={{email}})",
        nameAttribute: row.ldapNameAttribute.trim() || "cn",
        timeoutMs,
    };
}

export async function getLdapRuntimeConfig(prisma: PrismaClient): Promise<LdapAuthenticateConfig | null> {
    const row = await getAuthSettingsRow(prisma);
    return buildLdapConfigFromRow(row);
}

export async function getPublicAuthConfig(prisma: PrismaClient): Promise<{
    publicSignupEnabled: boolean;
    ldapEnabled: boolean;
}> {
    const row = await getAuthSettingsRow(prisma);
    return {
        publicSignupEnabled: row.publicSignupEnabled,
        ldapEnabled: isLdapOfferedInPublicUi(row),
    };
}
