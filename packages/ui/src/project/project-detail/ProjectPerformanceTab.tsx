"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { UserAvatar } from "../../UserAvatar";
import type {
    ApiProjectTasksItem,
    ApiWorkspacePriority,
    ApiWorkspaceStatus,
    ApiWorkspaceTask,
} from "../../types/workspace-api";
import type {
    ProjectDetailModel,
    ProjectDetailParticipant,
    ProjectDetailViewerRole,
} from "../../types/project-detail";
import type { WorkspaceTaskDetailActions } from "../../types/workspace-task-detail-actions";
import TaskDetailPanel from "../../workspace/TaskDetailPanel";
import { ProjectPerformanceMemberDetailPanel } from "./ProjectPerformanceMemberDetailPanel";
import {
    calculateWorkloadScore,
    getWorkloadBand,
    WORKLOAD_CHART_MAX_SCORE,
    type WorkloadBand,
    workloadTaskFromProjectTask,
} from "./workload-score";

type DetailTarget = null | { kind: "member"; id: string } | { kind: "unassigned" };

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

type ChartRow =
    | {
          key: string;
          kind: "member";
          participant: ProjectDetailParticipant;
          score: number;
          band: WorkloadBand;
      }
    | { key: string; kind: "unassigned"; score: number; band: WorkloadBand };

type PerformanceTaskPanelSelection = {
    task: ApiWorkspaceTask;
    workspaceId: string;
    workspaceOwnerId: string;
    statuses: ApiWorkspaceStatus[];
    priorities: ApiWorkspacePriority[];
};

function participantSortRank(role?: ProjectDetailViewerRole): number {
    if (role === "LEADER") return 0;
    if (role === "DEPUTY_LEADER") return 1;
    return 2;
}

function memberTaskStats(
    tasks: ApiWorkspaceTask[],
    memberId: string,
    todayStart: Date,
): { assigned: number; done: number; inProgress: number; overdue: number } {
    const list = tasks.filter((t) => t.assignee?.id === memberId);
    let done = 0;
    let overdue = 0;
    for (const task of list) {
        if (task.status.semantic === "DONE") {
            done++;
            continue;
        }
        if (task.dueDate) {
            const due = new Date(task.dueDate);
            due.setHours(0, 0, 0, 0);
            if (due.getTime() < todayStart.getTime()) overdue++;
        }
    }
    return {
        assigned: list.length,
        done,
        inProgress: list.length - done,
        overdue,
    };
}

function buildTaskPanelLookup(items: ApiProjectTasksItem[]): Map<string, PerformanceTaskPanelSelection> {
    const m = new Map<string, PerformanceTaskPanelSelection>();
    for (const item of items) {
        const workspaceId = item.workspace.id;
        const workspaceOwnerId = item.workspace.user.id;
        for (const task of item.tasks) {
            m.set(task.id, {
                task,
                workspaceId,
                workspaceOwnerId,
                statuses: item.statuses,
                priorities: item.priorities,
            });
        }
    }
    return m;
}

