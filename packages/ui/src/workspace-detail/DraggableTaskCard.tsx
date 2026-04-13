"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { StatusModal, type StatusModalValue } from "../workspace/StatusModal";
import type { ApiWorkspacePriority, ApiWorkspaceStatus, ApiWorkspaceTask } from "../types/workspace-api";
import type { WorkspaceDetailMyWorkMutations } from "../types/workspace-detail-mutations";
import { formatTaskTitleForList } from "../utils/task-title-display";

import { PriorityDropdown } from "./PriorityDropdown";
import { TagDropdown, type TagItem } from "./TagDropdown";

export function DraggableTaskCard({
    task, statuses, priorities, workspaceId, myWorkMutations, onUpdate, onDelete, onStatusesChange, onPrioritiesChange, onOpenPanel,
}: {
    task: ApiWorkspaceTask;
    statuses: ApiWorkspaceStatus[];
    priorities: ApiWorkspacePriority[];
    workspaceId: string;
    myWorkMutations: WorkspaceDetailMyWorkMutations;
    onUpdate: (t: ApiWorkspaceTask) => void;
    onDelete: (id: string) => void;
    onStatusesChange: (s: ApiWorkspaceStatus[]) => void;
    onPrioritiesChange: (p: ApiWorkspacePriority[]) => void;
    onOpenPanel?: (t: ApiWorkspaceTask) => void;
}) {
    const t = useTranslations("workspace");
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, data: { task } });
    const [isPending, startTransition] = useTransition();
    const [titleDraft, setTitleDraft] = useState(task.title);
    const [editingTitle, setEditingTitle] = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTitleDraft(task.title);
    }, [task.id, task.title]);

    useEffect(() => {
        if (editingTitle) {
            titleInputRef.current?.focus();
            titleInputRef.current?.select();
        }
    }, [editingTitle]);

    const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), opacity: isDragging ? 0.3 : 1 };

    // ── 상태 모달 ─────────────────────────────────────────────────────────────
    const [statusModal, setStatusModal] = useState<{
        mode: "create" | "edit";
        item?: TagItem;
    } | null>(null);

    // 상태 어댑터
    async function statusCreateAdapter(wsId: string, input: { name: string; color: string }) {
        const res = await myWorkMutations.createWorkspaceStatus(wsId, {
            ...input,
            semantic: "IN_PROGRESS",
        });
        if (res.ok) return { ok: true as const, item: res.status as TagItem };
        return { ok: false as const, message: res.message };
    }
    async function statusUpdateAdapter(wsId: string, id: string, input: { name?: string; color?: string }) {
        const res = await myWorkMutations.updateWorkspaceStatus(wsId, id, input);
        if (res.ok) return { ok: true as const, item: res.status as TagItem };
        return { ok: false as const, message: res.message };
    }

    async function handleStatusModalSave(value: StatusModalValue) {
        if (statusModal?.mode === "create") {
            const res = await myWorkMutations.createWorkspaceStatus(workspaceId, value);
            if (res.ok) onStatusesChange([...statuses, res.status] as unknown as ApiWorkspaceStatus[]);
        } else if (statusModal?.mode === "edit" && statusModal.item) {
            const res = await myWorkMutations.updateWorkspaceStatus(workspaceId, statusModal.item.id, value);
            if (res.ok) {
                onStatusesChange(
                    statuses.map((s) =>
                        s.id === statusModal.item!.id ? (res.status as unknown as ApiWorkspaceStatus) : s,
                    ),
                );
            }
        }
        setStatusModal(null);
    }

    function commitTitle() {
        const v = titleDraft.trim();
        if (!v) {
            setTitleDraft(task.title);
            return;
        }
        if (v === task.title) return;
        startTransition(async () => {
            const res = await myWorkMutations.updateWorkspaceTask(workspaceId, task.id, { title: v });
            if (res.ok) onUpdate(res.task);
        });
    }

    function finishTitleEdit() {
        commitTitle();
        setEditingTitle(false);
    }

    return (
        <>
        {statusModal && (
            <StatusModal
                mode={statusModal.mode}
                initialValue={statusModal.item}
                onSave={handleStatusModalSave}
                onClose={() => setStatusModal(null)}
            />
        )}
        <div ref={setNodeRef} style={style}
            className={`rounded-lg border border-stone-200 bg-white p-3 shadow-sm transition-opacity dark:border-elivis-line dark:bg-elivis-surface dark:shadow-none ${isPending ? "opacity-50" : ""}`}>
            {/* 드래그 핸들 + 삭제 */}
            <div className="mb-1.5 flex items-center justify-between gap-1">
                <button type="button" {...attributes} {...listeners}
                    className="cursor-grab touch-none text-stone-300 hover:text-stone-400 active:cursor-grabbing dark:text-elivis-ink-muted dark:hover:text-elivis-ink-secondary"
                    title="드래그"
                >
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8-16a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                    </svg>
                </button>
                <button type="button" onClick={() => startTransition(async () => { const res = await myWorkMutations.deleteWorkspaceTask(workspaceId, task.id); if (res.ok) onDelete(task.id); })}
                    disabled={isPending}
                    className="shrink-0 rounded p-0.5 text-stone-300 hover:bg-red-50 dark:text-elivis-ink-muted dark:hover:bg-red-950/40 hover:text-red-400 dark:hover:text-red-400"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div className="group/title mb-2 flex min-w-0 items-center gap-1">
                {editingTitle ? (
                    <input
                        ref={titleInputRef}
                        type="text"
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onBlur={finishTitleEdit}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                            if (e.key === "Escape") {
                                setTitleDraft(task.title);
                                setEditingTitle(false);
                            }
                        }}
                        disabled={isPending}
                        className="w-full rounded border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-1 py-0.5 text-sm font-medium text-stone-800 dark:text-elivis-ink outline-none focus:border-stone-400 focus:ring-0 disabled:opacity-60"
                    />
                ) : (
                    <>
                        {onOpenPanel ? (
                            <button
                                type="button"
                                onClick={() => onOpenPanel(task)}
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
                            onClick={() => {
                                setTitleDraft(task.title);
                                setEditingTitle(true);
                            }}
                            className="shrink-0 rounded p-0.5 text-stone-300 opacity-0 transition-opacity hover:bg-stone-100 dark:text-elivis-ink-muted dark:hover:bg-elivis-surface-elevated hover:text-stone-600 dark:hover:text-elivis-ink-secondary group-hover/title:opacity-100"
                            title={t("taskRow.editTitle")}
                            aria-label={t("taskRow.editTitle")}
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                        </button>
                    </>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
                <TagDropdown selectedId={task.statusId} items={statuses} workspaceId={workspaceId} disabled={isPending}
                    onChange={(id) => { if (id) { startTransition(async () => { const res = await myWorkMutations.updateWorkspaceTask(workspaceId, task.id, { statusId: id }); if (res.ok) onUpdate(res.task); }); } }}
                    onItemsChange={(items) => onStatusesChange(items as unknown as ApiWorkspaceStatus[])}
                    onCreate={statusCreateAdapter} onUpdate={statusUpdateAdapter}
                    onDelete={async (wsId, id) => myWorkMutations.deleteWorkspaceStatus(wsId, id)}
                    onOpenCreate={() => setStatusModal({ mode: "create" })}
                    onOpenEdit={(item) => setStatusModal({ mode: "edit", item })} />
                <PriorityDropdown
                    selectedId={task.priorityId}
                    items={priorities as unknown as TagItem[]}
                    workspaceId={workspaceId}
                    disabled={isPending}
                    mutations={myWorkMutations}
                    onChange={(id) => startTransition(async () => { const res = await myWorkMutations.updateWorkspaceTask(workspaceId, task.id, { priorityId: id }); if (res.ok) onUpdate(res.task); })}
                    onItemsChange={(items) => onPrioritiesChange(items as unknown as ApiWorkspacePriority[])}
                />
            </div>
            {(task.startDate || task.dueDate) && (
                <div className="mt-1.5 flex items-center gap-1 text-xs text-stone-500 dark:text-elivis-ink-secondary">
                    {task.startDate && <span>{new Date(task.startDate).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}</span>}
                    {task.startDate && task.dueDate && <span>~</span>}
                    {task.dueDate && <span>{new Date(task.dueDate).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}</span>}
                </div>
            )}
        </div>
        </>
    );
}