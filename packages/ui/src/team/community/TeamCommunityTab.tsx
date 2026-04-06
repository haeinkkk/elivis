"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import type { TeamCommunityPostsActions } from "../../types/team-community-posts-actions";
import type { ApiTeamPost, ApiTeamPostComment } from "../../types/team-posts-api";
import { PostComposePanel } from "./PostComposePanel";
import { PostDetailPanel } from "./PostDetailPanel";
import { PostCard } from "./PostCard";
import { CATEGORY_FILTER_ORDER, type PostCategory, type PostCategoryFilterId } from "./team-community-types";

export type { PostCategory };

export function TeamCommunityTab({
    teamId,
    myUserId,
    isLeader,
    postsActions,
}: {
    teamId: string;
    myUserId: string;
    isLeader: boolean;
    postsActions: TeamCommunityPostsActions;
}) {
    const t = useTranslations("teams.detail.community");
    const tList = useTranslations("teams.detail.community.list");
    const tMob = useTranslations("teams.detail.community.mobile");
    const tEmpty = useTranslations("teams.detail.community.emptyRight");
    const tDel = useTranslations("teams.detail.community.deletePost");
    const tCompose = useTranslations("teams.detail.community.compose");
    const tCommon = useTranslations("teams.detail.common");

    const {
        listTeamPostsAction,
        getTeamPostAction,
        createTeamPostAction,
        updateTeamPostAction,
        deleteTeamPostAction,
        toggleTeamPostPinAction,
        createTeamPostCommentAction,
        deleteTeamPostCommentAction,
        uploadTeamPostFileAction,
    } = postsActions;

    const [posts, setPosts] = useState<ApiTeamPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<PostCategoryFilterId>("all");

    const [selectedPost, setSelectedPost] = useState<ApiTeamPost | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const [composeOpen, setComposeOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<ApiTeamPost | null>(null);

    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const PAGE_SIZE = 10;
    const [page, setPage] = useState(1);

    const loadPosts = useCallback(
        async (category: PostCategoryFilterId) => {
            setLoading(true);
            const res = await listTeamPostsAction(teamId, {
                category: category === "all" ? undefined : category,
                take: 100,
            });
            if (res.ok) {
                setPosts(res.posts);
            }
            setLoading(false);
        },
        [listTeamPostsAction, teamId],
    );

    useEffect(() => {
        void loadPosts(activeCategory);
        setPage(1);
    }, [loadPosts, activeCategory]);

    async function handleSelectPost(post: ApiTeamPost) {
        setSelectedPost({ ...post, comments: [] });
        setDetailLoading(true);
        const res = await getTeamPostAction(teamId, post.id);
        if (res.ok) setSelectedPost(res.post);
        setDetailLoading(false);
    }

    async function handleSavePost(data: {
        title: string;
        content: string;
        category: PostCategory;
        attachments: { url: string; name: string; mimeType: string; size: number }[];
    }) {
        if (editTarget) {
            const res = await updateTeamPostAction(teamId, editTarget.id, data);
            if (res.ok) {
                setPosts((prev) =>
                    prev.map((p) => (p.id === res.post.id ? { ...res.post, _count: p._count } : p)),
                );
                if (selectedPost?.id === editTarget.id) {
                    setSelectedPost((prev) => (prev ? { ...prev, ...res.post } : prev));
                }
            }
        } else {
            const res = await createTeamPostAction(teamId, data);
            if (res.ok) {
                const newPost = { ...res.post, _count: { comments: 0 } };
                setPosts((prev) => [newPost, ...prev]);
                setSelectedPost({ ...newPost, comments: [] });
            }
        }
        setComposeOpen(false);
        setEditTarget(null);
    }

    async function handleDeletePost(postId: string) {
        if (deleting) return;
        setDeleting(true);
        try {
            const res = await deleteTeamPostAction(teamId, postId);
            if (res.ok) {
                setPosts((prev) => prev.filter((p) => p.id !== postId));
                if (selectedPost?.id === postId) setSelectedPost(null);
                setDeleteConfirmId(null);
            }
        } finally {
            setDeleting(false);
        }
    }

    async function handlePin(postId: string) {
        const res = await toggleTeamPostPinAction(teamId, postId);
        if (res.ok) {
            setPosts((prev) =>
                prev.map((p) => (p.id === res.post.id ? { ...res.post, _count: p._count } : p)),
            );
            if (selectedPost?.id === postId)
                setSelectedPost((prev) => (prev ? { ...prev, isPinned: res.post.isPinned } : prev));
        }
    }

    async function handleCommentAdd(optimistic: ApiTeamPostComment, parentId?: string) {
        const res = await createTeamPostCommentAction(
            teamId,
            optimistic.postId,
            optimistic.content,
            parentId,
        );
        if (res.ok) {
            const newComment = res.comment;
            const isTopLevel = !parentId;
            setSelectedPost((prev) =>
                prev
                    ? {
                          ...prev,
                          comments: [...(prev.comments ?? []), newComment],
                          _count: isTopLevel
                              ? { comments: (prev._count?.comments ?? 0) + 1 }
                              : prev._count,
                      }
                    : prev,
            );
            if (isTopLevel) {
                setPosts((prev) =>
                    prev.map((p) =>
                        p.id === optimistic.postId
                            ? { ...p, _count: { comments: (p._count?.comments ?? 0) + 1 } }
                            : p,
                    ),
                );
            }
        }
    }

    async function handleCommentDelete(commentId: string) {
        if (!selectedPost) return;
        const res = await deleteTeamPostCommentAction(teamId, selectedPost.id, commentId);
        if (res.ok) {
            const flat = selectedPost.comments ?? [];
            const deletedComment = flat.find((c) => c.id === commentId);
            const isTopLevel = !deletedComment?.parentId;

            function collectDescendants(id: string): string[] {
                const children = flat.filter((c) => c.parentId === id);
                return [id, ...children.flatMap((c) => collectDescendants(c.id))];
            }
            const toRemove = new Set(collectDescendants(commentId));

            setSelectedPost((prev) =>
                prev
                    ? {
                          ...prev,
                          comments: (prev.comments ?? []).filter((c) => !toRemove.has(c.id)),
                          _count: isTopLevel
                              ? { comments: Math.max(0, (prev._count?.comments ?? 0) - 1) }
                              : prev._count,
                      }
                    : prev,
            );
            if (isTopLevel) {
                setPosts((prev) =>
                    prev.map((p) =>
                        p.id === selectedPost.id
                            ? {
                                  ...p,
                                  _count: { comments: Math.max(0, (p._count?.comments ?? 0) - 1) },
                              }
                            : p,
                    ),
                );
            }
        }
    }

    const pinnedPosts = posts.filter((p) => p.isPinned);
    const regularPosts = posts.filter((p) => !p.isPinned);
    const totalPages = Math.max(1, Math.ceil(regularPosts.length / PAGE_SIZE));
    const pagedRegularPosts = regularPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const showDetail = composeOpen || !!selectedPost;

    return (
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
            <div
                className={[
                    "flex min-h-0 flex-col overflow-hidden border-r border-stone-200 bg-white",
                    "absolute inset-0 z-10 transition-transform duration-300 ease-in-out",
                    "md:relative md:w-72 md:shrink-0 md:translate-x-0 lg:w-80 xl:w-96",
                    showDetail ? "-translate-x-full" : "translate-x-0",
                ].join(" ")}
            >
                <div className="flex shrink-0 items-center justify-between border-b border-stone-100 px-4 py-3">
                    <div className="flex items-center gap-1 overflow-x-auto">
                        {CATEGORY_FILTER_ORDER.map((id) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setActiveCategory(id)}
                                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                                    activeCategory === id
                                        ? "bg-stone-800 text-white"
                                        : "text-stone-500 hover:bg-stone-100 hover:text-stone-700"
                                }`}
                            >
                                {t(`category.${id}` as "category.all")}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setEditTarget(null);
                            setComposeOpen(true);
                            setSelectedPost(null);
                        }}
                        className="ml-2 flex shrink-0 items-center gap-1 rounded-lg bg-stone-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-stone-700"
                    >
                        <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 4.5v15m7.5-7.5h-15"
                            />
                        </svg>
                        {tList("writeShort")}
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-stone-500" />
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-300">
                                <svg
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.4}
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                                    />
                                </svg>
                            </div>
                            <p className="text-sm font-medium text-stone-500">{tList("emptyTitle")}</p>
                            <p className="mt-0.5 text-xs text-stone-400">{tList("emptySubtitle")}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {pinnedPosts.length > 0 && (
                                <>
                                    <div className="flex items-center gap-1.5 border-b border-amber-100 bg-amber-50/70 px-4 py-2">
                                        <svg
                                            className="h-3 w-3 text-amber-500"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                                        </svg>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                                            {tList("pinned")}
                                        </span>
                                        <span className="ml-auto text-[10px] text-amber-400">
                                            {pinnedPosts.length}
                                        </span>
                                    </div>
                                    {pinnedPosts.map((post) => (
                                        <PostCard
                                            key={post.id}
                                            post={post}
                                            isSelected={selectedPost?.id === post.id}
                                            onClick={() => handleSelectPost(post)}
                                        />
                                    ))}
                                </>
                            )}

                            {regularPosts.length > 0 && (
                                <>
                                    <div className="flex items-center gap-1.5 border-b border-stone-100 bg-stone-50 px-4 py-2">
                                        <svg
                                            className="h-3 w-3 text-stone-400"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2}
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                                            />
                                        </svg>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                                            {tList("posts")}
                                        </span>
                                        <span className="ml-auto text-[10px] text-stone-400">
                                            {regularPosts.length}
                                        </span>
                                    </div>
                                    {pagedRegularPosts.map((post) => (
                                        <PostCard
                                            key={post.id}
                                            post={post}
                                            isSelected={selectedPost?.id === post.id}
                                            onClick={() => handleSelectPost(post)}
                                        />
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="shrink-0 flex items-center justify-between border-t border-stone-100 px-3 py-2">
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30"
                        >
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPage(p)}
                                    className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                                        p === page
                                            ? "bg-stone-800 text-white"
                                            : "text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30"
                        >
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            <div
                className={[
                    "flex min-h-0 flex-col overflow-hidden bg-[#f8f7f5]",
                    "absolute inset-0 z-20 transition-transform duration-300 ease-in-out",
                    "md:relative md:flex-1 md:translate-x-0",
                    showDetail ? "translate-x-0" : "translate-x-full",
                ].join(" ")}
            >
                <div className="flex shrink-0 items-center gap-2 border-b border-stone-100 bg-white px-4 py-3 md:hidden">
                    <button
                        type="button"
                        onClick={() => {
                            if (composeOpen) {
                                setComposeOpen(false);
                                setEditTarget(null);
                            } else {
                                setSelectedPost(null);
                            }
                        }}
                        className="flex shrink-0 items-center gap-0.5 rounded-lg py-1 pr-2 text-sm font-medium text-stone-500 active:bg-stone-100"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.2}
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        {tMob("backToList")}
                    </button>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-800">
                        {composeOpen
                            ? editTarget
                                ? tCompose("editTitle")
                                : tCompose("newTitle")
                            : (selectedPost?.title ?? "")}
                    </span>
                </div>

                {composeOpen ? (
                    <PostComposePanel
                        key={editTarget?.id ?? "new"}
                        initial={editTarget}
                        onClose={() => {
                            setComposeOpen(false);
                            setEditTarget(null);
                        }}
                        onSave={handleSavePost}
                        uploadTeamPostFile={uploadTeamPostFileAction}
                    />
                ) : !selectedPost ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
                            <svg
                                className="h-8 w-8 text-stone-300"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.3}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                                />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-stone-500">{tEmpty("title")}</p>
                            <p className="mt-1 text-xs text-stone-400">{tEmpty("subtitle")}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setEditTarget(null);
                                setComposeOpen(true);
                            }}
                            className="flex items-center gap-1.5 rounded-xl bg-stone-800 px-4 py-2 text-xs font-medium text-white hover:bg-stone-950"
                        >
                            <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2.5}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 4.5v15m7.5-7.5h-15"
                                />
                            </svg>
                            {tEmpty("cta")}
                        </button>
                    </div>
                ) : detailLoading ? (
                    <div className="flex flex-1 items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-stone-500" />
                    </div>
                ) : (
                    <PostDetailPanel
                        post={selectedPost}
                        myUserId={myUserId}
                        isLeader={isLeader}
                        onClose={() => setSelectedPost(null)}
                        onEdit={() => {
                            setEditTarget(selectedPost);
                            setComposeOpen(true);
                        }}
                        onDelete={() => setDeleteConfirmId(selectedPost.id)}
                        onPin={() => handlePin(selectedPost.id)}
                        onCommentAdd={handleCommentAdd}
                        onCommentDelete={handleCommentDelete}
                        uploadTeamPostFile={uploadTeamPostFileAction}
                    />
                )}
            </div>

            {deleteConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                        onClick={() => setDeleteConfirmId(null)}
                    />
                    <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                        <h3 className="text-base font-semibold text-stone-800">{tDel("title")}</h3>
                        <p className="mt-1.5 text-sm text-stone-500">{tDel("description")}</p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100"
                            >
                                {tCommon("cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeletePost(deleteConfirmId)}
                                disabled={deleting}
                                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                            >
                                {deleting ? tCommon("deleting") : tCommon("delete")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
