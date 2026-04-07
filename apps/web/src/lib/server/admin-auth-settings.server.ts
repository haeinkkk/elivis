import "server-only";

import { cookies } from "next/headers";

import type { ApiEnvelope } from "../http/api-envelope";
import type { ApiAdminAuthSettings, ApiAdminAuthSettingsLdap } from "../mappers/auth-settings";
import { apiUrl } from "../http/api-base-url";
import { AT_COOKIE } from "./auth.server";
import { apiFetchHeaders } from "../http/api-auth-headers.server";

export type { ApiAdminAuthSettings } from "../mappers/auth-settings";

function parseLdap(raw: unknown): ApiAdminAuthSettingsLdap | null {
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    return {
        enabled: Boolean(o.enabled),
        url: String(o.url ?? ""),
        userDnTemplate: String(o.userDnTemplate ?? ""),
        bindDn: String(o.bindDn ?? ""),
        hasBindPassword: Boolean(o.hasBindPassword),
        searchBase: String(o.searchBase ?? ""),
        searchFilter: String(o.searchFilter ?? ""),
        nameAttribute: String(o.nameAttribute ?? ""),
        timeoutMs: Number.isFinite(Number(o.timeoutMs)) ? Number(o.timeoutMs) : 15000,
    };
}

export async function fetchAdminAuthSettings(): Promise<ApiAdminAuthSettings | null> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return null;

    try {
        const res = await fetch(apiUrl("/api/admin/auth-settings"), {
            headers: await apiFetchHeaders(),
            cache: "no-store",
        });
        if (!res.ok) return null;
        const body = (await res.json()) as ApiEnvelope<ApiAdminAuthSettings>;
        const d = body.data;
        if (!d || typeof d !== "object") return null;
        const ldap = parseLdap((d as Record<string, unknown>).ldap);
        if (!ldap) return null;
        return {
            publicSignupEnabled: Boolean((d as Record<string, unknown>).publicSignupEnabled),
            updatedAt: String((d as Record<string, unknown>).updatedAt ?? ""),
            ldap,
        };
    } catch {
        return null;
    }
}
