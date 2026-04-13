"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { MyWorkOverviewClient, type WorkspaceDataItem } from "@/app/(main)/mywork/MyWorkOverviewClient";

import { MyPerformanceOverviewClient } from "./MyPerformanceOverviewClient";
import { filterWorkspaceDataByTeamId } from "./performance-team-groups";

export function AdminPerformanceShell({
    workspaceDataList,
    currentUserId,
}: {
    workspaceDataList: WorkspaceDataItem[];
    currentUserId: string;
}) {
    const t = useTranslations("myworkPerformance");
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

    const filteredList = !selectedTeamId
        ? workspaceDataList
        : filterWorkspaceDataByTeamId(workspaceDataList, selectedTeamId);

    return (
        <div className="flex min-h-full w-full flex-col">
            <MyPerformanceOverviewClient
                workspaceDataList={workspaceDataList}
                currentUserId={currentUserId}
                selectedTeamId={selectedTeamId}
                onSelectTeam={setSelectedTeamId}
            />

            <div className="border-b border-stone-200 dark:border-elivis-line bg-stone-50/50 px-4 py-3 sm:px-6">
                <h2 className="text-sm font-semibold text-stone-800 dark:text-elivis-ink">{t("timelineSectionTitle")}</h2>
            </div>

            {selectedTeamId ? (
                <MyWorkOverviewClient
                    workspaceDataList={filteredList}
                    timelineOnly
                    minimalChrome
                />
            ) : (
                <div className="flex flex-1 flex-col items-center justify-center bg-stone-50/40 px-4 py-20 text-center dark:bg-elivis-bg/60">
                    <p className="max-w-sm text-sm text-stone-500 dark:text-elivis-ink-secondary">{t("selectTeamForTimeline")}</p>
                </div>
            )}
        </div>
    );
}
