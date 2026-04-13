"use client";

import { useTranslations } from "next-intl";

import type {
    ApiWorkspacePriority,
    ApiWorkspaceStatus,
    ApiWorkspaceStatusSemantic,
    ApiWorkspaceTask,
} from "../types/workspace-api";
import { formatTaskTitleForList } from "../utils/task-title-display";
import { resolveTaskSemanticBucket } from "../project/project-detail/project-detail-helpers";

import { tagColorOf } from "../utils/tag-colors";

const SEMANTIC_DIST_ORDER: ApiWorkspaceStatusSemantic[] = [
    "WAITING",
    "IN_PROGRESS",
    "REVIEW",
    "ON_HOLD",
    "DONE",
];

const SEMANTIC_BAR_COLOR: Record<ApiWorkspaceStatusSemantic, string> = {
    WAITING: "#a8a29e",
    IN_PROGRESS: "#3b82f6",
    REVIEW: "#a855f7",
    ON_HOLD: "#f97316",
    DONE: "#22c55e",
};

export function DashboardPanel({
    tasks,
    statuses,
    priorities,
}: {
    tasks: ApiWorkspaceTask[];
    statuses: ApiWorkspaceStatus[];
    priorities: ApiWorkspacePriority[];
}) {
    const t = useTranslations("workspace");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const statusById = new Map(statuses.map((s) => [s.id, s]));

    const semanticOf = (task: ApiWorkspaceTask) => {
        const s = statusById.get(task.statusId);
        if (s) return resolveTaskSemanticBucket(s);
        return resolveTaskSemanticBucket({
            semantic: task.status.semantic,
            color: task.status.color,
            name: task.status.name,
        });
    };

    const allTasks = tasks;
    const totalTasks = allTasks.length;

    const countBySemantic = (sem: ApiWorkspaceStatusSemantic) =>
        allTasks.filter((task) => semanticOf(task) === sem).length;

    const completedCount = countBySemantic("DONE");
    const inProgressCount = countBySemantic("IN_PROGRESS");
    const reviewCount = countBySemantic("REVIEW");
    const onHoldCount = countBySemantic("ON_HOLD");

    const overdueCount = allTasks.filter((task) => {
        if (semanticOf(task) === "DONE" || !task.dueDate) return false;
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        return due < today;
    }).length;

    const progressPct = totalTasks === 0 ? 0 : Math.round((completedCount / totalTasks) * 100);

    const semanticDistCounts = SEMANTIC_DIST_ORDER.map((sem) => ({
        sem,
        color: SEMANTIC_BAR_COLOR[sem],
        count: countBySemantic(sem),
    }));
    const maxSemanticCount = Math.max(1, ...semanticDistCounts.map((r) => r.count));

    const noDate = allTasks.filter((task) => !task.startDate && !task.dueDate).length;

    const noPriority = allTasks.filter((task) => !task.priorityId).length;
    const byPriority = priorities
        .map((p) => ({ ...p, count: allTasks.filter((task) => task.priorityId === p.id).length }))
        .filter((p) => p.count > 0)
        .sort((a, b) => a.order - b.order);

    const upcomingTasks = allTasks
        .filter((task) => {
            if (!task.dueDate) return false;
            const due = new Date(task.dueDate);
            due.setHours(0, 0, 0, 0);
            const diff = (due.getTime() - today.getTime()) / 86400000;
            return diff >= -7 && diff <= 7 && semanticOf(task) !== "DONE";
        })
        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

    const semanticLabel = (sem: ApiWorkspaceStatusSemantic) =>
        sem === "WAITING"
            ? t("dashboard.statusSemanticWaiting")
            : sem === "IN_PROGRESS"
              ? t("dashboard.statusSemanticInProgress")
              : sem === "REVIEW"
                ? t("dashboard.statusSemanticReview")
                : sem === "ON_HOLD"
                  ? t("dashboard.statusSemanticOnHold")
                  : t("dashboard.statusSemanticDone");

    return (
        <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-stone-50/40 p-5 dark:bg-elivis-bg">
            {/* ── 상단 지표 카드 (프로젝트 대시보드와 동일 6종) ── */}
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
                {[
                    {
                        key: "total",
                        label: t("dashboard.statTotal"),
                        value: totalTasks,
                        sub: t("dashboard.noDateCount", { count: noDate }),
                        color: "text-stone-900 dark:text-elivis-ink",
                        bg: "bg-white border border-stone-100 dark:border-elivis-line dark:bg-elivis-surface-elevated",
                    },
                    {
                        key: "done",
                        label: t("dashboard.statDone"),
                        value: completedCount,
                        sub: t("dashboard.achievement", { pct: progressPct }),
                        color: "text-green-700 dark:text-green-400",
                        bg: "bg-green-50 border border-green-100 dark:border-emerald-900/50 dark:bg-emerald-950/35",
                    },
                    {
                        key: "inProgress",
                        label: t("dashboard.statInProgress"),
                        value: inProgressCount,
                        sub: "",
                        color: "text-blue-600 dark:text-blue-400",
                        bg: "bg-blue-50 border border-blue-100 dark:border-blue-900/50 dark:bg-blue-950/35",
                    },
                    {
                        key: "review",
                        label: t("dashboard.statReview"),
                        value: reviewCount,
                        sub: "",
                        color: "text-purple-600 dark:text-purple-300",
                        bg: "bg-purple-50 border border-purple-100 dark:border-purple-900/50 dark:bg-purple-950/35",
                    },
                    {
                        key: "overdue",
                        label: t("dashboard.statOverdue"),
                        value: overdueCount,
                        sub: t("dashboard.overdueNote"),
                        color: "text-red-600 dark:text-red-400",
                        bg: "bg-red-50 border border-red-100 dark:border-red-900/50 dark:bg-red-950/35",
                    },
                    {
                        key: "onHold",
                        label: t("dashboard.statOnHold"),
                        value: onHoldCount,
                        sub: "",
                        color: "text-orange-600 dark:text-elivis-accent-hover",
                        bg: "bg-orange-50 border border-orange-100 dark:border-elivis-accent/35 dark:bg-elivis-accent-strong/25",
                    },
                ].map(({ key, label, value, sub, color, bg }) => (
                    <div key={key} className={`rounded-2xl ${bg} px-5 py-4`}>
                        <p className="text-xs font-medium text-stone-500 dark:text-elivis-ink-secondary">{label}</p>
                        <p className={`mt-1 text-4xl font-bold tracking-tight ${color}`}>{value}</p>
                        {sub ? <p className="mt-1 text-[11px] text-stone-400 dark:text-elivis-ink-secondary">{sub}</p> : null}
                    </div>
                ))}
            </div>

            {/* ── 진행률 ── */}
            <div className="mb-5 rounded-2xl border border-stone-100 dark:border-elivis-line bg-white dark:bg-elivis-surface p-5">
                <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-stone-700 dark:text-elivis-ink">{t("dashboard.progress")}</span>
                    <span className="text-2xl font-bold text-stone-900 dark:text-elivis-ink">{progressPct}%</span>
                </div>
                <div className="h-4 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-elivis-surface-elevated">
                    <div
                        className="h-full rounded-full bg-green-500 transition-all duration-700"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
                <p className="mt-2 text-xs text-stone-400 dark:text-elivis-ink-secondary">
                    {t("dashboard.progressDetail", { completed: completedCount, total: totalTasks })}
                </p>
            </div>

            {/* ── 중단 2열 ── */}
            <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* 의미(semantic)별 — 동일 표시명 status 중복 제거 */}
                <div className="rounded-2xl border border-stone-100 dark:border-elivis-line bg-white dark:bg-elivis-surface p-5">
                    <h3 className="text-sm font-semibold text-stone-700 dark:text-elivis-ink">
                        {t("dashboard.statusBreakdown")}
                    </h3>
                    <p className="mt-0.5 text-xs text-stone-400 dark:text-elivis-ink-secondary">{t("dashboard.statusBreakdownHint")}</p>
                    {totalTasks === 0 ? (
                        <p className="mt-4 text-xs text-stone-400 dark:text-elivis-ink-secondary">{t("dashboard.noTasks")}</p>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {semanticDistCounts.map(({ sem, count, color }) => (
                                <div key={sem} className="flex items-center gap-2.5">
                                    <span className="w-16 shrink-0 truncate text-xs font-medium text-stone-600 dark:text-elivis-ink-secondary sm:w-20">
                                        {semanticLabel(sem)}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="h-6 overflow-hidden rounded-md bg-stone-100 dark:bg-elivis-surface-elevated">
                                            <div
                                                className="h-full rounded-md transition-all duration-500 ease-out"
                                                style={{
                                                    width: `${(count / maxSemanticCount) * 100}%`,
                                                    backgroundColor: color,
                                                    opacity: count === 0 ? 0.25 : 1,
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-stone-600 dark:text-elivis-ink-secondary">
                                        {count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 우선순위별 */}
                <div className="rounded-2xl border border-stone-100 dark:border-elivis-line bg-white dark:bg-elivis-surface p-5">
                    <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-elivis-ink">
                        {t("dashboard.priorityBreakdown")}
                    </h3>
                    {byPriority.length === 0 && noPriority === totalTasks ? (
                        <p className="text-xs text-stone-400 dark:text-elivis-ink-secondary">{t("dashboard.noTasks")}</p>
                    ) : (
                        <div className="space-y-3">
                            {byPriority.map((p) => {
                                const pct = totalTasks === 0 ? 0 : Math.round((p.count / totalTasks) * 100);
                                const color = tagColorOf(p.color);
                                return (
                                    <div key={p.id}>
                                        <div className="mb-1.5 flex items-center justify-between">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${color.badge}`}
                                                style={color.badgeStyle}
                                            >
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${color.dot}`}
                                                    style={color.dotStyle}
                                                />
                                                {p.name}
                                            </span>
                                            <span className="text-xs tabular-nums text-stone-500 dark:text-elivis-ink-secondary">
                                                {t("dashboard.items", { count: p.count })} · {pct}%
                                            </span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-elivis-surface-elevated">
                                            <div
                                                className={`h-full rounded-full ${color.dot} transition-all duration-500`}
                                                style={{ width: `${pct}%`, ...color.dotStyle }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            {noPriority > 0 &&
                                (() => {
                                    const pct =
                                        totalTasks === 0 ? 0 : Math.round((noPriority / totalTasks) * 100);
                                    return (
                                        <div>
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 dark:bg-elivis-surface-elevated px-2 py-0.5 text-xs font-medium text-stone-500 dark:text-elivis-ink-secondary">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-stone-300 dark:bg-elivis-surface-elevated" />
                                                    {t("dashboard.noPriority")}
                                                </span>
                                                <span className="text-xs tabular-nums text-stone-500 dark:text-elivis-ink-secondary">
                                                    {t("dashboard.items", { count: noPriority })} · {pct}%
                                                </span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-elivis-surface-elevated">
                                                <div
                                                    className="h-full rounded-full bg-stone-300 dark:bg-elivis-surface-elevated transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })()}
                        </div>
                    )}
                </div>
            </div>

            {/* ── 기한 임박 업무 전체 목록 ── */}
            <div className="rounded-2xl border border-stone-100 dark:border-elivis-line bg-white dark:bg-elivis-surface p-5">
                <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-elivis-ink">
                    {t("dashboard.upcomingTitle")}{" "}
                    <span className="ml-1 text-xs font-normal text-stone-400 dark:text-elivis-ink-secondary">
                        {t("dashboard.upcomingNote")}
                    </span>
                </h3>
                {upcomingTasks.length === 0 ? (
                    <p className="text-xs text-stone-400 dark:text-elivis-ink-secondary">{t("dashboard.noUpcoming")}</p>
                ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {upcomingTasks.map((task) => {
                            const due = new Date(task.dueDate!);
                            due.setHours(0, 0, 0, 0);
                            const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
                            const color = tagColorOf(task.status.color);
                            const label =
                                diff < 0
                                    ? t("timeline.daysOverdue", { count: Math.abs(diff) })
                                    : diff === 0
                                      ? t("timeline.todayLabel")
                                      : t("timeline.daysLeft", { count: diff });
                            const labelBg =
                                diff < 0
                                    ? "bg-red-100 text-red-600 dark:bg-red-950/45 dark:text-red-300"
                                    : diff === 0
                                      ? "bg-orange-100 text-orange-600 dark:bg-elivis-accent-strong/35 dark:text-elivis-accent-hover"
                                      : "bg-stone-100 text-stone-500 dark:bg-elivis-surface-elevated dark:text-elivis-ink-secondary";
                            return (
                                <div
                                    key={task.id}
                                    className="flex items-center gap-3 rounded-xl border border-stone-100 dark:border-elivis-line px-4 py-3"
                                >
                                    <span
                                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${color.dot}`}
                                        style={color.dotStyle}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p
                                            title={task.title}
                                            className="truncate text-xs font-semibold text-stone-800 dark:text-elivis-ink"
                                        >
                                            {formatTaskTitleForList(task.title)}
                                        </p>
                                        <p className="mt-0.5 truncate text-[11px] text-stone-400 dark:text-elivis-ink-secondary">
                                            {task.status.name}
                                        </p>
                                    </div>
                                    <span
                                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${labelBg}`}
                                    >
                                        {label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
