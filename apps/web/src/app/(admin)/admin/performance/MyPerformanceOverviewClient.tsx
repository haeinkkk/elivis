"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import {
    calculateWorkloadScore,
    getWorkloadBand,
    WORKLOAD_CHART_MAX_SCORE,
    workloadTaskFromProjectTask,
    type WorkloadBand,
} from "@repo/ui";

import { computeStats, StatsRow, type WorkspaceDataItem } from "@/app/(main)/mywork/MyWorkOverviewClient";

function bandBadgeClass(band: WorkloadBand): string {
    switch (band) {
        case "relaxed":
            return "bg-emerald-100 text-emerald-800 ring-emerald-200";
        case "normal":
            return "bg-sky-100 text-sky-800 ring-sky-200";
        case "overload":
            return "bg-amber-100 text-amber-900 ring-amber-200";
        default:
            return "bg-red-100 text-red-800 ring-red-200";
    }
}

function bandBarClass(band: WorkloadBand): string {
    switch (band) {
        case "relaxed":
            return "bg-emerald-500";
        case "normal":
            return "bg-sky-500";
        case "overload":
            return "bg-amber-500";
        default:
            return "bg-red-500";
    }
}

function bandLabelKey(
    band: WorkloadBand,
): "bandRelaxed" | "bandNormal" | "bandOverload" | "bandDanger" {
    switch (band) {
        case "relaxed":
            return "bandRelaxed";
        case "normal":
            return "bandNormal";
        case "overload":
            return "bandOverload";
        default:
            return "bandDanger";
    }
}

function diagnosisKeyFromBand(
    band: WorkloadBand,
): "diagnosisRelaxed" | "diagnosisNormal" | "diagnosisOverload" | "diagnosisDanger" {
    switch (band) {
        case "relaxed":
            return "diagnosisRelaxed";
        case "normal":
            return "diagnosisNormal";
        case "overload":
            return "diagnosisOverload";
        default:
            return "diagnosisDanger";
    }
}

type TeamPerformanceSection = {
    id: string;
    name: string;
    items: WorkspaceDataItem[];
};

function buildTeamSections(list: WorkspaceDataItem[]): TeamPerformanceSection[] {
    const map = new Map<string, { name: string; ids: Set<string>; items: WorkspaceDataItem[] }>();

    for (const item of list) {
        const teams = [
            item.workspace.project.team,
            ...item.workspace.project.projectTeams.map((pt) => pt.team),
        ].filter(Boolean) as { id: string; name: string }[];

        if (teams.length === 0) {
            const id = "__personal__";
            let e = map.get(id);
            if (!e) {
                e = { name: "", ids: new Set(), items: [] };
                map.set(id, e);
            }
            if (!e.ids.has(item.workspace.id)) {
                e.ids.add(item.workspace.id);
                e.items.push(item);
            }
            continue;
        }

        const seenTeam = new Set<string>();
        for (const t of teams) {
            if (seenTeam.has(t.id)) continue;
            seenTeam.add(t.id);
            let e = map.get(t.id);
            if (!e) {
                e = { name: t.name, ids: new Set(), items: [] };
                map.set(t.id, e);
            }
            if (!e.ids.has(item.workspace.id)) {
                e.ids.add(item.workspace.id);
                e.items.push(item);
            }
        }
    }

    return [...map.entries()]
        .map(([id, v]) => ({ id, name: v.name, items: v.items }))
        .sort((a, b) => {
            if (a.id === "__personal__") return 1;
            if (b.id === "__personal__") return -1;
            return a.name.localeCompare(b.name, "ko");
        });
}

function workloadForUserInItems(items: WorkspaceDataItem[], userId: string, now: Date) {
    const wtasks = [];
    for (const { tasks, statuses } of items) {
        const statusById = new Map(statuses.map((s) => [s.id, { semantic: s.semantic }]));
        for (const task of tasks) {
            if (task.assignee?.id !== userId) continue;
            wtasks.push(workloadTaskFromProjectTask(task, statusById));
        }
    }
    return calculateWorkloadScore(wtasks, now);
}

function activeAssignedTopLevelCount(items: WorkspaceDataItem[], userId: string): number {
    let n = 0;
    for (const { tasks, statuses } of items) {
        for (const t of tasks) {
            if (t.parentId) continue;
            if (t.assignee?.id !== userId) continue;
            const sem = statuses.find((s) => s.id === t.statusId)?.semantic;
            if (sem === "DONE") continue;
            n++;
        }
    }
    return n;
}

