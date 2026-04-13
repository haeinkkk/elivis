"use client";

import type { CSSProperties, HTMLAttributes, Ref } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { StatusModal, type StatusModalValue } from "../workspace/StatusModal";
import type { ApiWorkspacePriority, ApiWorkspaceStatus, ApiWorkspaceTask } from "../types/workspace-api";
import type { WorkspaceDetailMyWorkMutations } from "../types/workspace-detail-mutations";
import { formatTaskTitleForList } from "../utils/task-title-display";

import { InlineAddForm } from "./InlineAddForm";
import { PriorityDropdown } from "./PriorityDropdown";
import { TagDropdown, type TagItem } from "./TagDropdown";
import { AssigneeChip, DateCell } from "./task-cells";
import { sortTasksByOrder } from "./task-sort";

export interface TaskRowProps {
    task: ApiWorkspaceTask;
    subTasks: ApiWorkspaceTask[];
    allTasks: ApiWorkspaceTask[];
    statuses: ApiWorkspaceStatus[];
    priorities: ApiWorkspacePriority[];
    workspaceId: string;
    depth: number;
    isDragging?: boolean;
    dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
    rowRef?: Ref<HTMLTableRowElement>;
    rowStyle?: CSSProperties;
    onUpdate: (t: ApiWorkspaceTask) => void;
    onDelete: (id: string) => void;
    onAdded: (t: ApiWorkspaceTask) => void;
    onStatusesChange: (s: ApiWorkspaceStatus[]) => void;
    onPrioritiesChange: (p: ApiWorkspacePriority[]) => void;
    onOpenPanel: (t: ApiWorkspaceTask) => void;
    myWorkMutations: WorkspaceDetailMyWorkMutations;
    /** 부모가 일괄 펼침/접기할 때마다 증가시키고 defaultExpanded 로 동기화 */
    expandKey?: number;
    defaultExpanded?: boolean;
}

