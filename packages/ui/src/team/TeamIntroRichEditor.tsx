"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { htmlToMarkdown, markdownToHtml } from "../utils/team-intro-markdown";

type TeamIntroRichEditorProps = {
    initialMarkdown: string;
    onChangeMarkdown: (md: string) => void;
    disabled?: boolean;
};

function ToolbarBtn({
    onClick,
    active,
    disabled,
    title,
    children,
}: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title: string;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            disabled={disabled}
            className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                active
                    ? "bg-stone-200 text-stone-900"
                    : "text-stone-600 hover:bg-stone-200/80 hover:text-stone-900"
            }`}
        >
            {children}
        </button>
    );
}

export function TeamIntroRichEditor({
    initialMarkdown,
    onChangeMarkdown,
    disabled = false,
}: TeamIntroRichEditorProps) {
    const t = useTranslations("teams.detail.intro.richEditor");
    const onChangeMarkdownRef = useRef(onChangeMarkdown);
    useEffect(() => {
        onChangeMarkdownRef.current = onChangeMarkdown;
    }, [onChangeMarkdown]);

    const editor = useEditor(
        {
            immediatelyRender: false,
            extensions: [
                StarterKit.configure({
                    heading: { levels: [2, 3] },
                }),
                Link.configure({
                    openOnClick: false,
                    HTMLAttributes: {
                        class: "text-stone-800 underline underline-offset-2",
                    },
                }),
                Placeholder.configure({
                    placeholder: t("placeholder"),
                }),
            ],
            content: markdownToHtml(initialMarkdown),
            editable: !disabled,
            onUpdate: ({ editor: ed }) => {
                onChangeMarkdownRef.current(htmlToMarkdown(ed.getHTML()));
            },
            editorProps: {
                attributes: {
                    class:
                        "prose prose-stone max-w-none min-h-[200px] px-1 py-0.5 text-sm text-stone-800 focus:outline-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2",
                },
            },
        },
        /** `onChangeMarkdown`은 ref로 최신 참조 유지 — 부모 `key`로 마크다운 리셋 */
        [t, initialMarkdown, disabled],
    );

    if (!editor) {
        return (
            <div
                className="min-h-[220px] animate-pulse rounded-xl border border-stone-200 bg-stone-50"
                aria-hidden
            />
        );
    }

    const e = editor;

    function setLink() {
        const prev = (e.getAttributes("link").href as string) ?? "";
        const url = window.prompt(t("linkPromptTitle"), prev);
        if (url === null) return;
        if (url.trim() === "") {
            e.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
        }
        e.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
    }

    return (
        <div className="flex min-h-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-stone-200 bg-stone-50/90 p-1">
                <ToolbarBtn
                    title={t("boldTitle")}
                    active={e.isActive("bold")}
                    disabled={disabled}
                    onClick={() => e.chain().focus().toggleBold().run()}
                >
                    <span className="font-bold">B</span>
                </ToolbarBtn>
                <ToolbarBtn
                    title={t("italicTitle")}
                    active={e.isActive("italic")}
                    disabled={disabled}
                    onClick={() => e.chain().focus().toggleItalic().run()}
                >
                    <span className="italic">I</span>
                </ToolbarBtn>
                <ToolbarBtn
                    title={t("underlineTitle")}
                    active={e.isActive("underline")}
                    disabled={disabled}
                    onClick={() => e.chain().focus().toggleUnderline().run()}
                >
                    <span className="underline">U</span>
                </ToolbarBtn>
                <span className="mx-0.5 h-5 w-px bg-stone-200" aria-hidden />
                <ToolbarBtn
                    title={t("h2Title")}
                    active={e.isActive("heading", { level: 2 })}
                    disabled={disabled}
                    onClick={() => e.chain().focus().toggleHeading({ level: 2 }).run()}
                >
                    H2
                </ToolbarBtn>
                <ToolbarBtn
                    title={t("h3Title")}
                    active={e.isActive("heading", { level: 3 })}
                    disabled={disabled}
                    onClick={() => e.chain().focus().toggleHeading({ level: 3 }).run()}
                >
                    H3
                </ToolbarBtn>
                <span className="mx-0.5 h-5 w-px bg-stone-200" aria-hidden />
                <ToolbarBtn
                    title={t("bulletListTitle")}
                    active={e.isActive("bulletList")}
                    disabled={disabled}
                    onClick={() => e.chain().focus().toggleBulletList().run()}
                >
                    {t("bulletListLabel")}
                </ToolbarBtn>
                <ToolbarBtn
                    title={t("orderedListTitle")}
                    active={e.isActive("orderedList")}
                    disabled={disabled}
                    onClick={() => e.chain().focus().toggleOrderedList().run()}
                >
                    {t("orderedListLabel")}
                </ToolbarBtn>
                <ToolbarBtn
                    title={t("blockquoteTitle")}
                    active={e.isActive("blockquote")}
                    disabled={disabled}
                    onClick={() => e.chain().focus().toggleBlockquote().run()}
                >
                    {t("blockquoteLabel")}
                </ToolbarBtn>
                <span className="mx-0.5 h-5 w-px bg-stone-200" aria-hidden />
                <ToolbarBtn title={t("linkTitle")} active={e.isActive("link")} disabled={disabled} onClick={setLink}>
                    {t("linkLabel")}
                </ToolbarBtn>
                <ToolbarBtn
                    title={t("hrTitle")}
                    disabled={disabled}
                    onClick={() => e.chain().focus().setHorizontalRule().run()}
                >
                    ─
                </ToolbarBtn>
                <span className="mx-0.5 h-5 w-px bg-stone-200" aria-hidden />
                <ToolbarBtn
                    title={t("undoTitle")}
                    disabled={disabled || !e.can().undo()}
                    onClick={() => e.chain().focus().undo().run()}
                >
                    ↺
                </ToolbarBtn>
                <ToolbarBtn
                    title={t("redoTitle")}
                    disabled={disabled || !e.can().redo()}
                    onClick={() => e.chain().focus().redo().run()}
                >
                    ↻
                </ToolbarBtn>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-stone-200 bg-white px-3 py-2">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
