"use client";

import { useMemo } from "react";
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
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400"
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

    const statusById = useMemo(() => new Map(statuses.map((s) => [s.id, s])), [statuses]);

    const topTasks = tasks.filter((t) => !t.parentId && !taskIsSemanticDone(t, statusById));

    const completedTopTasks = useMemo(() => {
        const map = new Map(statuses.map((s) => [s.id, s]));
        return tasks
            .filter((task) => !task.parentId && taskIsSemanticDone(task, map))
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }, [tasks, statuses]);

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
        { key: "overdue",  label: t("timeline.overdue"),   badge: "bg-red-100 text-red-700",       dot: "bg-red-500",    items: overdue },
        { key: "today",    label: t("timeline.today"),     badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500", items: dueToday },
        { key: "soon",     label: t("timeline.soon"),      badge: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500", items: dueSoon },
        { key: "week",     label: t("timeline.thisWeek"),  badge: "bg-blue-100 text-blue-700",     dot: "bg-blue-400",   items: thisWeek },
        { key: "later",    label: t("timeline.later"),     badge: "bg-stone-100 text-stone-600",   dot: "bg-stone-400",  items: later },
        { key: "nodate",   label: t("timeline.noDate"),    badge: "bg-stone-100 text-stone-500",   dot: "bg-stone-300",  items: noDate },
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
                        <p className="mt-3 text-center text-sm font-semibold text-stone-700">
                            {t("timeline.allDone")}
                        </p>
                        <p className="mt-1 text-center text-xs text-stone-400">{t("timeline.allDoneDesc")}</p>
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
        if (d === null) return "text-stone-400";
        if (d < 0) return "text-red-500 font-semibold";
        if (d === 0) return "text-orange-500 font-semibold";
        if (d <= 3) return "text-yellow-600";
        return "text-stone-500";
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
                                <span className="mt-1 text-[10px] text-stone-400">{t("timeline.items", { count: group.items.length })}</span>
                            </div>
                            {/* 타임라인 선 */}
                            <div className="relative flex w-8 shrink-0 flex-col items-center">
                                <div className={`mt-[22px] h-3 w-3 shrink-0 rounded-full border-2 border-white ring-2 ring-offset-1 ${group.dot}`} />
                                {(gi < groups.length - 1 || (showCompleted && hasCompletedList)) && (
                                    <div className="mt-1 w-0.5 flex-1 bg-stone-200" />
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
                                <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                                    {tm("completedSectionTitle")}
                                </span>
                                <span className="mt-1 text-[10px] text-stone-400">
                                    {t("timeline.items", { count: completedTopTasks.length })}
                                </span>
                            </div>
                            <div className="relative flex w-8 shrink-0 flex-col items-center">
                                <div className="mt-[22px] h-3 w-3 shrink-0 rounded-full border-2 border-white bg-green-500 ring-2 ring-green-200 ring-offset-1" />
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