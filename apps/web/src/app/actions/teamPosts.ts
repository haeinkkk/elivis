"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";
import type { ApiEnvelope } from "@/lib/api-envelope";
import { AT_COOKIE } from "@/lib/auth.server";
import { apiFetchHeaders } from "@/lib/fetch-api-headers.server";

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

type ActionResult<T> = { ok: true } & T | { ok: false; message: string };

function notLoggedIn() {
    return { ok: false as const, message: "로그인이 필요합니다." };
}

// ─────────────────────────────────────────────────────────────────────────────
// 게시글 목록 조회
// ─────────────────────────────────────────────────────────────────────────────

export async function listTeamPostsAction(
    teamId: string,
    opts: { category?: string; take?: number; skip?: number } = {},
): Promise<ActionResult<{ posts: ApiTeamPost[]; total: number }>> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return notLoggedIn();

    try {
        const params = new URLSearchParams();
        if (opts.category) params.set("category", opts.category);
        if (opts.take) params.set("take", String(opts.take));
        if (opts.skip) params.set("skip", String(opts.skip));

        const res = await fetch(
            apiUrl(`/api/teams/${encodeURIComponent(teamId)}/posts?${params}`),
            { headers: await apiFetchHeaders(), cache: "no-store" },
        );
        const body = (await res.json()) as ApiEnvelope<{ posts: ApiTeamPost[]; total: number }>;
        if (!res.ok) return { ok: false, message: body.message ?? "게시글 목록 조회에 실패했습니다." };
        return { ok: true, posts: body.data.posts, total: body.data.total };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 게시글 상세 조회
// ─────────────────────────────────────────────────────────────────────────────

export async function getTeamPostAction(
    teamId: string,
    postId: string,
): Promise<ActionResult<{ post: ApiTeamPost }>> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return notLoggedIn();

    try {
        const res = await fetch(
            apiUrl(`/api/teams/${encodeURIComponent(teamId)}/posts/${encodeURIComponent(postId)}`),
            { headers: await apiFetchHeaders(), cache: "no-store" },
        );
        const body = (await res.json()) as ApiEnvelope<ApiTeamPost>;
        if (!res.ok) return { ok: false, message: body.message ?? "게시글 조회에 실패했습니다." };
        return { ok: true, post: body.data };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 게시글 작성
// ─────────────────────────────────────────────────────────────────────────────

export async function createTeamPostAction(
    teamId: string,
    input: { title: string; content: string; category: string; attachments?: { url: string; name: string; mimeType: string; size: number }[] },
): Promise<ActionResult<{ post: ApiTeamPost }>> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return notLoggedIn();

    try {
        const res = await fetch(
            apiUrl(`/api/teams/${encodeURIComponent(teamId)}/posts`),
            {
                method: "POST",
                headers: await apiFetchHeaders(),
                body: JSON.stringify(input),
            },
        );
        const body = (await res.json()) as ApiEnvelope<{ post: ApiTeamPost }>;
        if (!res.ok) return { ok: false, message: body.message ?? "게시글 작성에 실패했습니다." };
        revalidatePath(`/teams/${teamId}`);
        return { ok: true, post: body.data.post };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 게시글 수정
// ─────────────────────────────────────────────────────────────────────────────

export async function updateTeamPostAction(
    teamId: string,
    postId: string,
    input: { title?: string; content?: string; category?: string; attachments?: { url: string; name: string; mimeType: string; size: number }[] },
): Promise<ActionResult<{ post: ApiTeamPost }>> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return notLoggedIn();

    try {
        const res = await fetch(
            apiUrl(`/api/teams/${encodeURIComponent(teamId)}/posts/${encodeURIComponent(postId)}`),
            {
                method: "PATCH",
                headers: await apiFetchHeaders(),
                body: JSON.stringify(input),
            },
        );
        const body = (await res.json()) as ApiEnvelope<{ post: ApiTeamPost }>;
        if (!res.ok) return { ok: false, message: body.message ?? "게시글 수정에 실패했습니다." };
        return { ok: true, post: body.data.post };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 게시글 삭제
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteTeamPostAction(
    teamId: string,
    postId: string,
): Promise<ActionResult<{ id: string }>> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return notLoggedIn();

    try {
        const { "Content-Type": _, ...headersNoBody } = await apiFetchHeaders();
        const res = await fetch(
            apiUrl(`/api/teams/${encodeURIComponent(teamId)}/posts/${encodeURIComponent(postId)}`),
            { method: "DELETE", headers: headersNoBody },
        );
        const body = (await res.json()) as ApiEnvelope<{ id: string }>;
        if (!res.ok) return { ok: false, message: body.message ?? "게시글 삭제에 실패했습니다." };
        return { ok: true, id: body.data.id };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 고정 토글
// ─────────────────────────────────────────────────────────────────────────────

export async function toggleTeamPostPinAction(
    teamId: string,
    postId: string,
): Promise<ActionResult<{ post: ApiTeamPost }>> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return notLoggedIn();

    try {
        const { "Content-Type": _, ...headersNoBody } = await apiFetchHeaders();
        const res = await fetch(
            apiUrl(`/api/teams/${encodeURIComponent(teamId)}/posts/${encodeURIComponent(postId)}/pin`),
            { method: "PATCH", headers: headersNoBody },
        );
        const body = (await res.json()) as ApiEnvelope<{ post: ApiTeamPost }>;
        if (!res.ok) return { ok: false, message: body.message ?? "고정 변경에 실패했습니다." };
        return { ok: true, post: body.data.post };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
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
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return notLoggedIn();

    try {
        const res = await fetch(
            apiUrl(`/api/teams/${encodeURIComponent(teamId)}/posts/${encodeURIComponent(postId)}/comments`),
            {
                method: "POST",
                headers: await apiFetchHeaders(),
                body: JSON.stringify({ content, ...(parentId ? { parentId } : {}) }),
            },
        );
        const body = (await res.json()) as ApiEnvelope<{ comment: ApiTeamPostComment }>;
        if (!res.ok) return { ok: false, message: body.message ?? "댓글 작성에 실패했습니다." };
        return { ok: true, comment: body.data.comment };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
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
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return notLoggedIn();

    try {
        const { "Content-Type": _, ...headersNoBody } = await apiFetchHeaders();
        const res = await fetch(
            apiUrl(`/api/teams/${encodeURIComponent(teamId)}/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`),
            { method: "DELETE", headers: headersNoBody },
        );
        const body = (await res.json()) as ApiEnvelope<{ id: string }>;
        if (!res.ok) return { ok: false, message: body.message ?? "댓글 삭제에 실패했습니다." };
        return { ok: true, id: body.data.id };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 파일 업로드
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadTeamPostFileAction(
    file: File,
): Promise<ActionResult<{ url: string; name: string; mimeType: string; size: number; isImage: boolean }>> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return notLoggedIn();

    try {
        const { "Content-Type": _, ...headersNoBody } = await apiFetchHeaders();
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(apiUrl("/api/upload"), {
            method: "POST",
            headers: headersNoBody,
            body: formData,
        });
        const body = (await res.json()) as ApiEnvelope<{ url: string; name: string; mimeType: string; size: number; isImage: boolean }>;
        if (!res.ok) return { ok: false, message: body.message ?? "업로드에 실패했습니다." };
        return { ok: true, ...body.data };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}
