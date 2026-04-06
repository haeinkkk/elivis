"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";

import type {
    ApiWorkspaceStatus,
    ApiWorkspacePriority,
    ApiWorkspaceTask,
} from "../../types/workspace-api";
import type { WorkspaceTaskDetailActions } from "../../types/workspace-task-detail-actions";
import { TAG_COLORS } from "../../utils/tag-colors";
import { TaskDetailSimpleSelect } from "./TaskDetailSimpleSelect";
import { TaskDetailNotesSection } from "./TaskDetailNotesSection";
import { TaskDetailAttachmentsSection } from "./TaskDetailAttachmentsSection";
import { TaskDetailCommentsSection } from "./TaskDetailCommentsSection";

interface Props {
    actions: WorkspaceTaskDetailActions;
    task: ApiWorkspaceTask;
    statuses: ApiWorkspaceStatus[];
    priorities: ApiWorkspacePriority[];
    workspaceId: string;
    onUpdate: (t: ApiWorkspaceTask) => void;
    onClose: () => void;
    readOnly?: boolean;
    currentUserId?: string;
}

export default function TaskDetailPanel({
    actions,
    task,
    statuses,
    priorities,
    workspaceId,
    onUpdate,
    onClose,
    readOnly = false,
    currentUserId = "",
}: Props) {
    const t = useTranslations("workspace");
    const locale = useLocale();
    const [isPending, startTransition] = useTransition();
    const [title, setTitle] = useState(task.title);
    const titleRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setTitle(task.title);
    }, [task.id, task.title]);

    useEffect(() => {
        const el = titleRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.max(el.scrollHeight, 40)}px`;
    }, [title, task.id]);

    function update(patch: Parameters<WorkspaceTaskDetailActions["updateWorkspaceTaskAction"]>[2]) {
        if (readOnly) return;
        startTransition(async () => {
            const res = await actions.updateWorkspaceTaskAction(workspaceId, task.id, patch);
            if (res.ok) onUpdate(res.task);
        });
    }

    function saveTitle() {
        const v = title.trim();
        if (!v || v === task.title) return;
        update({ title: v });
    }

    const statusColor = TAG_COLORS[task.status.color] ?? TAG_COLORS.gray;
    const priorityColor = task.priority
        ? (TAG_COLORS[task.priority.color] ?? TAG_COLORS.gray)
        : null;

    const content = (
        <>
            <div
                className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-[1px]"
                onClick={onClose}
                aria-hidden
            />

            <div
                className="fixed inset-y-0 right-0 z-[9999] flex w-full max-w-2xl flex-col border-l border-stone-200 bg-white shadow-2xl"
                style={{ animation: "slideInRight 200ms ease-out" }}
            >
                <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-900">{t("taskDetail.title")}</span>
                        {readOnly && (
                            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-400">
                                읽기 전용
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
                    <div className="flex items-start gap-3">
                        <textarea
                            ref={titleRef}
                            value={title}
                            rows={1}
                            onChange={(e) => !readOnly && setTitle(e.target.value)}
                            onBlur={saveTitle}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    e.currentTarget.blur();
                                }
                            }}
                            disabled={isPending}
                            readOnly={readOnly}
                            className={`min-h-[2.5rem] min-w-0 flex-1 resize-none overflow-hidden rounded-lg border-0 bg-transparent px-0 py-0.5 text-lg font-bold leading-snug text-stone-900 outline-none placeholder:text-stone-300 focus:ring-0 break-words whitespace-pre-wrap ${readOnly ? "cursor-default select-text" : ""}`}
                            placeholder={t("taskDetail.taskTitlePlaceholder")}
                        />
                        {task.assignee && (
                            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1">
                                {task.assignee.avatarUrl ? (
                                    <img
                                        src={task.assignee.avatarUrl}
                                        className="h-5 w-5 rounded-full object-cover"
                                        alt=""
                                    />
                                ) : (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-300 text-[10px] font-semibold text-stone-600">
                                        {(task.assignee.name ?? task.assignee.email)[0].toUpperCase()}
                                    </span>
                                )}
                                <span className="text-xs font-medium text-stone-600">
                                    {task.assignee.name ?? task.assignee.email}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2 rounded-xl border border-stone-100 bg-stone-50/60 px-4 py-3">
                        <div className="grid grid-cols-2 gap-x-4">
                            <div className="flex items-center gap-2">
                                <span className="w-14 shrink-0 text-xs font-medium text-stone-400">
                                    {t("taskDetail.status")}
                                </span>
                                <TaskDetailSimpleSelect
                                    value={task.statusId}
                                    items={statuses}
                                    onChange={(id) => {
                                        if (id && !readOnly) update({ statusId: id });
                                    }}
                                    disabled={readOnly}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-14 shrink-0 text-xs font-medium text-stone-400">
                                    {t("taskDetail.priority")}
                                </span>
                                <TaskDetailSimpleSelect
                                    value={task.priorityId ?? null}
                                    items={priorities}
                                    nullable
                                    onChange={(id) => {
                                        if (!readOnly) update({ priorityId: id });
                                    }}
                                    disabled={readOnly}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4">
                            <div className="flex items-center gap-2">
                                <span className="w-14 shrink-0 text-xs font-medium text-stone-400">
                                    {t("taskDetail.startDate")}
                                </span>
                                <input
                                    type="date"
                                    defaultValue={task.startDate?.slice(0, 10) ?? ""}
                                    disabled={isPending || readOnly}
                                    onChange={(e) => !readOnly && update({ startDate: e.target.value || null })}
                                    className="rounded border border-stone-200 px-2 py-1 text-xs outline-none focus:border-stone-400 disabled:cursor-default disabled:opacity-70"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-14 shrink-0 text-xs font-medium text-stone-400">
                                    {t("taskDetail.dueDate")}
                                </span>
                                <input
                                    type="date"
                                    defaultValue={task.dueDate?.slice(0, 10) ?? ""}
                                    disabled={isPending || readOnly}
                                    onChange={(e) => !readOnly && update({ dueDate: e.target.value || null })}
                                    className="rounded border border-stone-200 px-2 py-1 text-xs outline-none focus:border-stone-400 disabled:cursor-default disabled:opacity-70"
                                />
                            </div>
                        </div>
                    </div>

                    <TaskDetailNotesSection
                        actions={actions}
                        workspaceId={workspaceId}
                        taskId={task.id}
                        readOnly={readOnly}
                        currentUserId={currentUserId}
                    />

                    <TaskDetailAttachmentsSection
                        actions={actions}
                        workspaceId={workspaceId}
                        taskId={task.id}
                        readOnly={readOnly}
                    />

                    <TaskDetailCommentsSection
                        actions={actions}
                        workspaceId={workspaceId}
                        taskId={task.id}
                        currentUserId={currentUserId}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 border-t border-stone-100 px-5 py-2.5">
                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor.badge}`}
                    >
                        <span className={`h-1.5 w-1.5 rounded-full ${statusColor.dot}`} />
                        {task.status.name}
                    </span>
                    {task.priority && priorityColor && (
                        <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor.badge}`}
                        >
                            <span className={`h-1.5 w-1.5 rounded-full ${priorityColor.dot}`} />
                            {task.priority.name}
                        </span>
                    )}
                    <span className="ml-auto text-[10px] text-stone-300">
                        {t("taskDetail.created")} {new Date(task.createdAt).toLocaleDateString(locale)}
                    </span>
                </div>
            </div>

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to   { transform: translateX(0); }
                }
                .tiptap p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #c2b8ae;
                    pointer-events: none;
                    height: 0;
                    font-size: 0.875rem;
                }
                .tiptap { outline: none; }
                .tiptap p { margin: 0.25rem 0; }
                .tiptap ul, .tiptap ol { padding-left: 1.25rem; margin: 0.25rem 0; }
                .tiptap blockquote { border-left: 2px solid #d6d3d1; padding-left: 0.75rem; color: #78716c; margin: 0.25rem 0; }
                .tiptap strong { font-weight: 600; }
                .tiptap em { font-style: italic; }
                .tiptap s { text-decoration: line-through; }
            `}</style>
        </>
    );

    return createPortal(content, document.body);
}
