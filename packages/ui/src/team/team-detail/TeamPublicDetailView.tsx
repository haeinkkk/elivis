"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import type { TeamBannerActions } from "../../types/team-fields-actions";
import type { TeamDetail } from "../../types/team-detail";
import { TeamFavoriteButton } from "../../TeamFavoriteButton";
import { TeamIntroBannerBlock } from "../TeamIntroBannerBlock";
import { TeamIntroPageContent } from "../TeamIntroPageContent";

export function TeamPublicDetailView({
    team,
    isFavorite,
    onBackToTeams,
    bannerActions,
    onAddFavorite,
    onRemoveFavorite,
    joinRequestPending = false,
    onRequestJoin,
}: {
    team: TeamDetail;
    isFavorite: boolean;
    onBackToTeams: () => void;
    bannerActions: TeamBannerActions;
    onAddFavorite: () => Promise<{ ok: boolean; message?: string }>;
    onRemoveFavorite: () => Promise<{ ok: boolean; message?: string }>;
    joinRequestPending?: boolean;
    onRequestJoin?: () => Promise<{ ok: boolean; message?: string }>;
}) {
    const t = useTranslations("teams.detail");
    const memberCount = team._count?.members ?? team.members.length;
    const [applied, setApplied] = useState(joinRequestPending);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setApplied(joinRequestPending);
    }, [joinRequestPending, team.id]);

    async function handleRequestJoin() {
        if (!onRequestJoin || applied || busy) return;
        setError(null);
        setBusy(true);
        try {
            const r = await onRequestJoin();
            if (r.ok) {
                setApplied(true);
            } else {
                setError(r.message ?? t("public.requestJoinFailed"));
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="flex min-h-full w-full flex-col">
            <TeamIntroBannerBlock
                teamId={team.id}
                bannerUrl={team.bannerUrl}
                canEdit={false}
                variant="pageTop"
                bannerActions={bannerActions}
            />
            <div className="border-b border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-4 py-3 sm:px-5 md:px-6">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onBackToTeams}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 dark:text-elivis-ink-secondary transition-colors hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated hover:text-stone-700"
                        aria-label={t("aria.backToTeams")}
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <h1 className="truncate text-lg font-semibold text-stone-800 dark:text-elivis-ink sm:text-xl">
                                {team.name}
                            </h1>
                            <TeamFavoriteButton
                                teamId={team.id}
                                initialIsFavorite={isFavorite}
                                size="sm"
                                onAdd={onAddFavorite}
                                onRemove={onRemoveFavorite}
                            />
                        </div>
                        <p className="truncate text-xs text-stone-500 dark:text-elivis-ink-secondary sm:text-sm">
                            {team.shortDescription?.trim() || t("public.shortDescriptionFallback")}
                        </p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-sm font-medium text-stone-600 dark:text-elivis-ink-secondary">
                        {t("labels.membersCount", { count: memberCount })}
                    </span>
                </div>
            </div>

            <div className="border-b border-stone-200 dark:border-elivis-line bg-amber-50/60 px-4 py-2.5 sm:px-5 md:px-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <p className="text-sm text-stone-700 dark:text-elivis-ink">{t("public.notMemberNotice")}</p>
                    {onRequestJoin ? (
                        <button
                            type="button"
                            onClick={handleRequestJoin}
                            disabled={applied || busy}
                            className="shrink-0 rounded-lg bg-stone-800 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
                        >
                            {applied
                                ? t("public.requestJoinPending")
                                : busy
                                  ? t("public.requestJoinSending")
                                  : t("public.requestJoin")}
                        </button>
                    ) : null}
                </div>
                {error ? <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p> : null}
            </div>

            <div className="min-h-0 flex-1 p-4 sm:p-5 md:p-6">
                <TeamIntroPageContent team={team} showFullRoster={false} />
            </div>
        </div>
    );
}
