"use server";

import { revalidatePath } from "next/cache";

import type { ApiEnvelope } from "@/lib/http/api-envelope";
import {
    actionFail,
    actionNetworkError,
    apiFetchAuthenticated,
    apiFetchHeadersWithoutContentType,
    envelopeMessage,
    fetchApiEnvelope,
    requireActionSession,
    type ActionResult,
} from "@/lib/http/server-action-http";

// ─────────────────────────────────────────────────────────────────────────────
// 공유 타입
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiTeamPostAuthor {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
}

export interface ApiTeamPostComment {
    id: string;
    postId: string;
    parentId: string | null;
    content: string;
    author: ApiTeamPostAuthor;
    /** 클라이언트에서 buildCommentTree()로 채워지는 필드 (API 응답에는 없음) */
    replies?: ApiTeamPostComment[];
    createdAt: string;
    updatedAt: string;
}

export interface ApiTeamPostAttachment {
    id: string;
    postId: string;
    name: string;
    url: string;
    mimeType: string;
    size: number;
    createdAt: string;
}

export interface ApiTeamPost {
    id: string;
    teamId: string;
    category: string;
    title: string;
    content: string;
    isPinned: boolean;
    author: ApiTeamPostAuthor;
    _count?: { comments: number };
    comments?: ApiTeamPostComment[];
    attachments?: ApiTeamPostAttachment[];
    createdAt: string;
    updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 게시글 목록 조회
// ─────────────────────────────────────────────────────────────────────────────

export async function listTeamPostsAction(
    teamId: string,
    opts: { category?: string; take?: number; skip?: number } = {},
): Promise<ActionResult<{ posts: ApiTeamPost[]; total: number }>> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const params = new URLSearchParams();
        if (opts.category) params.set("category", opts.category);
        if (opts.take) params.set("take", String(opts.take));
        if (opts.skip) params.set("skip", String(opts.skip));

        const { res, body } = await fetchApiEnvelope<{ posts: ApiTeamPost[]; total: number }>(
            `/api/teams/${encodeURIComponent(teamId)}/posts?${params}`,
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "게시글 목록 조회에 실패했습니다."));
        return { ok: true, posts: body.data.posts, total: body.data.total };
    } catch {
        return actionNetworkError();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 게시글 상세 조회
// ─────────────────────────────────────────────────────────────────────────────

export async function getTeamPostAction(
    teamId: string,
    postId: string,
): Promise<ActionResult<{ post: ApiTeamPost }>> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiTeamPost>(
            `/api/teams/${encodeURIComponent(teamId)}/posts/${encodeURIComponent(postId)}`,
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "게시글 조회에 실패했습니다."));
        return { ok: true, post: body.data };
    } catch {
        return actionNetworkError();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 게시글 작성
// ─────────────────────────────────────────────────────────────────────────────

export async function createTeamPostAction(
    teamId: string,
    input: {
        title: string;
        content: string;
        category: string;
        attachments?: { url: string; name: string; mimeType: string; size: number }[];
    },
): Promise<ActionResult<{ post: ApiTeamPost }>> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<{ post: ApiTeamPost }>(
            `/api/teams/${encodeURIComponent(teamId)}/posts`,
            {
                method: "POST",
                body: JSON.stringify(input),
            },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "게시글 작성에 실패했습니다."));
        revalidatePath(`/teams/${teamId}`);
        return { ok: true, post: body.data.post };
    } catch {
        return actionNetworkError();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 게시글 수정
// ─────────────────────────────────────────────────────────────────────────────

export async function updateTeamPostAction(
    teamId: string,
    postId: string,
    input: {
        title?: string;
        content?: string;
        category?: string;
        attachments?: { url: string; name: string; mimeType: string; size: number }[];
    },
): Promise<ActionResult<{ post: ApiTeamPost }>> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<{ post: ApiTeamPost }>(
            `/api/teams/${encodeURIComponent(teamId)}/posts/${encodeURIComponent(postId)}`,
            {
                method: "PATCH",
                body: JSON.stringify(input),
            },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "게시글 수정에 실패했습니다."));
        return { ok: true, post: body.data.post };
    } catch {
        return actionNetworkError();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 게시글 삭제
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteTeamPostAction(
    teamId: string,
    postId: string,
): Promise<ActionResult<{ id: string }>> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const headers = await apiFetchHeadersWithoutContentType();
        const { res, body } = await fetchApiEnvelope<{ id: string }>(
            `/api/teams/${encodeURIComponent(teamId)}/posts/${encodeURIComponent(postId)}`,
            { method: "DELETE", headers },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "게시글 삭제에 실패했습니다."));
        return { ok: true, id: body.data.id };
    } catch {
        return actionNetworkError();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 고정 토글
// ─────────────────────────────────────────────────────────────────────────────

export async function toggleTeamPostPinAction(
    teamId: string,
    postId: string,
): Promise<ActionResult<{ post: ApiTeamPost }>> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const headers = await apiFetchHeadersWithoutContentType();
        const { res, body } = await fetchApiEnvelope<{ post: ApiTeamPost }>(
            `/api/teams/${encodeURIComponent(teamId)}/posts/${encodeURIComponent(postId)}/pin`,
            { method: "PATCH", headers },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "고정 변경에 실패했습니다."));
        return { ok: true, post: body.data.post };
    } catch {
        return actionNetworkError();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 댓글 작성
// ─────────────────────────────────────────────────────────────────────────────

export async function createTeamPostCommentAction(
    teamId: string,
    postId: string,
    content: string,
    parentId?: string,
): Promise<ActionResult<{ comment: ApiTeamPostComment }>> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<{ comment: ApiTeamPostComment }>(
            `/api/teams/${encodeURIComponent(teamId)}/posts/${encodeURIComponent(postId)}/comments`,
            {
                method: "POST",
                body: JSON.stringify({ content, ...(parentId ? { parentId } : {}) }),
            },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "댓글 작성에 실패했습니다."));
        return { ok: true, comment: body.data.comment };
    } catch {
        return actionNetworkError();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 댓글 삭제
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteTeamPostCommentAction(
    teamId: string,
    postId: string,
    commentId: string,
): Promise<ActionResult<{ id: string }>> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const headers = await apiFetchHeadersWithoutContentType();
        const { res, body } = await fetchApiEnvelope<{ id: string }>(
            `/api/teams/${encodeURIComponent(teamId)}/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
            { method: "DELETE", headers },
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "댓글 삭제에 실패했습니다."));
        return { ok: true, id: body.data.id };
    } catch {
        return actionNetworkError();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 파일 업로드
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadTeamPostFileAction(
    file: File,
): Promise<
    ActionResult<{ url: string; name: string; mimeType: string; size: number; isImage: boolean }>
> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const headers = await apiFetchHeadersWithoutContentType();
        const formData = new FormData();
        formData.append("file", file);

        const res = await apiFetchAuthenticated("/api/upload", {
            method: "POST",
            headers,
            body: formData,
        });
        const body = (await res.json()) as ApiEnvelope<{
            url: string;
            name: string;
            mimeType: string;
            size: number;
            isImage: boolean;
        }>;
        if (!res.ok)
            return actionFail(envelopeMessage(body, "업로드에 실패했습니다."));
        return { ok: true, ...body.data };
    } catch {
        return actionNetworkError();
    }
}
