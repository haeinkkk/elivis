"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";
import type { ApiEnvelope } from "@/lib/api-envelope";
import { AT_COOKIE } from "@/lib/auth.server";
import { apiFetchHeaders } from "@/lib/fetch-api-headers.server";
import type { ApiTaskRequest } from "@/lib/map-api-workspace";

// ─────────────────────────────────────────────────────────────────────────────
// 업무 요청 생성
// ─────────────────────────────────────────────────────────────────────────────

export async function createTaskRequestAction(
    projectId: string,
    input: {
        toUserId: string;
        title: string;
        content?: string;
        isUrgent?: boolean;
    },
): Promise<{ ok: true; request: ApiTaskRequest } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return { ok: false, message: "로그인이 필요합니다." };

    try {
        const res = await fetch(
            apiUrl(`/api/projects/${encodeURIComponent(projectId)}/task-requests`),
            {
                method: "POST",
                headers: await apiFetchHeaders(),
                body: JSON.stringify(input),
            },
        );
        const body = (await res.json()) as ApiEnvelope<ApiTaskRequest>;
        if (!res.ok) return { ok: false, message: body.message ?? "업무 요청에 실패했습니다." };
        return { ok: true, request: body.data };
    } catch {
        return { ok: false, message: "서버 오류가 발생했습니다." };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 업무 요청 목록 조회
// ─────────────────────────────────────────────────────────────────────────────

export async function listTaskRequestsAction(
    workspaceId: string,
): Promise<{ ok: true; requests: ApiTaskRequest[] } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return { ok: false, message: "로그인이 필요합니다." };

    try {
        const res = await fetch(
            apiUrl(`/api/workspaces/${encodeURIComponent(workspaceId)}/task-requests`),
            {
                headers: await apiFetchHeaders(),
                cache: "no-store",
            },
        );
        const body = (await res.json()) as ApiEnvelope<ApiTaskRequest[]>;
        if (!res.ok)
            return { ok: false, message: body.message ?? "목록을 불러오는데 실패했습니다." };
        return { ok: true, requests: body.data };
    } catch {
        return { ok: false, message: "서버 오류가 발생했습니다." };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 업무 요청 수락
// ─────────────────────────────────────────────────────────────────────────────

export async function acceptTaskRequestAction(
    requestId: string,
    workspaceId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return { ok: false, message: "로그인이 필요합니다." };

    try {
        const res = await fetch(
            apiUrl(`/api/task-requests/${encodeURIComponent(requestId)}/accept`),
            {
                method: "POST",
                headers: await apiFetchHeaders(),
                body: JSON.stringify({}),
            },
        );
        const body = (await res.json()) as ApiEnvelope<unknown>;
        if (!res.ok) return { ok: false, message: body.message ?? "수락에 실패했습니다." };
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true };
    } catch {
        return { ok: false, message: "서버 오류가 발생했습니다." };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 업무 요청 거절
// ─────────────────────────────────────────────────────────────────────────────

export async function rejectTaskRequestAction(
    requestId: string,
    workspaceId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return { ok: false, message: "로그인이 필요합니다." };

    try {
        const res = await fetch(
            apiUrl(`/api/task-requests/${encodeURIComponent(requestId)}/reject`),
            {
                method: "POST",
                headers: await apiFetchHeaders(),
                body: JSON.stringify({}),
            },
        );
        const body = (await res.json()) as ApiEnvelope<unknown>;
        if (!res.ok) return { ok: false, message: body.message ?? "거절에 실패했습니다." };
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true };
    } catch {
        return { ok: false, message: "서버 오류가 발생했습니다." };
    }
}
