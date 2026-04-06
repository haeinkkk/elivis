"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useTranslations, useLocale } from "next-intl";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
// eslint-disable-next-line import/no-extraneous-dependencies
import { Extension } from "@tiptap/core";
import type {
    ApiWorkspaceStatus,
    ApiWorkspacePriority,
    ApiWorkspaceTask,
    ApiWorkspaceTaskComment,
    ApiWorkspaceTaskAttachment,
    ApiWorkspaceTaskNote,
} from "@/lib/map-api-workspace";
import {
    updateWorkspaceTaskAction,
    listTaskCommentsAction,
    createTaskCommentAction,
    deleteTaskCommentAction,
    listTaskAttachmentsAction,
    uploadTaskAttachmentAction,
    deleteTaskAttachmentAction,
    listTaskNotesAction,
    createTaskNoteAction,
    deleteTaskNoteAction,
} from "@/app/actions/workspaces";
import { TAG_COLORS } from "./WorkspaceDetailClient";

// 글자 크기 커스텀 확장
const FontSize = Extension.create({
    name: "fontSize",
    addOptions() {
        return { types: ["textStyle"] };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: (el: HTMLElement) => el.style.fontSize?.replace("px", "") || null,
                        renderHTML: (attrs: Record<string, unknown>) =>
                            attrs.fontSize ? { style: `font-size: ${attrs.fontSize}px` } : {},
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setFontSize:
                (size: string) =>
                ({ chain }: { chain: () => any }) =>
                    chain().setMark("textStyle", { fontSize: size }).run(),
            unsetFontSize:
                () =>
                ({ chain }: { chain: () => any }) =>
                    chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
        } as any;
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string, locale: string) {
    return new Date(iso).toLocaleString(locale, {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getFileIcon(mime: string) {
    if (mime.startsWith("image/")) return "🖼";
    if (mime === "application/pdf") return "📄";
    if (mime.includes("spreadsheet") || mime.includes("excel")) return "📊";
    if (mime.includes("word") || mime.includes("document")) return "📝";
    if (mime.includes("zip") || mime.includes("compressed")) return "🗜";
    return "📎";
}

function serverUrl(path: string) {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
    return `${base}${path}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 심플 드롭다운 (상태 / 우선순위 용)
// ─────────────────────────────────────────────────────────────────────────────

function SimpleSelect<T extends { id: string; name: string; color: string }>({
    value,
    items,
    nullable,
    placeholder,
    onChange,
    disabled = false,
}: {
    value: string | null;
    items: T[];
    nullable?: boolean;
    placeholder?: string;
    onChange: (id: string | null) => void;
    disabled?: boolean;
}) {
    const t = useTranslations("workspace");
    return (
        <select
            value={value ?? ""}
            onChange={(e) => !disabled && onChange(e.target.value || null)}
            disabled={disabled}
            className="rounded border border-stone-200 bg-white px-2 py-1 text-xs outline-none focus:border-stone-400 disabled:cursor-default disabled:opacity-70"
        >
            {nullable && <option value="">{placeholder ?? t("taskDetail.none")}</option>}
            {items.map((item) => (
                <option key={item.id} value={item.id}>
                    {item.name}
                </option>
            ))}
        </select>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 노트 섹션 (리치 텍스트, 여러 개 작성)
// ─────────────────────────────────────────────────────────────────────────────

function NotesSection({ workspaceId, taskId, readOnly = false, currentUserId = "" }: { workspaceId: string; taskId: string; readOnly?: boolean; currentUserId?: string }) {
    const locale = useLocale();
    const [notes, setNotes] = useState<ApiWorkspaceTaskNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [fontSizeKey, setFontSizeKey] = useState(0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            TextStyle as any,
            FontSize as any,
            Placeholder.configure({ placeholder: "내용을 입력하세요… (Ctrl+Enter로 저장)" }),
        ],
        editorProps: {
            attributes: {
                class: "prose prose-sm max-w-none min-h-[100px] px-4 py-3 focus:outline-none text-stone-700",
            },
        },
    });

    useEffect(() => {
        listTaskNotesAction(workspaceId, taskId).then((res) => {
            if (res.ok) setNotes(res.notes);
            setLoading(false);
        });
    }, [workspaceId, taskId]);

    function submit() {
        const html = editor?.getHTML() ?? "";
        const text = editor?.getText() ?? "";
        if (!text.trim()) return;
        startTransition(async () => {
            const res = await createTaskNoteAction(workspaceId, taskId, html);
            if (res.ok) {
                setNotes((prev) => [...prev, res.note]);
                editor?.commands.clearContent();
            }
        });
    }

    function remove(noteId: string) {
        startTransition(async () => {
            const res = await deleteTaskNoteAction(workspaceId, taskId, noteId);
            if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== noteId));
        });
    }

    return (
        <div className="mb-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                내용
            </h3>

            {/* 노트 목록 */}
            {loading ? (
                <p className="mb-3 text-xs text-stone-400">불러오는 중…</p>
            ) : notes.length === 0 ? (
                <div className="mb-3 flex min-h-[56px] items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/40">
                    <p className="text-xs text-stone-300">아직 작성된 내용이 없습니다.</p>
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
                                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold text-stone-600">
                                    {(n.user.name ?? n.user.email)[0].toUpperCase()}
                                </span>
                            )}
                            <div className="flex-1 min-w-0 rounded-xl border border-stone-100 bg-stone-50/60 px-4 py-3">
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="text-xs font-semibold text-stone-700">
                                        {n.user.name ?? n.user.email}
                                    </span>
                                    <span className="text-[10px] text-stone-400">
                                        {formatDate(n.createdAt, locale)}
                                    </span>
                                    {(!readOnly || n.user.id === currentUserId) && (
                                        <button
                                            type="button"
                                            onClick={() => remove(n.id)}
                                            disabled={isPending}
                                            className="ml-auto text-[10px] text-stone-300 hover:text-red-400"
                                        >
                                            삭제
                                        </button>
                                    )}
                                </div>
                                {/* Tiptap HTML 렌더링 */}
                                <div
                                    className="prose prose-sm max-w-none text-stone-700 [&_p]:my-0.5 [&_ul]:my-1 [&_ol]:my-1 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-stone-300 [&_blockquote]:pl-3 [&_blockquote]:text-stone-500 [&_span[style]]:leading-relaxed"
                                    // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted server content
                                    dangerouslySetInnerHTML={{ __html: n.content }}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {/* Tiptap 에디터 입력부 — readOnly 시 숨김 */}
            {!readOnly && (
                <>
                <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50/60 focus-within:border-stone-400 focus-within:bg-white transition-colors">
                    {/* 툴바 */}
                    <div className="flex flex-wrap items-center gap-0.5 border-b border-stone-100 px-2 py-1.5">
                        {/* 글자 크기 */}
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
                            <option value="" disabled>크기</option>
                            {["10","12","14","16","18","20","24","28","32","36"].map((s) => (
                                <option key={s} value={s}>{s}px</option>
                            ))}
                        </select>

                        <div className="mx-1 h-3 w-px bg-stone-200" />

                        {/* 텍스트 스타일 */}
                        {[
                            { cmd: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive("bold"), icon: "B", title: "굵게", className: "font-bold" },
                            { cmd: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive("italic"), icon: "I", title: "기울임", className: "italic" },
                            { cmd: () => editor?.chain().focus().toggleStrike().run(), active: editor?.isActive("strike"), icon: "S", title: "취소선", className: "line-through" },
                        ].map(({ cmd, active, icon, title, className }) => (
                            <button
                                key={title}
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); cmd(); }}
                                title={title}
                                className={`rounded px-2 py-0.5 text-xs transition-colors ${className ?? ""} ${active ? "bg-stone-200 text-stone-900" : "text-stone-400 hover:bg-stone-100 hover:text-stone-700"}`}
                            >
                                {icon}
                            </button>
                        ))}

                        <div className="mx-1 h-3 w-px bg-stone-200" />

                        {/* 목록 / 인용 */}
                        {[
                            { cmd: () => editor?.chain().focus().toggleBulletList().run(), active: editor?.isActive("bulletList"), icon: "•—", title: "목록" },
                            { cmd: () => editor?.chain().focus().toggleOrderedList().run(), active: editor?.isActive("orderedList"), icon: "1—", title: "번호 목록" },
                            { cmd: () => editor?.chain().focus().toggleBlockquote().run(), active: editor?.isActive("blockquote"), icon: "❝", title: "인용" },
                        ].map(({ cmd, active, icon, title }) => (
                            <button
                                key={title}
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); cmd(); }}
                                title={title}
                                className={`rounded px-2 py-0.5 text-xs transition-colors ${active ? "bg-stone-200 text-stone-900" : "text-stone-400 hover:bg-stone-100 hover:text-stone-700"}`}
                            >
                                {icon}
                            </button>
                        ))}
                    </div>

                    {/* 에디터 본문 */}
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
                    <span className="text-[10px] text-stone-300">Ctrl+Enter로 저장</span>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={isPending}
                        className="rounded-lg bg-stone-800 px-4 py-2 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-40"
                    >
                        저장
                    </button>
                </div>
                </>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 댓글 섹션
// ─────────────────────────────────────────────────────────────────────────────

function CommentsSection({ workspaceId, taskId, currentUserId = "" }: { workspaceId: string; taskId: string; currentUserId?: string }) {
    const t = useTranslations("workspace");
    const locale = useLocale();
    const [comments, setComments] = useState<ApiWorkspaceTaskComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [fontSizeKey, setFontSizeKey] = useState(0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            TextStyle as any,
            FontSize as any,
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
        listTaskCommentsAction(workspaceId, taskId).then((res) => {
            if (res.ok) setComments(res.comments);
            setLoading(false);
        });
    }, [workspaceId, taskId]);

    function submitComment() {
        if (!editor) return;
        const html = editor.getHTML();
        const isEmpty = editor.isEmpty;
        if (isEmpty) return;
        startTransition(async () => {
            const res = await createTaskCommentAction(workspaceId, taskId, html);
            if (res.ok) {
                setComments((prev) => [...prev, res.comment]);
                editor.commands.clearContent();
            }
        });
    }

    function remove(commentId: string) {
        startTransition(async () => {
            const res = await deleteTaskCommentAction(workspaceId, taskId, commentId);
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
                <div className="flex min-h-[80px] mb-2 items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/50">
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
                            <div className="flex-1 min-w-0 rounded-xl border border-stone-100 bg-stone-50/60 px-4 py-3">
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="text-xs font-semibold text-stone-700">
                                        {c.user.name ?? c.user.email}
                                    </span>
                                    <span className="text-[10px] text-stone-400">
                                        {formatDate(c.createdAt, locale)}
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
                                    // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted server content
                                    dangerouslySetInnerHTML={{ __html: c.content }}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {/* Tiptap 에디터 입력부 */}
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50/60 focus-within:border-stone-400 focus-within:bg-white transition-colors">
                {/* 툴바 */}
                <div className="flex flex-wrap items-center gap-0.5 border-b border-stone-100 px-2 py-1.5">
                    {/* 글자 크기 */}
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
                        <option value="" disabled>크기</option>
                        {["10","12","14","16","18","20","24","28","32","36"].map((s) => (
                            <option key={s} value={s}>{s}px</option>
                        ))}
                    </select>

                    <div className="mx-1 h-3 w-px bg-stone-200" />

                    {/* 텍스트 스타일 */}
                    {[
                        { cmd: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive("bold"), icon: "B", title: "굵게", className: "font-bold" },
                        { cmd: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive("italic"), icon: "I", title: "기울임", className: "italic" },
                        { cmd: () => editor?.chain().focus().toggleStrike().run(), active: editor?.isActive("strike"), icon: "S", title: "취소선", className: "line-through" },
                    ].map(({ cmd, active, icon, title, className }) => (
                        <button
                            key={title}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); cmd(); }}
                            title={title}
                            className={`rounded px-2 py-0.5 text-xs transition-colors ${className ?? ""} ${active ? "bg-stone-200 text-stone-900" : "text-stone-400 hover:bg-stone-100 hover:text-stone-700"}`}
                        >
                            {icon}
                        </button>
                    ))}

                    <div className="mx-1 h-3 w-px bg-stone-200" />

                    {/* 목록 / 인용 */}
                    {[
                        { cmd: () => editor?.chain().focus().toggleBulletList().run(), active: editor?.isActive("bulletList"), icon: "•—", title: "목록" },
                        { cmd: () => editor?.chain().focus().toggleOrderedList().run(), active: editor?.isActive("orderedList"), icon: "1—", title: "번호 목록" },
                        { cmd: () => editor?.chain().focus().toggleBlockquote().run(), active: editor?.isActive("blockquote"), icon: "❝", title: "인용" },
                    ].map(({ cmd, active, icon, title }) => (
                        <button
                            key={title}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); cmd(); }}
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
                    onMouseDown={(e) => { e.preventDefault(); submitComment(); }}
                    disabled={isPending || !editor || editor.isEmpty}
                    className="rounded-lg bg-stone-800 px-4 py-2 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-40"
                >
                    {t("taskDetail.submitComment")}
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 첨부파일 섹션
// ─────────────────────────────────────────────────────────────────────────────

function AttachmentsSection({ workspaceId, taskId, readOnly = false }: { workspaceId: string; taskId: string; readOnly?: boolean }) {
    const t = useTranslations("workspace");
    const [attachments, setAttachments] = useState<ApiWorkspaceTaskAttachment[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        listTaskAttachmentsAction(workspaceId, taskId).then((res) => {
            if (res.ok) setAttachments(res.attachments);
            setLoading(false);
        });
    }, [workspaceId, taskId]);

    async function handleFiles(files: FileList | null) {
        if (!files || files.length === 0) return;
        setUploading(true);
        for (const file of Array.from(files)) {
            const fd = new FormData();
            fd.append("file", file);
            const res = await uploadTaskAttachmentAction(workspaceId, taskId, fd);
            if (res.ok) setAttachments((prev) => [...prev, res.attachment]);
        }
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
    }

    async function remove(attachmentId: string) {
        const res = await deleteTaskAttachmentAction(workspaceId, taskId, attachmentId);
        if (res.ok) setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    }

    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                    {t("taskDetail.attachments")}
                </h3>
                {!readOnly && (
                    <>
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            className="flex items-center gap-1 rounded-lg border border-stone-200 px-2 py-1 text-xs text-stone-500 hover:bg-stone-50 disabled:opacity-40"
                        >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 4v16m8-8H4"
                                />
                            </svg>
                            {t("taskDetail.addFile")}
                        </button>
                        <input
                            ref={fileRef}
                            type="file"
                            multiple
                            hidden
                            onChange={(e) => handleFiles(e.target.files)}
                        />
                    </>
                )}
            </div>

            {/* 드래그 앤 드랍 영역 */}
            <div
                onClick={() => !readOnly && !uploading && fileRef.current?.click()}
                onDragOver={(e) => {
                    if (readOnly) return;
                    e.preventDefault();
                    setIsDragOver(true);
                }}
                onDragEnter={(e) => {
                    if (readOnly) return;
                    e.preventDefault();
                    setIsDragOver(true);
                }}
                onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (!readOnly) handleFiles(e.dataTransfer.files);
                }}
                className={`mb-3 flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-xs transition-all ${readOnly ? "cursor-default" : "cursor-pointer"}
                    ${
                        isDragOver
                            ? "border-stone-500 bg-stone-100 text-stone-600 scale-[1.01]"
                            : "border-stone-200 bg-stone-50/50 text-stone-400 hover:border-stone-300 hover:bg-stone-50"
                    }`}
            >
                {uploading ? (
                    <>
                        <svg
                            className="h-5 w-5 animate-spin text-stone-400"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v8H4z"
                            />
                        </svg>
                        <span>{t("taskDetail.uploading")}</span>
                    </>
                ) : isDragOver ? (
                    <>
                        <svg
                            className="h-6 w-6 text-stone-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                        </svg>
                        <span className="font-medium">{t("taskDetail.dropHere")}</span>
                    </>
                ) : readOnly ? (
                    <span className="text-stone-300">첨부파일 보기 전용</span>
                ) : (
                    <>
                        <svg
                            className="h-5 w-5 text-stone-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                            />
                        </svg>
                        <span>{t("taskDetail.dragOrClick")}</span>
                    </>
                )}
            </div>

            {loading ? (
                <p className="text-xs text-stone-400">{t("taskDetail.commentsLoading")}</p>
            ) : attachments.length === 0 ? (
                <p className="text-xs text-stone-300">{t("taskDetail.noFiles")}</p>
            ) : (
                <ul className="space-y-1.5">
                    {attachments.map((a) => (
                        <li
                            key={a.id}
                            className="flex items-center gap-2 rounded-lg border border-stone-100 bg-white px-3 py-2"
                        >
                            <span className="text-base">{getFileIcon(a.mimeType)}</span>
                            <div className="min-w-0 flex-1">
                                <a
                                    href={serverUrl(a.fileUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block truncate text-xs font-medium text-stone-700 hover:underline"
                                >
                                    {a.fileName}
                                </a>
                                <span className="text-[10px] text-stone-400">
                                    {formatBytes(a.fileSize)}
                                </span>
                            </div>
                            {!readOnly && (
                                <button
                                    type="button"
                                    onClick={() => remove(a.id)}
                                    className="shrink-0 rounded p-0.5 text-stone-300 hover:bg-red-50 hover:text-red-400"
                                >
                                    <svg
                                        className="h-3.5 w-3.5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskDetailPanel
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    task: ApiWorkspaceTask;
    statuses: ApiWorkspaceStatus[];
    priorities: ApiWorkspacePriority[];
    workspaceId: string;
    onUpdate: (t: ApiWorkspaceTask) => void;
    onClose: () => void;
    /** true면 업무 내용 조회만 가능하고 수정/노트/첨부파일 추가 불가. 댓글은 항상 작성 가능. */
    readOnly?: boolean;
    /** 현재 로그인한 사용자 ID — 본인 노트/댓글 삭제 버튼 표시에 사용 */
    currentUserId?: string;
}

export default function TaskDetailPanel({
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

    function update(patch: Parameters<typeof updateWorkspaceTaskAction>[2]) {
        if (readOnly) return;
        startTransition(async () => {
            const res = await updateWorkspaceTaskAction(workspaceId, task.id, patch);
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
            {/* 백드롭 (클릭 시 닫기) */}
            <div
                className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-[1px]"
                onClick={onClose}
                aria-hidden
            />

            {/* 패널 */}
            <div
                className="fixed inset-y-0 right-0 z-[9999] flex w-full max-w-2xl flex-col border-l border-stone-200 bg-white shadow-2xl"
                style={{ animation: "slideInRight 200ms ease-out" }}
            >
                {/* ── 헤더 ── */}
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
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* ── 본문 스크롤 ── */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                    {/* 제목 + 담당자 */}
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
                            className={`min-h-[2.5rem] min-w-0 flex-1 resize-none overflow-hidden rounded-lg border-0 bg-transparent px-0 py-0.5 text-lg font-bold leading-snug text-stone-900 outline-none placeholder:text-stone-300 focus:ring-0 whitespace-pre-wrap break-words ${readOnly ? "cursor-default select-text" : ""}`}
                            placeholder={t("taskDetail.taskTitlePlaceholder")}
                        />
                        {task.assignee && (
                            <div className="shrink-0 flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1">
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

                    {/* 메타 정보 — 2열 그리드 */}
                    <div className="rounded-xl border border-stone-100 bg-stone-50/60 px-4 py-3 space-y-2">
                        {/* 1행: 상태 | 우선순위 */}
                        <div className="grid grid-cols-2 gap-x-4">
                            <div className="flex items-center gap-2">
                                <span className="w-14 shrink-0 text-xs font-medium text-stone-400">{t("taskDetail.status")}</span>
                                <SimpleSelect
                                    value={task.statusId}
                                    items={statuses}
                                    onChange={(id) => {
                                        if (id && !readOnly) update({ statusId: id });
                                    }}
                                    disabled={readOnly}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-14 shrink-0 text-xs font-medium text-stone-400">{t("taskDetail.priority")}</span>
                                <SimpleSelect
                                    value={task.priorityId ?? null}
                                    items={priorities}
                                    nullable
                                    onChange={(id) => { if (!readOnly) update({ priorityId: id }); }}
                                    disabled={readOnly}
                                />
                            </div>
                        </div>
                        {/* 2행: 시작일 | 종료일 */}
                        <div className="grid grid-cols-2 gap-x-4">
                            <div className="flex items-center gap-2">
                                <span className="w-14 shrink-0 text-xs font-medium text-stone-400">{t("taskDetail.startDate")}</span>
                                <input
                                    type="date"
                                    defaultValue={task.startDate?.slice(0, 10) ?? ""}
                                    disabled={isPending || readOnly}
                                    onChange={(e) => !readOnly && update({ startDate: e.target.value || null })}
                                    className="rounded border border-stone-200 px-2 py-1 text-xs outline-none focus:border-stone-400 disabled:cursor-default disabled:opacity-70"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-14 shrink-0 text-xs font-medium text-stone-400">{t("taskDetail.dueDate")}</span>
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

                    {/* 노트 (리치 텍스트, 여러 개) */}
                    <NotesSection workspaceId={workspaceId} taskId={task.id} readOnly={readOnly} currentUserId={currentUserId} />

                    {/* 첨부파일 */}
                    <AttachmentsSection workspaceId={workspaceId} taskId={task.id} readOnly={readOnly} />

                    {/* 댓글 — 항상 작성 가능 */}
                    <CommentsSection workspaceId={workspaceId} taskId={task.id} currentUserId={currentUserId} />
                </div>

                {/* ── 하단 배지 ── */}
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
