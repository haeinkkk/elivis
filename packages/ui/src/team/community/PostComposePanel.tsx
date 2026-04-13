"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { useTranslations } from "next-intl";

import { ElivisSelect } from "../../ElivisSelect";
import type { TeamCommunityPostsActions } from "../../types/team-community-posts-actions";
import type { ApiTeamPost } from "../../types/team-posts-api";
import { TeamCommunityTextStyle } from "./team-community-tiptap";
import type { PendingAttachment, PostCategory } from "./team-community-types";
import { CATEGORY_BADGE_CLASS } from "./team-community-category-styles";
import { formatBytes } from "./team-community-format";

type UploadTeamPostFileFn = TeamCommunityPostsActions["uploadTeamPostFileAction"];

const COMPOSE_CATEGORIES: PostCategory[] = ["notice", "discussion", "share", "general"];

const FONT_SIZE_OPTIONS: { value: string; msgKey: "fontSm" | "fontNormal" | "fontMd" | "fontLg" | "fontXl" }[] =
    [
        { value: "12px", msgKey: "fontSm" },
        { value: "14px", msgKey: "fontNormal" },
        { value: "16px", msgKey: "fontMd" },
        { value: "20px", msgKey: "fontLg" },
        { value: "24px", msgKey: "fontXl" },
    ];

