"use server";

import { revalidatePath } from "next/cache";

import type {
    ApiWorkspacePriority,
    ApiWorkspaceStatus,
    ApiWorkspaceTask,
    ApiWorkspaceTaskComment,
    ApiWorkspaceTaskAttachment,
    ApiWorkspaceTaskNote,
} from "@/lib/mappers/workspace";
import {
    actionFail,
    actionServerError,
    apiFetchAuthenticated,
    apiFetchHeadersWithoutContentType,
    envelopeMessage,
    fetchApiEnvelope,
    readApiEnvelope,
    requireActionSession,
} from "@/lib/http/server-action-http";

// ─── 상태 (WorkspaceStatus) ───────────────────────────────────────────────────

export async function createWorkspaceStatusAction(
    workspaceId: string,
    input: { name: string; color?: string; notifyOnChange?: boolean },
): Promise<{ ok: true; status: ApiWorkspaceStatus } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiWorkspaceStatus>(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/statuses`,
            {
                method: "POST",
                body: JSON.stringify(input),
            },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "상태 추가에 실패했습니다."));
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true, status: body.data };
    } catch {
        return actionServerError();
    }
}

export async function updateWorkspaceStatusAction(
    workspaceId: string,
    statusId: string,
    input: { name?: string; color?: string; notifyOnChange?: boolean },
): Promise<{ ok: true; status: ApiWorkspaceStatus } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiWorkspaceStatus>(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/statuses/${encodeURIComponent(statusId)}`,
            {
                method: "PATCH",
                body: JSON.stringify(input),
            },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "상태 수정에 실패했습니다."));
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true, status: body.data };
    } catch {
        return actionServerError();
    }
}

export async function deleteWorkspaceStatusAction(
    workspaceId: string,
    statusId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const headers = await apiFetchHeadersWithoutContentType();
        const { res, body } = await fetchApiEnvelope<null>(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/statuses/${encodeURIComponent(statusId)}`,
            { method: "DELETE", headers },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "상태 삭제에 실패했습니다."));
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true };
    } catch {
        return actionServerError();
    }
}

// ─── 우선순위 (WorkspacePriority) ─────────────────────────────────────────────

export async function createWorkspacePriorityAction(
    workspaceId: string,
    input: { name: string; color?: string; value?: number },
): Promise<{ ok: true; priority: ApiWorkspacePriority } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;
    try {
        const { res, body } = await fetchApiEnvelope<ApiWorkspacePriority>(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/priorities`,
            { method: "POST", body: JSON.stringify(input) },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "우선순위 추가에 실패했습니다."));
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true, priority: body.data };
    } catch {
        return actionServerError();
    }
}

export async function updateWorkspacePriorityAction(
    workspaceId: string,
    priorityId: string,
    input: { name?: string; color?: string; value?: number },
): Promise<{ ok: true; priority: ApiWorkspacePriority } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;
    try {
        const { res, body } = await fetchApiEnvelope<ApiWorkspacePriority>(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/priorities/${encodeURIComponent(priorityId)}`,
            { method: "PATCH", body: JSON.stringify(input) },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "우선순위 수정에 실패했습니다."));
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true, priority: body.data };
    } catch {
        return actionServerError();
    }
}

export async function deleteWorkspacePriorityAction(
    workspaceId: string,
    priorityId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;
    try {
        const headers = await apiFetchHeadersWithoutContentType();
        const { res, body } = await fetchApiEnvelope<null>(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/priorities/${encodeURIComponent(priorityId)}`,
            { method: "DELETE", headers },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "우선순위 삭제에 실패했습니다."));
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true };
    } catch {
        return actionServerError();
    }
}

// ─── 업무 순서 일괄 변경 ──────────────────────────────────────────────────────

export async function reorderWorkspaceTasksAction(
    workspaceId: string,
    items: Array<{ id: string; order: number; statusId?: string }>,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;
    try {
        const { res, body } = await fetchApiEnvelope<null>(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/reorder`,
            { method: "POST", body: JSON.stringify({ items }) },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "순서 변경에 실패했습니다."));
        return { ok: true };
    } catch {
        return actionServerError();
    }
}

// ─── 업무 (WorkspaceTask) ─────────────────────────────────────────────────────

export async function createWorkspaceTaskAction(
    workspaceId: string,
    input: {
        title: string;
        statusId?: string;
        priorityId?: string;
        assigneeId?: string;
        startDate?: string;
        dueDate?: string;
        parentId?: string;
    },
): Promise<{ ok: true; task: ApiWorkspaceTask } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiWorkspaceTask>(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/tasks`,
            {
                method: "POST",
                body: JSON.stringify(input),
            },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "업무 추가에 실패했습니다."));
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true, task: body.data };
    } catch {
        return actionServerError();
    }
}

export async function updateWorkspaceTaskAction(
    workspaceId: string,
    taskId: string,
    input: {
        title?: string;
        description?: string | null;
        statusId?: string;
        priorityId?: string | null;
        assigneeId?: string | null;
        startDate?: string | null;
        dueDate?: string | null;
        order?: number;
    },
): Promise<{ ok: true; task: ApiWorkspaceTask } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiWorkspaceTask>(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}`,
            {
                method: "PATCH",
                body: JSON.stringify(input),
            },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "업무 수정에 실패했습니다."));
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true, task: body.data };
    } catch {
        return actionServerError();
    }
}

export async function deleteWorkspaceTaskAction(
    workspaceId: string,
    taskId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const headers = await apiFetchHeadersWithoutContentType();
        const { res, body } = await fetchApiEnvelope<null>(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}`,
            { method: "DELETE", headers },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "업무 삭제에 실패했습니다."));
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true };
    } catch {
        return actionServerError();
    }
}

