"use server";

import { revalidatePath } from "next/cache";

import type { ApiTaskRequest } from "@/lib/mappers/workspace";
import {
    actionFail,
    actionServerError,
    envelopeMessage,
    fetchApiEnvelope,
    requireActionSession,
} from "@/lib/http/server-action-http";

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
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiTaskRequest>(
            `/api/projects/${encodeURIComponent(projectId)}/task-requests`,
            {
                method: "POST",
                body: JSON.stringify(input),
            },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "업무 요청에 실패했습니다."));
        return { ok: true, request: body.data };
    } catch {
        return actionServerError();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 업무 요청 목록 조회
// ─────────────────────────────────────────────────────────────────────────────

export async function listTaskRequestsAction(
    workspaceId: string,
): Promise<{ ok: true; requests: ApiTaskRequest[] } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiTaskRequest[]>(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/task-requests`,
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "목록을 불러오는데 실패했습니다."));
        return { ok: true, requests: body.data };
    } catch {
        return actionServerError();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 업무 요청 수락
// ─────────────────────────────────────────────────────────────────────────────

export async function acceptTaskRequestAction(
    requestId: string,
    workspaceId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<unknown>(
            `/api/task-requests/${encodeURIComponent(requestId)}/accept`,
            {
                method: "POST",
                body: JSON.stringify({}),
            },
        );
        if (!res.ok) return actionFail(envelopeMessage(body, "수락에 실패했습니다."));
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true };
    } catch {
        return actionServerError();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 업무 요청 거절
// ─────────────────────────────────────────────────────────────────────────────

export async function rejectTaskRequestAction(
    requestId: string,
    workspaceId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<unknown>(
            `/api/task-requests/${encodeURIComponent(requestId)}/reject`,
            {
                method: "POST",
                body: JSON.stringify({}),
            },
        );
        if (!res.ok) return actionFail(envelopeMessage(body, "거절에 실패했습니다."));
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true };
    } catch {
        return actionServerError();
    }
}
