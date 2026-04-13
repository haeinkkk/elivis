"use client";

import { useTranslations } from "next-intl";

import type { ApiWorkspaceStatus, ApiWorkspaceTask } from "../types/workspace-api";
import type { WorkspaceDetailMyWorkMutations } from "../types/workspace-detail-mutations";
import { resolveTaskSemanticBucket } from "../project/project-detail/project-detail-helpers";

import { SummaryTimelineTaskCard } from "./SummaryTimelineTaskCard";
import { tagColorOf } from "../utils/tag-colors";

function taskIsSemanticDone(
    task: ApiWorkspaceTask,
    statusById: Map<string, ApiWorkspaceStatus>,
): boolean {
    const s = statusById.get(task.statusId);
    return (
        resolveTaskSemanticBucket(
            s ?? {
                semantic: task.status.semantic,
                color: task.status.color,
                name: task.status.name,
            },
        ) === "DONE"
    );
}

function AllClearIllustration() {
    return (
        <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 dark:bg-elivis-surface-elevated text-stone-400 dark:text-elivis-ink-secondary"
            aria-hidden
        >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
        </span>
    );
}

export function TimelineTab({
    tasks,
    statuses,
    workspaceId,
    updateWorkspaceTask,
    onTaskUpdate,
    onSelectTask,
    showCompleted = false,
}: {
    tasks: ApiWorkspaceTask[];
    statuses: ApiWorkspaceStatus[];
    workspaceId: string;
    updateWorkspaceTask: WorkspaceDetailMyWorkMutations["updateWorkspaceTask"];
    onTaskUpdate: (t: ApiWorkspaceTask) => void;
    onSelectTask?: (task: ApiWorkspaceTask) => void;
    /** 켜면 하단에 완료된 상위 업무 섹션 표시 */
    showCompleted?: boolean;
}) {
    const t = useTranslations("workspace");
    const tm = useTranslations("mywork");
    const todayRaw = new Date();
    todayRaw.setHours(0, 0, 0, 0);
    const today = todayRaw.getTime();

    const statusById = new Map(statuses.map((s) => [s.id, s]));

    const topTasks = tasks.filter((t) => !t.parentId && !taskIsSemanticDone(t, statusById));

    const completedTopTasks = tasks
        .filter((task) => !task.parentId && taskIsSemanticDone(task, statusById))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    function diffDays(t: ApiWorkspaceTask) {
        if (!t.dueDate) return null;
        const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
        return Math.round((d.getTime() - today) / 86400000);
    }

    function priorityScore(t: ApiWorkspaceTask) {
        return t.priority?.value ?? 0;
    }

    function sortByPriority(arr: ApiWorkspaceTask[]) {
        return [...arr].sort((a, b) => {
            const dd = (diffDays(a) ?? 9999) - (diffDays(b) ?? 9999);
            if (dd !== 0) return dd;
            return priorityScore(b) - priorityScore(a);
        });
    }

    const overdue   = sortByPriority(topTasks.filter((t) => { const d = diffDays(t); return d !== null && d < 0; }));
    const dueToday  = sortByPriority(topTasks.filter((t) => diffDays(t) === 0));
    const dueSoon   = sortByPriority(topTasks.filter((t) => { const d = diffDays(t); return d !== null && d >= 1 && d <= 3; }));
    const thisWeek  = sortByPriority(topTasks.filter((t) => { const d = diffDays(t); return d !== null && d >= 4 && d <= 7; }));
    const later     = sortByPriority(topTasks.filter((t) => { const d = diffDays(t); return d !== null && d > 7; }));
    const noDate    = [...topTasks.filter((t) => !t.dueDate)].sort((a, b) => priorityScore(b) - priorityScore(a));

    const groups = [
        {
            key: "overdue",
            label: t("timeline.overdue"),
            badge: "bg-red-100 text-red-700 dark:bg-red-950/45 dark:text-red-300",
            dot: "bg-red-500 dark:bg-red-400",
            items: overdue,
        },
        {
            key: "today",
            label: t("timeline.today"),
            badge: "bg-orange-100 text-orange-700 dark:bg-elivis-accent-strong/35 dark:text-elivis-accent-hover",
            dot: "bg-orange-500 dark:bg-elivis-accent",
            items: dueToday,
        },
        {
            key: "soon",
            label: t("timeline.soon"),
            badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-200",
            dot: "bg-yellow-500 dark:bg-yellow-400",
            items: dueSoon,
        },
        {
            key: "week",
            label: t("timeline.thisWeek"),
            badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
            dot: "bg-blue-400 dark:bg-blue-400",
            items: thisWeek,
        },
        {
            key: "later",
            label: t("timeline.later"),
            badge: "bg-stone-100 text-stone-600 dark:bg-elivis-surface-elevated dark:text-elivis-ink-secondary",
            dot: "bg-stone-400 dark:bg-elivis-ink-muted",
            items: later,
        },
        {
            key: "nodate",
            label: t("timeline.noDate"),
            badge: "bg-stone-100 text-stone-500 dark:bg-elivis-surface-elevated dark:text-elivis-ink-muted",
            dot: "bg-stone-300 dark:bg-elivis-ink-secondary",
            items: noDate,
        },
    ].filter((g) => g.items.length > 0);

    const hasCompletedList = completedTopTasks.length > 0;

    if (groups.length === 0 && !(showCompleted && hasCompletedList)) {
        return (
            <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex flex-1 items-center justify-center px-4 py-20">
                    <div className="mx-auto w-full max-w-md text-center">
                        <div className="flex justify-center" aria-hidden>
                            <AllClearIllustration />
                        </div>
                        <p className="mt-3 text-center text-sm font-semibold text-stone-700 dark:text-elivis-ink">
                            {t("timeline.allDone")}
                        </p>
                        <p className="mt-1 text-center text-xs text-stone-400 dark:text-elivis-ink-secondary">{t("timeline.allDoneDesc")}</p>
                    </div>
                </div>
            </div>
        );
    }

    function dueDateLabel(task: ApiWorkspaceTask) {
        const d = diffDays(task);
        if (d === null) return t("timeline.dateNone");
        if (d < 0) return t("timeline.daysOverdue", { count: Math.abs(d) });
        if (d === 0) return t("timeline.todayLabel");
        return t("timeline.daysLeft", { count: d });
    }

    function dueDateColor(t: ApiWorkspaceTask) {
        const d = diffDays(t);
        if (d === null) return "text-stone-400 dark:text-elivis-ink-secondary";
        if (d < 0) return "font-semibold text-red-500 dark:text-red-400";
        if (d === 0) return "font-semibold text-orange-500 dark:text-elivis-accent-hover";
        if (d <= 3) return "text-yellow-600 dark:text-yellow-300";
        return "text-stone-500 dark:text-elivis-ink-secondary";
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex h-full min-h-0 flex-1 overflow-y-auto">
                <div className="flex w-full flex-col">
                    {groups.map((group, gi) => (
                        <div key={group.key} className="flex min-h-0">
                            {/* 라벨 */}
                            <div className="flex w-36 shrink-0 flex-col items-end pr-5 pt-5">
                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${group.badge}`}>
                                    {group.label}
                                </span>
                                <span className="mt-1 text-[10px] text-stone-400 dark:text-elivis-ink-secondary">{t("timeline.items", { count: group.items.length })}</span>
                            </div>
                            {/* 타임라인 선 */}
                            <div className="relative flex w-8 shrink-0 flex-col items-center">
                                <div
                                    className={`mt-[22px] h-3 w-3 shrink-0 rounded-full border-2 border-stone-100 ring-2 ring-stone-200/90 ring-offset-1 ring-offset-stone-100 dark:border-elivis-bg dark:ring-elivis-line dark:ring-offset-elivis-bg ${group.dot}`}
                                />
                                {(gi < groups.length - 1 || (showCompleted && hasCompletedList)) && (
                                    <div className="mt-1 w-0.5 flex-1 bg-stone-200 dark:bg-elivis-surface-elevated" />
                                )}
                            </div>
                            {/* 업무 카드 */}
                            <div className="flex-1 space-y-2 pb-6 pl-4 pr-5 pt-4">
                                {group.items.map((task) => {
                                    const statusColor = tagColorOf(task.status.color);
                                    const priorityColor = task.priority ? tagColorOf(task.priority.color) : null;
                                    return (
                                        <SummaryTimelineTaskCard
                                            key={task.id}
                                            task={task}
                                            workspaceId={workspaceId}
                                            updateWorkspaceTask={updateWorkspaceTask}
                                            onTaskUpdate={onTaskUpdate}
                                            onSelectTask={onSelectTask}
                                            statusColor={statusColor}
                                            priorityColor={priorityColor}
                                            dueLabel={dueDateLabel(task)}
                                            dueClass={dueDateColor(task)}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {showCompleted && hasCompletedList && (
                        <div className="flex min-h-0">
                            <div className="flex w-36 shrink-0 flex-col items-end pr-5 pt-5">
                                <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800 dark:bg-emerald-950/45 dark:text-green-300">
                                    {tm("completedSectionTitle")}
                                </span>
                                <span className="mt-1 text-[10px] text-stone-400 dark:text-elivis-ink-secondary">
                                    {t("timeline.items", { count: completedTopTasks.length })}
                                </span>
                            </div>
                            <div className="relative flex w-8 shrink-0 flex-col items-center">
                                <div className="mt-[22px] h-3 w-3 shrink-0 rounded-full border-2 border-stone-100 bg-green-500 ring-2 ring-green-200 ring-offset-1 ring-offset-stone-100 dark:border-elivis-bg dark:bg-emerald-500 dark:ring-emerald-900/60 dark:ring-offset-elivis-bg" />
                            </div>
                            <div className="flex-1 space-y-2 pb-6 pl-4 pr-5 pt-4">
                                {completedTopTasks.map((task) => {
                                    const statusColor = tagColorOf(task.status.color);
                                    const priorityColor = task.priority ? tagColorOf(task.priority.color) : null;
                                    return (
                                        <SummaryTimelineTaskCard
                                            key={task.id}
                                            task={task}
                                            workspaceId={workspaceId}
                                            updateWorkspaceTask={updateWorkspaceTask}
                                            onTaskUpdate={onTaskUpdate}
                                            onSelectTask={onSelectTask}
                                            statusColor={statusColor}
                                            priorityColor={priorityColor}
                                            dueLabel={dueDateLabel(task)}
                                            dueClass={dueDateColor(task)}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}