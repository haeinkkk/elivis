"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useTranslations } from "next-intl";

import type { TeamCommunityPostsActions } from "../../types/team-community-posts-actions";

type UploadTeamPostFileFn = TeamCommunityPostsActions["uploadTeamPostFileAction"];

export function MiniEditor({
    placeholder,
    autoFocus,
    onSubmit,
    onCancel,
    submitLabel,
    submitting,
    uploadTeamPostFile,
}: {
    placeholder?: string;
    autoFocus?: boolean;
    onSubmit: (html: string) => void;
    onCancel?: () => void;
    submitLabel?: string;
    submitting?: boolean;
    uploadTeamPostFile: UploadTeamPostFileFn;
}) {
    const t = useTranslations("teams.detail.community.miniEditor");
    const tCommon = useTranslations("teams.detail.common");

    const [uploading, setUploading] = useState(false);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [showImageInput, setShowImageInput] = useState(false);
    const [imageUrl, setImageUrl] = useState("");

    const ph = placeholder ?? t("placeholderDefault");
    const label = submitLabel ?? t("submitComment");

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Image.configure({ inline: true, allowBase64: false }),
            Link.configure({ openOnClick: false, autolink: true }),
            Placeholder.configure({ placeholder: ph }),
        ],
        editorProps: {
            attributes: {
                class: "prose prose-sm max-w-none min-h-[56px] px-3 py-2.5 focus:outline-none text-stone-700 dark:text-elivis-ink [&_p]:my-0.5 [&_img]:max-w-full [&_img]:rounded [&_a]:text-blue-600 [&_a]:underline dark:prose-invert",
            },
        },
        autofocus: autoFocus,
    });

    async function uploadImageFiles(files: File[]) {
        setUploading(true);
        try {
            for (const file of files) {
                const res = await uploadTeamPostFile(file);
                if (res.ok) {
                    if (res.isImage) {
                        editor?.chain().focus().setImage({ src: res.url, alt: res.name }).run();
                    } else {
                        editor?.chain().focus().setLink({ href: res.url }).insertContent(res.name).run();
                    }
                }
            }
        } finally {
            setUploading(false);
        }
    }

    function handleSubmit() {
        const html = editor?.getHTML() ?? "";
        const text = editor?.getText() ?? "";
        if (!text.trim()) return;
        onSubmit(html);
        editor?.commands.clearContent();
        setShowLinkInput(false);
        setShowImageInput(false);
    }

    function applyLink() {
        if (!linkUrl.trim()) {
            setShowLinkInput(false);
            return;
        }
        const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
        editor?.chain().focus().setLink({ href: url }).run();
        setLinkUrl("");
        setShowLinkInput(false);
    }

    function applyImageUrl() {
        if (!imageUrl.trim()) {
            setShowImageInput(false);
            return;
        }
        editor?.chain().focus().setImage({ src: imageUrl }).run();
        setImageUrl("");
        setShowImageInput(false);
    }

    return (
        <div className="rounded-xl border border-stone-200 bg-white transition-colors focus-within:border-stone-400 dark:border-elivis-line dark:bg-elivis-surface dark:focus-within:border-elivis-line">
            <div className="flex items-center gap-0.5 border-b border-stone-100 dark:border-elivis-line px-2 py-1">
                <button
                    type="button"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        editor?.chain().focus().toggleBold().run();
                    }}
                    className={`rounded px-1.5 py-0.5 text-xs font-bold transition-colors ${editor?.isActive("bold") ? "bg-stone-200 text-stone-900 dark:bg-elivis-surface-elevated dark:text-elivis-ink" : "text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:text-elivis-ink-secondary dark:hover:bg-elivis-surface-elevated dark:hover:text-elivis-ink"}`}
                >
                    B
                </button>
                <button
                    type="button"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        editor?.chain().focus().toggleItalic().run();
                    }}
                    className={`rounded px-1.5 py-0.5 text-xs italic transition-colors ${editor?.isActive("italic") ? "bg-stone-200 text-stone-900 dark:bg-elivis-surface-elevated dark:text-elivis-ink" : "text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:text-elivis-ink-secondary dark:hover:bg-elivis-surface-elevated dark:hover:text-elivis-ink"}`}
                >
                    I
                </button>
                <div className="mx-1 h-3 w-px bg-stone-200 dark:bg-elivis-surface-elevated" />
                <button
                    type="button"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setShowLinkInput((v) => !v);
                        setShowImageInput(false);
                    }}
                    title={t("linkTitle")}
                    className={`rounded px-1.5 py-0.5 text-xs transition-colors ${showLinkInput ? "bg-stone-200 text-stone-700 dark:bg-elivis-surface-elevated dark:text-elivis-ink" : "text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:text-elivis-ink-secondary dark:hover:bg-elivis-surface-elevated dark:hover:text-elivis-ink"}`}
                >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
                        />
                    </svg>
                </button>
                <button
                    type="button"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setShowImageInput((v) => !v);
                        setShowLinkInput(false);
                    }}
                    title={t("imageUrlTitle")}
                    className={`rounded px-1.5 py-0.5 text-xs transition-colors ${showImageInput ? "bg-stone-200 text-stone-700 dark:bg-elivis-surface-elevated dark:text-elivis-ink" : "text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:text-elivis-ink-secondary dark:hover:bg-elivis-surface-elevated dark:hover:text-elivis-ink"}`}
                >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                        />
                    </svg>
                </button>
                {uploading && (
                    <div className="ml-1 h-3 w-3 animate-spin rounded-full border border-stone-300 border-t-stone-600 dark:border-elivis-line dark:border-t-elivis-ink-secondary" />
                )}
                <span className="ml-auto text-[10px] text-stone-300 dark:text-elivis-ink-muted">{t("pasteHint")}</span>
            </div>

            {showLinkInput && (
                <div className="flex items-center gap-1.5 border-b border-stone-100 dark:border-elivis-line px-3 py-1.5">
                    <input
                        autoFocus
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                applyLink();
                            }
                            if (e.key === "Escape") setShowLinkInput(false);
                        }}
                        placeholder={t("linkPlaceholder")}
                        className="flex-1 rounded border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-700 outline-none focus:border-stone-400 dark:border-elivis-line dark:bg-elivis-surface-elevated dark:text-elivis-ink dark:focus:border-elivis-line"
                    />
                    <button
                        type="button"
                        onClick={applyLink}
                        className="rounded bg-stone-700 px-2 py-1 text-xs font-medium text-white hover:bg-stone-800"
                    >
                        {t("insert")}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowLinkInput(false)}
                        className="text-xs text-stone-400 hover:text-stone-600 dark:text-elivis-ink-secondary dark:hover:text-elivis-ink"
                    >
                        {tCommon("cancel")}
                    </button>
                </div>
            )}

            {showImageInput && (
                <div className="flex items-center gap-1.5 border-b border-stone-100 dark:border-elivis-line px-3 py-1.5">
                    <input
                        autoFocus
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                applyImageUrl();
                            }
                            if (e.key === "Escape") setShowImageInput(false);
                        }}
                        placeholder={t("imageUrlPlaceholder")}
                        className="flex-1 rounded border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-700 outline-none focus:border-stone-400 dark:border-elivis-line dark:bg-elivis-surface-elevated dark:text-elivis-ink dark:focus:border-elivis-line"
                    />
                    <button
                        type="button"
                        onClick={applyImageUrl}
                        className="rounded bg-stone-700 px-2 py-1 text-xs font-medium text-white hover:bg-stone-800"
                    >
                        {t("insert")}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowImageInput(false)}
                        className="text-xs text-stone-400 hover:text-stone-600 dark:text-elivis-ink-secondary dark:hover:text-elivis-ink"
                    >
                        {tCommon("cancel")}
                    </button>
                </div>
            )}

            <div
                onPaste={async (e) => {
                    const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
                    if (files.length === 0) return;
                    e.preventDefault();
                    await uploadImageFiles(files);
                }}
            >
                <EditorContent
                    editor={editor}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
                        if (e.key === "Escape" && onCancel) onCancel();
                    }}
                />
            </div>

            <div className="flex items-center justify-end gap-1.5 border-t border-stone-100 dark:border-elivis-line px-3 py-2">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-lg px-3 py-1 text-xs font-medium text-stone-400 dark:text-elivis-ink-secondary hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated hover:text-stone-600"
                    >
                        {tCommon("cancel")}
                    </button>
                )}
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || uploading}
                    className="rounded-lg bg-stone-800 px-3 py-1 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-40"
                >
                    {submitting ? t("submitting") : label}
                </button>
            </div>
        </div>
    );
}