export function ProjectPerformanceTab({
    project,
    projectTasksData,
    taskPanelActions,
    currentUserId = "",
}: {
    project: ProjectDetailModel;
    projectTasksData: ApiProjectTasksItem[];
    taskPanelActions: WorkspaceTaskDetailActions;
    currentUserId?: string;
}) {
    const t = useTranslations("projects.detail.performance");
    const tDetail = useTranslations("projects.detail");
    const [detail, setDetail] = useState<DetailTarget>(null);
    /** 닫힘 트랜지션 후 detail 제거 — 슬라이드 아웃 재생용 */
    const [panelOpen, setPanelOpen] = useState(false);
    const [taskPanel, setTaskPanel] = useState<PerformanceTaskPanelSelection | null>(null);
    const allTasks = projectTasksData.flatMap((item) => item.tasks);

    const taskPanelLookup = buildTaskPanelLookup(projectTasksData);

    function openPerformanceTaskDetail(task: ApiWorkspaceTask) {
        const row = taskPanelLookup.get(task.id);
        if (row) setTaskPanel(row);
    }

    function handleTaskPanelUpdate(updated: ApiWorkspaceTask) {
        setTaskPanel((prev) => (prev ? { ...prev, task: updated } : null));
    }

    useEffect(() => {
        if (!detail) {
            setPanelOpen(false);
            return;
        }
        setPanelOpen(false);
        const id = window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => setPanelOpen(true));
        });
        return () => window.cancelAnimationFrame(id);
    }, [detail]);
    const statusById = new Map(
        projectTasksData.flatMap((item) => item.statuses).map((s) => [s.id, s]),
    );

    const today = (() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    })();

    const sortedParticipants = [...project.participants].sort((a, b) => {
        const ra = participantSortRank(a.role);
        const rb = participantSortRank(b.role);
        if (ra !== rb) return ra - rb;
        return a.name.localeCompare(b.name, "ko");
    });

    function roleLabel(role?: ProjectDetailViewerRole) {
        if (!role) return "—";
        return tDetail(`viewerRoles.${role}`);
    }

    const memberWorkloadRows = project.participants.map((p) => {
        const assigned = allTasks.filter((task) => task.assignee?.id === p.id);
        const wtasks = assigned.map((task) => workloadTaskFromProjectTask(task, statusById));
        const { total } = calculateWorkloadScore(wtasks, today);
        const band = getWorkloadBand(total);
        return { participant: p, score: total, band };
    });

    const unassignedWorkload = (() => {
        const unassigned = allTasks.filter((task) => !task.assignee?.id);
        const wtasks = unassigned.map((task) => workloadTaskFromProjectTask(task, statusById));
        return {
            ...calculateWorkloadScore(wtasks, today),
            count: unassigned.length,
        };
    })();

    const chartRows: ChartRow[] = (() => {
        const list: ChartRow[] = memberWorkloadRows.map((r) => ({
            key: r.participant.id,
            kind: "member",
            participant: r.participant,
            score: r.score,
            band: r.band,
        }));
        if (unassignedWorkload.count > 0) {
            list.push({
                key: "unassigned",
                kind: "unassigned",
                score: unassignedWorkload.total,
                band: getWorkloadBand(unassignedWorkload.total),
            });
        }
        list.sort((a, b) => b.score - a.score);
        return list;
    })();

    const detailPayload = (() => {
        if (!detail) return null;
        if (detail.kind === "unassigned") {
            return {
                variant: { type: "unassigned" as const },
                tasks: allTasks.filter((task) => !task.assignee?.id),
                score: unassignedWorkload.total,
                band: getWorkloadBand(unassignedWorkload.total),
            };
        }
        const row = memberWorkloadRows.find((r) => r.participant.id === detail.id);
        if (!row) return null;
        return {
            variant: { type: "member" as const, participant: row.participant },
            tasks: allTasks.filter((task) => task.assignee?.id === detail.id),
            score: row.score,
            band: row.band,
        };
    })();

    const diagnosisKey = (band: WorkloadBand) =>
        band === "relaxed"
            ? "diagnosisRelaxed"
            : band === "normal"
              ? "diagnosisNormal"
              : band === "overload"
                ? "diagnosisOverload"
                : "diagnosisDanger";

    return (
        <>
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-stone-800">{t("title")}</h2>
                <p className="mt-1 text-sm text-stone-500">{t("subtitle")}</p>
            </div>

            {sortedParticipants.length > 0 ? (
                <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
                    <h3 className="text-base font-semibold text-stone-800">{t("memberWorkTableTitle")}</h3>
                    <p className="mt-1 text-sm text-stone-500">{t("memberWorkTableSubtitle")}</p>
                    <div className="mt-4 overflow-x-auto rounded-xl border border-stone-100">
                        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                            <thead>
                                <tr className="border-b border-stone-200 bg-stone-50/80 text-xs font-semibold uppercase tracking-wide text-stone-500">
                                    <th scope="col" className="px-4 py-3">
                                        {t("colRole")}
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        {t("colMember")}
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        {t("colEmail")}
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right tabular-nums">
                                        {t("colAssigned")}
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right tabular-nums">
                                        {t("colDone")}
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right tabular-nums">
                                        {t("colProgress")}
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right tabular-nums">
                                        {t("colOverdue")}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedParticipants.map((p) => {
                                    const st = memberTaskStats(allTasks, p.id, today);
                                    return (
                                        <tr
                                            key={p.id}
                                            className="cursor-pointer border-b border-stone-100 transition-colors last:border-b-0 hover:bg-stone-50/80"
                                            onClick={() => setDetail({ kind: "member", id: p.id })}
                                        >
                                            <td className="whitespace-nowrap px-4 py-3 text-stone-700">
                                                {roleLabel(p.role)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <UserAvatar
                                                        userId={p.id}
                                                        label={p.name}
                                                        avatarUrl={p.avatarUrl ?? null}
                                                        sizeClass="h-8 w-8 text-xs"
                                                    />
                                                    <span className="font-medium text-stone-900">{p.name}</span>
                                                </div>
                                            </td>
                                            <td className="max-w-[12rem] truncate px-4 py-3 text-stone-600">
                                                {p.userId}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums text-stone-800">
                                                {st.assigned}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums text-stone-800">
                                                {st.done}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums text-stone-800">
                                                {st.inProgress}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums text-stone-800">
                                                {st.overdue}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : null}

            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
                <h3 className="text-base font-semibold text-stone-800">{t("workloadTitle")}</h3>
                <p className="mt-1 text-xs text-stone-500">{t("workloadSubtitle")}</p>
                <p className="mt-2 font-mono text-[11px] text-stone-400">{t("workloadFormula")}</p>

                {allTasks.length === 0 ? (
                    <p className="mt-8 text-center text-sm text-stone-400">{t("noTasks")}</p>
                ) : (
                    <>
                        <p className="mt-6 text-xs text-stone-400">
                            {t("chartScaleHint", { max: WORKLOAD_CHART_MAX_SCORE })}
                        </p>

                        <div className="mt-4 space-y-5">
                            {chartRows.map((row) => {
                                const pct = Math.min(
                                    100,
                                    (row.score / WORKLOAD_CHART_MAX_SCORE) * 100,
                                );
                                const rounded = Math.round(row.score * 10) / 10;
                                return (
                                    <div
                                        key={row.key}
                                        className="rounded-xl border border-stone-100 bg-stone-50/40 p-4 sm:p-5"
                                    >
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-6">
                                            {/* 프로필 + 이름 */}
                                            <div className="flex shrink-0 items-center gap-3 lg:w-56">
                                                {row.kind === "member" ? (
                                                    <>
                                                        <UserAvatar
                                                            userId={row.participant.id}
                                                            label={row.participant.name}
                                                            avatarUrl={row.participant.avatarUrl}
                                                            sizeClass="h-11 w-11 text-sm"
                                                        />
                                                        <div className="min-w-0">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setDetail({
                                                                        kind: "member",
                                                                        id: row.participant.id,
                                                                    })
                                                                }
                                                                className="truncate text-left text-sm font-semibold text-stone-900 underline-offset-2 hover:text-stone-700 hover:underline"
                                                            >
                                                                {row.participant.name}
                                                            </button>
                                                            <p className="truncate text-xs text-stone-400">
                                                                {row.participant.userId}
                                                            </p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-200 text-stone-500">
                                                            <svg
                                                                className="h-5 w-5"
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
                                                        <div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setDetail({ kind: "unassigned" })}
                                                                className="text-left text-sm font-semibold text-stone-800 underline-offset-2 hover:text-stone-700 hover:underline"
                                                            >
                                                                {t("unassigned")}
                                                            </button>
                                                            <p className="text-xs text-stone-400">
                                                                {t("unassignedWorkloadNote")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 막대 + 점수 + 진단 */}
                                            <div className="min-w-0 flex-1 space-y-3">
                                                <div className="flex flex-wrap items-end justify-between gap-3">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-3xl font-bold tabular-nums tracking-tight text-stone-900">
                                                            {rounded}
                                                        </span>
                                                        <span className="text-xs font-medium text-stone-400">
                                                            {t("scoreUnit")}
                                                        </span>
                                                    </div>
                                                    <span
                                                        className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold ring-1 ${bandBadgeClass(row.band)}`}
                                                    >
                                                        {t(bandLabelKey(row.band))}
                                                    </span>
                                                </div>
                                                <div className="relative">
                                                    <div className="h-6 overflow-hidden rounded-lg bg-stone-200/80 shadow-inner">
                                                        <div
                                                            className={`h-full rounded-lg shadow-sm transition-all duration-500 ${bandBarClass(row.band)}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-stone-400">
                                                        <span>0</span>
                                                        <span>{WORKLOAD_CHART_MAX_SCORE}</span>
                                                    </div>
                                                </div>
                                                <p className="text-sm leading-snug text-stone-600">
                                                    {t(diagnosisKey(row.band))}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </section>

            {detail !== null && detailPayload ? (
                <ProjectPerformanceMemberDetailPanel
                    key={
                        detail.kind === "member"
                            ? detail.id
                            : detail.kind === "unassigned"
                              ? "unassigned"
                              : "closed"
                    }
                    open={panelOpen}
                    onClose={() => setPanelOpen(false)}
                    onExitComplete={() => setDetail(null)}
                    variant={detailPayload.variant}
                    score={detailPayload.score}
                    band={detailPayload.band}
                    tasks={detailPayload.tasks}
                    statusById={statusById}
                    today={today}
                    onOpenTask={openPerformanceTaskDetail}
                />
            ) : null}
        </div>

        {taskPanel ? (
            <TaskDetailPanel
                actions={taskPanelActions}
                task={taskPanel.task}
                statuses={taskPanel.statuses}
                priorities={taskPanel.priorities}
                workspaceId={taskPanel.workspaceId}
                onUpdate={handleTaskPanelUpdate}
                onClose={() => setTaskPanel(null)}
                readOnly={!!currentUserId && taskPanel.workspaceOwnerId !== currentUserId}
                currentUserId={currentUserId}
            />
        ) : null}
        </>
    );
}
