"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { updateWorkspaceTaskAction } from "@/app/actions/workspaces";
import { formatTaskTitleForList } from "@/lib/display/task-title";
import { workspaceTaskPanelActions } from "@/lib/ui/workspace-task-panel-actions";
import type {
    ApiWorkspaceListItem,
    ApiWorkspacePriority,
    ApiWorkspaceStatus,
    ApiWorkspaceTask,
} from "@/lib/mappers/workspace";
import { tagColorOf, WorkspaceTaskDetailPanel as TaskDetailPanel } from "@repo/ui";

/** 타임라인에 남은 업무가 없을 때 — 이모지 대신 톤다운된 아이콘 */
function AllDoneIllustration() {
    return (
        <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400"
            aria-hidden
        >
            <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

export type WorkspaceDataItem = {
    workspace: ApiWorkspaceListItem;
    tasks: ApiWorkspaceTask[];
    statuses: ApiWorkspaceStatus[];
    priorities: ApiWorkspacePriority[];
};

type SelectedTaskInfo = {
    task: ApiWorkspaceTask;
    workspaceId: string;
    statuses: ApiWorkspaceStatus[];
    priorities: ApiWorkspacePriority[];
};

type ViewMode = "combined" | "by-workspace";

/** 상태 의미(semantic)가 DONE인 경우만 완료로 집계 */
function isTaskDoneBySemantic(statuses: ApiWorkspaceStatus[], statusId: string): boolean {
    const s = statuses.find((x) => x.id === statusId);
    return s?.semantic === "DONE";
}

// ─────────────────────────────────────────────────────────────────────────────
// 통계 계산
// ─────────────────────────────────────────────────────────────────────────────

function computeStats(list: WorkspaceDataItem[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let total = 0,
        completed = 0,
        overdue = 0,
        dueSoon = 0;

    for (const { tasks, statuses } of list) {
        const topTasks = tasks.filter((t) => !t.parentId);
        const isDone = (t: ApiWorkspaceTask) => isTaskDoneBySemantic(statuses, t.statusId);

        for (const task of topTasks) {
            total++;
            if (isDone(task)) {
                completed++;
                continue;
            }
            if (task.dueDate) {
                const due = new Date(task.dueDate);
                due.setHours(0, 0, 0, 0);
                const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
                if (diff < 0) overdue++;
                else if (diff <= 3) dueSoon++;
            }
        }
    }

    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, overdue, dueSoon, pct };
}

// ─────────────────────────────────────────────────────────────────────────────
// 타임라인 그룹화
// ─────────────────────────────────────────────────────────────────────────────

type EnrichedTask = ApiWorkspaceTask & {
    _workspaceId: string;
    _workspaceName: string;
    _statuses: ApiWorkspaceStatus[];
    _priorities: ApiWorkspacePriority[];
};

type TimelineGroupLabels = {
    overdue: string;
    today: string;
    soon: string;
    week: string;
    later: string;
    nodate: string;
};

function groupByDeadline(
    tasks: EnrichedTask[],
    allStatuses: ApiWorkspaceStatus[],
    labels: TimelineGroupLabels,
) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const isDone = (t: EnrichedTask) => {
        const statuses = t._statuses.length > 0 ? t._statuses : allStatuses;
        return isTaskDoneBySemantic(statuses, t.statusId);
    };

    const topTasks = tasks.filter((t) => !t.parentId && !isDone(t));

    function diff(t: EnrichedTask): number | null {
        if (!t.dueDate) return null;
        const d = new Date(t.dueDate);
        d.setHours(0, 0, 0, 0);
        return Math.round((d.getTime() - todayMs) / 86400000);
    }

    function sort(arr: EnrichedTask[]) {
        return [...arr].sort((a, b) => {
            const da = diff(a) ?? 9999;
            const db = diff(b) ?? 9999;
            if (da !== db) return da - db;
            return (b.priority?.value ?? 0) - (a.priority?.value ?? 0);
        });
    }

    return [
        {
            key: "overdue",
            label: labels.overdue,
            badge: "bg-red-100 text-red-700",
            dot: "bg-red-500",
            items: sort(
                topTasks.filter((t) => {
                    const d = diff(t);
                    return d !== null && d < 0;
                }),
            ),
        },
        {
            key: "today",
            label: labels.today,
            badge: "bg-orange-100 text-orange-700",
            dot: "bg-orange-500",
            items: sort(topTasks.filter((t) => diff(t) === 0)),
        },
        {
            key: "soon",
            label: labels.soon,
            badge: "bg-yellow-100 text-yellow-700",
            dot: "bg-yellow-500",
            items: sort(
                topTasks.filter((t) => {
                    const d = diff(t);
                    return d !== null && d >= 1 && d <= 3;
                }),
            ),
        },
        {
            key: "week",
            label: labels.week,
            badge: "bg-blue-100 text-blue-700",
            dot: "bg-blue-400",
            items: sort(
                topTasks.filter((t) => {
                    const d = diff(t);
                    return d !== null && d >= 4 && d <= 7;
                }),
            ),
        },
        {
            key: "later",
            label: labels.later,
            badge: "bg-stone-100 text-stone-600",
            dot: "bg-stone-400",
            items: sort(
                topTasks.filter((t) => {
                    const d = diff(t);
                    return d !== null && d > 7;
                }),
            ),
        },
        {
            key: "nodate",
            label: labels.nodate,
            badge: "bg-stone-100 text-stone-500",
            dot: "bg-stone-300",
            items: [...topTasks.filter((t) => !t.dueDate)].sort(
                (a, b) => (b.priority?.value ?? 0) - (a.priority?.value ?? 0),
            ),
        },
    ].filter((g) => g.items.length > 0);
}

function dueDateLabel(
    task: EnrichedTask,
    tTimeline: (key: string, values?: Record<string, number>) => string,
): string {
    if (!task.dueDate) return tTimeline("timeline.dateNone");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    const d = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (d < 0) return tTimeline("timeline.daysOverdue", { count: Math.abs(d) });
    if (d === 0) return tTimeline("timeline.todayLabel");
    return tTimeline("timeline.daysRemaining", { count: d });
}

function dueDateColor(task: EnrichedTask): string {
    if (!task.dueDate) return "text-stone-400";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    const d = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (d < 0) return "text-red-500 font-semibold";
    if (d === 0) return "text-orange-500 font-semibold";
    if (d <= 3) return "text-yellow-600";
    return "text-stone-500";
}

// ─────────────────────────────────────────────────────────────────────────────
// 타임라인 뷰 (공용)
// ─────────────────────────────────────────────────────────────────────────────

function OverviewTimelineTitleRow({
    task,
    onUpdated,
    onOpenDetail,
}: {
    task: EnrichedTask;
    onUpdated: (t: ApiWorkspaceTask) => void;
    onOpenDetail: () => void;
}) {
    const t = useTranslations("workspace");
    const [draft, setDraft] = useState(task.title);
    const [isPending, startTransition] = useTransition();
    const [editingTitle, setEditingTitle] = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setDraft(task.title);
    }, [task.id, task.title]);

    useEffect(() => {
        if (editingTitle) {
            titleInputRef.current?.focus();
            titleInputRef.current?.select();
        }
    }, [editingTitle]);

    function commit() {
        const v = draft.trim();
        if (!v) {
            setDraft(task.title);
            return;
        }
        if (v === task.title) return;
        startTransition(async () => {
            const res = await updateWorkspaceTaskAction(task._workspaceId, task.id, { title: v });
            if (res.ok) onUpdated(res.task);
        });
    }

    function finishEdit() {
        commit();
        setEditingTitle(false);
    }

    if (editingTitle) {
        return (
            <input
                ref={titleInputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={finishEdit}
                onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") {
                        setDraft(task.title);
                        setEditingTitle(false);
                    }
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={isPending}
                className="min-w-0 flex-1 truncate rounded border border-stone-200 bg-white px-1 py-0 text-sm font-medium text-stone-800 outline-none focus:border-stone-400 focus:ring-0 disabled:opacity-60"
            />
        );
    }

    return (
        <>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetail();
                }}
                title={task.title}
                className="min-w-0 flex-1 truncate text-left text-sm font-medium text-stone-800 hover:underline"
            >
                {formatTaskTitleForList(task.title)}
            </button>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setDraft(task.title);
                    setEditingTitle(true);
                }}
                className="shrink-0 rounded p-0.5 text-stone-300 opacity-0 transition-opacity hover:bg-stone-100 hover:text-stone-600 group-hover:opacity-100"
                title={t("taskRow.editTitle")}
                aria-label={t("taskRow.editTitle")}
            >
                <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                    />
                </svg>
            </button>
        </>
    );
}

