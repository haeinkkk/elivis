"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { ApiWorkspacePriority, ApiWorkspaceStatus, ApiWorkspaceTask } from "../types/workspace-api";
import type { WorkspaceDetailMyWorkMutations } from "../types/workspace-detail-mutations";

import { DashboardPanel } from "./DashboardPanel";
import { TimelineTab } from "./TimelineTab";
import type { SummarySubTab } from "./types";

export function SummaryTab({
    tasks,
    statuses,
    priorities,
    workspaceId,
    updateWorkspaceTask,
    onTaskUpdate,
    onSelectTask,
}: {
    tasks: ApiWorkspaceTask[];
    statuses: ApiWorkspaceStatus[];
    priorities: ApiWorkspacePriority[];
    workspaceId: string;
    updateWorkspaceTask: WorkspaceDetailMyWorkMutations["updateWorkspaceTask"];
    onTaskUpdate: (t: ApiWorkspaceTask) => void;
    onSelectTask?: (task: ApiWorkspaceTask) => void;
}) {
    const t = useTranslations("workspace");
    const [subTab, setSubTab] = useState<SummarySubTab>("timeline");

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {/* 서브탭 헤더 */}
            <div className="flex items-center gap-1 border-b border-stone-200 bg-white px-5 py-2">
                {(["timeline", "dashboard"] as const).map((id) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setSubTab(id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            subTab === id
                                ? "bg-stone-100 text-stone-900"
                                : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
                        }`}
                    >
                        {id === "timeline" ? t("tabs.timeline") : t("tabs.dashboard")}
                    </button>
                ))}
            </div>

            {/* 서브탭 콘텐츠 — 빈 상태 세로 가운데 정렬을 위해 flex 컬럼 유지 */}
            <div className="flex min-h-0 flex-1 flex-col">
                {subTab === "timeline" && (
                    <TimelineTab
                        tasks={tasks}
                        statuses={statuses}
                        workspaceId={workspaceId}
                        updateWorkspaceTask={updateWorkspaceTask}
                        onTaskUpdate={onTaskUpdate}
                        onSelectTask={onSelectTask}
                    />
                )}
                {subTab === "dashboard" && (
                    <DashboardPanel tasks={tasks} statuses={statuses} priorities={priorities} />
                )}
            </div>
        </div>
    );
}