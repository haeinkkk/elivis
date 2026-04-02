import "server-only";

import { cookies } from "next/headers";

import type { ApiEnvelope } from "./api-envelope";
import type {
    ApiWorkspaceDetail,
    ApiWorkspaceListItem,
    ApiWorkspacePriority,
    ApiWorkspaceStatus,
    ApiWorkspaceTask,
} from "./map-api-workspace";
import { apiUrl } from "./api";
import { AT_COOKIE } from "./auth.server";
import { apiFetchHeaders } from "./fetch-api-headers.server";

/** GET /api/workspaces — 내 워크스페이스 목록 */
export async function fetchWorkspaceList(): Promise<ApiWorkspaceListItem[] | null> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return null;

    try {
        const res = await fetch(apiUrl("/api/workspaces"), {
            headers: await apiFetchHeaders(),
            cache: "no-store",
        });
        if (!res.ok) return null;

        const body = (await res.json()) as ApiEnvelope<ApiWorkspaceListItem[]>;
        return body.data;
    } catch {
        return null;
    }
}

export type FetchWorkspaceResult =
    | { ok: true; workspace: ApiWorkspaceDetail }
    | { ok: false; reason: "unauthorized" | "not_found" | "forbidden" | "error" };

/** GET /api/workspaces/:workspaceId — 워크스페이스 상세 */
export async function fetchWorkspaceById(workspaceId: string): Promise<FetchWorkspaceResult> {
    const jar = await cookies();
    const token = jar.get(AT_COOKIE)?.value?.trim();
    if (!token) return { ok: false, reason: "unauthorized" };

    const trimmed = workspaceId?.trim();
    if (!trimmed) return { ok: false, reason: "not_found" };

    try {
        const res = await fetch(apiUrl(`/api/workspaces/${encodeURIComponent(trimmed)}`), {
            headers: await apiFetchHeaders(),
            cache: "no-store",
        });

        if (res.status === 401) return { ok: false, reason: "unauthorized" };
        if (res.status === 404) return { ok: false, reason: "not_found" };
        if (res.status === 403) return { ok: false, reason: "forbidden" };

        let body: ApiEnvelope<ApiWorkspaceDetail> | null = null;
        try {
            body = (await res.json()) as ApiEnvelope<ApiWorkspaceDetail>;
        } catch {
            return { ok: false, reason: "error" };
        }

        if (!res.ok || body.data == null) return { ok: false, reason: "error" };
        return { ok: true, workspace: body.data };
    } catch {
        return { ok: false, reason: "error" };
    }
}

/** GET /api/workspaces/:workspaceId/priorities — 우선순위 목록 */
export async function fetchWorkspacePriorities(
    workspaceId: string,
): Promise<ApiWorkspacePriority[] | null> {
    try {
        const res = await fetch(
            apiUrl(`/api/workspaces/${encodeURIComponent(workspaceId)}/priorities`),
            { headers: await apiFetchHeaders(), cache: "no-store" },
        );
        if (!res.ok) return null;
        const body = (await res.json()) as ApiEnvelope<ApiWorkspacePriority[]>;
        return body.data;
    } catch {
        return null;
    }
}

/** GET /api/workspaces/:workspaceId/statuses — 상태 목록 */
export async function fetchWorkspaceStatuses(
    workspaceId: string,
): Promise<ApiWorkspaceStatus[] | null> {
    try {
        const res = await fetch(
            apiUrl(`/api/workspaces/${encodeURIComponent(workspaceId)}/statuses`),
            {
                headers: await apiFetchHeaders(),
                cache: "no-store",
            },
        );
        if (!res.ok) return null;

        const body = (await res.json()) as ApiEnvelope<ApiWorkspaceStatus[]>;
        return body.data;
    } catch {
        return null;
    }
}

/** GET /api/workspaces/:workspaceId/tasks — 업무 목록 */
export async function fetchWorkspaceTasks(
    workspaceId: string,
): Promise<ApiWorkspaceTask[] | null> {
    try {
        const res = await fetch(
            apiUrl(`/api/workspaces/${encodeURIComponent(workspaceId)}/tasks`),
            {
                headers: await apiFetchHeaders(),
                cache: "no-store",
            },
        );
        if (!res.ok) return null;

        const body = (await res.json()) as ApiEnvelope<ApiWorkspaceTask[]>;
        return body.data;
    } catch {
        return null;
    }
}