export function MyPerformanceOverviewClient({
    workspaceDataList,
    currentUserId,
}: {
    workspaceDataList: WorkspaceDataItem[];
    currentUserId: string;
}) {
    const t = useTranslations("myworkPerformance");
    const tm = useTranslations("mywork");
    const tp = useTranslations("projects.detail.performance");

    const now = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const stats = computeStats(workspaceDataList);
    const teamSections = useMemo(() => buildTeamSections(workspaceDataList), [workspaceDataList]);

    const globalWorkload = useMemo(
        () => workloadForUserInItems(workspaceDataList, currentUserId, now),
        [workspaceDataList, currentUserId, now],
    );
    const globalBand = getWorkloadBand(globalWorkload.total);
    const barPct = Math.min(100, (globalWorkload.total / WORKLOAD_CHART_MAX_SCORE) * 100);

    return (
        <div className="border-b border-stone-200 bg-white">
            <div className="px-4 py-4 sm:px-6">
                <h1 className="text-lg font-bold text-stone-800 sm:text-xl">{t("title")}</h1>
                <p className="mt-0.5 text-xs text-stone-500 sm:text-sm">{t("subtitle")}</p>
            </div>

            <div className="border-t border-stone-100 px-4 py-4 sm:px-6">
                <StatsRow {...stats} />
            </div>

            <div className="border-t border-stone-100 px-4 py-5 sm:px-6">
                <h2 className="text-sm font-semibold text-stone-800">{tp("workloadTitle")}</h2>
                <p className="mt-1 text-xs text-stone-500">{tp("workloadSubtitle")}</p>
                <p className="mt-1 text-[11px] text-stone-400">{tp("workloadFormula")}</p>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-medium text-stone-500">{t("myWorkloadCaption")}</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-stone-900">
                            {Math.round(globalWorkload.total * 10) / 10}
                            <span className="ml-1 text-sm font-medium text-stone-500">
                                {tp("scoreUnit")}
                            </span>
                        </p>
                    </div>
                    <span
                        className={`inline-flex w-fit items-center rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ${bandBadgeClass(globalBand)}`}
                    >
                        {tp(bandLabelKey(globalBand))}
                    </span>
                </div>

                <div className="mt-3">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
                        <div
                            className={`h-full rounded-full transition-all ${bandBarClass(globalBand)}`}
                            style={{ width: `${barPct}%` }}
                        />
                    </div>
                    <p className="mt-1 text-[11px] text-stone-400">
                        {tp("chartScaleHint", { max: WORKLOAD_CHART_MAX_SCORE })}
                    </p>
                </div>

                <p className="mt-3 text-sm text-stone-700">{tp(diagnosisKeyFromBand(globalBand))}</p>
            </div>

            <div className="border-t border-stone-100 px-4 py-5 sm:px-6">
                <h2 className="text-sm font-semibold text-stone-800">{t("teamSectionTitle")}</h2>
                <p className="mt-1 text-xs text-stone-500">{t("teamSectionSubtitle")}</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {teamSections.length === 0 ? (
                        <p className="col-span-full text-sm text-stone-500">{t("teamSectionEmpty")}</p>
                    ) : null}
                    {teamSections.map((section) => {
                        const { total } = workloadForUserInItems(section.items, currentUserId, now);
                        const band = getWorkloadBand(total);
                        const bar = Math.min(100, (total / WORKLOAD_CHART_MAX_SCORE) * 100);
                        const displayName =
                            section.id === "__personal__" ? tm("personalProject") : section.name;
                        const activeMine = activeAssignedTopLevelCount(section.items, currentUserId);
                        const wsCount = section.items.length;

                        return (
                            <div
                                key={section.id}
                                className="rounded-2xl border border-stone-200 bg-stone-50/40 p-4 shadow-sm"
                            >
                                <p className="text-sm font-semibold text-stone-800">{displayName}</p>
                                <p className="mt-0.5 text-[11px] text-stone-500">
                                    {t("teamMeta", { workspaces: wsCount, tasks: activeMine })}
                                </p>
                                <div className="mt-3 flex items-center justify-between gap-2">
                                    <span className="text-lg font-bold tabular-nums text-stone-900">
                                        {Math.round(total * 10) / 10}
                                        <span className="ml-0.5 text-xs font-medium text-stone-500">
                                            {tp("scoreUnit")}
                                        </span>
                                    </span>
                                    <span
                                        className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ${bandBadgeClass(band)}`}
                                    >
                                        {tp(bandLabelKey(band))}
                                    </span>
                                </div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200/80">
                                    <div
                                        className={`h-full rounded-full ${bandBarClass(band)}`}
                                        style={{ width: `${bar}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
