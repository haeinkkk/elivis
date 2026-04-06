"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ApiProjectTasksItem } from "../../types/workspace-api";
import type { ProjectDetailModel } from "../../types/project-detail";
import { formatTaskTitleForList } from "../../utils/task-title-display";
import { ProjectDonutChart } from "./ProjectDonutChart";
import {
    getDaysSinceStart,
    getProgressPercent,
    getRemainingDays,
    isCompletedStatus,
    isInProgressStatus,
    statusCssColor,
} from "./project-detail-helpers";

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
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-600" />
            </div>
        );
    }

    // ── 실데이터 집계 ──────────────────────────────────────────────
    const allTasks = projectTasksData.flatMap((item) => item.tasks);

    // 워크스페이스별 상태/우선순위를 id 기준 중복 제거
    const statusById = new Map(
        projectTasksData.flatMap((item) => item.statuses).map((s) => [s.id, s]),
    );
    const uniqueStatuses = [...statusById.values()].sort((a, b) => a.order - b.order);

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => {
        const s = statusById.get(t.statusId);
        return s ? isCompletedStatus(s) : false;
    });
    const inProgressTasks = allTasks.filter((t) => {
        const s = statusById.get(t.statusId);
        return s ? isInProgressStatus(s) : false;
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueTasks = allTasks.filter((t) => {
        const s = statusById.get(t.statusId);
        const done = s ? isCompletedStatus(s) : false;
        if (done || !t.dueDate) return false;
        return new Date(t.dueDate) < today;
    });

    // 상태별 업무 수 (막대 그래프용)
    const statusCounts = uniqueStatuses.map((s) => ({
        id: s.id,
        name: s.name,
        color: statusCssColor(s.color),
        count: allTasks.filter((t) => t.statusId === s.id).length,
    }));
    const maxCount = Math.max(1, ...statusCounts.map((s) => s.count));

    // 완료율
    const completionPercent = totalTasks
        ? Math.round((completedTasks.length / totalTasks) * 100)
        : 0;

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
            ? "bg-stone-100 text-stone-600"
            : remainingDays > 14
              ? "bg-blue-50 text-blue-700"
              : remainingDays > 0
                ? "bg-amber-50 text-amber-700"
                : "bg-red-50 text-red-600";

    const dDayTextColor =
        remainingDays === null
            ? "text-stone-800"
            : remainingDays > 14
              ? "text-blue-600"
              : remainingDays > 0
                ? "text-amber-600"
                : "text-red-600";

    return (
        <div className="space-y-5">
            {/* ── 1. 일정 히어로 카드 ───────────────────────────────── */}
            <section
                className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
                style={{ animation: "overview-fade-in 0.4s ease-out" }}
            >
                {/* 상단 헤더 바 */}
                <div className="flex items-center justify-between border-b border-stone-100 px-6 py-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
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
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                                {t("overview.startLabel")}
                            </p>
                            <p className="mt-1 text-lg font-bold text-stone-800 sm:text-xl">
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
                                        <span className="text-sm font-semibold text-stone-500">
                                            일 진행 중
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-xl font-semibold text-stone-400">
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
                                    <span className="text-sm font-semibold text-stone-500">
                                        {t("overview.daysLeftSuffix")}
                                    </span>
                                </>
                            ) : remainingDays === 0 ? (
                                <>
                                    <span className="text-3xl font-black text-red-600 sm:text-4xl">
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
                                    <span className="text-sm font-semibold text-red-500">
                                        {t("overview.daysOverdueSuffix")}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* 종료일 */}
                        <div className="min-w-0 text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                                {t("overview.endLabel")}
                            </p>
                            <p className="mt-1 text-lg font-bold text-stone-800 sm:text-xl">
                                {project.noEndDate ? t("overview.noEndDisplay") : formatOverviewDate(project.endDate, locale)}
                            </p>
                        </div>
                    </div>

                    {/* 타임라인 바 */}
                    {!project.noEndDate && progressPercent !== null && (
                        <div className="mt-5">
                            <div className="relative h-2.5 overflow-hidden rounded-full bg-stone-100">
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
                            <div className="mt-1.5 flex justify-between text-[10px] font-medium text-stone-400">
                                <span>{t("overview.timelineStart")}</span>
                                <span className="font-semibold text-stone-600">
                                    {t("overview.progressElapsed", { pct: progressPercent })}
                                </span>
                                <span>{t("overview.timelineEnd")}</span>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ── 2. 통계 카드 4개 ─────────────────────────────────── */}
            <section
                className="grid grid-cols-2 gap-4 lg:grid-cols-4"
                style={{ animation: "overview-fade-in 0.4s ease-out 0.05s both" }}
            >
                {[
                    {
                        label: t("overview.statTotal"),
                        value: totalTasks,
                        unit: t("overview.unit"),
                        color: "text-stone-800",
                        bg: "bg-stone-50",
                        icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2",
                    },
                    {
                        label: t("overview.statDone"),
                        value: completedTasks.length,
                        unit: t("overview.unit"),
                        color: "text-green-600",
                        bg: "bg-green-50",
                        icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
                    },
                    {
                        label: t("overview.statInProgress"),
                        value: inProgressTasks.length,
                        unit: t("overview.unit"),
                        color: "text-blue-600",
                        bg: "bg-blue-50",
                        icon: "M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z",
                    },
                    {
                        label: t("overview.statOverdue"),
                        value: overdueTasks.length,
                        unit: t("overview.unit"),
                        color: overdueTasks.length > 0 ? "text-red-600" : "text-stone-400",
                        bg: overdueTasks.length > 0 ? "bg-red-50" : "bg-stone-50",
                        icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
                    },
                ].map(({ label, value, unit, color, bg, icon }) => (
                    <div
                        key={label}
                        className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5"
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
                            <p className="text-[11px] font-medium text-stone-400">{label}</p>
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
                    className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"
                    style={{ animation: "overview-fade-in 0.4s ease-out 0.1s both" }}
                >
                    <h3 className="text-sm font-semibold text-stone-700">{t("overview.donutTitle")}</h3>
                    <p className="mt-0.5 text-xs text-stone-400">
                        {totalTasks > 0
                            ? t("overview.donutSubDone", { total: totalTasks, done: completedTasks.length })
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
                            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold tabular-nums text-stone-800">
                                {completionPercent}%
                            </span>
                        </div>
                        <div className="min-w-0 flex-1 space-y-2.5">
                            {[
                                { label: t("overview.legendDone"), count: completedTasks.length, color: "#22c55e" },
                                {
                                    label: t("overview.legendInProgress"),
                                    count: inProgressTasks.length,
                                    color: "#3b82f6",
                                },
                                {
                                    label: t("overview.legendOther"),
                                    count:
                                        totalTasks - completedTasks.length - inProgressTasks.length,
                                    color: "#d1d5db",
                                },
                            ].map(({ label, count, color }) => (
                                <div key={label} className="flex items-center gap-2">
                                    <span
                                        className="h-2 w-2 shrink-0 rounded-full"
                                        style={{ backgroundColor: color }}
                                    />
                                    <span className="min-w-0 flex-1 truncate text-xs text-stone-500">
                                        {label}
                                    </span>
                                    <span className="shrink-0 text-xs font-semibold tabular-nums text-stone-700">
                                        {count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 업무 상태별 막대 그래프 */}
                <div
                    className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"
                    style={{ animation: "overview-fade-in 0.4s ease-out 0.15s both" }}
                >
                    <h3 className="text-sm font-semibold text-stone-700">{t("overview.statusDistTitle")}</h3>
                    <p className="mt-0.5 text-xs text-stone-400">{t("overview.statusDistSub")}</p>
                    {statusCounts.length === 0 ? (
                        <p className="mt-6 text-center text-sm text-stone-400">{t("overview.statusEmpty")}</p>
                    ) : (
                        <div className="mt-5 space-y-3">
                            {statusCounts.map(({ id, name, count, color }) => (
                                <div key={id} className="flex items-center gap-2.5">
                                    <span className="w-14 shrink-0 truncate text-xs font-medium text-stone-600">
                                        {name}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="h-6 overflow-hidden rounded-md bg-stone-100">
                                            <div
                                                className="h-full rounded-md transition-all duration-700 ease-out"
                                                style={{
                                                    width: `${(count / maxCount) * 100}%`,
                                                    backgroundColor: color,
                                                    opacity: count === 0 ? 0.25 : 1,
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-stone-600">
                                        {count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 진행중인 업무 */}
                <div
                    className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"
                    style={{ animation: "overview-fade-in 0.4s ease-out 0.2s both" }}
                >
                    <h3 className="text-sm font-semibold text-stone-700">{t("overview.inProgressTitle")}</h3>
                    <p className="mt-0.5 text-xs text-stone-400">
                        {inProgressTasks.length > 0
                            ? t("overview.inProgressSub", { count: inProgressTasks.length })
                            : t("overview.inProgressSubEmpty")}
                    </p>
                    {inProgressTasks.length === 0 ? (
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
                            {inProgressTasks.slice(0, 6).map((task) => (
                                <li
                                    key={task.id}
                                    className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-stone-50"
                                >
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                                    <span
                                        title={task.title}
                                        className="min-w-0 flex-1 truncate text-sm text-stone-700"
                                    >
                                        {formatTaskTitleForList(task.title)}
                                    </span>
                                    {task.assignee?.name && (
                                        <span className="shrink-0 text-xs text-stone-400">
                                            {task.assignee.name}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    {inProgressTasks.length > 6 && onSeeMoreTasks && (
                        <button
                            type="button"
                            onClick={onSeeMoreTasks}
                            className="mt-3 w-full rounded-lg border border-stone-200 bg-white py-1.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-700"
                        >
                            {t("overview.seeMore", { count: inProgressTasks.length - 6 })}
                        </button>
                    )}
                </div>
            </section>

            {/* ── 4. 최근 업무 리스트 ──────────────────────────────── */}
            <section
                className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"
                style={{ animation: "overview-fade-in 0.4s ease-out 0.3s both" }}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-stone-700">{t("overview.recentTitle")}</h3>
                        <p className="mt-0.5 text-xs text-stone-400">{t("overview.recentSub")}</p>
                    </div>
                    {onSeeMoreTasks && (
                        <button
                            type="button"
                            onClick={onSeeMoreTasks}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
                        >
                            {t("overview.seeAll")}
                        </button>
                    )}
                </div>

                {recentTasks.length === 0 ? (
                    <div className="mt-6 py-8 text-center text-sm text-stone-400">
                        {t("overview.recentEmpty")}
                    </div>
                ) : (
                    <ul className="mt-4 divide-y divide-stone-50">
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
                                        className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800"
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
                                        <span className="hidden shrink-0 text-xs text-stone-400 sm:inline">
                                            {task.assignee.name}
                                        </span>
                                    )}
                                    {/* 마감일 */}
                                    {task.dueDate && (
                                        <span className="hidden shrink-0 text-xs text-stone-400 md:inline">
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
