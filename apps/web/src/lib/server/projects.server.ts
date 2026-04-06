import "server-only";

import { cookies } from "next/headers";

import type { ApiEnvelope } from "../http/api-envelope";
import type { ApiProjectDetail, ApiProjectListData, ApiProjectListItem } from "../mappers/project";
import { mapApiProjectToClient } from "../mappers/project";
import type { Project } from "../types/project";
import { apiUrl } from "../http/api-base-url";
import { AT_COOKIE } from "./auth.server";
import { apiFetchHeaders } from "../http/api-auth-headers.server";

export type ProjectListItem = ApiProjectListItem;

export async function fetchProjectsList(input?: {
    q?: string;
    teamIds?: string[];
    take?: number;
    skip?: number;
}): Promise<ApiProjectListData | null> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return null;

    try {
        const params = new URLSearchParams();
        params.set("take", String(input?.take ?? 100));
        params.set("skip", String(input?.skip ?? 0));
        if (input?.teamIds?.length) {
            for (const id of input.teamIds) {
                if (id.trim()) params.append("teamIds", id.trim());
            }
        }
        if (input?.q?.trim()) params.set("q", input.q.trim());

        const res = await fetch(apiUrl(`/api/projects?${params.toString()}`), {
            headers: await apiFetchHeaders(),
            cache: "no-store",
        });
        if (!res.ok) return null;

        const body = (await res.json()) as ApiEnvelope<ApiProjectListData>;
        return body.data;
    } catch {
        return null;
    }
}

export type FetchProjectByIdResult =
    | { ok: true; project: Project }
    | { ok: false; reason: "unauthorized" | "not_found" | "forbidden" | "error" };

/**
 * 팀 상세(`fetchTeamById`)와 같이 서버에서 API 조회 → RSC가 클라이언트로 전달.
 * Server Action 직렬화를 거치지 않아 멤버 `avatarUrl` 등 중첩 필드가 그대로 유지됩니다.
 */
export async function fetchProjectById(projectId: string): Promise<FetchProjectByIdResult> {
    const jar = await cookies();
    const token = jar.get(AT_COOKIE)?.value?.trim();
    if (!token) {
        return { ok: false, reason: "unauthorized" };
    }

    const trimmed = projectId?.trim();
    if (!trimmed) {
        return { ok: false, reason: "not_found" };
    }

    try {
        const res = await fetch(apiUrl(`/api/projects/${encodeURIComponent(trimmed)}`), {
            headers: await apiFetchHeaders(),
            cache: "no-store",
        });

        if (res.status === 401) {
            return { ok: false, reason: "unauthorized" };
        }
        if (res.status === 404) {
            return { ok: false, reason: "not_found" };
        }
        if (res.status === 403) {
            return { ok: false, reason: "forbidden" };
        }

        let body: ApiEnvelope<ApiProjectDetail> | null = null;
        try {
            body = (await res.json()) as ApiEnvelope<ApiProjectDetail>;
        } catch {
            return { ok: false, reason: "error" };
        }

        if (!res.ok || body.data == null) {
            return { ok: false, reason: "error" };
        }

        return { ok: true, project: mapApiProjectToClient(body.data) };
    } catch {
        return { ok: false, reason: "error" };
    }
}
