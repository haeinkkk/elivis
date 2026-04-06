"use client";

import { UserAvatar } from "../../UserAvatar";
import type { ApiProjectTasksItem } from "../../types/workspace-api";
import type { ProjectDetailModel } from "../../types/project-detail";
import { isCompletedStatus, isInProgressStatus } from "./project-detail-helpers";

export function ProjectPerformanceTab({
    project,
    projectTasksData,
}: {
    project: ProjectDetailModel;
    projectTasksData: ApiProjectTasksItem[];
}) {
    const allTasks = projectTasksData.flatMap((item) => item.tasks);
    const statusById = new Map(
        projectTasksData.flatMap((item) => item.statuses).map((s) => [s.id, s]),
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = project.participants.map((p) => {
        const assigned = allTasks.filter((t) => t.assignee?.id === p.id);
        const completed = assigned.filter((t) => {
            const s = statusById.get(t.statusId);
            return s ? isCompletedStatus(s) : false;
        });
        const inProgress = assigned.filter((t) => {
            const s = statusById.get(t.statusId);
            return s ? isInProgressStatus(s) : false;
        });
        const overdue = assigned.filter((t) => {
            const s = statusById.get(t.statusId);
            const done = s ? isCompletedStatus(s) : false;
            if (done || !t.dueDate) return false;
            return new Date(t.dueDate) < today;
        });
        return {
            participant: p,
            total: assigned.length,
            completed: completed.length,
            inProgress: inProgress.length,
            overdue: overdue.length,
        };
    });

    const unassigned = allTasks.filter((t) => !t.assignee?.id);
    const unassignedCompleted = unassigned.filter((t) => {
        const s = statusById.get(t.statusId);
        return s ? isCompletedStatus(s) : false;
    });
    const unassignedInProgress = unassigned.filter((t) => {
        const s = statusById.get(t.statusId);
        return s ? isInProgressStatus(s) : false;
    });
    const unassignedOverdue = unassigned.filter((t) => {
        const s = statusById.get(t.statusId);
        const done = s ? isCompletedStatus(s) : false;
        if (done || !t.dueDate) return false;
        return new Date(t.dueDate) < today;
    });

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-stone-800">실적 현황</h2>
                <p className="mt-1 text-sm text-stone-500">
                    프로젝트 전체 업무 중 담당자(Assignee)별 처리 건수입니다.
                </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b border-stone-100 bg-stone-50/80 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                            <th className="px-4 py-3">멤버</th>
                            <th className="hidden px-4 py-3 sm:table-cell">이메일</th>
                            <th className="px-4 py-3 text-right tabular-nums">담당</th>
                            <th className="px-4 py-3 text-right tabular-nums">완료</th>
                            <th className="px-4 py-3 text-right tabular-nums">진행</th>
                            <th className="px-4 py-3 text-right tabular-nums">기한 초과</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                        {rows.map(
                            ({
                                participant: p,
                                total,
                                completed,
                                inProgress,
                                overdue,
                            }) => (
                                <tr key={p.id} className="text-stone-700">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <UserAvatar
                                                userId={p.id}
                                                label={p.name}
                                                avatarUrl={p.avatarUrl}
                                                sizeClass="h-8 w-8 text-xs"
                                            />
                                            <span className="font-medium text-stone-800">{p.name}</span>
                                        </div>
                                    </td>
                                    <td className="hidden max-w-[200px] truncate px-4 py-3 text-stone-500 sm:table-cell">
                                        {p.userId}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium tabular-nums text-stone-800">
                                        {total}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-green-600">
                                        {completed}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-blue-600">
                                        {inProgress}
                                    </td>
                                    <td
                                        className={`px-4 py-3 text-right tabular-nums ${overdue > 0 ? "font-medium text-red-600" : "text-stone-400"}`}
                                    >
                                        {overdue}
                                    </td>
                                </tr>
                            ),
                        )}
                        {unassigned.length > 0 ? (
                            <tr className="bg-stone-50/50 text-stone-600">
                                <td className="px-4 py-3 font-medium text-stone-700">담당자 미지정</td>
                                <td className="hidden px-4 py-3 sm:table-cell">—</td>
                                <td className="px-4 py-3 text-right tabular-nums font-medium">
                                    {unassigned.length}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums text-green-600">
                                    {unassignedCompleted.length}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums text-blue-600">
                                    {unassignedInProgress.length}
                                </td>
                                <td
                                    className={`px-4 py-3 text-right tabular-nums ${unassignedOverdue.length > 0 ? "font-medium text-red-600" : "text-stone-400"}`}
                                >
                                    {unassignedOverdue.length}
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>

            {allTasks.length === 0 ? (
                <p className="text-center text-sm text-stone-400">등록된 업무가 없습니다.</p>
            ) : null}
        </div>
    );
}
