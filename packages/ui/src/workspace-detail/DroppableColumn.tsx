"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useDroppable } from "@dnd-kit/core";

import type { ApiWorkspacePriority, ApiWorkspaceStatus, ApiWorkspaceTask } from "../types/workspace-api";
import type { WorkspaceDetailMyWorkMutations } from "../types/workspace-detail-mutations";

import { DraggableTaskCard } from "./DraggableTaskCard";
import { InlineAddForm } from "./InlineAddForm";
import { tagColorOf } from "../utils/tag-colors";

export function DroppableColumn({
    status, tasks, statuses, priorities, workspaceId, myWorkMutations, onUpdate, onDelete, onAdded, onStatusesChange, onPrioritiesChange, onOpenPanel,
}: {
    status: ApiWorkspaceStatus;
    tasks: ApiWorkspaceTask[];
    statuses: ApiWorkspaceStatus[];
    priorities: ApiWorkspacePriority[];
    workspaceId: string;
    myWorkMutations: WorkspaceDetailMyWorkMutations;
    onUpdate: (t: ApiWorkspaceTask) => void;
    onDelete: (id: string) => void;
    onAdded: (t: ApiWorkspaceTask) => void;
    onStatusesChange: (s: ApiWorkspaceStatus[]) => void;
    onPrioritiesChange: (p: ApiWorkspacePriority[]) => void;
    onOpenPanel?: (t: ApiWorkspaceTask) => void;
}) {
    const t = useTranslations("workspace");
    const { isOver, setNodeRef } = useDroppable({ id: status.id });
    const [adding, setAdding] = useState(false);
    const cm = tagColorOf(status.color);

    return (
        <div
            className={`flex min-w-[260px] flex-col rounded-xl border transition-colors ${
                isOver
                    ? "border-blue-300 bg-blue-50/30 dark:border-blue-600/50 dark:bg-blue-950/30"
                    : "border-stone-200 bg-stone-50/50 dark:border-elivis-line dark:bg-elivis-surface"
            }`}
        >
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-elivis-line px-3 py-2.5">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cm.badge}`} style={cm.badgeStyle}>{status.name}</span>
                <span className="rounded-full bg-stone-200 dark:bg-elivis-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-stone-600 dark:text-elivis-ink-secondary">{tasks.length}</span>
            </div>
            <div ref={setNodeRef} className="flex min-h-[60px] flex-1 flex-col gap-2 p-2">
                {tasks.map((task) => (
                    <DraggableTaskCard key={task.id} task={task} statuses={statuses} priorities={priorities}
                        workspaceId={workspaceId} myWorkMutations={myWorkMutations} onUpdate={onUpdate} onDelete={onDelete}
                        onStatusesChange={onStatusesChange} onPrioritiesChange={onPrioritiesChange}
                        onOpenPanel={onOpenPanel} />
                ))}
                {adding ? (
                    <InlineAddForm workspaceId={workspaceId} defaultStatusId={status.id}
                        createWorkspaceTask={myWorkMutations.createWorkspaceTask}
                        onAdded={(t) => { onAdded(t); setAdding(false); }} onCancel={() => setAdding(false)} />
                ) : (
                    <button type="button" onClick={() => setAdding(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-dashed border-stone-300 dark:border-elivis-line px-3 py-2 text-xs text-stone-400 dark:text-elivis-ink-secondary hover:border-stone-400 hover:text-stone-600 dark:hover:border-elivis-ink-muted dark:hover:text-elivis-ink">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {t("common.addTask")}
                    </button>
                )}
            </div>
        </div>
    );
}