// ─── 댓글 ─────────────────────────────────────────────────────────────────────

export async function listTaskCommentsAction(
    workspaceId: string,
    taskId: string,
): Promise<{ ok: true; comments: ApiWorkspaceTaskComment[] } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;
    try {
        const { res, body } = await fetchApiEnvelope<ApiWorkspaceTaskComment[]>(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/comments`,
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "댓글 로드에 실패했습니다."));
        return { ok: true, comments: body.data };
    } catch {
        return actionServerError();
    }
}

export async function createTaskCommentAction(
    workspaceId: string,
    taskId: string,
    content: string,
): Promise<{ ok: true; comment: ApiWorkspaceTaskComment } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;
    try {
        const { res, body } = await fetchApiEnvelope<ApiWorkspaceTaskComment>(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/comments`,
            { method: "POST", body: JSON.stringify({ content }) },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "댓글 등록에 실패했습니다."));
        return { ok: true, comment: body.data };
    } catch {
        return actionServerError();
    }
}

export async function deleteTaskCommentAction(
    workspaceId: string,
    taskId: string,
    commentId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;
    try {
        const headers = await apiFetchHeadersWithoutContentType();
        const { res, body } = await fetchApiEnvelope<null>(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/comments/${encodeURIComponent(commentId)}`,
            { method: "DELETE", headers },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "댓글 삭제에 실패했습니다."));
        return { ok: true };
    } catch {
        return actionServerError();
    }
}

// ─── 첨부파일 ─────────────────────────────────────────────────────────────────

export async function listTaskAttachmentsAction(
    workspaceId: string,
    taskId: string,
): Promise<{ ok: true; attachments: ApiWorkspaceTaskAttachment[] } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;
    try {
        const { res, body } = await fetchApiEnvelope<ApiWorkspaceTaskAttachment[]>(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/attachments`,
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "첨부파일 로드에 실패했습니다."));
        return { ok: true, attachments: body.data };
    } catch {
        return actionServerError();
    }
}

export async function uploadTaskAttachmentAction(
    workspaceId: string,
    taskId: string,
    formData: FormData,
): Promise<{ ok: true; attachment: ApiWorkspaceTaskAttachment } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;
    try {
        const headers = await apiFetchHeadersWithoutContentType();
        const res = await apiFetchAuthenticated(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/attachments`,
            { method: "POST", headers, body: formData },
        );
        const body = await readApiEnvelope<ApiWorkspaceTaskAttachment>(res);
        if (!res.ok)
            return actionFail(envelopeMessage(body, "파일 업로드에 실패했습니다."));
        return { ok: true, attachment: body.data };
    } catch {
        return actionServerError();
    }
}

export async function deleteTaskAttachmentAction(
    workspaceId: string,
    taskId: string,
    attachmentId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;
    try {
        const headers = await apiFetchHeadersWithoutContentType();
        const { res, body } = await fetchApiEnvelope<null>(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/attachments/${encodeURIComponent(attachmentId)}`,
            { method: "DELETE", headers },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "파일 삭제에 실패했습니다."));
        return { ok: true };
    } catch {
        return actionServerError();
    }
}

// ─── 노트 ─────────────────────────────────────────────────────────────────────

export async function listTaskNotesAction(
    workspaceId: string,
    taskId: string,
): Promise<{ ok: true; notes: ApiWorkspaceTaskNote[] } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;
    try {
        const { res, body } = await fetchApiEnvelope<ApiWorkspaceTaskNote[]>(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/notes`,
            { cache: "no-store" },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "노트를 불러오지 못했습니다."));
        return { ok: true, notes: body.data ?? [] };
    } catch {
        return actionServerError();
    }
}

export async function createTaskNoteAction(
    workspaceId: string,
    taskId: string,
    content: string,
): Promise<{ ok: true; note: ApiWorkspaceTaskNote } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;
    try {
        const { res, body } = await fetchApiEnvelope<ApiWorkspaceTaskNote>(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/notes`,
            { method: "POST", body: JSON.stringify({ content }) },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "노트 등록에 실패했습니다."));
        return { ok: true, note: body.data };
    } catch {
        return actionServerError();
    }
}

export async function deleteTaskNoteAction(
    workspaceId: string,
    taskId: string,
    noteId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;
    try {
        const headers = await apiFetchHeadersWithoutContentType();
        const { res, body } = await fetchApiEnvelope<null>(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/notes/${encodeURIComponent(noteId)}`,
            { method: "DELETE", headers },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "노트 삭제에 실패했습니다."));
        return { ok: true };
    } catch {
        return actionServerError();
    }
}

/** PATCH /api/workspaces/:workspaceId — 사이드바 표시 이름 (sidebarLabel) */
export async function updateWorkspaceSidebarLabelAction(
    workspaceId: string,
    sidebarLabel: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;
    try {
        const { res, body } = await fetchApiEnvelope<unknown>(
            `/api/workspaces/${encodeURIComponent(workspaceId)}`,
            {
                method: "PATCH",
                body: JSON.stringify({ sidebarLabel }),
            },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "표시 이름을 저장하지 못했습니다."));
        revalidatePath("/mywork", "layout");
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true };
    } catch {
        return actionServerError();
    }
}
