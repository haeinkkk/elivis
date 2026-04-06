"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

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

    const t = await getTranslations("workspace.requests");

    try {
        const { res, body } = await fetchApiEnvelope<ApiTaskRequest>(
            `/api/projects/${encodeURIComponent(projectId)}/task-requests`,
            {
                method: "POST",
                body: JSON.stringify(input),
            },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, t("createFail")));
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

    const t = await getTranslations("workspace.requests");

    try {
        const { res, body } = await fetchApiEnvelope<ApiTaskRequest[]>(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/task-requests`,
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, t("listLoadError")));
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

    const t = await getTranslations("workspace.requests");

    try {
        const { res, body } = await fetchApiEnvelope<unknown>(
            `/api/task-requests/${encodeURIComponent(requestId)}/accept`,
            {
                method: "POST",
                body: JSON.stringify({}),
            },
        );
        if (!res.ok) return actionFail(envelopeMessage(body, t("acceptFail")));
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

    const t = await getTranslations("workspace.requests");

    try {
        const { res, body } = await fetchApiEnvelope<unknown>(
            `/api/task-requests/${encodeURIComponent(requestId)}/reject`,
            {
                method: "POST",
                body: JSON.stringify({}),
            },
        );
        if (!res.ok) return actionFail(envelopeMessage(body, t("rejectFail")));
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true };
    } catch {
        return actionServerError();
    }
}
