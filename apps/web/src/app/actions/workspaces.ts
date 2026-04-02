"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";
import type { ApiEnvelope } from "@/lib/api-envelope";
import { AT_COOKIE } from "@/lib/auth.server";
import { apiFetchHeaders } from "@/lib/fetch-api-headers.server";
import type {
    ApiWorkspacePriority,
    ApiWorkspaceStatus,
    ApiWorkspaceTask,
    ApiWorkspaceTaskComment,
    ApiWorkspaceTaskAttachment,
} from "@/lib/map-api-workspace";

// ─── 상태 (WorkspaceStatus) ───────────────────────────────────────────────────

export async function createWorkspaceStatusAction(
    workspaceId: string,
    input: { name: string; color?: string },
): Promise<{ ok: true; status: ApiWorkspaceStatus } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return { ok: false, message: "로그인이 필요합니다." };

    try {
        const res = await fetch(
            apiUrl(`/api/workspaces/${encodeURIComponent(workspaceId)}/statuses`),
            {
                method: "POST",
                headers: await apiFetchHeaders(),
                body: JSON.stringify(input),
            },
        );
        const body = (await res.json()) as ApiEnvelope<ApiWorkspaceStatus>;
        if (!res.ok) return { ok: false, message: body.message ?? "상태 추가에 실패했습니다." };
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true, status: body.data };
    } catch {
        return { ok: false, message: "서버 오류가 발생했습니다." };
    }
}

export async function updateWorkspaceStatusAction(
    workspaceId: string,
    statusId: string,
    input: { name?: string; color?: string },
): Promise<{ ok: true; status: ApiWorkspaceStatus } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return { ok: false, message: "로그인이 필요합니다." };

    try {
        const res = await fetch(
            apiUrl(
                `/api/workspaces/${encodeURIComponent(workspaceId)}/statuses/${encodeURIComponent(statusId)}`,
            ),
            {
                method: "PATCH",
                headers: await apiFetchHeaders(),
                body: JSON.stringify(input),
            },
        );
        const body = (await res.json()) as ApiEnvelope<ApiWorkspaceStatus>;
        if (!res.ok) return { ok: false, message: body.message ?? "상태 수정에 실패했습니다." };
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true, status: body.data };
    } catch {
        return { ok: false, message: "서버 오류가 발생했습니다." };
    }
}

export async function deleteWorkspaceStatusAction(
    workspaceId: string,
    statusId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return { ok: false, message: "로그인이 필요합니다." };

    try {
        const baseHeaders = await apiFetchHeaders();
        const { "Content-Type": _ct, ...headersWithoutContentType } = baseHeaders;
        const res = await fetch(
            apiUrl(
                `/api/workspaces/${encodeURIComponent(workspaceId)}/statuses/${encodeURIComponent(statusId)}`,
            ),
            {
                method: "DELETE",
                headers: headersWithoutContentType,
            },
        );
        if (!res.ok) {
            const body = (await res.json()) as ApiEnvelope<null>;
            return { ok: false, message: body.message ?? "상태 삭제에 실패했습니다." };
        }
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true };
    } catch {
        return { ok: false, message: "서버 오류가 발생했습니다." };
    }
}

// ─── 우선순위 (WorkspacePriority) ─────────────────────────────────────────────

export async function createWorkspacePriorityAction(
    workspaceId: string,
    input: { name: string; color?: string; value?: number },
): Promise<{ ok: true; priority: ApiWorkspacePriority } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return { ok: false, message: "로그인이 필요합니다." };
    try {
        const res = await fetch(
            apiUrl(`/api/workspaces/${encodeURIComponent(workspaceId)}/priorities`),
            { method: "POST", headers: await apiFetchHeaders(), body: JSON.stringify(input) },
        );
        const body = (await res.json()) as ApiEnvelope<ApiWorkspacePriority>;
        if (!res.ok) return { ok: false, message: body.message ?? "우선순위 추가에 실패했습니다." };
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true, priority: body.data };
    } catch { return { ok: false, message: "서버 오류가 발생했습니다." }; }
}

