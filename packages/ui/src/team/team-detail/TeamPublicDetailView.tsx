"use client";

import { useTranslations } from "next-intl";

import type { TeamBannerActions, UpdateTeamFieldsFn } from "../../types/team-fields-actions";
import type { TeamDetail } from "../../types/team-detail";
import { TeamFavoriteButton } from "../../TeamFavoriteButton";
import { TeamIntroBannerBlock } from "../TeamIntroBannerBlock";
import { TeamIntroPageContent } from "../TeamIntroPageContent";

export function TeamPublicDetailView({
    team,
    isFavorite,
    onBackToTeams,
    bannerActions,
    updateTeamFields,
    onAfterTeamFieldsMutation,
    onAddFavorite,
    onRemoveFavorite,
}: {
    team: TeamDetail;
    isFavorite: boolean;
    onBackToTeams: () => void;
    bannerActions: TeamBannerActions;
    updateTeamFields: UpdateTeamFieldsFn;
    onAfterTeamFieldsMutation: () => void;
    onAddFavorite: () => Promise<{ ok: boolean; message?: string }>;
    onRemoveFavorite: () => Promise<{ ok: boolean; message?: string }>;
}) {
    const t = useTranslations("teams.detail");
    const memberCount = team._count?.members ?? team.members.length;

    return (
        <div className="flex min-h-full w-full flex-col">
            <TeamIntroBannerBlock
                teamId={team.id}
                bannerUrl={team.bannerUrl}
                canEdit={false}
                variant="pageTop"
                bannerActions={bannerActions}
            />
            <div className="border-b border-stone-200 bg-white px-4 py-3 sm:px-5 md:px-6">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onBackToTeams}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
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
                            <h1 className="truncate text-lg font-semibold text-stone-800 sm:text-xl">
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
                        <p className="truncate text-xs text-stone-500 sm:text-sm">
                            {team.shortDescription?.trim() || t("public.shortDescriptionFallback")}
                        </p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-sm font-medium text-stone-600">
                        {t("labels.membersCount", { count: memberCount })}
                    </span>
                </div>
            </div>

            <div className="border-b border-stone-200 bg-amber-50/60 px-4 py-2.5 text-sm text-stone-700 sm:px-5 md:px-6">
                {t("public.notMemberNotice")}
            </div>

            <div className="min-h-0 flex-1 p-4 sm:p-5 md:p-6">
                <TeamIntroPageContent
                    team={team}
                    updateTeamFields={updateTeamFields}
                    onAfterTeamFieldsMutation={onAfterTeamFieldsMutation}
                />
            </div>
        </div>
    );
}
