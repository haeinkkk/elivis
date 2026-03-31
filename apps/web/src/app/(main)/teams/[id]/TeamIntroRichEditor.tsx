"use client";

import type { ReactNode } from "react";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { htmlToMarkdown, markdownToHtml } from "@/lib/team-intro-markdown";

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
                    placeholder: "내용을 입력하세요…",
                }),
            ],
            content: markdownToHtml(initialMarkdown),
            editable: !disabled,
            onUpdate: ({ editor: ed }) => {
                onChangeMarkdown(htmlToMarkdown(ed.getHTML()));
            },
            editorProps: {
                attributes: {
                    class:
                        "prose prose-stone max-w-none min-h-[200px] px-1 py-0.5 text-sm text-stone-800 focus:outline-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2",
                },
            },
        },
        // 부모에서 `key`로 리셋 — 마운트 시점의 initialMarkdown만 반영
        // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
        [],
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
        const url = window.prompt("링크 URL", prev);
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
                    title="굵게"
                    active={e.isActive("bold")}
                    disabled={disabled}
                    onClick={() => e.chain().focus().toggleBold().run()}
                >
                    <span className="font-bold">B</span>
                </ToolbarBtn>
                <ToolbarBtn
                    title="기울임"
                    active={e.isActive("italic")}
                    disabled={disabled}
                    onClick={() => e.chain().focus().toggleItalic().run()}
                >
                    <span className="italic">I</span>
                </ToolbarBtn>
                <ToolbarBtn
                    title="밑줄"
                    active={e.isActive("underline")}
                    disabled={disabled}
                    onClick={() => e.chain().focus().toggleUnderline().run()}
                >
                    <span className="underline">U</span>
                </ToolbarBtn>
                <span className="mx-0.5 h-5 w-px bg-stone-200" aria-hidden />
                <ToolbarBtn
                    title="제목 2"
                    active={e.isActive("heading", { level: 2 })}
                    disabled={disabled}
                    onClick={() => e.chain().focus().toggleHeading({ level: 2 }).run()}
                >
                    H2
                </ToolbarBtn>
                <ToolbarBtn
                    title="제목 3"
                    active={e.isActive("heading", { level: 3 })}
                    disabled={disabled}
                    onClick={() => e.chain().focus().toggleHeading({ level: 3 }).run()}
                >
                    H3
                </ToolbarBtn>
                <span className="mx-0.5 h-5 w-px bg-stone-200" aria-hidden />
                <ToolbarBtn
                    title="글머리 목록"
                    active={e.isActive("bulletList")}
                    disabled={disabled}
                    onClick={() => e.chain().focus().toggleBulletList().run()}
                >
                    • 목록
                </ToolbarBtn>
                <ToolbarBtn
                    title="번호 목록"
                    active={e.isActive("orderedList")}
                    disabled={disabled}
                    onClick={() => e.chain().focus().toggleOrderedList().run()}
                >
                    1. 목록
                </ToolbarBtn>
                <ToolbarBtn
                    title="인용"
                    active={e.isActive("blockquote")}
                    disabled={disabled}
                    onClick={() => e.chain().focus().toggleBlockquote().run()}
                >
                    인용
                </ToolbarBtn>
                <span className="mx-0.5 h-5 w-px bg-stone-200" aria-hidden />
                <ToolbarBtn title="링크" active={e.isActive("link")} disabled={disabled} onClick={setLink}>
                    링크
                </ToolbarBtn>
                <ToolbarBtn
                    title="가로줄"
                    disabled={disabled}
                    onClick={() => e.chain().focus().setHorizontalRule().run()}
                >
                    ─
                </ToolbarBtn>
                <span className="mx-0.5 h-5 w-px bg-stone-200" aria-hidden />
                <ToolbarBtn
                    title="실행 취소"
                    disabled={disabled || !e.can().undo()}
                    onClick={() => e.chain().focus().undo().run()}
                >
                    ↺
                </ToolbarBtn>
                <ToolbarBtn
                    title="다시 실행"
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
