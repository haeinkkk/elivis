"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

import type { ApiWorkspaceStatus, ApiWorkspaceTask } from "../../types/workspace-api";
import type { ProjectDetailParticipant } from "../../types/project-detail";
import { UserAvatar } from "../../UserAvatar";
import { formatTaskTitleForList } from "../../utils/task-title-display";
import { tagColorOf } from "../../utils/tag-colors";
import { resolveTaskSemanticBucket } from "./project-detail-helpers";
import { type WorkloadBand, WORKLOAD_CHART_MAX_SCORE } from "./workload-score";

const PAGE_SIZE = 10;
const PANEL_MS = 500;

function taskSemantic(
    task: ApiWorkspaceTask,
    statusById: Map<string, ApiWorkspaceStatus>,
) {
    const s = statusById.get(task.statusId);
    return resolveTaskSemanticBucket(
        s ?? {
            semantic: task.status.semantic,
            color: task.status.color,
            name: task.status.name,
        },
    );
}

function assigneeTaskStats(
    tasks: ApiWorkspaceTask[],
    statusById: Map<string, ApiWorkspaceStatus>,
    today: Date,
) {
    const sem = (t: ApiWorkspaceTask) => taskSemantic(t, statusById);
    const total = tasks.length;
    const completed = tasks.filter((t) => sem(t) === "DONE").length;
    const inProgress = tasks.filter((t) => sem(t) === "IN_PROGRESS").length;
    const review = tasks.filter((t) => sem(t) === "REVIEW").length;
    const onHold = tasks.filter((t) => sem(t) === "ON_HOLD").length;
    const overdue = tasks.filter((t) => {
        if (sem(t) === "DONE" || !t.dueDate) return false;
        return new Date(t.dueDate) < today;
    }).length;
    return { total, completed, inProgress, review, overdue, onHold };
}

/** 통계 박스 ↔ 목록 필터 (대시보드 집계와 동일 규칙) */
export type PerformanceStatFilter =
    | "all"
    | "done"
    | "inProgress"
    | "review"
    | "overdue"
    | "onHold";

function filterTasksByStat(
    tasks: ApiWorkspaceTask[],
    filter: PerformanceStatFilter,
    statusById: Map<string, ApiWorkspaceStatus>,
    today: Date,
): ApiWorkspaceTask[] {
    if (filter === "all") return tasks;
    const sem = (t: ApiWorkspaceTask) => taskSemantic(t, statusById);
    switch (filter) {
        case "done":
            return tasks.filter((t) => sem(t) === "DONE");
        case "inProgress":
            return tasks.filter((t) => sem(t) === "IN_PROGRESS");
        case "review":
            return tasks.filter((t) => sem(t) === "REVIEW");
        case "onHold":
            return tasks.filter((t) => sem(t) === "ON_HOLD");
        case "overdue":
            return tasks.filter((t) => {
                if (sem(t) === "DONE" || !t.dueDate) return false;
                return new Date(t.dueDate) < today;
            });
        default:
            return tasks;
    }
}

function bandBadgeClass(band: WorkloadBand): string {
    switch (band) {
        case "relaxed":
            return "bg-emerald-100 text-emerald-800 ring-emerald-200/80";
        case "normal":
            return "bg-sky-100 text-sky-800 ring-sky-200/80";
        case "overload":
            return "bg-amber-100 text-amber-900 ring-amber-200/80";
        default:
            return "bg-red-100 text-red-800 ring-red-200/80";
    }
}

function bandBarClass(band: WorkloadBand): string {
    switch (band) {
        case "relaxed":
            return "bg-gradient-to-r from-emerald-400 to-emerald-600";
        case "normal":
            return "bg-gradient-to-r from-sky-400 to-sky-600";
        case "overload":
            return "bg-gradient-to-r from-amber-400 to-amber-600";
        default:
            return "bg-gradient-to-r from-red-400 to-red-600";
    }
}

