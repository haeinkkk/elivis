"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ApiProjectTasksItem, ApiWorkspaceStatusSemantic } from "../../types/workspace-api";
import type { ProjectDetailModel } from "../../types/project-detail";
import { formatTaskTitleForList } from "../../utils/task-title-display";
import { ProjectDonutChart } from "./ProjectDonutChart";
import {
    getDaysSinceStart,
    getProgressPercent,
    getRemainingDays,
    resolveTaskSemanticBucket,
    statusCssColor,
} from "./project-detail-helpers";

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

function formatOverviewDate(iso: string | undefined, locale: string): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const tag = locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "en-US";
    return d.toLocaleDateString(tag, { year: "numeric", month: "long", day: "numeric" });
}

export function ProjectOverviewTab({
    project,
    projectTasksData,
    onSeeMoreTasks,
}: {
    project: ProjectDetailModel | null;
    projectTasksData: ApiProjectTasksItem[];
    onSeeMoreTasks?: () => void;
}) {
    const t = useTranslations("projects.detail");
    const locale = useLocale();

    if (!project) {
        return (
            <div className="flex min-h-[200px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 dark:border-elivis-line border-t-stone-600" />
            </div>
        );
    }

    // ── 실데이터 집계 ──────────────────────────────────────────────
    const allTasks = projectTasksData.flatMap((item) => item.tasks);

    // 워크스페이스별 상태를 id 기준으로 매핑 (태스크 → semantic 집계에 사용)
    const statusById = new Map(
        projectTasksData.flatMap((item) => item.statuses).map((s) => [s.id, s]),
    );

    const totalTasks = allTasks.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const semanticOf = (task: (typeof allTasks)[number]) =>
        resolveTaskSemanticBucket(statusById.get(task.statusId));

    const countBySemantic = (sem: ApiWorkspaceStatusSemantic) =>
        allTasks.filter((task) => semanticOf(task) === sem).length;

    const completedCount = countBySemantic("DONE");
    const inProgressCount = countBySemantic("IN_PROGRESS");
    const reviewCount = countBySemantic("REVIEW");
    const onHoldCount = countBySemantic("ON_HOLD");

    const overdueTasks = allTasks.filter((t) => {
        if (semanticOf(t) === "DONE" || !t.dueDate) return false;
        return new Date(t.dueDate) < today;
    });

    /** 사이드바·진행 목록: 진행중 + 검토중 (미완료 업무) */
    const activeWorkTasks = allTasks
        .filter((t) => {
            const sem = semanticOf(t);
            return sem === "IN_PROGRESS" || sem === "REVIEW";
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    // 의미(semantic)별 업무 수 — 동일 표시명·다른 statusId 중복 행 제거
    const semanticDistCounts = SEMANTIC_DIST_ORDER.map((sem) => ({
        sem,
        color: SEMANTIC_BAR_COLOR[sem],
        count: countBySemantic(sem),
    }));
    const maxSemanticCount = Math.max(1, ...semanticDistCounts.map((r) => r.count));

    // 완료율
    const completionPercent = totalTasks ? Math.round((completedCount / totalTasks) * 100) : 0;

    const donutOtherCount = Math.max(
        0,
        totalTasks - completedCount - inProgressCount - reviewCount,
    );

    // 최근 업무 (updatedAt 내림차순)
    const recentTasks = [...allTasks]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 8);

    // ── 일정 계산 ──────────────────────────────────────────────────
    const remainingDays = getRemainingDays(project.endDate, project.noEndDate);
    const progressPercent = getProgressPercent(project);
    const daysSinceStart = getDaysSinceStart(project);

    const dDayLabel =
        remainingDays === null
            ? daysSinceStart !== null
                ? `D+${daysSinceStart}`
                : "—"
            : remainingDays > 0
              ? `D-${remainingDays}`
              : remainingDays === 0
                ? "D-Day"
                : `D+${Math.abs(remainingDays)}`;

    const dDayColor =
        remainingDays === null
            ? "bg-stone-100 text-stone-600 dark:bg-elivis-surface-elevated dark:text-elivis-ink-secondary"
            : remainingDays > 14
              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/35 dark:text-blue-300"
              : remainingDays > 0
                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/35 dark:text-amber-300"
                : "bg-red-50 text-red-600 dark:bg-red-950/35 dark:text-red-400";

    const dDayTextColor =
        remainingDays === null
            ? "text-stone-800 dark:text-elivis-ink"
            : remainingDays > 14
              ? "text-blue-600 dark:text-blue-400"
              : remainingDays > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-red-600 dark:text-red-400";

    return (
        <div className="space-y-5">
            {/* ── 1. 일정 히어로 카드 ───────────────────────────────── */}
            <section
                className="overflow-hidden rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface shadow-sm"
                style={{ animation: "overview-fade-in 0.4s ease-out" }}
            >
                {/* 상단 헤더 바 */}
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-elivis-line px-6 py-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-elivis-ink-secondary">
                        {t("overview.periodHeader")}
                    </span>
                    <span
                        className={`rounded-full px-3 py-0.5 text-xs font-bold tracking-wide ${dDayColor}`}
                    >
                        {dDayLabel}
                    </span>
                </div>

                <div className="px-6 py-5 sm:px-8 sm:py-6">
                    {/* 날짜 행 */}
                    <div className="flex items-end justify-between gap-4">
                        {/* 시작일 */}
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-elivis-ink-secondary">
                                {t("overview.startLabel")}
                            </p>
                            <p className="mt-1 text-lg font-bold text-stone-800 dark:text-elivis-ink sm:text-xl">
                                {formatOverviewDate(project.startDate, locale)}
                            </p>
                        </div>

                        {/* 가운데: 강조 D-Day 수치 */}
                        <div className="flex flex-col items-center gap-1">
                            {remainingDays === null ? (
                                daysSinceStart !== null ? (
                                    <>
                                        <span
                                            className={`text-5xl font-black tabular-nums sm:text-6xl ${dDayTextColor}`}
                                        >
                                            {daysSinceStart}
                                        </span>
                                        <span className="text-sm font-semibold text-stone-500 dark:text-elivis-ink-secondary">
                                            일 진행 중
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-xl font-semibold text-stone-400 dark:text-elivis-ink-secondary">
                                        {t("overview.noEndMiddle")}
                                    </span>
                                )
                            ) : remainingDays > 0 ? (
                                <>
                                    <span
                                        className={`text-5xl font-black tabular-nums sm:text-6xl ${dDayTextColor}`}
                                    >
                                        {remainingDays}
                                    </span>
                                    <span className="text-sm font-semibold text-stone-500 dark:text-elivis-ink-secondary">
                                        {t("overview.daysLeftSuffix")}
                                    </span>
                                </>
                            ) : remainingDays === 0 ? (
                                <>
                                    <span className="text-3xl font-black text-red-600 dark:text-red-400 sm:text-4xl">
                                        {t("overview.dueToday")}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span
                                        className={`text-4xl font-black tabular-nums sm:text-5xl ${dDayTextColor}`}
                                    >
                                        {Math.abs(remainingDays)}
                                    </span>
                                    <span className="text-sm font-semibold text-red-500 dark:text-red-400">
                                        {t("overview.daysOverdueSuffix")}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* 종료일 */}
                        <div className="min-w-0 text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-elivis-ink-secondary">
                                {t("overview.endLabel")}
                            </p>
                            <p className="mt-1 text-lg font-bold text-stone-800 dark:text-elivis-ink sm:text-xl">
                                {project.noEndDate ? t("overview.noEndDisplay") : formatOverviewDate(project.endDate, locale)}
                            </p>
                        </div>
                    </div>

                    {/* 타임라인 바 */}
                    {!project.noEndDate && progressPercent !== null && (
                        <div className="mt-5">
                            <div className="relative h-2.5 overflow-hidden rounded-full bg-stone-100 dark:bg-elivis-surface-elevated">
                                <div
                                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{
                                        width: `${progressPercent}%`,
                                        background:
                                            remainingDays !== null && remainingDays < 0
                                                ? "linear-gradient(90deg, #f87171, #ef4444)"
                                                : remainingDays !== null && remainingDays <= 14
                                                  ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
                                                  : "linear-gradient(90deg, #60a5fa, #3b82f6)",
                                    }}
                                />
                                {/* 오늘 마커 */}
                                <div
                                    className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-stone-600 shadow"
                                    style={{ left: `${Math.min(progressPercent, 99)}%` }}
                                />
                            </div>
                            <div className="mt-1.5 flex justify-between text-[10px] font-medium text-stone-400 dark:text-elivis-ink-secondary">
                                <span>{t("overview.timelineStart")}</span>
                                <span className="font-semibold text-stone-600 dark:text-elivis-ink-secondary">
                                    {t("overview.progressElapsed", { pct: progressPercent })}
                                </span>
                                <span>{t("overview.timelineEnd")}</span>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ── 2. 통계 카드 (팀 전체 업무 기준) ───────────────────── */}
            <section
                className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6"
                style={{ animation: "overview-fade-in 0.4s ease-out 0.05s both" }}
            >
                {[
                    {
                        key: "total",
                        label: t("overview.statTotal"),
                        value: totalTasks,
                        unit: t("overview.unit"),
                        color: "text-stone-800",
                        bg: "bg-stone-50",
                        icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2",
                    },
                    {
                        key: "done",
                        label: t("overview.statDone"),
                        value: completedCount,
                        unit: t("overview.unit"),
                        color: "text-green-600",
                        bg: "bg-green-50",
                        icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
                    },
                    {
                        key: "inProgress",
                        label: t("overview.statInProgress"),
                        value: inProgressCount,
                        unit: t("overview.unit"),
                        color: "text-blue-600",
                        bg: "bg-blue-50",
                        icon: "M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z",
                    },
                    {
                        key: "review",
                        label: t("overview.statReview"),
                        value: reviewCount,
                        unit: t("overview.unit"),
                        color: "text-purple-600",
                        bg: "bg-purple-50",
                        icon: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
                    },
                    {
                        key: "overdue",
                        label: t("overview.statOverdue"),
                        value: overdueTasks.length,
                        unit: t("overview.unit"),
                        color: overdueTasks.length > 0 ? "text-red-600" : "text-stone-400",
                        bg: overdueTasks.length > 0 ? "bg-red-50" : "bg-stone-50",
                        icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
                    },
                    {
                        key: "onHold",
                        label: t("overview.statOnHold"),
                        value: onHoldCount,
                        unit: t("overview.unit"),
                        color: "text-orange-600",
                        bg: "bg-orange-50",
                        icon: "M15.75 5.25v13.5m-7.5-13.5v13.5",
                    },
                ].map(({ key, label, value, unit, color, bg, icon }) => (
                    <div
                        key={key}
                        className="flex items-center gap-4 rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface p-4 sm:p-5"
                    >
                        <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}
                        >
                            <svg
                                className={`h-5 w-5 ${color}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.8}
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-medium text-stone-400 dark:text-elivis-ink-secondary">{label}</p>
                            <p className={`mt-0.5 text-2xl font-bold tabular-nums ${color}`}>
                                {value}
                                <span className="ml-0.5 text-sm font-medium">{unit}</span>
                            </p>
                        </div>
                    </div>
                ))}
            </section>

            {/* ── 3. 차트 영역 (완료율 + 상태분포 + 진행중 업무) ────── */}
            <section className="grid gap-5 lg:grid-cols-3">
                {/* 완료율 도넛 */}
                <div
                    className="rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface p-5 sm:p-6"
                    style={{ animation: "overview-fade-in 0.4s ease-out 0.1s both" }}
                >
                    <h3 className="text-sm font-semibold text-stone-700 dark:text-elivis-ink">{t("overview.donutTitle")}</h3>
                    <p className="mt-0.5 text-xs text-stone-400 dark:text-elivis-ink-secondary">
                        {totalTasks > 0
                            ? t("overview.donutSubDone", { total: totalTasks, done: completedCount })
                            : t("overview.donutSubEmpty")}
                    </p>
                    <div className="mt-5 flex items-center gap-6">
                        <div className="relative shrink-0">
                            <ProjectDonutChart
                                percent={completionPercent}
                                size={110}
                                strokeWidth={12}
                                color="#22c55e"
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold tabular-nums text-stone-800 dark:text-elivis-ink">
                                {completionPercent}%
                            </span>
                        </div>
                        <div className="min-w-0 flex-1 space-y-2.5">
                            {[
                                { label: t("overview.legendDone"), count: completedCount, color: "#22c55e" },
                                {
                                    label: t("overview.legendInProgress"),
                                    count: inProgressCount,
                                    color: "#3b82f6",
                                },
                                {
                                    label: t("overview.legendReview"),
                                    count: reviewCount,
                                    color: "#a855f7",
                                },
                                {
                                    label: t("overview.legendOther"),
                                    count: donutOtherCount,
                                    color: "#d1d5db",
                                },
                            ].map(({ label, count, color }) => (
                                <div key={label} className="flex items-center gap-2">
                                    <span
                                        className="h-2 w-2 shrink-0 rounded-full"
                                        style={{ backgroundColor: color }}
                                    />
                                    <span className="min-w-0 flex-1 truncate text-xs text-stone-500 dark:text-elivis-ink-secondary">
                                        {label}
                                    </span>
                                    <span className="shrink-0 text-xs font-semibold tabular-nums text-stone-700 dark:text-elivis-ink">
                                        {count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 업무 상태별 막대 그래프 */}
                <div
                    className="rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface p-5 sm:p-6"
                    style={{ animation: "overview-fade-in 0.4s ease-out 0.15s both" }}
                >
                    <h3 className="text-sm font-semibold text-stone-700 dark:text-elivis-ink">{t("overview.statusDistTitle")}</h3>
                    <p className="mt-0.5 text-xs text-stone-400 dark:text-elivis-ink-secondary">{t("overview.statusDistSub")}</p>
                    {totalTasks === 0 ? (
                        <p className="mt-6 text-center text-sm text-stone-400 dark:text-elivis-ink-secondary">{t("overview.statusEmpty")}</p>
                    ) : (
                        <div className="mt-5 space-y-3">
                            {semanticDistCounts.map(({ sem, count, color }) => (
                                <div key={sem} className="flex items-center gap-2.5">
                                    <span className="w-16 shrink-0 truncate text-xs font-medium text-stone-600 dark:text-elivis-ink-secondary sm:w-20">
                                        {sem === "WAITING"
                                            ? t("overview.statusSemanticWaiting")
                                            : sem === "IN_PROGRESS"
                                              ? t("overview.statusSemanticInProgress")
                                              : sem === "REVIEW"
                                                ? t("overview.statusSemanticReview")
                                                : sem === "ON_HOLD"
                                                  ? t("overview.statusSemanticOnHold")
                                                  : t("overview.statusSemanticDone")}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="h-6 overflow-hidden rounded-md bg-stone-100 dark:bg-elivis-surface-elevated">
                                            <div
                                                className="h-full rounded-md transition-all duration-700 ease-out"
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

                {/* 진행중인 업무 */}
                <div
                    className="rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface p-5 sm:p-6"
                    style={{ animation: "overview-fade-in 0.4s ease-out 0.2s both" }}
                >
                    <h3 className="text-sm font-semibold text-stone-700 dark:text-elivis-ink">{t("overview.inProgressTitle")}</h3>
                    <p className="mt-0.5 text-xs text-stone-400 dark:text-elivis-ink-secondary">
                        {activeWorkTasks.length > 0
                            ? t("overview.inProgressSub", { count: activeWorkTasks.length })
                            : t("overview.inProgressSubEmpty")}
                    </p>
                    {activeWorkTasks.length === 0 ? (
                        <div className="mt-6 flex flex-col items-center justify-center gap-2 py-6 text-stone-300">
                            <svg
                                className="h-8 w-8"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.2}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                />
                            </svg>
                            <span className="text-xs">{t("overview.inProgressAllDone")}</span>
                        </div>
                    ) : (
                        <ul className="mt-3 space-y-1.5">
                            {activeWorkTasks.slice(0, 6).map((task) => (
                                <li
                                    key={task.id}
                                    className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated"
                                >
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                                    <span
                                        title={task.title}
                                        className="min-w-0 flex-1 truncate text-sm text-stone-700 dark:text-elivis-ink"
                                    >
                                        {formatTaskTitleForList(task.title)}
                                    </span>
                                    {task.assignee?.name && (
                                        <span className="shrink-0 text-xs text-stone-400 dark:text-elivis-ink-secondary">
                                            {task.assignee.name}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    {activeWorkTasks.length > 6 && onSeeMoreTasks && (
                        <button
                            type="button"
                            onClick={onSeeMoreTasks}
                            className="mt-3 w-full rounded-lg border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface py-1.5 text-xs font-medium text-stone-500 dark:text-elivis-ink-secondary transition-colors hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated hover:text-stone-700"
                        >
                            {t("overview.seeMore", { count: activeWorkTasks.length - 6 })}
                        </button>
                    )}
                </div>
            </section>

            {/* ── 4. 최근 업무 리스트 ──────────────────────────────── */}
            <section
                className="rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface p-5 sm:p-6"
                style={{ animation: "overview-fade-in 0.4s ease-out 0.3s both" }}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-stone-700 dark:text-elivis-ink">{t("overview.recentTitle")}</h3>
                        <p className="mt-0.5 text-xs text-stone-400 dark:text-elivis-ink-secondary">{t("overview.recentSub")}</p>
                    </div>
                    {onSeeMoreTasks && (
                        <button
                            type="button"
                            onClick={onSeeMoreTasks}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-stone-500 dark:text-elivis-ink-secondary transition-colors hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated hover:text-stone-700"
                        >
                            {t("overview.seeAll")}
                        </button>
                    )}
                </div>

                {recentTasks.length === 0 ? (
                    <div className="mt-6 py-8 text-center text-sm text-stone-400 dark:text-elivis-ink-secondary">
                        {t("overview.recentEmpty")}
                    </div>
                ) : (
                    <ul className="mt-4 divide-y divide-stone-100 dark:divide-elivis-line">
                        {recentTasks.map((task, i) => {
                            const taskStatus = statusById.get(task.statusId);
                            return (
                                <li
                                    key={task.id}
                                    className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                                    style={{
                                        animation: `overview-fade-in 0.35s ease-out ${0.3 + i * 0.04}s both`,
                                    }}
                                >
                                    {/* 상태 도트 */}
                                    <span
                                        className="h-2 w-2 shrink-0 rounded-full"
                                        style={{
                                            backgroundColor: taskStatus
                                                ? statusCssColor(taskStatus.color)
                                                : "#d1d5db",
                                        }}
                                    />
                                    <span
                                        title={task.title}
                                        className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800 dark:text-elivis-ink"
                                    >
                                        {formatTaskTitleForList(task.title)}
                                    </span>
                                    {/* 상태 뱃지 */}
                                    {taskStatus && (
                                        <span
                                            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                                            style={{
                                                backgroundColor: statusCssColor(taskStatus.color),
                                            }}
                                        >
                                            {taskStatus.name}
                                        </span>
                                    )}
                                    {/* 담당자 */}
                                    {task.assignee?.name && (
                                        <span className="hidden shrink-0 text-xs text-stone-400 dark:text-elivis-ink-secondary sm:inline">
                                            {task.assignee.name}
                                        </span>
                                    )}
                                    {/* 마감일 */}
                                    {task.dueDate && (
                                        <span className="hidden shrink-0 text-xs text-stone-400 dark:text-elivis-ink-secondary md:inline">
                                            {new Date(task.dueDate).toLocaleDateString(
                                                locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "en-US",
                                                {
                                                    month: "short",
                                                    day: "numeric",
                                                },
                                            )}
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
}
