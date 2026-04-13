"use client";

import { useLocale, useTranslations } from "next-intl";

import type { TeamCommunityPostsActions } from "../../types/team-community-posts-actions";
import type { ApiTeamPostComment } from "../../types/team-posts-api";
import { MiniEditor } from "./MiniEditor";
import { formatPostDate } from "./team-community-format";
import {
    displayTeamPostAuthorName,
    TeamCommunityAuthorAvatar,
} from "./TeamCommunityAuthorAvatar";

type UploadTeamPostFileFn = TeamCommunityPostsActions["uploadTeamPostFileAction"];

export type CommentWithReplies = Omit<ApiTeamPostComment, "replies"> & { replies: CommentWithReplies[] };

export function buildCommentTree(flat: ApiTeamPostComment[]): CommentWithReplies[] {
    const map = new Map<string, CommentWithReplies>();
    for (const c of flat) map.set(c.id, { ...c, replies: [] });

    const roots: CommentWithReplies[] = [];
    for (const c of flat) {
        const node = map.get(c.id)!;
        if (c.parentId && map.has(c.parentId)) {
            map.get(c.parentId)!.replies.push(node);
        } else {
            roots.push(node);
        }
    }
    return roots;
}

const MAX_INDENT = 3;

export function CommentNode({
    comment,
    depth,
    myUserId,
    isLeader,
    replyingTo,
    submittingReply,
    deletingComment,
    onToggleReply,
    onReplySubmit,
    onDelete,
    uploadTeamPostFile,
}: {
    comment: CommentWithReplies;
    depth: number;
    myUserId: string;
    isLeader: boolean;
    replyingTo: string | null;
    submittingReply: boolean;
    deletingComment: string | null;
    onToggleReply: (id: string) => void;
    onReplySubmit: (parentId: string, html: string) => void;
    onDelete: (id: string) => void;
    uploadTeamPostFile: UploadTeamPostFileFn;
}) {
    const locale = useLocale();
    const tRel = useTranslations("teams.detail.community.relative");
    const tComm = useTranslations("teams.detail.community.comments");
    const tMini = useTranslations("teams.detail.community.miniEditor");
    const tCommon = useTranslations("teams.detail.common");

    const isReplying = replyingTo === comment.id;
    const avatarSize = depth === 0 ? "h-7 w-7 shrink-0" : "h-6 w-6 shrink-0";

    const childProps = {
        myUserId,
        isLeader,
        replyingTo,
        submittingReply,
        deletingComment,
        onToggleReply,
        onReplySubmit,
        onDelete,
        uploadTeamPostFile,
    };

    const dateStr = formatPostDate(comment.createdAt, locale, (key, values) =>
        tRel(key as "justNow" | "minutesAgo" | "hoursAgo" | "daysAgo", values),
    );

    return (
        <div>
            <div className="group flex gap-2.5">
                <TeamCommunityAuthorAvatar author={comment.author} sizeClass={avatarSize} />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-stone-700 dark:text-elivis-ink">
                            {displayTeamPostAuthorName(comment.author)}
                        </span>
                        <span className="text-[10px] text-stone-400 dark:text-elivis-ink-secondary">{dateStr}</span>
                        <button
                            type="button"
                            onClick={() => onToggleReply(comment.id)}
                            className={`text-[10px] font-medium transition-colors ${isReplying ? "text-stone-700 dark:text-elivis-ink" : "text-stone-400 hover:text-stone-600 dark:text-elivis-ink-secondary dark:hover:text-elivis-ink"}`}
                        >
                            {isReplying ? tCommon("cancel") : tComm("reply")}
                        </button>
                        {(comment.author.id === myUserId || isLeader) && (
                            <button
                                type="button"
                                onClick={() => onDelete(comment.id)}
                                disabled={deletingComment === comment.id}
                                className="ml-auto hidden text-stone-300 hover:text-red-400 group-hover:inline-flex disabled:opacity-50 dark:text-elivis-ink-muted dark:hover:text-red-400"
                            >
                                <svg
                                    className="h-3.5 w-3.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18 18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        )}
                    </div>

                    <div
                        className="mt-0.5 text-sm leading-relaxed text-stone-600 dark:text-elivis-ink-secondary [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline [&_img]:max-w-full [&_img]:rounded [&_strong]:font-semibold [&_em]:italic [&_p]:my-0"
                        dangerouslySetInnerHTML={{ __html: comment.content }}
                    />

                    {isReplying && (
                        <div className="mt-2.5">
                            <MiniEditor
                                autoFocus
                                placeholder={tMini("replyTo", {
                                    name: displayTeamPostAuthorName(comment.author),
                                })}
                                submitLabel={tMini("submitReply")}
                                submitting={submittingReply}
                                onSubmit={(html) => onReplySubmit(comment.id, html)}
                                onCancel={() => onToggleReply(comment.id)}
                                uploadTeamPostFile={uploadTeamPostFile}
                            />
                        </div>
                    )}

                    {depth < MAX_INDENT && comment.replies.length > 0 && (
                        <div className="mt-3 flex flex-col gap-3 border-l-2 border-stone-300 dark:border-elivis-line pl-3">
                            {comment.replies.map((child) => (
                                <CommentNode key={child.id} comment={child} depth={depth + 1} {...childProps} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {depth >= MAX_INDENT && comment.replies.length > 0 && (
                <div className="mt-3 flex flex-col gap-3">
                    {comment.replies.map((child) => (
                        <CommentNode key={child.id} comment={child} depth={depth + 1} {...childProps} />
                    ))}
                </div>
            )}
        </div>
    );
}