function bandLabelKey(band: WorkloadBand): "bandRelaxed" | "bandNormal" | "bandOverload" | "bandDanger" {
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

function diagnosisKey(band: WorkloadBand) {
    return band === "relaxed"
        ? "diagnosisRelaxed"
        : band === "normal"
          ? "diagnosisNormal"
          : band === "overload"
            ? "diagnosisOverload"
            : "diagnosisDanger";
}

type PanelVariant =
    | { type: "member"; participant: ProjectDetailParticipant }
    | { type: "unassigned" };

export function ProjectPerformanceMemberDetailPanel({
    open,
    onClose,
    onExitComplete,
    variant,
    score,
    band,
    tasks,
    statusById,
    today,
    onOpenTask,
}: {
    open: boolean;
    onClose: () => void;
    /** transform 트랜지션 종료 후 호출(언마운트 전 슬라이드 아웃) */
    onExitComplete?: () => void;
    variant: PanelVariant | null;
    score: number;
    band: WorkloadBand;
    tasks: ApiWorkspaceTask[];
    statusById: Map<string, ApiWorkspaceStatus>;
    today: Date;
    /** 업무 제목 클릭 시 상세 패널(부모에서 TaskDetail 등) */
    onOpenTask?: (task: ApiWorkspaceTask) => void;
}) {
    const tp = useTranslations("projects.detail.performance");
    const to = useTranslations("projects.detail.overview");
    const [page, setPage] = useState(1);
    const [statFilter, setStatFilter] = useState<PerformanceStatFilter>("all");
    const [portalReady, setPortalReady] = useState(false);
    const exitNotified = useRef(false);

    useEffect(() => {
        setPortalReady(true);
    }, []);

    const stats = useMemo(
        () => assigneeTaskStats(tasks, statusById, today),
        [tasks, statusById, today],
    );

    const sortedTasks = useMemo(
        () =>
            [...tasks].sort(
                (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
            ),
        [tasks],
    );

    const filteredTasks = useMemo(
        () => filterTasksByStat(sortedTasks, statFilter, statusById, today),
        [sortedTasks, statFilter, statusById, today],
    );

    const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));

    useEffect(() => {
        setPage((p) => Math.min(p, totalPages));
    }, [totalPages]);

    useEffect(() => {
        setPage(1);
    }, [statFilter]);

    useEffect(() => {
        if (open) setStatFilter("all");
    }, [open, variant]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    useEffect(() => {
        if (open) exitNotified.current = false;
    }, [open]);

    const safePage = Math.min(page, totalPages);
    const pageTasks = filteredTasks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const rounded = Math.round(score * 10) / 10;
    const pct = Math.min(100, (score / WORKLOAD_CHART_MAX_SCORE) * 100);

    const handleAsideTransitionEnd = (e: React.TransitionEvent<HTMLElement>) => {
        if (e.target !== e.currentTarget) return;
        if (e.propertyName !== "transform") return;
        if (open) return;
        if (exitNotified.current) return;
        exitNotified.current = true;
        onExitComplete?.();
    };

    if (!variant) return null;

    const title =
        variant.type === "member" ? variant.participant.name : tp("unassigned");
    const subtitle =
        variant.type === "member" ? variant.participant.userId : tp("unassignedWorkloadNote");

    // body 포털: main(z-0) 안에 두면 fixed+z가 헤더(z-50)보다 아래로 묶임. z-[110]은 알림(z-70)·로딩바(z-100) 위.
    const panel = (
        <div className="fixed inset-0 z-[110] flex justify-end" aria-hidden={!open}>
            <button
                type="button"
                className={`absolute inset-0 bg-stone-900/45 transition-opacity ease-out ${
                    open ? "opacity-100" : "opacity-0"
                }`}
                style={{ transitionDuration: `${PANEL_MS}ms` }}
                onClick={onClose}
                aria-label={tp("detailCloseAria")}
            />
            <aside
                className={`relative flex h-full w-full max-w-lg flex-col border-l border-stone-200/90 bg-white shadow-[0_0_40px_-10px_rgba(0,0,0,0.25)] will-change-transform sm:max-w-xl ${
                    open ? "translate-x-0" : "translate-x-full"
                }`}
                style={{
                    transitionProperty: "transform",
                    transitionDuration: `${PANEL_MS}ms`,
                    transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
                }}
                role="dialog"
                aria-modal={open}
                aria-labelledby="perf-member-detail-title"
                onTransitionEnd={handleAsideTransitionEnd}
            >
                <header className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 bg-white/95 px-5 py-4 backdrop-blur-sm">
                    <div className="flex min-w-0 items-center gap-3">
                        {variant.type === "member" ? (
                            <UserAvatar
                                userId={variant.participant.id}
                                label={variant.participant.name}
                                avatarUrl={variant.participant.avatarUrl}
                                sizeClass="h-12 w-12 text-sm ring-2 ring-stone-100"
                            />
                        ) : (
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-stone-200 to-stone-300 text-stone-600 ring-2 ring-stone-100">
                                <svg
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    aria-hidden
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                                    />
                                </svg>
                            </span>
                        )}
                        <div className="min-w-0">
                            <h2
                                id="perf-member-detail-title"
                                className="truncate text-lg font-semibold tracking-tight text-stone-900"
                            >
                                {title}
                            </h2>
                            <p className="truncate text-xs text-stone-500">{subtitle}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-xl p-2 text-stone-500 transition-all duration-200 hover:bg-stone-100 hover:text-stone-900 active:scale-95"
                        aria-label={tp("detailCloseAria")}
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                <div
                    className={`min-h-0 flex-1 overflow-y-auto px-5 py-6 transition-opacity ease-out ${
                        open ? "opacity-100" : "opacity-0"
                    }`}
                    style={{ transitionDuration: `${Math.min(280, PANEL_MS)}ms` }}
                >
                    {/* 과부하 점수 */}
                    <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-gradient-to-br from-stone-50 to-white p-5 shadow-sm ring-1 ring-stone-100/80">
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400">
                            {tp("detailWorkloadHeading")}
                        </p>
                        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold tabular-nums tracking-tight text-stone-900 sm:text-5xl">
                                    {rounded}
                                </span>
                                <span className="pb-1 text-sm font-medium text-stone-400">{tp("scoreUnit")}</span>
                            </div>
                            <span
                                className={`rounded-full px-3.5 py-1.5 text-xs font-bold shadow-sm ring-1 ${bandBadgeClass(band)}`}
                            >
                                {tp(bandLabelKey(band))}
                            </span>
                        </div>
                        <div className="mt-5">
                            <div className="relative h-6 overflow-hidden rounded-full bg-stone-200/90 shadow-inner ring-1 ring-stone-200/60">
                                <div
                                    className={`h-full min-w-0 rounded-full shadow-sm ${bandBarClass(band)}`}
                                    style={{
                                        width: `${pct}%`,
                                        transitionProperty: "width",
                                        transitionDuration: "900ms",
                                        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                                    }}
                                />
                            </div>
                            <div className="mt-2 flex justify-between text-[11px] font-medium tabular-nums text-stone-400">
                                <span>0</span>
                                <span className="text-stone-300">—</span>
                                <span>{WORKLOAD_CHART_MAX_SCORE}</span>
                            </div>
                        </div>
                        <p className="mt-4 rounded-lg bg-white/70 px-3 py-2.5 text-sm leading-relaxed text-stone-700 ring-1 ring-stone-100/80">
                            {tp(diagnosisKey(band))}
                        </p>
                    </section>

                    {/* 대시보드와 동일 6지표 */}
                    <section className="mt-7">
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400">
                            {tp("detailStatsHeading")}
                        </p>
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                            {(
                                [
                                    { filter: "all" as const, key: "total", label: to("statTotal"), value: stats.total },
                                    { filter: "done" as const, key: "done", label: to("statDone"), value: stats.completed },
                                    {
                                        filter: "inProgress" as const,
                                        key: "ip",
                                        label: to("statInProgress"),
                                        value: stats.inProgress,
                                    },
                                    { filter: "review" as const, key: "rev", label: to("statReview"), value: stats.review },
                                    {
                                        filter: "overdue" as const,
                                        key: "ov",
                                        label: to("statOverdue"),
                                        value: stats.overdue,
                                    },
                                    { filter: "onHold" as const, key: "hold", label: to("statOnHold"), value: stats.onHold },
                                ] as const
                            ).map(({ filter, key, label, value }) => {
                                const selected = statFilter === filter;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setStatFilter(filter)}
                                        className={`rounded-xl border px-3 py-3 text-center shadow-sm transition-all duration-200 ${
                                            selected
                                                ? "border-stone-800 bg-stone-900 text-white ring-2 ring-stone-800 ring-offset-2"
                                                : "border-stone-100 bg-white ring-1 ring-stone-50 hover:border-stone-300 hover:shadow-md"
                                        }`}
                                    >
                                        <p
                                            className={`text-[10px] font-semibold ${selected ? "text-stone-300" : "text-stone-500"}`}
                                        >
                                            {label}
                                        </p>
                                        <p
                                            className={`mt-1.5 text-xl font-bold tabular-nums ${selected ? "text-white" : "text-stone-900"}`}
                                        >
                                            {value}
                                            <span
                                                className={`ml-0.5 text-xs font-semibold ${selected ? "text-stone-400" : "text-stone-400"}`}
                                            >
                                                {to("unit")}
                                            </span>
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                        {statFilter !== "all" ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="text-xs text-stone-500">
                                    {tp("detailFilterActive", {
                                        label:
                                            statFilter === "done"
                                                ? to("statDone")
                                                : statFilter === "inProgress"
                                                  ? to("statInProgress")
                                                  : statFilter === "review"
                                                    ? to("statReview")
                                                    : statFilter === "overdue"
                                                      ? to("statOverdue")
                                                      : to("statOnHold"),
                                    })}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setStatFilter("all")}
                                    className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600 transition-colors hover:bg-stone-50"
                                >
                                    {tp("detailFilterClear")}
                                </button>
                            </div>
                        ) : null}
                    </section>

                    {/* 업무 목록 */}
                    <section className="mt-8 pb-2">
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400">
                            {tp("detailTasksHeading")}
                        </p>
                        {sortedTasks.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-stone-200 py-10 text-center text-sm text-stone-400">
                                {tp("detailTasksEmpty")}
                            </p>
                        ) : filteredTasks.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-stone-200 py-10 text-center text-sm text-stone-400">
                                {tp("detailFilteredEmpty")}
                            </p>
                        ) : (
                            <>
                                <ul className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm ring-1 ring-stone-100/60">
                                    {pageTasks.map((task) => {
                                        const st = tagColorOf(task.status.color);
                                        const pr = task.priority ? tagColorOf(task.priority.color) : null;
                                        const titleText = formatTaskTitleForList(task.title);
                                        const TitleEl =
                                            onOpenTask != null ? (
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenTask(task)}
                                                    className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-stone-900 underline-offset-2 hover:text-stone-700 hover:underline"
                                                    title={task.title}
                                                >
                                                    {titleText}
                                                </button>
                                            ) : (
                                                <p
                                                    className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-900"
                                                    title={task.title}
                                                >
                                                    {titleText}
                                                </p>
                                            );
                                        return (
                                            <li
                                                key={task.id}
                                                className="border-b border-stone-100 px-4 py-3 transition-colors duration-200 last:border-b-0 hover:bg-stone-50/90"
                                            >
                                                <div className="flex min-w-0 items-center gap-2">
                                                    {task.priority ? (
                                                        <span
                                                            className={`inline-flex min-w-0 max-w-[28%] shrink items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${pr!.badge}`}
                                                            style={pr!.badgeStyle}
                                                            title={task.priority.name}
                                                        >
                                                            <span
                                                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${pr!.dot}`}
                                                                style={pr!.dotStyle}
                                                            />
                                                            <span className="truncate">{task.priority.name}</span>
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className="shrink-0 tabular-nums text-[11px] font-medium text-stone-400"
                                                            aria-hidden
                                                        >
                                                            —
                                                        </span>
                                                    )}
                                                    {TitleEl}
                                                    <span
                                                        className={`inline-flex min-w-0 max-w-[28%] shrink items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.badge}`}
                                                        style={st.badgeStyle}
                                                        title={task.status.name}
                                                    >
                                                        <span
                                                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${st.dot}`}
                                                            style={st.dotStyle}
                                                        />
                                                        <span className="truncate">{task.status.name}</span>
                                                    </span>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>

                                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-center text-[11px] tabular-nums text-stone-500 sm:text-left">
                                        {tp("detailPageInfo", {
                                            current: safePage,
                                            totalPages,
                                            from:
                                                filteredTasks.length === 0
                                                    ? 0
                                                    : (safePage - 1) * PAGE_SIZE + 1,
                                            to: Math.min(safePage * PAGE_SIZE, filteredTasks.length),
                                            total: filteredTasks.length,
                                        })}
                                    </p>
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            type="button"
                                            disabled={safePage <= 1}
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            className="min-w-[5rem] rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 shadow-sm transition-all duration-200 hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-35"
                                        >
                                            {tp("detailPaginationPrev")}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={safePage >= totalPages}
                                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                            className="min-w-[5rem] rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 shadow-sm transition-all duration-200 hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-35"
                                        >
                                            {tp("detailPaginationNext")}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </section>
                </div>
            </aside>
        </div>
    );

    if (!portalReady) return null;
    return createPortal(panel, document.body);
}