export async function updateWorkspacePriorityAction(
    workspaceId: string,
    priorityId: string,
    input: { name?: string; color?: string; value?: number },
): Promise<{ ok: true; priority: ApiWorkspacePriority } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return { ok: false, message: "로그인이 필요합니다." };
    try {
        const res = await fetch(
            apiUrl(`/api/workspaces/${encodeURIComponent(workspaceId)}/priorities/${encodeURIComponent(priorityId)}`),
            { method: "PATCH", headers: await apiFetchHeaders(), body: JSON.stringify(input) },
        );
        const body = (await res.json()) as ApiEnvelope<ApiWorkspacePriority>;
        if (!res.ok) return { ok: false, message: body.message ?? "우선순위 수정에 실패했습니다." };
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true, priority: body.data };
    } catch { return { ok: false, message: "서버 오류가 발생했습니다." }; }
}

export async function deleteWorkspacePriorityAction(
    workspaceId: string,
    priorityId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return { ok: false, message: "로그인이 필요합니다." };
    try {
        const baseHeaders = await apiFetchHeaders();
        const { "Content-Type": _ct, ...h } = baseHeaders;
        const res = await fetch(
            apiUrl(`/api/workspaces/${encodeURIComponent(workspaceId)}/priorities/${encodeURIComponent(priorityId)}`),
            { method: "DELETE", headers: h },
        );
        if (!res.ok) {
            const body = (await res.json()) as ApiEnvelope<null>;
            return { ok: false, message: body.message ?? "우선순위 삭제에 실패했습니다." };
        }
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true };
    } catch { return { ok: false, message: "서버 오류가 발생했습니다." }; }
}

// ─── 업무 순서 일괄 변경 ──────────────────────────────────────────────────────

export async function reorderWorkspaceTasksAction(
    workspaceId: string,
    items: Array<{ id: string; order: number; statusId?: string }>,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return { ok: false, message: "로그인이 필요합니다." };
    try {
        const res = await fetch(
            apiUrl(`/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/reorder`),
            { method: "POST", headers: await apiFetchHeaders(), body: JSON.stringify({ items }) },
        );
        if (!res.ok) {
            const body = (await res.json()) as ApiEnvelope<null>;
            return { ok: false, message: body.message ?? "순서 변경에 실패했습니다." };
        }
        return { ok: true };
    } catch { return { ok: false, message: "서버 오류가 발생했습니다." }; }
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
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return { ok: false, message: "로그인이 필요합니다." };

    try {
        const res = await fetch(
            apiUrl(`/api/workspaces/${encodeURIComponent(workspaceId)}/tasks`),
            {
                method: "POST",
                headers: await apiFetchHeaders(),
                body: JSON.stringify(input),
            },
        );
        const body = (await res.json()) as ApiEnvelope<ApiWorkspaceTask>;
        if (!res.ok) return { ok: false, message: body.message ?? "업무 추가에 실패했습니다." };
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true, task: body.data };
    } catch {
        return { ok: false, message: "서버 오류가 발생했습니다." };
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
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return { ok: false, message: "로그인이 필요합니다." };

    try {
        const res = await fetch(
            apiUrl(
                `/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}`,
            ),
            {
                method: "PATCH",
                headers: await apiFetchHeaders(),
                body: JSON.stringify(input),
            },
        );
        const body = (await res.json()) as ApiEnvelope<ApiWorkspaceTask>;
        if (!res.ok) return { ok: false, message: body.message ?? "업무 수정에 실패했습니다." };
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true, task: body.data };
    } catch {
        return { ok: false, message: "서버 오류가 발생했습니다." };
    }
}

export async function deleteWorkspaceTaskAction(
    workspaceId: string,
    taskId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return { ok: false, message: "로그인이 필요합니다." };

    try {
        const baseHeaders = await apiFetchHeaders();
        const { "Content-Type": _ct, ...headersWithoutContentType } = baseHeaders;
        const res = await fetch(
            apiUrl(
                `/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}`,
            ),
            {
                method: "DELETE",
                headers: headersWithoutContentType,
            },
        );
        if (!res.ok) {
            const body = (await res.json()) as ApiEnvelope<null>;
            return { ok: false, message: body.message ?? "업무 삭제에 실패했습니다." };
        }
        revalidatePath(`/mywork/${workspaceId}`);
        return { ok: true };
    } catch {
        return { ok: false, message: "서버 오류가 발생했습니다." };
    }
}

// ─── 댓글 ─────────────────────────────────────────────────────────────────────

