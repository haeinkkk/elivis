"use client";

import { useEffect, useState, useTransition } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { useLocale, useTranslations } from "next-intl";

import type { ApiWorkspaceTaskComment } from "../../types/workspace-api";
import type { WorkspaceTaskDetailActions } from "../../types/workspace-task-detail-actions";
import { TaskDetailFontSize } from "./task-detail-font-size";
import { formatTaskDetailDate } from "./task-detail-utils";

export function TaskDetailCommentsSection({
    actions,
    workspaceId,
    taskId,
    currentUserId = "",
}: {
    actions: WorkspaceTaskDetailActions;
    workspaceId: string;
    taskId: string;
    currentUserId?: string;
}) {
    const t = useTranslations("workspace");
    const locale = useLocale();
    const [comments, setComments] = useState<ApiWorkspaceTaskComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [fontSizeKey, setFontSizeKey] = useState(0);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            TextStyle as any,
            TaskDetailFontSize as any,
            Placeholder.configure({ placeholder: t("taskDetail.commentPlaceholder") }),
        ],
        editorProps: {
            attributes: {
                class: "prose prose-sm max-w-none min-h-[100px] px-4 py-3 focus:outline-none text-stone-700",
            },
            handleKeyDown(_, event) {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                    submitComment();
                    return true;
                }
                return false;
            },
        },
    });

    useEffect(() => {
        actions.listTaskCommentsAction(workspaceId, taskId).then((res) => {
            if (res.ok) setComments(res.comments);
            setLoading(false);
        });
    }, [actions, workspaceId, taskId]);

    function submitComment() {
        if (!editor) return;
        const html = editor.getHTML();
        const isEmpty = editor.isEmpty;
        if (isEmpty) return;
        startTransition(async () => {
            const res = await actions.createTaskCommentAction(workspaceId, taskId, html);
            if (res.ok) {
                setComments((prev) => [...prev, res.comment]);
                editor.commands.clearContent();
            }
        });
    }

    function remove(commentId: string) {
        startTransition(async () => {
            const res = await actions.deleteTaskCommentAction(workspaceId, taskId, commentId);
            if (res.ok) setComments((prev) => prev.filter((c) => c.id !== commentId));
        });
    }

    return (
        <div className="mb-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                {t("taskDetail.addMore")}
            </h3>

            {loading ? (
                <p className="text-xs text-stone-400">{t("taskDetail.commentsLoading")}</p>
            ) : comments.length === 0 ? (
                <div className="mb-2 flex min-h-[80px] items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/50">
                    <p className="text-xs text-stone-300">{t("taskDetail.noComments")}</p>
                </div>
            ) : (
                <ul className="mb-3 space-y-3">
                    {comments.map((c) => (
                        <li key={c.id} className="flex gap-2">
                            {c.user.avatarUrl ? (
                                <img
                                    src={c.user.avatarUrl}
                                    alt=""
                                    className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover"
                                />
                            ) : (
                                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold text-stone-600">
                                    {(c.user.name ?? c.user.email)[0].toUpperCase()}
                                </span>
                            )}
                            <div className="min-w-0 flex-1 rounded-xl border border-stone-100 bg-stone-50/60 px-4 py-3">
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="text-xs font-semibold text-stone-700">
                                        {c.user.name ?? c.user.email}
                                    </span>
                                    <span className="text-[10px] text-stone-400">
                                        {formatTaskDetailDate(c.createdAt, locale)}
                                    </span>
                                    {(!currentUserId || c.user.id === currentUserId) && (
                                        <button
                                            type="button"
                                            onClick={() => remove(c.id)}
                                            disabled={isPending}
                                            className="ml-auto text-[10px] text-stone-300 hover:text-red-400"
                                        >
                                            {t("taskDetail.delete")}
                                        </button>
                                    )}
                                </div>
                                <div
                                    className="prose prose-sm max-w-none text-stone-700 [&_p]:my-0.5 [&_ul]:my-1 [&_ol]:my-1 [&_strong]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-stone-300 [&_blockquote]:pl-3 [&_blockquote]:text-stone-500 [&_span[style]]:leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: c.content }}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50/60 transition-colors focus-within:border-stone-400 focus-within:bg-white">
                <div className="flex flex-wrap items-center gap-0.5 border-b border-stone-100 px-2 py-1.5">
                    <select
                        key={fontSizeKey}
                        title="글자 크기"
                        defaultValue=""
                        onChange={(e) => {
                            const val = e.target.value;
                            if (!editor) return;
                            if (val === "") {
                                (editor.chain().focus() as any).unsetFontSize().run();
                            } else {
                                (editor.chain().focus() as any).setFontSize(val).run();
                            }
                            setFontSizeKey((k) => k + 1);
                        }}
                        className="rounded border border-stone-200 bg-white px-1 py-0.5 text-xs text-stone-500 outline-none hover:bg-stone-50 focus:border-stone-400"
                    >
                        <option value="" disabled>
                            크기
                        </option>
                        {["10", "12", "14", "16", "18", "20", "24", "28", "32", "36"].map((s) => (
                            <option key={s} value={s}>
                                {s}px
                            </option>
                        ))}
                    </select>

                    <div className="mx-1 h-3 w-px bg-stone-200" />

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
                            className={`rounded px-2 py-0.5 text-xs transition-colors ${className ?? ""} ${active ? "bg-stone-200 text-stone-900" : "text-stone-400 hover:bg-stone-100 hover:text-stone-700"}`}
                        >
                            {icon}
                        </button>
                    ))}

                    <div className="mx-1 h-3 w-px bg-stone-200" />

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
                            className={`rounded px-2 py-0.5 text-xs transition-colors ${active ? "bg-stone-200 text-stone-900" : "text-stone-400 hover:bg-stone-100 hover:text-stone-700"}`}
                        >
                            {icon}
                        </button>
                    ))}
                </div>

                <EditorContent editor={editor} />
            </div>

            <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-stone-300">{t("taskDetail.commentHint")}</span>
                <button
                    type="button"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        submitComment();
                    }}
                    disabled={isPending || !editor || editor.isEmpty}
                    className="rounded-lg bg-stone-800 px-4 py-2 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-40"
                >
                    {t("taskDetail.submitComment")}
                </button>
            </div>
        </div>
    );
}
