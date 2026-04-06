"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import type { TeamCommunityPostsActions } from "../../types/team-community-posts-actions";
import type { ApiTeamPost, ApiTeamPostComment } from "../../types/team-posts-api";
import { CommentNode, buildCommentTree } from "./CommentTree";
import { MiniEditor } from "./MiniEditor";
import { CATEGORY_BADGE_CLASS } from "./team-community-category-styles";
import { formatBytes, formatPostDate, stripHtml } from "./team-community-format";
import type { PostCategory } from "./team-community-types";
import {
    displayTeamPostAuthorName,
    TeamCommunityAuthorAvatar,
} from "./TeamCommunityAuthorAvatar";

type UploadTeamPostFileFn = TeamCommunityPostsActions["uploadTeamPostFileAction"];

export function PostDetailPanel({
    post,
    myUserId,
    isLeader,
    onClose,
    onEdit,
    onDelete,
    onPin,
    onCommentAdd,
    onCommentDelete,
    uploadTeamPostFile,
}: {
    post: ApiTeamPost;
    myUserId: string;
    isLeader: boolean;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onPin: () => void;
    onCommentAdd: (comment: ApiTeamPostComment, parentId?: string) => void;
    onCommentDelete: (commentId: string) => void;
    uploadTeamPostFile: UploadTeamPostFileFn;
}) {
    const locale = useLocale();
    const t = useTranslations("teams.detail.community");
    const tDet = useTranslations("teams.detail.community.detail");
    const tRel = useTranslations("teams.detail.community.relative");
    const tMini = useTranslations("teams.detail.community.miniEditor");

    const [submitting, startSubmit] = useTransition();
    const [deletingComment, setDeletingComment] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [submittingReply, setSubmittingReply] = useState(false);

    const cat = post.category as PostCategory;
    const badgeCls = CATEGORY_BADGE_CLASS[cat] ?? CATEGORY_BADGE_CLASS.general;
    const badgeLabel = t(`category.${cat}` as "category.general");
    const flatComments = post.comments ?? [];
    const commentTree = buildCommentTree(flatComments);

    const createdLabel = formatPostDate(post.createdAt, locale, (key, values) =>
        tRel(key as "justNow" | "minutesAgo" | "hoursAgo" | "daysAgo", values),
    );

    function handleCommentSubmit(html: string) {
        if (!stripHtml(html).trim()) return;
        startSubmit(async () => {
            onCommentAdd({
                id: "",
                postId: post.id,
                parentId: null,
                content: html,
                author: { id: myUserId, name: null, email: "", avatarUrl: null },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        });
    }

    async function handleReplySubmit(parentId: string, html: string) {
        if (!stripHtml(html).trim() || submittingReply) return;
        setSubmittingReply(true);
        onCommentAdd(
            {
                id: "",
                postId: post.id,
                parentId,
                content: html,
                author: { id: myUserId, name: null, email: "", avatarUrl: null },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            parentId,
        );
        setReplyingTo(null);
        setSubmittingReply(false);
    }

    function handleDeleteComment(commentId: string) {
        setDeletingComment(commentId);
        onCommentDelete(commentId);
        setDeletingComment(null);
    }

    function toggleReply(commentId: string) {
        setReplyingTo((prev) => (prev === commentId ? null : commentId));
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-4">
                <div className="flex-1 pr-4">
                    <div className="mb-2 flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${badgeCls}`}>
                            {badgeLabel}
                        </span>
                        {post.isPinned && (
                            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-500 ring-1 ring-amber-200">
                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                                </svg>
                                {tDet("pinned")}
                            </span>
                        )}
                    </div>
                    <h2 className="text-base font-bold leading-snug text-stone-900">{post.title}</h2>
                    <div className="mt-2 flex items-center gap-2 text-xs text-stone-400">
                        <TeamCommunityAuthorAvatar author={post.author} sizeClass="h-5 w-5" />
                        <span className="font-medium text-stone-600">
                            {displayTeamPostAuthorName(post.author)}
                        </span>
                        <span>·</span>
                        <span>{createdLabel}</span>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    {isLeader && (
                        <button
                            type="button"
                            onClick={onPin}
                            title={post.isPinned ? tDet("unpin") : tDet("pinNotice")}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                                post.isPinned
                                    ? "text-amber-500 hover:bg-amber-50"
                                    : "text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                            }`}
                        >
                            <svg
                                className="h-4 w-4"
                                fill={post.isPinned ? "currentColor" : "none"}
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={post.isPinned ? 0 : 1.8}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"
                                />
                            </svg>
                        </button>
                    )}
                    {post.author.id === myUserId && (
                        <button
                            type="button"
                            onClick={onEdit}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                            title={tDet("editTooltip")}
                        >
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.8}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
                                />
                            </svg>
                        </button>
                    )}
                    {(post.author.id === myUserId || isLeader) && (
                        <button
                            type="button"
                            onClick={onDelete}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-500"
                            title={tDet("deleteTooltip")}
                        >
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.8}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                                />
                            </svg>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="bg-white px-6 py-5">
                    <div
                        className="prose prose-sm max-w-none text-stone-700 [&_blockquote]:border-l-2 [&_blockquote]:border-stone-300 [&_blockquote]:pl-3 [&_blockquote]:text-stone-500 [&_code]:rounded [&_code]:bg-stone-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.82em] [&_h2]:text-base [&_h2]:font-bold [&_img]:max-w-full [&_img]:rounded-lg [&_ol]:pl-5 [&_p]:my-1 [&_ul]:pl-5"
                        dangerouslySetInnerHTML={{ __html: post.content }}
                    />
                </div>

                {(post.attachments ?? []).length > 0 && (
                    <div className="border-t border-stone-100 bg-stone-50/40 px-6 py-3">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                            {tDet("attachments")}
                        </p>
                        <div className="flex flex-col gap-1.5">
                            {(post.attachments ?? []).map((att) => (
                                <a
                                    key={att.id}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={att.name}
                                    className="group flex items-center gap-2.5 rounded-lg border border-stone-100 bg-white px-3 py-2 transition-colors hover:border-stone-300 hover:bg-stone-50"
                                >
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-stone-100 text-stone-400 group-hover:bg-stone-200">
                                        {att.mimeType.startsWith("image/") ? (
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={1.5}
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                                                />
                                            </svg>
                                        ) : (
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={1.5}
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                                                />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium text-stone-700 group-hover:text-stone-900">
                                            {att.name}
                                        </p>
                                        <p className="text-[10px] text-stone-400">{formatBytes(att.size)}</p>
                                    </div>
                                    <svg
                                        className="h-3.5 w-3.5 shrink-0 text-stone-300 group-hover:text-stone-500"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                                        />
                                    </svg>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                <div className="border-t border-stone-100 bg-stone-50/60">
                    <div className="flex items-center gap-2 px-6 pt-4 pb-2">
                        <svg
                            className="h-3.5 w-3.5 text-stone-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.8}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                            />
                        </svg>
                        <span className="text-xs font-semibold text-stone-500">
                            {tDet("commentsLabel")}{" "}
                            <span className="text-stone-700">{flatComments.length}</span>
                        </span>
                    </div>

                    <div className="px-6 pb-3">
                        <MiniEditor
                            placeholder={tMini("rootPlaceholder")}
                            submitLabel={tMini("submitComment")}
                            submitting={submitting}
                            onSubmit={handleCommentSubmit}
                            uploadTeamPostFile={uploadTeamPostFile}
                        />
                    </div>

                    <div className="px-6 pb-6">
                        {commentTree.length === 0 ? (
                            <p className="py-4 text-center text-xs text-stone-400">{t("comments.empty")}</p>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {commentTree.map((c) => (
                                    <CommentNode
                                        key={c.id}
                                        comment={c}
                                        depth={0}
                                        myUserId={myUserId}
                                        isLeader={isLeader}
                                        replyingTo={replyingTo}
                                        submittingReply={submittingReply}
                                        deletingComment={deletingComment}
                                        onToggleReply={toggleReply}
                                        onReplySubmit={handleReplySubmit}
                                        onDelete={handleDeleteComment}
                                        uploadTeamPostFile={uploadTeamPostFile}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