export function PostComposePanel({
    initial,
    onClose,
    onSave,
    uploadTeamPostFile,
}: {
    initial?: Pick<ApiTeamPost, "id" | "title" | "content" | "category" | "attachments"> | null;
    onClose: () => void;
    onSave: (data: {
        title: string;
        content: string;
        category: PostCategory;
        attachments: { url: string; name: string; mimeType: string; size: number }[];
    }) => Promise<void>;
    uploadTeamPostFile: UploadTeamPostFileFn;
}) {
    const t = useTranslations("teams.detail.community.compose");
    const tCat = useTranslations("teams.detail.community.category");
    const tCommon = useTranslations("teams.detail.common");

    const isEdit = Boolean(initial);
    const [title, setTitle] = useState(initial?.title ?? "");
    const [category, setCategory] = useState<PostCategory>(
        (initial?.category as PostCategory) ?? "general",
    );
    const [saving, startSaving] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const titleRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const [attachments, setAttachments] = useState<PendingAttachment[]>(
        (initial?.attachments ?? []).map((a) => ({
            localId: a.id,
            url: a.url,
            name: a.name,
            mimeType: a.mimeType,
            size: a.size,
            isImage: a.mimeType.startsWith("image/"),
        })),
    );
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const dragCounterRef = useRef(0);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            TeamCommunityTextStyle,
            Placeholder.configure({ placeholder: t("bodyPlaceholder") }),
            Image.configure({ inline: false, allowBase64: false }),
        ],
        content: initial?.content ?? "",
        editorProps: {
            attributes: {
                class: "prose prose-sm max-w-none min-h-[200px] px-4 py-3 focus:outline-none text-stone-700 dark:text-elivis-ink [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_h2]:text-base [&_h2]:font-bold [&_blockquote]:border-l-2 [&_blockquote]:border-stone-300 dark:[&_blockquote]:border-elivis-line [&_blockquote]:pl-3 [&_blockquote]:text-stone-500 dark:[&_blockquote]:text-elivis-ink-secondary [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 dark:prose-invert",
            },
        },
    });

    useEffect(() => {
        setTimeout(() => titleRef.current?.focus(), 50);
    }, []);

    const currentFontSize = editor?.getAttributes("textStyle").fontSize ?? "";

    async function uploadFiles(files: File[], insertAsImage = false) {
        if (files.length === 0) return;
        setUploading(true);
        try {
            for (const file of files) {
                const res = await uploadTeamPostFile(file);
                if (res.ok) {
                    if (insertAsImage && res.isImage) {
                        editor?.chain().focus().setImage({ src: res.url, alt: res.name }).run();
                    } else {
                        setAttachments((prev) => [
                            ...prev,
                            {
                                localId: `${Date.now()}-${res.name}`,
                                url: res.url,
                                name: res.name,
                                mimeType: res.mimeType,
                                size: res.size,
                                isImage: res.isImage,
                            },
                        ]);
                    }
                }
            }
        } finally {
            setUploading(false);
        }
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, insertAsImage = false) {
        const files = Array.from(e.target.files ?? []);
        await uploadFiles(files, insertAsImage);
        e.target.value = "";
    }

    function handleDragEnter(e: React.DragEvent) {
        e.preventDefault();
        dragCounterRef.current += 1;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setIsDragging(true);
    }

    function handleDragLeave(e: React.DragEvent) {
        e.preventDefault();
        dragCounterRef.current -= 1;
        if (dragCounterRef.current === 0) setIsDragging(false);
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
    }

    async function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        dragCounterRef.current = 0;
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        await uploadFiles(files, false);
    }

    async function handlePaste(e: React.ClipboardEvent) {
        const files = Array.from(e.clipboardData.files);
        if (files.length === 0) return;
        e.preventDefault();
        const imageFiles = files.filter((f) => f.type.startsWith("image/"));
        const otherFiles = files.filter((f) => !f.type.startsWith("image/"));
        if (imageFiles.length > 0) await uploadFiles(imageFiles, true);
        if (otherFiles.length > 0) await uploadFiles(otherFiles, false);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const html = editor?.getHTML() ?? "";
        const text = editor?.getText() ?? "";
        if (!title.trim() || !text.trim()) {
            setError(t("validationTitleContent"));
            return;
        }
        setError(null);
        startSaving(async () => {
            await onSave({
                title: title.trim(),
                content: html,
                category,
                attachments: attachments.map(({ url, name, mimeType, size }) => ({
                    url,
                    name,
                    mimeType,
                    size,
                })),
            });
        });
    }

    const ToolbarBtn = ({
        onClick,
        active,
        title: btnTitle,
        disabled: dis,
        children,
    }: {
        onClick: () => void;
        active?: boolean;
        title: string;
        disabled?: boolean;
        children: React.ReactNode;
    }) => (
        <button
            type="button"
            onMouseDown={(e) => {
                e.preventDefault();
                onClick();
            }}
            title={btnTitle}
            disabled={dis}
            className={`rounded px-2 py-1 text-xs transition-colors disabled:opacity-30 ${active ? "bg-stone-200 text-stone-900 dark:bg-elivis-surface-elevated dark:text-elivis-ink" : "text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-elivis-ink-secondary dark:hover:bg-elivis-surface-elevated dark:hover:text-elivis-ink"}`}
        >
            {children}
        </button>
    );

    return (
        <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-stone-200 dark:border-elivis-line bg-stone-50 dark:bg-elivis-surface px-6 py-4">
                <h2 className="text-sm font-bold text-stone-800 dark:text-elivis-ink">
                    {isEdit ? t("editTitle") : t("newTitle")}
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-200 hover:text-stone-600 dark:text-elivis-ink-secondary dark:hover:bg-elivis-surface-elevated dark:hover:text-elivis-ink"
                >
                    <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18 18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            <form
                onSubmit={handleSubmit}
                onPaste={handlePaste}
                className="flex min-h-0 flex-1 flex-col overflow-y-auto"
            >
                <div className="shrink-0 border-b border-stone-100 dark:border-elivis-line px-6 py-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-elivis-ink-secondary">
                        {t("categoryLabel")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {COMPOSE_CATEGORIES.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setCategory(c)}
                                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 transition-all ${
                                    category === c
                                        ? CATEGORY_BADGE_CLASS[c]
                                        : "bg-white text-stone-400 ring-stone-200 hover:bg-stone-50 dark:bg-elivis-surface dark:text-elivis-ink-secondary dark:ring-elivis-line dark:hover:bg-elivis-surface-elevated"
                                }`}
                            >
                                {tCat(c)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="shrink-0 border-b border-stone-100 dark:border-elivis-line px-6 py-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-elivis-ink-secondary">
                        {t("titleLabel")}
                    </p>
                    <input
                        ref={titleRef}
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t("titlePlaceholder")}
                        maxLength={120}
                        className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-medium text-stone-800 outline-none placeholder:text-stone-300 focus:border-stone-400 focus:bg-white dark:border-elivis-line dark:bg-elivis-surface dark:text-elivis-ink dark:placeholder:text-elivis-ink-muted dark:focus:border-elivis-line dark:focus:bg-elivis-surface-elevated"
                    />
                </div>

                <div className="flex min-h-0 flex-1 flex-col px-6 py-3">
                    <p className="mb-2 shrink-0 text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-elivis-ink-secondary">
                        {t("bodyLabel")}
                    </p>

                    <div className="mb-1 flex shrink-0 flex-wrap items-center gap-0.5 rounded-t-lg border border-b-0 border-stone-200 dark:border-elivis-line bg-stone-50 dark:bg-elivis-surface px-2 py-1.5">
                        <ElivisSelect
                            variant="toolbarPlain"
                            value={currentFontSize}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (!val) {
                                    editor?.chain().focus().unsetMark("textStyle").run();
                                } else {
                                    editor?.chain().focus().setMark("textStyle", { fontSize: val }).run();
                                }
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            title={t("fontSize")}
                        >
                            <option value="">{t("fontDefault")}</option>
                            {FONT_SIZE_OPTIONS.map((f) => (
                                <option key={f.value} value={f.value}>
                                    {t(f.msgKey)}
                                </option>
                            ))}
                        </ElivisSelect>

                        <div className="mx-1 h-3 w-px bg-stone-200 dark:bg-elivis-surface-elevated" />

                        <ToolbarBtn
                            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                            active={editor?.isActive("heading", { level: 2 })}
                            title={t("toolbarHeading")}
                        >
                            <span className="font-bold">H</span>
                        </ToolbarBtn>
                        <div className="mx-1 h-3 w-px bg-stone-200 dark:bg-elivis-surface-elevated" />
                        <ToolbarBtn
                            onClick={() => editor?.chain().focus().toggleBold().run()}
                            active={editor?.isActive("bold")}
                            title={t("toolbarBold")}
                        >
                            <span className="font-bold">B</span>
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() => editor?.chain().focus().toggleItalic().run()}
                            active={editor?.isActive("italic")}
                            title={t("toolbarItalic")}
                        >
                            <span className="italic">I</span>
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() => editor?.chain().focus().toggleStrike().run()}
                            active={editor?.isActive("strike")}
                            title={t("toolbarStrike")}
                        >
                            <span className="line-through">S</span>
                        </ToolbarBtn>
                        <div className="mx-1 h-3 w-px bg-stone-200 dark:bg-elivis-surface-elevated" />
                        <ToolbarBtn
                            onClick={() => editor?.chain().focus().toggleBulletList().run()}
                            active={editor?.isActive("bulletList")}
                            title={t("toolbarBulletList")}
                        >
                            •—
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                            active={editor?.isActive("orderedList")}
                            title={t("toolbarOrderedList")}
                        >
                            1—
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                            active={editor?.isActive("blockquote")}
                            title={t("toolbarBlockquote")}
                        >
                            ❝
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() => editor?.chain().focus().toggleCode().run()}
                            active={editor?.isActive("code")}
                            title={t("toolbarCode")}
                        >
                            {"</>"}
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
                            title={t("toolbarHr")}
                        >
                            —
                        </ToolbarBtn>

                        <div className="mx-1 h-3 w-px bg-stone-200 dark:bg-elivis-surface-elevated" />

                        <button
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                imageInputRef.current?.click();
                            }}
                            title={t("toolbarInsertImage")}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-stone-500 dark:text-elivis-ink-secondary hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated hover:text-stone-800"
                        >
                            <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.8}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                                />
                            </svg>
                            {t("toolbarImage")}
                        </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto rounded-b-lg border border-stone-200 bg-white focus-within:border-stone-400 dark:border-elivis-line dark:bg-elivis-surface dark:focus-within:border-elivis-line">
                        <EditorContent editor={editor} />
                    </div>
                </div>

                <div
                    className={`relative shrink-0 border-t px-6 py-3 transition-colors ${
                        isDragging
                            ? "border-stone-300 bg-stone-50 dark:border-elivis-line dark:bg-elivis-surface-elevated"
                            : "border-stone-100 dark:border-elivis-line"
                    }`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    {isDragging && (
                        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 rounded border-2 border-dashed border-stone-400 bg-stone-50/95 dark:border-elivis-line dark:bg-elivis-surface/95">
                            <svg
                                className="h-4 w-4 text-stone-400 dark:text-elivis-ink-secondary"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.8}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                                />
                            </svg>
                            <span className="text-sm font-medium text-stone-600 dark:text-elivis-ink-secondary">{t("attachmentsDrop")}</span>
                        </div>
                    )}
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-elivis-ink-secondary">
                            {t("attachmentsHint")}
                        </p>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex items-center gap-1 rounded-lg border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-2.5 py-1 text-xs font-medium text-stone-500 dark:text-elivis-ink-secondary hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated disabled:opacity-50"
                        >
                            {uploading ? (
                                <div className="h-3 w-3 animate-spin rounded-full border border-stone-300 border-t-stone-600 dark:border-elivis-line dark:border-t-elivis-ink-secondary" />
                            ) : (
                                <svg
                                    className="h-3.5 w-3.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 4.5v15m7.5-7.5h-15"
                                    />
                                </svg>
                            )}
                            {t("addFile")}
                        </button>
                    </div>

                    {attachments.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            {attachments.map((f) => (
                                <div
                                    key={f.localId}
                                    className="flex items-center gap-2 rounded-lg border border-stone-100 dark:border-elivis-line bg-stone-50 dark:bg-elivis-surface px-3 py-2"
                                >
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white dark:bg-elivis-surface text-stone-400 dark:text-elivis-ink-secondary ring-1 ring-stone-200 dark:ring-elivis-line">
                                        {f.isImage ? (
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={1.5}
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                                                />
                                            </svg>
                                        ) : (
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={1.5}
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                                                />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium text-stone-700 dark:text-elivis-ink">{f.name}</p>
                                        <p className="text-[10px] text-stone-400 dark:text-elivis-ink-secondary">{formatBytes(f.size)}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setAttachments((prev) => prev.filter((a) => a.localId !== f.localId))
                                        }
                                        className="shrink-0 text-stone-300 hover:text-red-400 dark:text-elivis-ink-muted dark:hover:text-red-400"
                                    >
                                        <svg
                                            className="h-3.5 w-3.5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2}
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M6 18 18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {error && <p className="shrink-0 px-6 pb-2 text-xs text-red-500 dark:text-red-400">{error}</p>}

                <div className="shrink-0 flex items-center justify-end gap-2 border-t border-stone-100 dark:border-elivis-line bg-stone-50 dark:bg-elivis-surface px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-200 dark:text-elivis-ink-secondary dark:hover:bg-elivis-surface-elevated"
                    >
                        {tCommon("cancel")}
                    </button>
                    <button
                        type="submit"
                        disabled={saving || uploading}
                        className="rounded-lg bg-stone-800 px-5 py-2 text-sm font-medium text-white hover:bg-stone-950 disabled:opacity-50"
                    >
                        {saving ? t("saving") : isEdit ? t("saveEdit") : t("publish")}
                    </button>
                </div>
            </form>

            <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileChange(e, false)}
            />
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileChange(e, true)}
            />

            <style>{`
                .tiptap { outline: none; }
                .tiptap p { margin: 0.25rem 0; }
                .tiptap ul, .tiptap ol { padding-left: 1.25rem; margin: 0.25rem 0; }
                .tiptap blockquote { border-left: 2px solid #d6d3d1; padding-left: 0.75rem; color: #78716c; margin: 0.25rem 0; }
                .tiptap strong { font-weight: 600; }
                .tiptap em { font-style: italic; }
                .tiptap s { text-decoration: line-through; }
                .tiptap code { background: #f5f5f4; border-radius: 3px; padding: 0.1rem 0.3rem; font-size: 0.85em; }
                .tiptap hr { border: none; border-top: 1px solid #e7e5e4; margin: 0.75rem 0; }
                .tiptap h2 { font-size: 1.05rem; font-weight: 700; margin: 0.5rem 0 0.25rem; }
                .tiptap img { max-width: 100%; border-radius: 0.5rem; margin: 0.5rem 0; }
                .tiptap p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #c2b8ae;
                    pointer-events: none;
                    height: 0;
                    font-size: 0.875rem;
                }
                .dark .tiptap blockquote { border-left-color: rgb(55 55 55); color: rgb(160 160 160); }
                .dark .tiptap code { background: rgb(44 44 44); color: rgb(225 225 225); }
                .dark .tiptap hr { border-top-color: rgb(55 55 55); }
                .dark .tiptap p.is-editor-empty:first-child::before { color: rgb(108 108 108); }
            `}</style>
        </div>
    );
}
