import "server-only";

import { cookies } from "next/headers";

import type { ApiEnvelope } from "../http/api-envelope";
import { apiUrl } from "../http/api-base-url";
import { AT_COOKIE } from "./auth.server";
import { apiFetchHeaders } from "../http/api-auth-headers.server";
import type { ApiAdminSmtpSettings } from "../mappers/smtp";

export type { ApiAdminSmtpSettings } from "../mappers/smtp";

/** SUPER_ADMIN 전용. 실패 시 null */
export async function fetchAdminSmtpSettings(): Promise<ApiAdminSmtpSettings | null> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return null;

    try {
        const res = await fetch(apiUrl("/api/admin/smtp"), {
            headers: await apiFetchHeaders(),
            cache: "no-store",
        });

        if (!res.ok) return null;

        const body = (await res.json()) as ApiEnvelope<ApiAdminSmtpSettings>;
        const data = body.data;
        if (!data || typeof data !== "object") return null;
        return data;
    } catch {
        return null;
    }
}
