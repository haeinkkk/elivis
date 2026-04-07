"use server";

import { revalidatePath } from "next/cache";

import {
    actionFail,
    actionNetworkError,
    envelopeMessage,
    fetchApiEnvelope,
    requireActionSession,
} from "@/lib/http/server-action-http";
import type { ApiAdminAuthSettings } from "@/lib/mappers/auth-settings";

export type PatchAdminAuthSettingsPayload = {
    publicSignupEnabled?: boolean;
    ldapEnabled?: boolean;
    ldapUrl?: string;
    ldapUserDnTemplate?: string;
    ldapBindDn?: string;
    ldapBindPassword?: string;
    clearLdapBindPassword?: boolean;
    ldapSearchBase?: string;
    ldapSearchFilter?: string;
    ldapNameAttribute?: string;
    ldapTimeoutMs?: number;
};

function revalidateAuthSettingsPaths() {
    revalidatePath("/admin/security/public-signup");
    revalidatePath("/admin/security/ldap");
    revalidatePath("/login");
    revalidatePath("/signup");
}

export async function patchAdminAuthSettingsAction(
    data: PatchAdminAuthSettingsPayload,
): Promise<{ ok: true; settings: ApiAdminAuthSettings } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiAdminAuthSettings>("/api/admin/auth-settings", {
            method: "PATCH",
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            return actionFail(envelopeMessage(body, "저장에 실패했습니다."));
        }

        revalidateAuthSettingsPaths();
        return { ok: true, settings: body.data };
    } catch {
        return actionNetworkError();
    }
}

export async function testAdminLdapAuthAction(
    email: string,
    password: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<unknown>("/api/admin/auth-settings/ldap-test", {
            method: "POST",
            body: JSON.stringify({ email: email.trim(), password }),
        });

        if (!res.ok) {
            return actionFail(envelopeMessage(body, "테스트에 실패했습니다."));
        }

        return { ok: true };
    } catch {
        return actionNetworkError();
    }
}