function TimelineTaskCard({
    task,
    showWorkspaceName,
    onSelectTask,
    onTaskUpdated,
    tTimeline,
}: {
    task: EnrichedTask;
    showWorkspaceName: boolean;
    onSelectTask: (info: SelectedTaskInfo) => void;
    onTaskUpdated?: (task: ApiWorkspaceTask) => void;
    tTimeline: (key: string, values?: Record<string, number>) => string;
}) {
    const statusColor = tagColorOf(task.status.color);
    const priorityColor = task.priority ? tagColorOf(task.priority.color) : null;

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() =>
                onSelectTask({
                    task,
                    workspaceId: task._workspaceId,
                    statuses: task._statuses,
                    priorities: task._priorities,
                })
            }
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                    onSelectTask({
                        task,
                        workspaceId: task._workspaceId,
                        statuses: task._statuses,
                        priorities: task._priorities,
                    });
            }}
            className="group flex cursor-pointer items-center gap-3 rounded-xl border border-stone-100 bg-white px-4 py-3 shadow-sm transition-shadow hover:border-stone-300 hover:shadow-md"
        >
            <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusColor.dot}`}
                style={statusColor.dotStyle}
            />
            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                    {showWorkspaceName && (
                        <span className="max-w-[120px] shrink-0 truncate rounded-md bg-stone-100 px-1.5 py-px text-[11px] font-medium text-stone-500">
                            {task._workspaceName}
                        </span>
                    )}
                    {onTaskUpdated ? (
                        <div className="flex min-w-0 flex-1 items-center gap-1">
                            <OverviewTimelineTitleRow
                                task={task}
                                onUpdated={onTaskUpdated}
                                onOpenDetail={() =>
                                    onSelectTask({
                                        task,
                                        workspaceId: task._workspaceId,
                                        statuses: task._statuses,
                                        priorities: task._priorities,
                                    })
                                }
                            />
                        </div>
                    ) : (
                        <p title={task.title} className="truncate text-sm font-medium text-stone-800">
                            {formatTaskTitleForList(task.title)}
                        </p>
                    )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <span
                        className={`rounded-full px-1.5 py-px text-[11px] ${statusColor.badge}`}
                        style={statusColor.badgeStyle}
                    >
                        {task.status.name}
                    </span>
                    {priorityColor && task.priority && (
                        <span
                            className={`rounded-full px-1.5 py-px text-[11px] ${priorityColor.badge}`}
                            style={priorityColor.badgeStyle}
                        >
                            {task.priority.name}
                        </span>
                    )}
                    {task.assignee && (
                        <span className="flex items-center gap-1 text-[11px] text-stone-400">
                            {task.assignee.avatarUrl ? (
                                <img
                                    src={task.assignee.avatarUrl}
                                    className="h-3.5 w-3.5 rounded-full"
                                    alt=""
                                />
                            ) : (
                                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-stone-200 text-[9px] font-semibold">
                                    {(task.assignee.name ?? task.assignee.email)[0].toUpperCase()}
                                </span>
                            )}
                            {task.assignee.name ?? task.assignee.email}
                        </span>
                    )}
                </div>
            </div>
            <span className={`shrink-0 text-xs ${dueDateColor(task)}`}>{dueDateLabel(task, tTimeline)}</span>
        </div>
    );
}

function completedTopTasksForView(tasks: EnrichedTask[]): EnrichedTask[] {
    return tasks
        .filter((t) => !t.parentId && isTaskDoneBySemantic(t._statuses, t.statusId))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function TimelineView({
    tasks,
    onSelectTask,
    onTaskUpdated,
    showWorkspaceName = false,
    showCompleted = false,
    emptyVisual,
    emptyTitle,
    emptyDesc,
    groupLabels,
    tTimeline,
    tMywork,
}: {
    tasks: EnrichedTask[];
    onSelectTask: (info: SelectedTaskInfo) => void;
    onTaskUpdated?: (task: ApiWorkspaceTask) => void;
    showWorkspaceName?: boolean;
    showCompleted?: boolean;
    emptyVisual?: ReactNode;
    emptyTitle: string;
    emptyDesc: string;
    groupLabels: TimelineGroupLabels;
    tTimeline: (key: string, values?: Record<string, number>) => string;
    tMywork: (key: string, values?: Record<string, number>) => string;
}) {
    const groups = groupByDeadline(tasks, [], groupLabels);
    const completedTasks = useMemo(
        () => (showCompleted ? completedTopTasksForView(tasks) : []),
        [tasks, showCompleted],
    );

    const hasIncompleteGroups = groups.length > 0;
    const hasCompletedList = completedTasks.length > 0;

    if (!hasIncompleteGroups && !(showCompleted && hasCompletedList)) {
        return (
            <div className="flex w-full flex-1 items-center justify-center py-20 text-center">
                <div>
                    <div className="flex justify-center" aria-hidden>
                        {emptyVisual ?? <AllDoneIllustration />}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-stone-700">{emptyTitle}</p>
                    {emptyDesc ? <p className="mt-1 text-xs text-stone-400">{emptyDesc}</p> : null}
                </div>
            </div>
        );
    }

    return (
        <div className="flex w-full flex-col">
            {groups.map((group, gi) => (
                <div key={group.key} className="flex min-h-0">
                    <div className="flex w-32 shrink-0 flex-col items-end pr-4 pt-5">
                        <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${group.badge}`}
                        >
                            {group.label}
                        </span>
                        <span className="mt-1 text-[10px] text-stone-400">
                            {tMywork("groupCount", { count: group.items.length })}
                        </span>
                    </div>
                    <div className="relative flex w-7 shrink-0 flex-col items-center">
                        <div
                            className={`mt-[22px] h-3 w-3 shrink-0 rounded-full border-2 border-white ring-2 ring-offset-1 ${group.dot}`}
                        />
                        {gi < groups.length - 1 && (
                            <div className="mt-1 w-0.5 flex-1 bg-stone-200" />
                        )}
                    </div>
                    <div className="flex-1 space-y-2 pb-6 pl-3 pr-4 pt-4">
                        {group.items.map((task) => (
                            <TimelineTaskCard
                                key={task.id}
                                task={task}
                                showWorkspaceName={showWorkspaceName}
                                onSelectTask={onSelectTask}
                                onTaskUpdated={onTaskUpdated}
                                tTimeline={tTimeline}
                            />
                        ))}
                    </div>
                </div>
            ))}

            {showCompleted && hasCompletedList && (
                <div className="flex min-h-0">
                    <div className="flex w-32 shrink-0 flex-col items-end pr-4 pt-5">
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                            {tMywork("completedSectionTitle")}
                        </span>
                        <span className="mt-1 text-[10px] text-stone-400">
                            {tMywork("groupCount", { count: completedTasks.length })}
                        </span>
                    </div>
                    <div className="relative flex w-7 shrink-0 flex-col items-center">
                        <div className="mt-[22px] h-3 w-3 shrink-0 rounded-full border-2 border-white bg-green-500 ring-2 ring-green-200 ring-offset-1" />
                    </div>
                    <div className="flex-1 space-y-2 pb-6 pl-3 pr-4 pt-4">
                        {completedTasks.map((task) => (
                            <TimelineTaskCard
                                key={task.id}
                                task={task}
                                showWorkspaceName={showWorkspaceName}
                                onSelectTask={onSelectTask}
                                onTaskUpdated={onTaskUpdated}
                                tTimeline={tTimeline}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 통계 카드 행
// ─────────────────────────────────────────────────────────────────────────────

function StatsRow({ total, completed, overdue, dueSoon, pct }: ReturnType<typeof computeStats>) {
    const td = useTranslations("workspace.dashboard");
    const tm = useTranslations("mywork");
    const cards = [
        {
            label: td("totalTasks"),
            value: total,
            sub: tm("statsCompletedRate", { pct }),
            color: "text-stone-900",
            bg: "bg-white border border-stone-100",
        },
        {
            label: td("completed"),
            value: completed,
            sub: tm("statsCompletedShare", { pct }),
            color: "text-green-700",
            bg: "bg-green-50 border border-green-100",
        },
        {
            label: td("overdue"),
            value: overdue,
            sub: td("overdueNote"),
            color: "text-red-600",
            bg: "bg-red-50 border border-red-100",
        },
        {
            label: td("dueSoon"),
            value: dueSoon,
            sub: tm("statsDueSoonSub"),
            color: "text-orange-600",
            bg: "bg-orange-50 border border-orange-100",
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cards.map(({ label, value, sub, color, bg }) => (
                <div key={label} className={`rounded-2xl ${bg} px-4 py-4`}>
                    <p className="text-xs font-medium text-stone-500">{label}</p>
                    <p className={`mt-1 text-3xl font-bold tracking-tight ${color}`}>{value}</p>
                    <p className="mt-1 text-[11px] text-stone-400">{sub}</p>
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

export function MyWorkOverviewClient({
    workspaceDataList,
}: {
    workspaceDataList: WorkspaceDataItem[];
}) {
    const tm = useTranslations("mywork");
    const tw = useTranslations("workspace");
    const groupLabels = useMemo<TimelineGroupLabels>(
        () => ({
            overdue: tw("timeline.overdue"),
            today: tw("timeline.today"),
            soon: tw("timeline.soon"),
            week: tw("timeline.thisWeek"),
            later: tw("timeline.later"),
            nodate: tw("timeline.dateNone"),
        }),
        [tw],
    );

    const [viewMode, setViewMode] = useState<ViewMode>("combined");
    const [showCompleted, setShowCompleted] = useState(false);
    const [selectedTask, setSelectedTask] = useState<SelectedTaskInfo | null>(null);
    const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
    const [workspaceData, setWorkspaceData] = useState(workspaceDataList);

    useEffect(() => {
        setWorkspaceData(workspaceDataList);
    }, [workspaceDataList]);

    function toggleCollapse(wsId: string) {
        setCollapsedMap((prev) => ({ ...prev, [wsId]: !prev[wsId] }));
    }

    function mergeTaskUpdate(updated: ApiWorkspaceTask) {
        setWorkspaceData((prev) =>
            prev.map((w) => ({
                ...w,
                tasks: w.tasks.map((t) => (t.id === updated.id ? updated : t)),
            })),
        );
        setSelectedTask((p) => (p && p.task.id === updated.id ? { ...p, task: updated } : p));
    }

    // 모든 워크스페이스의 task에 컨텍스트 정보 부착
    const allEnrichedTasks = useMemo<EnrichedTask[]>(
        () =>
            workspaceData.flatMap(({ workspace, tasks, statuses, priorities }) =>
                tasks.map((t) => ({
                    ...t,
                    _workspaceId: workspace.id,
                    _workspaceName: workspace.project.name,
                    _statuses: statuses,
                    _priorities: priorities,
                })),
            ),
        [workspaceData],
    );

    const stats = useMemo(() => computeStats(workspaceData), [workspaceData]);

    const hasAnyTask = allEnrichedTasks.length > 0;

    function handleSelectTask(info: SelectedTaskInfo) {
        setSelectedTask(info);
    }

    return (
        <div className="flex min-h-full w-full flex-col">
            {/* 헤더 */}
            <div className="border-b border-stone-200 bg-white px-4 py-3 sm:px-6">
                <h1 className="text-lg font-bold text-stone-800 sm:text-xl">{tm("title")}</h1>
                <p className="text-xs text-stone-400 sm:text-sm">{tm("subtitle")}</p>
            </div>

            {/* 상단 통계 */}
            <div className="border-b border-stone-200 bg-white px-4 py-4 sm:px-6">
                <StatsRow {...stats} />
            </div>

            {/* 뷰 모드 토글 */}
            <div className="border-b border-stone-200 bg-white/95 px-4 py-2 sm:px-6">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1">
                        {(["combined", "by-workspace"] as const).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setViewMode(mode)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                    viewMode === mode
                                        ? "bg-stone-100 text-stone-900"
                                        : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
                                }`}
                            >
                                {mode === "combined" ? tm("viewCombined") : tm("viewByWorkspace")}
                            </button>
                        ))}
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 transition-colors hover:bg-stone-50">
                        <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-stone-300 accent-amber-500"
                            checked={showCompleted}
                            onChange={(e) => setShowCompleted(e.target.checked)}
                        />
                        <span>{tm("showCompletedTasks")}</span>
                    </label>
                </div>
            </div>

            {/* 타임라인 본문 */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-stone-50/40 px-4 py-5 sm:px-6">
                {!hasAnyTask ? (
                    <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
                        <div>
                            <div className="flex justify-center" aria-hidden>
                                <AllDoneIllustration />
                            </div>
                            <p className="mt-3 text-sm font-semibold text-stone-700">
                                {tm("emptyNoTasks")}
                            </p>
                            <p className="mt-1 text-xs text-stone-400">{tm("emptyNoTasksDesc")}</p>
                        </div>
                    </div>
                ) : viewMode === "combined" ? (
                    /* ── 전체 타임라인 (좌측 정렬, full width) ── */
                    <div className="w-full">
                        <p className="mb-4 text-xs font-medium text-stone-400">
                            {tm("totalTasksLine", {
                                count: allEnrichedTasks.filter((t) => !t.parentId).length,
                            })}
                        </p>
                        <TimelineView
                            tasks={allEnrichedTasks}
                            onSelectTask={handleSelectTask}
                            onTaskUpdated={mergeTaskUpdate}
                            showWorkspaceName
                            showCompleted={showCompleted}
                            emptyTitle={tm("emptyAllDoneTitle")}
                            emptyDesc={tm("emptyAllDoneDesc")}
                            groupLabels={groupLabels}
                            tTimeline={tw}
                            tMywork={tm}
                        />
                    </div>
                ) : (
                    /* ── 워크스페이스별 타임라인 (섹션 구분, full width) ── */
                    <div className="w-full">
                        {workspaceData.map(({ workspace, tasks, statuses, priorities }, idx) => {
                            const enriched: EnrichedTask[] = tasks.map((t) => ({
                                ...t,
                                _workspaceId: workspace.id,
                                _workspaceName: workspace.project.name,
                                _statuses: statuses,
                                _priorities: priorities,
                            }));
                            const topCount = enriched.filter((t) => !t.parentId).length;
                            const allTeams = [
                                workspace.project.team,
                                ...workspace.project.projectTeams.map((pt) => pt.team),
                            ].filter(Boolean);
                            const teamLabel =
                                allTeams.length > 0
                                    ? allTeams.map((t) => t!.name).join(" · ")
                                    : tm("personalProject");
                            const isCollapsed = !!collapsedMap[workspace.id];

                            return (
                                <div
                                    key={workspace.id}
                                    className={idx > 0 ? "mt-6 border-t border-stone-200 pt-6" : ""}
                                >
                                    {/* 섹션 헤더 — 클릭 시 접기/펼치기 */}
                                    <button
                                        type="button"
                                        onClick={() => toggleCollapse(workspace.id)}
                                        className="mb-4 flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-stone-100/60"
                                    >
                                        {/* 접기 화살표 */}
                                        <svg
                                            className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : "rotate-0"}`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2}
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M19 9l-7 7-7-7"
                                            />
                                        </svg>

                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
                                            <svg
                                                className="h-3.5 w-3.5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={1.5}
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
                                                />
                                            </svg>
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-sm font-semibold text-stone-800">
                                                {workspace.project.name}
                                            </span>
                                            <span className="ml-2 text-xs text-stone-400">
                                                {teamLabel}
                                            </span>
                                        </div>
                                        <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                                            {tm("workspaceTaskCount", { count: topCount })}
                                        </span>
                                    </button>

                                    {/* 워크스페이스 타임라인 */}
                                    {!isCollapsed && (
                                        <TimelineView
                                            tasks={enriched}
                                            onSelectTask={handleSelectTask}
                                            onTaskUpdated={mergeTaskUpdate}
                                            showCompleted={showCompleted}
                                            emptyTitle={tm("emptySectionDoneTitle")}
                                            emptyDesc=""
                                            groupLabels={groupLabels}
                                            tTimeline={tw}
                                            tMywork={tm}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 업무 상세 패널 */}
            {selectedTask && (
                <TaskDetailPanel
                    actions={workspaceTaskPanelActions}
                    task={selectedTask.task}
                    statuses={selectedTask.statuses}
                    priorities={selectedTask.priorities}
                    workspaceId={selectedTask.workspaceId}
                    onUpdate={mergeTaskUpdate}
                    onClose={() => setSelectedTask(null)}
                />
            )}
        </div>
    );
}
