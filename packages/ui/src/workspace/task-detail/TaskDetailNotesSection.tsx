"use client";

import { useEffect, useState, useTransition } from "react";
import type { AnyExtension } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { useLocale } from "next-intl";

import { ElivisSelect } from "../../ElivisSelect";
import type { ApiWorkspaceTaskNote } from "../../types/workspace-api";
import type { WorkspaceTaskDetailActions } from "../../types/workspace-task-detail-actions";
import { TaskDetailFontSize } from "./task-detail-font-size";
import { applyTaskDetailFontSize } from "./task-detail-font-size-chain";
import { formatTaskDetailDate } from "./task-detail-utils";

export function TaskDetailNotesSection({
    actions,
    workspaceId,
    taskId,
    readOnly = false,
    currentUserId = "",
}: {
    actions: WorkspaceTaskDetailActions;
    workspaceId: string;
    taskId: string;
    readOnly?: boolean;
    currentUserId?: string;
}) {
    const locale = useLocale();
    const [notes, setNotes] = useState<ApiWorkspaceTaskNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [fontSizeKey, setFontSizeKey] = useState(0);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            TextStyle as unknown as AnyExtension,
            TaskDetailFontSize as unknown as AnyExtension,
            Placeholder.configure({ placeholder: "내용을 입력하세요… (Ctrl+Enter로 저장)" }),
        ],
        editorProps: {
            attributes: {
                class: "prose prose-sm max-w-none min-h-[100px] px-4 py-3 focus:outline-none text-stone-700 dark:text-elivis-ink dark:prose-invert",
            },
        },
    });

    useEffect(() => {
        actions.listTaskNotesAction(workspaceId, taskId).then((res) => {
            if (res.ok) setNotes(res.notes);
            setLoading(false);
        });
    }, [actions, workspaceId, taskId]);

    function submit() {
        const html = editor?.getHTML() ?? "";
        const text = editor?.getText() ?? "";
        if (!text.trim()) return;
        startTransition(async () => {
            const res = await actions.createTaskNoteAction(workspaceId, taskId, html);
            if (res.ok) {
                setNotes((prev) => [...prev, res.note]);
                editor?.commands.clearContent();
            }
        });
    }

    function remove(noteId: string) {
        startTransition(async () => {
            const res = await actions.deleteTaskNoteAction(workspaceId, taskId, noteId);
            if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== noteId));
        });
    }

    return (
        <div className="mb-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-elivis-ink-secondary">내용</h3>

            {loading ? (
                <p className="mb-3 text-xs text-stone-400 dark:text-elivis-ink-secondary">불러오는 중…</p>
            ) : notes.length === 0 ? (
                <div className="mb-3 flex min-h-[56px] items-center justify-center rounded-xl border border-dashed border-stone-200 dark:border-elivis-line bg-stone-50/40 dark:bg-elivis-surface-elevated/80">
                    <p className="text-xs text-stone-300 dark:text-elivis-ink-secondary">아직 작성된 내용이 없습니다.</p>
                </div>
            ) : (
                <ul className="mb-4 space-y-3">
                    {notes.map((n) => (
                        <li key={n.id} className="flex gap-2.5">
                            {n.user.avatarUrl ? (
                                <img
                                    src={n.user.avatarUrl}
                                    alt=""
                                    className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover"
                                />
                            ) : (
                                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-200 dark:bg-elivis-surface-elevated text-xs font-semibold text-stone-600 dark:text-elivis-ink-secondary">
                                    {(n.user.name ?? n.user.email)[0].toUpperCase()}
                                </span>
                            )}
                            <div className="min-w-0 flex-1 rounded-xl border border-stone-100 dark:border-elivis-line bg-stone-50/60 px-4 py-3 dark:bg-elivis-surface-elevated">
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="text-xs font-semibold text-stone-700 dark:text-elivis-ink">
                                        {n.user.name ?? n.user.email}
                                    </span>
                                    <span className="text-[10px] text-stone-400 dark:text-elivis-ink-secondary">
                                        {formatTaskDetailDate(n.createdAt, locale)}
                                    </span>
                                    {(!readOnly || n.user.id === currentUserId) && (
                                        <button
                                            type="button"
                                            onClick={() => remove(n.id)}
                                            disabled={isPending}
                                            className="ml-auto text-[10px] text-stone-300 hover:text-red-400 dark:text-elivis-ink-muted dark:hover:text-red-400"
                                        >
                                            삭제
                                        </button>
                                    )}
                                </div>
                                <div
                                    className="prose prose-sm max-w-none text-stone-700 dark:text-elivis-ink [&_p]:my-0.5 [&_ul]:my-1 [&_ol]:my-1 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-stone-300 dark:[&_blockquote]:border-elivis-line [&_blockquote]:pl-3 [&_blockquote]:text-stone-500 dark:[&_blockquote]:text-elivis-ink-secondary [&_span[style]]:leading-relaxed dark:prose-invert"
                                    dangerouslySetInnerHTML={{ __html: n.content }}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {!readOnly && (
                <>
                    <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-elivis-line bg-stone-50/60 transition-colors focus-within:border-stone-400 focus-within:bg-white dark:bg-elivis-surface-elevated dark:focus-within:border-elivis-ink-muted dark:focus-within:bg-elivis-surface-elevated">
                        <div className="flex flex-wrap items-center gap-0.5 border-b border-stone-100 dark:border-elivis-line px-2 py-1.5 dark:bg-elivis-surface">
                            <ElivisSelect
                                key={fontSizeKey}
                                variant="toolbar"
                                title="글자 크기"
                                defaultValue=""
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (!editor) return;
                                    applyTaskDetailFontSize(editor, val);
                                    setFontSizeKey((k) => k + 1);
                                }}
                            >
                                <option value="" disabled>
                                    크기
                                </option>
                                {["10", "12", "14", "16", "18", "20", "24", "28", "32", "36"].map((s) => (
                                    <option key={s} value={s}>
                                        {s}px
                                    </option>
                                ))}
                            </ElivisSelect>

                            <div className="mx-1 h-3 w-px bg-stone-200 dark:bg-elivis-line" />

                            {[
                                {
                                    cmd: () => editor?.chain().focus().toggleBold().run(),
                                    active: editor?.isActive("bold"),
                                    icon: "B",
                                    title: "굵게",
                                    className: "font-bold",
                                },
                                {
                                    cmd: () => editor?.chain().focus().toggleItalic().run(),
                                    active: editor?.isActive("italic"),
                                    icon: "I",
                                    title: "기울임",
                                    className: "italic",
                                },
                                {
                                    cmd: () => editor?.chain().focus().toggleStrike().run(),
                                    active: editor?.isActive("strike"),
                                    icon: "S",
                                    title: "취소선",
                                    className: "line-through",
                                },
                            ].map(({ cmd, active, icon, title, className }) => (
                                <button
                                    key={title}
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        cmd();
                                    }}
                                    title={title}
                                    className={`rounded px-2 py-0.5 text-xs transition-colors ${className ?? ""} ${active ? "bg-stone-200 text-stone-900 dark:bg-elivis-surface-elevated dark:text-elivis-ink" : "text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:text-elivis-ink-secondary dark:hover:bg-elivis-surface-elevated dark:hover:text-elivis-ink"}`}
                                >
                                    {icon}
                                </button>
                            ))}

                            <div className="mx-1 h-3 w-px bg-stone-200 dark:bg-elivis-line" />

                            {[
                                {
                                    cmd: () => editor?.chain().focus().toggleBulletList().run(),
                                    active: editor?.isActive("bulletList"),
                                    icon: "•—",
                                    title: "목록",
                                },
                                {
                                    cmd: () => editor?.chain().focus().toggleOrderedList().run(),
                                    active: editor?.isActive("orderedList"),
                                    icon: "1—",
                                    title: "번호 목록",
                                },
                                {
                                    cmd: () => editor?.chain().focus().toggleBlockquote().run(),
                                    active: editor?.isActive("blockquote"),
                                    icon: "❝",
                                    title: "인용",
                                },
                            ].map(({ cmd, active, icon, title }) => (
                                <button
                                    key={title}
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        cmd();
                                    }}
                                    title={title}
                                    className={`rounded px-2 py-0.5 text-xs transition-colors ${active ? "bg-stone-200 text-stone-900 dark:bg-elivis-surface-elevated dark:text-elivis-ink" : "text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:text-elivis-ink-secondary dark:hover:bg-elivis-surface-elevated dark:hover:text-elivis-ink"}`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>

                        <EditorContent
                            editor={editor}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                    e.preventDefault();
                                    submit();
                                }
                            }}
                        />
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-stone-300 dark:text-elivis-ink-muted">Ctrl+Enter로 저장</span>
                        <button
                            type="button"
                            onClick={submit}
                            disabled={isPending}
                            className="rounded-lg bg-stone-800 px-4 py-2 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-40 dark:bg-elivis-accent dark:text-white dark:hover:bg-elivis-accent-hover"
                        >
                            저장
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
