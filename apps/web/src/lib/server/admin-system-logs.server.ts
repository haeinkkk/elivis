import "server-only";

import { cookies } from "next/headers";

import type { ApiEnvelope } from "../http/api-envelope";
import type { ApiSystemLogsPayload } from "../mappers/system-logs";
import { apiUrl } from "../http/api-base-url";
import { AT_COOKIE } from "./auth.server";
import { apiFetchHeaders } from "../http/api-auth-headers.server";

export type { ApiSystemLogsPayload } from "../mappers/system-logs";

export async function fetchAdminSystemLogs(query: {
    file?: string;
    limit?: number;
    levelMin?: string;
    search?: string;
}): Promise<ApiSystemLogsPayload | null> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return null;

    const params = new URLSearchParams();
    if (query.file) params.set("file", query.file);
    if (query.limit != null) params.set("limit", String(query.limit));
    if (query.levelMin) params.set("levelMin", query.levelMin);
    if (query.search) params.set("search", query.search);

    const qs = params.toString();
    const path = qs ? `/api/admin/system-logs?${qs}` : "/api/admin/system-logs";

    try {
        const res = await fetch(apiUrl(path), {
            headers: await apiFetchHeaders(),
            cache: "no-store",
        });

        if (!res.ok) return null;

        const body = (await res.json()) as ApiEnvelope<ApiSystemLogsPayload>;
        const data = body.data;
        if (!data || typeof data !== "object") return null;
        return data;
    } catch {
        return null;
    }
}