export async function listTaskCommentsAction(
    workspaceId: string,
    taskId: string,
): Promise<{ ok: true; comments: ApiWorkspaceTaskComment[] } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return { ok: false, message: "로그인이 필요합니다." };
    try {
        const res = await fetch(
            apiUrl(`/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/comments`),
            { headers: await apiFetchHeaders() },
        );
        const body = (await res.json()) as ApiEnvelope<ApiWorkspaceTaskComment[]>;
        if (!res.ok) return { ok: false, message: body.message ?? "댓글 로드에 실패했습니다." };
        return { ok: true, comments: body.data };
    } catch {
        return { ok: false, message: "서버 오류가 발생했습니다." };
    }
}

export async function createTaskCommentAction(
    workspaceId: string,
    taskId: string,
    content: string,
): Promise<{ ok: true; comment: ApiWorkspaceTaskComment } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return { ok: false, message: "로그인이 필요합니다." };
    try {
        const res = await fetch(
            apiUrl(`/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/comments`),
            { method: "POST", headers: await apiFetchHeaders(), body: JSON.stringify({ content }) },
        );
        const body = (await res.json()) as ApiEnvelope<ApiWorkspaceTaskComment>;
        if (!res.ok) return { ok: false, message: body.message ?? "댓글 등록에 실패했습니다." };
        return { ok: true, comment: body.data };
    } catch {
        return { ok: false, message: "서버 오류가 발생했습니다." };
    }
}

export async function deleteTaskCommentAction(
    workspaceId: string,
    taskId: string,
    commentId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return { ok: false, message: "로그인이 필요합니다." };
    try {
        const baseHeaders = await apiFetchHeaders();
        const { "Content-Type": _ct, ...h } = baseHeaders;
        const res = await fetch(
            apiUrl(`/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/comments/${encodeURIComponent(commentId)}`),
            { method: "DELETE", headers: h },
        );
        if (!res.ok) {
            const body = (await res.json()) as ApiEnvelope<null>;
            return { ok: false, message: body.message ?? "댓글 삭제에 실패했습니다." };
        }
        return { ok: true };
    } catch {
        return { ok: false, message: "서버 오류가 발생했습니다." };
    }
}

// ─── 첨부파일 ─────────────────────────────────────────────────────────────────

export async function listTaskAttachmentsAction(
    workspaceId: string,
    taskId: string,
): Promise<{ ok: true; attachments: ApiWorkspaceTaskAttachment[] } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return { ok: false, message: "로그인이 필요합니다." };
    try {
        const res = await fetch(
            apiUrl(`/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/attachments`),
            { headers: await apiFetchHeaders() },
        );
        const body = (await res.json()) as ApiEnvelope<ApiWorkspaceTaskAttachment[]>;
        if (!res.ok) return { ok: false, message: body.message ?? "첨부파일 로드에 실패했습니다." };
        return { ok: true, attachments: body.data };
    } catch {
        return { ok: false, message: "서버 오류가 발생했습니다." };
    }
}

export async function uploadTaskAttachmentAction(
    workspaceId: string,
    taskId: string,
    formData: FormData,
): Promise<{ ok: true; attachment: ApiWorkspaceTaskAttachment } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return { ok: false, message: "로그인이 필요합니다." };
    try {
        // multipart → Content-Type 헤더를 fetch가 자동 설정하도록 직접 제거
        const baseHeaders = await apiFetchHeaders();
        const { "Content-Type": _ct, ...headersWithoutCT } = baseHeaders;
        const res = await fetch(
            apiUrl(`/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/attachments`),
            { method: "POST", headers: headersWithoutCT, body: formData },
        );
        const body = (await res.json()) as ApiEnvelope<ApiWorkspaceTaskAttachment>;
        if (!res.ok) return { ok: false, message: body.message ?? "파일 업로드에 실패했습니다." };
        return { ok: true, attachment: body.data };
    } catch {
        return { ok: false, message: "서버 오류가 발생했습니다." };
    }
}

export async function deleteTaskAttachmentAction(
    workspaceId: string,
    taskId: string,
    attachmentId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return { ok: false, message: "로그인이 필요합니다." };
    try {
        const baseHeaders = await apiFetchHeaders();
        const { "Content-Type": _ct, ...h } = baseHeaders;
        const res = await fetch(
            apiUrl(`/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/attachments/${encodeURIComponent(attachmentId)}`),
            { method: "DELETE", headers: h },
        );
        if (!res.ok) {
            const body = (await res.json()) as ApiEnvelope<null>;
            return { ok: false, message: body.message ?? "파일 삭제에 실패했습니다." };
        }
        return { ok: true };
    } catch {
        return { ok: false, message: "서버 오류가 발생했습니다." };
    }
}
