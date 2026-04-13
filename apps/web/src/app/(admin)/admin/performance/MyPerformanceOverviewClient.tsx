"use client";

import { useTranslations } from "next-intl";

import {
    calculateWorkloadScore,
    getWorkloadBand,
    WORKLOAD_CHART_MAX_SCORE,
    workloadTaskFromProjectTask,
    type WorkloadBand,
} from "@repo/ui";

import {
    computeTeamTaskMetrics,
    type WorkspaceDataItem,
} from "@/app/(main)/mywork/MyWorkOverviewClient";

import { buildTeamSections, type TeamPerformanceSection } from "./performance-team-groups";

function bandBadgeClass(band: WorkloadBand): string {
    switch (band) {
        case "relaxed":
            return "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800/50";
        case "normal":
            return "bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-100 dark:ring-sky-800/50";
        case "overload":
            return "bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950/35 dark:text-amber-100 dark:ring-amber-800/50";
        default:
            return "bg-red-100 text-red-800 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900/60";
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

function TeamStatsDashboardFixed({
    sections,
    personalLabel,
    teamColumnLabel,
    emptyLabel,
}: {
    sections: TeamPerformanceSection[];
    personalLabel: string;
    teamColumnLabel: string;
    emptyLabel: string;
}) {
    const td = useTranslations("workspace.dashboard");

    const cols = [
        { key: "total" as const, label: td("totalTasks") },
        { key: "completed" as const, label: td("completed") },
        { key: "inProgress" as const, label: td("statInProgress") },
        { key: "onHold" as const, label: td("statOnHold") },
        { key: "overdue" as const, label: td("statOverdue") },
        { key: "dueWithin3" as const, label: td("dueSoon") },
    ];

    return (
        <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-elivis-line bg-stone-50/50 dark:bg-elivis-surface/40">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                    <tr className="border-b border-stone-200 dark:border-elivis-line bg-white/90 dark:bg-elivis-surface/90">
                        <th className="sticky left-0 z-[1] min-w-[140px] border-r border-stone-100 dark:border-elivis-line bg-white dark:bg-elivis-surface px-3 py-2.5 text-xs font-semibold text-stone-600 dark:text-elivis-ink-secondary">
                            {teamColumnLabel}
                        </th>
                        {cols.map((c) => (
                            <th
                                key={c.key}
                                className="px-2 py-2.5 text-center text-[11px] font-semibold text-stone-500 dark:text-elivis-ink-secondary"
                            >
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sections.length === 0 ? (
                        <tr>
                            <td
                                colSpan={1 + cols.length}
                                className="px-3 py-8 text-center text-sm text-stone-500 dark:text-elivis-ink-secondary"
                            >
                                {emptyLabel}
                            </td>
                        </tr>
                    ) : (
                        sections.map((section) => {
                            const m = computeTeamTaskMetrics(section.items);
                            const rowVals = {
                                total: m.total,
                                completed: m.completed,
                                inProgress: m.inProgress,
                                onHold: m.onHold,
                                overdue: m.overdue,
                                dueWithin3: m.dueWithin3,
                            };
                            const teamName =
                                section.id === "__personal__" ? personalLabel : section.name;
                            return (
                                <tr
                                    key={section.id}
                                    className="border-b border-stone-100 dark:border-elivis-line last:border-b-0"
                                >
                                    <td className="sticky left-0 z-[1] border-r border-stone-100 dark:border-elivis-line bg-white dark:bg-elivis-surface px-3 py-2 text-xs font-semibold text-stone-800 dark:text-elivis-ink">
                                        {teamName}
                                    </td>
                                    {cols.map((c) => (
                                        <td
                                            key={c.key}
                                            className="px-1 py-2 text-center tabular-nums text-stone-900 dark:text-elivis-ink"
                                        >
                                            <span className="inline-block min-w-[2rem] text-sm font-semibold">
                                                {rowVals[c.key]}
                                            </span>
                                        </td>
                                    ))}
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
}

export function MyPerformanceOverviewClient({
    workspaceDataList,
    currentUserId,
    selectedTeamId,
    onSelectTeam,
}: {
    workspaceDataList: WorkspaceDataItem[];
    currentUserId: string;
    selectedTeamId: string | null;
    onSelectTeam: (teamId: string | null) => void;
}) {
    const t = useTranslations("myworkPerformance");
    const tm = useTranslations("mywork");
    const tp = useTranslations("projects.detail.performance");

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const teamSections = buildTeamSections(workspaceDataList);

    return (
        <div className="border-b border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface">
            <div className="px-4 py-4 sm:px-6">
                <h1 className="text-lg font-bold text-stone-800 dark:text-elivis-ink sm:text-xl">{t("title")}</h1>
            </div>

            {/* 1) 팀별 업무 건수 대시보드 */}
            <div className="border-t border-stone-100 dark:border-elivis-line px-4 py-4 sm:px-6">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-elivis-ink-secondary">
                    {t("adminDashboardTitle")}
                </h2>
                <TeamStatsDashboardFixed
                    sections={teamSections}
                    personalLabel={tm("personalProject")}
                    teamColumnLabel={t("adminDashboardTeamCol")}
                    emptyLabel={t("teamSectionEmpty")}
                />
            </div>

            {/* 2) 팀별 과부하 — 클릭 시 하단 타임라인 */}
            <div className="border-t border-stone-100 dark:border-elivis-line px-4 py-5 sm:px-6">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-elivis-ink-secondary">
                    {t("adminWorkloadSectionTitle")}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {teamSections.length === 0 ? (
                        <p className="col-span-full text-sm text-stone-500 dark:text-elivis-ink-secondary">{t("teamSectionEmpty")}</p>
                    ) : null}
                    {teamSections.map((section) => {
                        const { total } = workloadForUserInItems(section.items, currentUserId, now);
                        const band = getWorkloadBand(total);
                        const bar = Math.min(100, (total / WORKLOAD_CHART_MAX_SCORE) * 100);
                        const displayName =
                            section.id === "__personal__" ? tm("personalProject") : section.name;
                        const isSelected = selectedTeamId === section.id;

                        return (
                            <button
                                key={section.id}
                                type="button"
                                onClick={() =>
                                    onSelectTeam(selectedTeamId === section.id ? null : section.id)
                                }
                                className={[
                                    "rounded-2xl border p-4 text-left shadow-sm transition-colors dark:shadow-none",
                                    isSelected
                                        ? "border-stone-800 bg-stone-50 ring-2 ring-stone-800/20 dark:border-elivis-accent dark:bg-elivis-accent-strong/15 dark:ring-elivis-accent/30"
                                        : "border-stone-200 bg-stone-50/40 hover:border-stone-300 dark:border-elivis-line dark:bg-elivis-surface/60 dark:hover:border-elivis-ink-muted",
                                ].join(" ")}
                            >
                                <p className="text-sm font-semibold text-stone-800 dark:text-elivis-ink">{displayName}</p>
                                <div className="mt-3 flex items-center justify-between gap-2">
                                    <span className="text-lg font-bold tabular-nums text-stone-900 dark:text-elivis-ink">
                                        {Math.round(total * 10) / 10}
                                        <span className="ml-0.5 text-xs font-medium text-stone-500 dark:text-elivis-ink-secondary">
                                            {tp("scoreUnit")}
                                        </span>
                                    </span>
                                    <span
                                        className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ${bandBadgeClass(band)}`}
                                    >
                                        {tp(bandLabelKey(band))}
                                    </span>
                                </div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200/80 dark:bg-elivis-line/80">
                                    <div
                                        className={`h-full rounded-full ${bandBarClass(band)}`}
                                        style={{ width: `${bar}%` }}
                                    />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