const TaskRow = ({
    task, subTasks, allTasks, statuses, priorities, workspaceId, depth,
    isDragging, dragHandleProps, rowRef, rowStyle,
    onUpdate, onDelete, onAdded, onStatusesChange, onPrioritiesChange, onOpenPanel, myWorkMutations,
    expandKey = 0,
    defaultExpanded = true,
}: TaskRowProps) => {
    const t = useTranslations("workspace");
    const [isPending, startTransition] = useTransition();
    const [addingSub, setAddingSub] = useState(false);
    const [expanded, setExpanded] = useState(defaultExpanded);
    const prevExpandKeyRef = useRef(expandKey);

    useEffect(() => {
        if (expandKey !== prevExpandKeyRef.current) {
            prevExpandKeyRef.current = expandKey;
            setExpanded(defaultExpanded);
        }
    }, [expandKey, defaultExpanded]);
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

    const isTop = depth === 0;
    const indentPx = depth * 20;
    const sortedSubTasks = [...subTasks].sort(sortTasksByOrder);
    const hasChildren = sortedSubTasks.length > 0;

    function updateField(input: Parameters<WorkspaceDetailMyWorkMutations["updateWorkspaceTask"]>[2]) {
        startTransition(async () => {
            const res = await myWorkMutations.updateWorkspaceTask(workspaceId, task.id, input);
            if (res.ok) onUpdate(res.task);
        });
    }

    function commitTitle() {
        const v = titleDraft.trim();
        if (!v) {
            setTitleDraft(task.title);
            return;
        }
        if (v === task.title) return;
        updateField({ title: v });
    }

    function finishTitleEdit() {
        commitTitle();
        setEditingTitle(false);
    }

    // ── 상태 모달 ─────────────────────────────────────────────────────────────
    const [statusModal, setStatusModal] = useState<{
        mode: "create" | "edit";
        item?: TagItem;
    } | null>(null);

    // 상태 CRUD 어댑터
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
    async function statusDeleteAdapter(wsId: string, id: string) {
        return myWorkMutations.deleteWorkspaceStatus(wsId, id);
    }

    // 상태 모달 저장 핸들러
    async function handleStatusModalSave(value: StatusModalValue) {
        if (statusModal?.mode === "create") {
            const res = await myWorkMutations.createWorkspaceStatus(workspaceId, value);
            if (res.ok) {
                onStatusesChange([...statuses, res.status] as unknown as ApiWorkspaceStatus[]);
            }
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
            <tr
                ref={rowRef}
                style={rowStyle}
                className={`group border-b transition-opacity ${isPending ? "opacity-50" : ""} ${isDragging ? "opacity-30" : ""} ${
                    isTop
                        ? "border-stone-200 bg-white hover:bg-stone-50/60 dark:border-elivis-line dark:bg-elivis-surface dark:hover:bg-elivis-surface-elevated/50"
                        : "border-stone-100 bg-stone-50/20 hover:bg-stone-50/40 dark:border-elivis-line/70 dark:bg-elivis-bg/50 dark:hover:bg-elivis-surface-elevated/35"
                }`}
            >
                {/* 드래그 핸들 (형제 그룹 내 순서 변경) */}
                <td className="w-6 py-2 pl-2">
                    {dragHandleProps ? (
                        <button
                            type="button"
                            className="cursor-grab touch-none text-stone-300 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing dark:text-elivis-ink-muted"
                            {...dragHandleProps}
                            title={t("taskRow.dragAria")}
                        >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8-16a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                            </svg>
                        </button>
                    ) : (
                        <span className="inline-block w-4" />
                    )}
                </td>

                {/* 제목 */}
                <td className="py-2 pr-3" style={{ paddingLeft: `${4 + indentPx}px` }}>
                    <div className="flex items-center gap-1.5">
                        {hasChildren ? (
                            <button type="button" onClick={() => setExpanded((v) => !v)}
                                className="flex h-4 w-4 shrink-0 items-center justify-center text-stone-400 dark:text-elivis-ink-secondary hover:text-stone-600 dark:hover:text-elivis-ink">
                                <svg className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        ) : <span className="h-4 w-4 shrink-0" />}
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
                                className={`min-w-0 flex-1 rounded border border-stone-200 bg-white px-1 py-0.5 outline-none focus:border-stone-400 focus:ring-0 disabled:opacity-60 dark:border-elivis-line dark:bg-elivis-surface ${isTop ? "text-sm font-semibold text-stone-900 dark:text-elivis-ink" : "text-sm text-stone-600 dark:text-elivis-ink-secondary"}`}
                            />
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => onOpenPanel(task)}
                                    title={task.title}
                                    className={`min-w-0 flex-1 truncate text-left hover:underline ${isTop ? "text-sm font-semibold text-stone-900 dark:text-elivis-ink" : "text-sm text-stone-600 dark:text-elivis-ink-secondary"}`}
                                >
                                    {formatTaskTitleForList(task.title)}
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setTitleDraft(task.title);
                                        setEditingTitle(true);
                                    }}
                                    className="shrink-0 rounded p-0.5 text-stone-300 opacity-0 transition-opacity hover:bg-stone-100 dark:text-elivis-ink-muted dark:hover:bg-elivis-surface-elevated hover:text-stone-600 dark:hover:text-elivis-ink-secondary group-hover:opacity-100"
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
                </td>

                {/* 상태 */}
                <td className="py-2 pr-2 text-center">
                    <div className="flex justify-center">
                    <TagDropdown
                        selectedId={task.statusId}
                        items={statuses}
                        workspaceId={workspaceId}
                        disabled={isPending}
                        onChange={(id) => { if (id) updateField({ statusId: id }); }}
                        onItemsChange={(items) => onStatusesChange(items as unknown as ApiWorkspaceStatus[])}
                        onCreate={statusCreateAdapter}
                        onUpdate={statusUpdateAdapter}
                        onDelete={statusDeleteAdapter}
                        onOpenCreate={() => setStatusModal({ mode: "create" })}
                        onOpenEdit={(item) => setStatusModal({ mode: "edit", item })}
                    />
                    </div>
                </td>

                {/* 우선순위 */}
                <td className="py-2 pr-2 text-center">
                    <div className="flex justify-center">
                    <PriorityDropdown
                        selectedId={task.priorityId}
                        items={priorities as unknown as TagItem[]}
                        workspaceId={workspaceId}
                        disabled={isPending}
                        mutations={myWorkMutations}
                        onChange={(id) => updateField({ priorityId: id })}
                        onItemsChange={(items) => onPrioritiesChange(items as unknown as ApiWorkspacePriority[])}
                    />
                    </div>
                </td>

                {/* 담당자 */}
                <td className="hidden py-2 pr-3 text-center sm:table-cell">
                    <div className="flex justify-center">
                        <AssigneeChip assignee={task.assignee} />
                    </div>
                </td>

                {/* 시작일 */}
                <td className="hidden py-2 pr-2 text-center md:table-cell">
                    <div className="flex justify-center">
                        <DateCell
                            value={task.startDate}
                            disabled={isPending}
                            onCommit={(v) => updateField({ startDate: v })}
                        />
                    </div>
                </td>

                {/* 종료일 */}
                <td className="hidden py-2 pr-2 text-center md:table-cell">
                    <div className="flex justify-center">
                        <DateCell
                            value={task.dueDate}
                            disabled={isPending}
                            onCommit={(v) => updateField({ dueDate: v })}
                        />
                    </div>
                </td>

                {/* 액션 */}
                <td className="py-2 pr-2">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        {depth < 2 && (
                            <button type="button" onClick={() => setAddingSub(true)}
                                className="rounded p-1 text-stone-400 dark:text-elivis-ink-secondary hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated hover:text-stone-600" title={t("taskRow.addSubtask")}>
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        )}
                        <button type="button" onClick={() => startTransition(async () => {
                            const res = await myWorkMutations.deleteWorkspaceTask(workspaceId, task.id);
                            if (res.ok) onDelete(task.id);
                        })} disabled={isPending}
                            className="rounded p-1 text-stone-400 dark:text-elivis-ink-secondary hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500" title="삭제">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>

            {addingSub && (
                <tr>
                    <td colSpan={8} style={{ paddingLeft: `${28 + (depth + 1) * 20}px` }} className="py-1.5 pr-3">
                        <InlineAddForm workspaceId={workspaceId} defaultStatusId={task.statusId} parentId={task.id}
                            createWorkspaceTask={myWorkMutations.createWorkspaceTask}
                            onAdded={(t) => { onAdded(t); setExpanded(true); }} onCancel={() => setAddingSub(false)} />
                    </td>
                </tr>
            )}

            {expanded && sortedSubTasks.length > 0 && (
                <SortableContext items={sortedSubTasks.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    {sortedSubTasks.map((sub) => (
                        <SortableTaskRow
                            key={sub.id}
                            task={sub}
                            subTasks={allTasks.filter((t) => t.parentId === sub.id)}
                            allTasks={allTasks}
                            statuses={statuses}
                            priorities={priorities}
                            workspaceId={workspaceId}
                            depth={depth + 1}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            onAdded={onAdded}
                            onStatusesChange={onStatusesChange}
                            onPrioritiesChange={onPrioritiesChange}
                            onOpenPanel={onOpenPanel}
                            myWorkMutations={myWorkMutations}
                            expandKey={expandKey}
                            defaultExpanded={defaultExpanded}
                        />
                    ))}
                </SortableContext>
            )}
        </>
    );
}

export function SortableTaskRow(props: TaskRowProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id });
    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
    };
    return (
        <TaskRow
            {...props}
            isDragging={isDragging}
            rowRef={setNodeRef}
            rowStyle={style}
            dragHandleProps={{ ...attributes, ...listeners }}
        />
    );
}