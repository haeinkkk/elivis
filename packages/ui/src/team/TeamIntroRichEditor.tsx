"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { htmlToMarkdown, markdownToHtml } from "../utils/team-intro-markdown";

export type WikiRichMediaUploadResult =
    | { ok: true; url: string; mimeType: string }
    | { ok: false; message: string };

type TeamIntroRichEditorProps = {
    initialMarkdown: string;
    onChangeMarkdown: (md: string) => void;
    disabled?: boolean;
    /** 위키 등 넓은 편집 영역 — 본문 최소 높이·스크롤 박스 확대 */
    size?: "default" | "large";
    /** 위키 본문 열에 붙임 — 카드형 테두리 제거 */
    embedded?: boolean;
    /** 이미지·영상 업로드 후 에디터에 삽입 (위키 등) */
    wikiMediaUpload?: (file: File) => Promise<WikiRichMediaUploadResult>;
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

const EDITOR_BODY_CLASS_DEFAULT =
    "prose prose-stone max-w-none min-h-[200px] px-1 py-0.5 text-sm text-stone-800 focus:outline-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2";
const EDITOR_BODY_CLASS_LARGE =
    "prose prose-stone max-w-none min-h-[min(70vh,760px)] px-1 py-0.5 text-sm text-stone-800 focus:outline-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2";

export function TeamIntroRichEditor({
    initialMarkdown,
    onChangeMarkdown,
    disabled = false,
    size = "default",
    embedded = false,
    wikiMediaUpload,
}: TeamIntroRichEditorProps) {
    const t = useTranslations("teams.detail.intro.richEditor");
    const [mediaUploading, setMediaUploading] = useState(false);
    const mediaInputRef = useRef<HTMLInputElement>(null);
    let bodyClass = size === "large" ? EDITOR_BODY_CLASS_LARGE : EDITOR_BODY_CLASS_DEFAULT;
    if (embedded && size === "large") {
        bodyClass = bodyClass
            .replace("px-1 py-0.5", "px-0 py-1")
            .replace("min-h-[min(70vh,760px)]", "min-h-[min(65vh,700px)]");
    }
    const onChangeMarkdownRef = useRef(onChangeMarkdown);
    useEffect(() => {
        onChangeMarkdownRef.current = onChangeMarkdown;
    }, [onChangeMarkdown]);

    const wikiMediaUploadRef = useRef(wikiMediaUpload);
    useEffect(() => {
        wikiMediaUploadRef.current = wikiMediaUpload;
    }, [wikiMediaUpload]);

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
                Image.configure({
                    inline: true,
                    allowBase64: false,
                    HTMLAttributes: { class: "max-h-[min(80vh,720px)] w-auto max-w-full rounded-lg" },
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
                    class: bodyClass,
                },
            },
        },
        /**
         * `initialMarkdown`은 의존성에 넣지 않습니다. 넣으면 부모 `setState`로 인해
         * 글자마다 에디터가 파괴·재생성되어 입력이 끊깁니다.
         * 문서 전환·초기값 반영은 부모에서 `key`를 바꿔 마운트를 갱신하세요.
         */
        [t, disabled, bodyClass],
    );

    async function onPickMediaFile(ev: React.ChangeEvent<HTMLInputElement>) {
        const file = ev.target.files?.[0];
        ev.target.value = "";
        const upload = wikiMediaUploadRef.current;
        if (!file || !upload || !editor) return;
        setMediaUploading(true);
        try {
            const r = await upload(file);
            if (!r.ok) {
                window.alert(r.message);
                return;
            }
            if (r.mimeType.startsWith("image/")) {
                editor.chain().focus().setImage({ src: r.url }).run();
            } else {
                const label = t("videoLinkLabel");
                editor
                    .chain()
                    .focus()
                    .insertContent({
                        type: "paragraph",
                        content: [
                            {
                                type: "text",
                                text: label,
                                marks: [{ type: "link", attrs: { href: r.url } }],
                            },
                        ],
                    })
                    .run();
            }
        } finally {
            setMediaUploading(false);
        }
    }

    const toolbarWrapClass = embedded
        ? "flex flex-wrap items-center gap-0.5 border-b border-stone-200 bg-transparent px-0 py-1.5"
        : "flex flex-wrap items-center gap-0.5 rounded-lg border border-stone-200 bg-stone-50/90 p-1";
    const editorScrollClass = embedded
        ? "min-h-0 flex-1 overflow-y-auto border-0 bg-transparent px-0 py-2"
        : "min-h-0 flex-1 overflow-y-auto rounded-xl border border-stone-200 bg-white px-3 py-2";

    if (!editor) {
        return (
            <div
                className={
                    size === "large"
                        ? embedded
                            ? "min-h-[min(65vh,700px)] animate-pulse border-b border-stone-100 bg-stone-50/40"
                            : "min-h-[min(70vh,760px)] animate-pulse rounded-xl border border-stone-200 bg-stone-50"
                        : "min-h-[220px] animate-pulse rounded-xl border border-stone-200 bg-stone-50"
                }
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
        <div
            className={
                size === "large" ? "flex h-full min-h-0 flex-col gap-2" : "flex min-h-0 flex-col gap-2"
            }
        >
            <div className={toolbarWrapClass}>
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
                {wikiMediaUpload ? (
                    <>
                        <input
                            ref={mediaInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                            className="hidden"
                            onChange={onPickMediaFile}
                        />
                        <ToolbarBtn
                            title={t("mediaTitle")}
                            disabled={disabled || mediaUploading}
                            onClick={() => mediaInputRef.current?.click()}
                        >
                            {t("mediaLabel")}
                        </ToolbarBtn>
                    </>
                ) : null}
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
            <div className={editorScrollClass}>
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
