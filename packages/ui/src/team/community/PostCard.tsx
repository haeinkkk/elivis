"use client";

import { useLocale, useTranslations } from "next-intl";

import type { ApiTeamPost } from "../../types/team-posts-api";
import { CATEGORY_BADGE_CLASS, CATEGORY_CARD } from "./team-community-category-styles";
import { formatPostDate, stripHtml } from "./team-community-format";
import type { PostCategory } from "./team-community-types";
import { displayTeamPostAuthorName } from "./TeamCommunityAuthorAvatar";

export function PostCard({
    post,
    isSelected,
    onClick,
}: {
    post: ApiTeamPost;
    isSelected: boolean;
    onClick: () => void;
}) {
    const locale = useLocale();
    const t = useTranslations("teams.detail.community");
    const tRel = useTranslations("teams.detail.community.relative");
    const tCard = useTranslations("teams.detail.community.postCard");

    const cat = post.category as PostCategory;
    const badgeCls = CATEGORY_BADGE_CLASS[cat] ?? CATEGORY_BADGE_CLASS.general;
    const card = CATEGORY_CARD[cat] ?? CATEGORY_CARD.general;
    const badgeLabel = t(`category.${cat}` as "category.general");

    const dateStr = formatPostDate(post.createdAt, locale, (key, values) =>
        tRel(key as "justNow" | "minutesAgo" | "hoursAgo" | "daysAgo", values),
    );

    const commentCount = post._count?.comments ?? 0;

    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                w-full border-l-[3px] px-4 py-3.5 text-left transition-all
                ${card.border}
                ${isSelected ? card.selectedBg + " shadow-sm" : `bg-white ${card.hoverBg}`}
            `}
        >
            {post.isPinned && (
                <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-500">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                    </svg>
                    {tCard("pinned")}
                </div>
            )}

            <div className="mb-1.5 flex items-center gap-1.5">
                <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${badgeCls}`}
                >
                    {badgeLabel}
                </span>
                <span className="truncate text-[10px] text-stone-400">
                    {displayTeamPostAuthorName(post.author)}
                </span>
                <span className="ml-auto shrink-0 text-[10px] text-stone-400">{dateStr}</span>
            </div>

            <p
                className={`line-clamp-1 text-sm font-semibold leading-snug ${isSelected ? "text-stone-900" : "text-stone-800"}`}
            >
                {post.title}
            </p>

            <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-stone-500">
                {stripHtml(post.content)}
            </p>

            {commentCount > 0 && (
                <div className="mt-2 flex items-center gap-1 text-stone-400">
                    <svg
                        className="h-3 w-3"
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
                    <span className="text-[10px]">{tCard("commentsCount", { count: commentCount })}</span>
                </div>
            )}
        </button>
    );
}
