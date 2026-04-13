"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import type { ApiWorkspaceTask } from "../types/workspace-api";
import type { WorkspaceDetailMyWorkMutations } from "../types/workspace-detail-mutations";
import { formatTaskTitleForList } from "../utils/task-title-display";

import type { TagColorResult } from "../utils/tag-colors";

export function SummaryTimelineTaskCard({
    task,
    workspaceId,
    updateWorkspaceTask,
    onTaskUpdate,
    onSelectTask,
    statusColor,
    priorityColor,
    dueLabel,
    dueClass,
}: {
    task: ApiWorkspaceTask;
    workspaceId: string;
    updateWorkspaceTask: WorkspaceDetailMyWorkMutations["updateWorkspaceTask"];
    onTaskUpdate: (t: ApiWorkspaceTask) => void;
    onSelectTask?: (task: ApiWorkspaceTask) => void;
    statusColor: TagColorResult;
    priorityColor: TagColorResult | null;
    dueLabel: string;
    dueClass: string;
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

    function commitTitle() {
        const v = draft.trim();
        if (!v) {
            setDraft(task.title);
            return;
        }
        if (v === task.title) return;
        startTransition(async () => {
            const res = await updateWorkspaceTask(workspaceId, task.id, { title: v });
            if (res.ok) onTaskUpdate(res.task);
        });
    }

    function finishTitleEdit() {
        commitTitle();
        setEditingTitle(false);
    }

    return (
        <div
            role={onSelectTask ? "button" : undefined}
            tabIndex={onSelectTask ? 0 : undefined}
            onClick={() => onSelectTask?.(task)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelectTask?.(task);
            }}
            className={`group/tl flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 shadow-sm transition-shadow hover:border-stone-300 hover:shadow-md dark:border-elivis-line dark:bg-elivis-surface dark:shadow-none dark:hover:border-elivis-line dark:hover:shadow-none ${onSelectTask ? "cursor-pointer" : ""}`}
        >
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusColor.dot}`} style={statusColor.dotStyle} />
            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1">
                    {editingTitle ? (
                        <input
                            ref={titleInputRef}
                            type="text"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={finishTitleEdit}
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
                            className="w-full truncate rounded border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-1 py-0 text-sm font-medium text-stone-800 dark:text-elivis-ink outline-none focus:border-stone-400 focus:ring-0 disabled:opacity-60"
                        />
                    ) : (
                        <>
                            {onSelectTask ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectTask(task);
                                    }}
                                    title={task.title}
                                    className="min-w-0 flex-1 truncate text-left text-sm font-medium text-stone-800 dark:text-elivis-ink hover:underline"
                                >
                                    {formatTaskTitleForList(task.title)}
                                </button>
                            ) : (
                                <span title={task.title} className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800 dark:text-elivis-ink">{formatTaskTitleForList(task.title)}</span>
                            )}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDraft(task.title);
                                    setEditingTitle(true);
                                }}
                                className="shrink-0 rounded p-0.5 text-stone-300 opacity-0 transition-opacity hover:bg-stone-100 hover:text-stone-600 group-hover/tl:opacity-100 dark:text-elivis-ink-muted dark:hover:bg-elivis-surface-elevated dark:hover:text-elivis-ink-secondary"
                                title={t("taskRow.editTitle")}
                                aria-label={t("taskRow.editTitle")}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                            </button>
                        </>
                    )}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                    <span className={`text-[11px] ${statusColor.badge} rounded-full px-1.5 py-px`} style={statusColor.badgeStyle}>{task.status.name}</span>
                    {priorityColor && task.priority && (
                        <span className={`text-[11px] ${priorityColor.badge} rounded-full px-1.5 py-px`} style={priorityColor.badgeStyle}>
                            {task.priority.name}
                            {(task.priority.value ?? 0) > 0 && <span className="ml-0.5 opacity-60">·{task.priority.value}</span>}
                        </span>
                    )}
                    {task.assignee && (
                        <span className="flex items-center gap-1 text-[11px] text-stone-400 dark:text-elivis-ink-secondary">
                            {task.assignee.avatarUrl
                                ? <img src={task.assignee.avatarUrl} className="h-3.5 w-3.5 rounded-full" alt="" />
                                : <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-stone-200 dark:bg-elivis-surface-elevated text-[9px] font-semibold">{(task.assignee.name ?? task.assignee.email)[0].toUpperCase()}</span>
                            }
                            {task.assignee.name ?? task.assignee.email}
                        </span>
                    )}
                </div>
            </div>
            <span className={`shrink-0 text-xs ${dueClass}`}>{dueLabel}</span>
        </div>
    );
}