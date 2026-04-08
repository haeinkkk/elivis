import "server-only";

import { cookies } from "next/headers";

import type { ApiEnvelope } from "../http/api-envelope";
import type { QuickSearchResult } from "@repo/ui";
import { apiUrl } from "../http/api-base-url";
import { AT_COOKIE } from "./auth.server";
import { apiFetchHeaders } from "../http/api-auth-headers.server";

const SEARCH_PAGE_TAKE = 50;

/** GET /api/search/quick — 전체 검색 결과 페이지용 */
export async function fetchSearchQuick(q: string): Promise<QuickSearchResult | null> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return null;

    const trimmed = q.trim();
    if (trimmed.length < 1) {
        return { teams: [], projects: [], tasks: [] };
    }

    try {
        const params = new URLSearchParams({ q: trimmed, take: String(SEARCH_PAGE_TAKE) });
        const res = await fetch(apiUrl(`/api/search/quick?${params.toString()}`), {
            headers: await apiFetchHeaders(),
            cache: "no-store",
        });

        if (!res.ok) return null;

        const body = (await res.json()) as ApiEnvelope<QuickSearchResult | Record<string, unknown>>;
        const d = body.data;
        if (!d || typeof d !== "object") return null;

        return {
            teams: Array.isArray((d as QuickSearchResult).teams) ? (d as QuickSearchResult).teams : [],
            projects: Array.isArray((d as QuickSearchResult).projects)
                ? (d as QuickSearchResult).projects
                : [],
            tasks: Array.isArray((d as QuickSearchResult).tasks) ? (d as QuickSearchResult).tasks : [],
        };
    } catch {
        return null;
    }
}
