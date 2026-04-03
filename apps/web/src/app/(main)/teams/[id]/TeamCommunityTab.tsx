"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle as TextStyleBase } from "@tiptap/extension-text-style";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";

// fontSize 속성을 지원하도록 TextStyle 확장
const TextStyle = TextStyleBase.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            fontSize: {
                default: null,
                parseHTML: (el) => (el as HTMLElement).style.fontSize || null,
                renderHTML: (attrs) =>
                    attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
            },
        };
    },
});

import {
    type ApiTeamPost,
    type ApiTeamPostAttachment,
    type ApiTeamPostAuthor,
    type ApiTeamPostComment,
    listTeamPostsAction,
    getTeamPostAction,
    createTeamPostAction,
    updateTeamPostAction,
    deleteTeamPostAction,
    toggleTeamPostPinAction,
    createTeamPostCommentAction,
    deleteTeamPostCommentAction,
    uploadTeamPostFileAction,
} from "@/app/actions/teamPosts";
import { UserAvatar } from "@/components/UserAvatar";

// ─────────────────────────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────────────────────────

export type PostCategory = "general" | "notice" | "discussion" | "share";

const CATEGORIES: { id: PostCategory | "all"; label: string; color: string }[] = [
    { id: "all", label: "전체", color: "stone" },
    { id: "notice", label: "공지", color: "red" },
    { id: "discussion", label: "토론", color: "blue" },
    { id: "share", label: "공유", color: "green" },
    { id: "general", label: "자유", color: "stone" },
];

const CATEGORY_BADGE: Record<PostCategory, { label: string; cls: string }> = {
    notice: { label: "공지", cls: "bg-red-50 text-red-600 ring-red-200" },
    discussion: { label: "토론", cls: "bg-blue-50 text-blue-600 ring-blue-200" },
    share: { label: "공유", cls: "bg-green-50 text-green-600 ring-green-200" },
    general: { label: "자유", cls: "bg-stone-100 text-stone-500 ring-stone-200" },
};

const CATEGORY_CARD: Record<PostCategory, { border: string; selectedBg: string; hoverBg: string }> =
    {
        notice: {
            border: "border-l-red-400",
            selectedBg: "bg-red-50/60",
            hoverBg: "hover:bg-red-50/40",
        },
        discussion: {
            border: "border-l-blue-400",
            selectedBg: "bg-blue-50/60",
            hoverBg: "hover:bg-blue-50/40",
        },
        share: {
            border: "border-l-green-400",
            selectedBg: "bg-green-50/60",
            hoverBg: "hover:bg-green-50/40",
        },
        general: {
            border: "border-l-stone-300",
            selectedBg: "bg-stone-50",
            hoverBg: "hover:bg-stone-50",
        },
    };

// 상세 패널 헤더 & 섹션 색상
const CATEGORY_DETAIL: Record<
    PostCategory,
    { headerBg: string; topBar: string; commentsBg: string; inputBorder: string }
> = {
    notice: {
        headerBg: "bg-red-50/50",
        topBar: "bg-red-400",
        commentsBg: "bg-red-50/20",
        inputBorder: "border-red-100",
    },
    discussion: {
        headerBg: "bg-blue-50/50",
        topBar: "bg-blue-400",
        commentsBg: "bg-blue-50/20",
        inputBorder: "border-blue-100",
    },
    share: {
        headerBg: "bg-green-50/50",
        topBar: "bg-green-400",
        commentsBg: "bg-green-50/20",
        inputBorder: "border-green-100",
    },
    general: {
        headerBg: "bg-stone-50/60",
        topBar: "bg-stone-300",
        commentsBg: "bg-stone-50/40",
        inputBorder: "border-stone-200",
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return "방금 전";
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function displayName(u: { name: string | null; email: string }) {
    return u.name ?? u.email;
}

function AuthorAvatar({ author, sizeClass }: { author: ApiTeamPostAuthor; sizeClass: string }) {
    return (
        <UserAvatar
            userId={author.id}
            label={displayName(author)}
            avatarUrl={author.avatarUrl}
            sizeClass={sizeClass}
            ringClass=""
        />
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 폰트 크기 옵션
// ─────────────────────────────────────────────────────────────────────────────

const FONT_SIZES = [
    { label: "소", value: "12px" },
    { label: "보통", value: "14px" },
    { label: "중", value: "16px" },
    { label: "대", value: "20px" },
    { label: "특대", value: "24px" },
];

// ─────────────────────────────────────────────────────────────────────────────
// 첨부파일 아이템 타입
// ─────────────────────────────────────────────────────────────────────────────

interface PendingAttachment {
    localId: string;
    url: string;
    name: string;
    mimeType: string;
    size: number;
    isImage: boolean;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 게시글 작성/수정 패널 (인라인, Tiptap 에디터)
// ─────────────────────────────────────────────────────────────────────────────

function PostComposePanel({
    initial,
    onClose,
    onSave,
}: {
    initial?: Pick<ApiTeamPost, "id" | "title" | "content" | "category" | "attachments"> | null;
    onClose: () => void;
    onSave: (data: {
        title: string;
        content: string;
        category: PostCategory;
        attachments: { url: string; name: string; mimeType: string; size: number }[];
    }) => Promise<void>;
}) {
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

    // 첨부파일 상태 (기존 + 새로 추가한 것 모두)
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
            TextStyle,
            Placeholder.configure({ placeholder: "내용을 작성하세요…" }),
            Image.configure({ inline: false, allowBase64: false }),
        ],
        content: initial?.content ?? "",
        editorProps: {
            attributes: {
                class: "prose prose-sm max-w-none min-h-[200px] px-4 py-3 focus:outline-none text-stone-700 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_h2]:text-base [&_h2]:font-bold [&_blockquote]:border-l-2 [&_blockquote]:border-stone-300 [&_blockquote]:pl-3 [&_blockquote]:text-stone-500 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2",
            },
        },
    });

    useEffect(() => {
        setTimeout(() => titleRef.current?.focus(), 50);
    }, []);

    // 현재 선택 영역에 적용된 fontSize 감지
    const currentFontSize = editor?.getAttributes("textStyle").fontSize ?? "";

    async function uploadFiles(files: File[], insertAsImage = false) {
        if (files.length === 0) return;
        setUploading(true);
        try {
            for (const file of files) {
                const res = await uploadTeamPostFileAction(file);
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
        // 클립보드에 파일이 있을 때만 가로채서 처리
        e.preventDefault();
        const imageFiles = files.filter((f) => f.type.startsWith("image/"));
        const otherFiles = files.filter((f) => !f.type.startsWith("image/"));
        // 이미지는 에디터에 인라인 삽입
        if (imageFiles.length > 0) await uploadFiles(imageFiles, true);
        // 나머지 파일은 첨부파일로 추가
        if (otherFiles.length > 0) await uploadFiles(otherFiles, false);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const html = editor?.getHTML() ?? "";
        const text = editor?.getText() ?? "";
        if (!title.trim() || !text.trim()) {
            setError("제목과 내용을 모두 입력해주세요.");
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
        title: t,
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
            title={t}
            disabled={dis}
            className={`rounded px-2 py-1 text-xs transition-colors disabled:opacity-30 ${active ? "bg-stone-200 text-stone-900" : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"}`}
        >
            {children}
        </button>
    );

    return (
        <div className="flex h-full flex-col">
            {/* 헤더 */}
            <div className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
                <h2 className="text-sm font-bold text-stone-800">
                    {isEdit ? "게시글 수정" : "새 게시글"}
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-200 hover:text-stone-600"
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
                {/* 카테고리 선택 */}
                <div className="shrink-0 border-b border-stone-100 px-6 py-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                        카테고리
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => setCategory(c.id as PostCategory)}
                                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 transition-all ${
                                    category === c.id
                                        ? CATEGORY_BADGE[c.id as PostCategory].cls
                                        : "bg-white text-stone-400 ring-stone-200 hover:bg-stone-50"
                                }`}
                            >
                                {CATEGORY_BADGE[c.id as PostCategory].label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 제목 */}
                <div className="shrink-0 border-b border-stone-100 px-6 py-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                        제목
                    </p>
                    <input
                        ref={titleRef}
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="제목을 입력하세요"
                        maxLength={120}
                        className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-medium text-stone-800 placeholder-stone-300 outline-none focus:border-stone-400 focus:bg-white"
                    />
                </div>

                {/* 본문 에디터 */}
                <div className="flex min-h-0 flex-1 flex-col px-6 py-3">
                    <p className="mb-2 shrink-0 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                        내용
                    </p>

                    {/* 툴바 */}
                    <div className="mb-1 flex shrink-0 flex-wrap items-center gap-0.5 rounded-t-lg border border-b-0 border-stone-200 bg-stone-50 px-2 py-1.5">
                        {/* 폰트 크기 */}
                        <select
                            value={currentFontSize}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (!val) {
                                    editor?.chain().focus().unsetMark("textStyle").run();
                                } else {
                                    editor
                                        ?.chain()
                                        .focus()
                                        .setMark("textStyle", { fontSize: val })
                                        .run();
                                }
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-xs text-stone-600 outline-none focus:border-stone-400"
                            title="폰트 크기"
                        >
                            <option value="">기본</option>
                            {FONT_SIZES.map((f) => (
                                <option key={f.value} value={f.value}>
                                    {f.label}
                                </option>
                            ))}
                        </select>

                        <div className="mx-1 h-3 w-px bg-stone-200" />

                        <ToolbarBtn
                            onClick={() =>
                                editor?.chain().focus().toggleHeading({ level: 2 }).run()
                            }
                            active={editor?.isActive("heading", { level: 2 })}
                            title="제목"
                        >
                            <span className="font-bold">H</span>
                        </ToolbarBtn>
                        <div className="mx-1 h-3 w-px bg-stone-200" />
                        <ToolbarBtn
                            onClick={() => editor?.chain().focus().toggleBold().run()}
                            active={editor?.isActive("bold")}
                            title="굵게"
                        >
                            <span className="font-bold">B</span>
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() => editor?.chain().focus().toggleItalic().run()}
                            active={editor?.isActive("italic")}
                            title="기울임"
                        >
                            <span className="italic">I</span>
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() => editor?.chain().focus().toggleStrike().run()}
                            active={editor?.isActive("strike")}
                            title="취소선"
                        >
                            <span className="line-through">S</span>
                        </ToolbarBtn>
                        <div className="mx-1 h-3 w-px bg-stone-200" />
                        <ToolbarBtn
                            onClick={() => editor?.chain().focus().toggleBulletList().run()}
                            active={editor?.isActive("bulletList")}
                            title="목록"
                        >
                            •—
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                            active={editor?.isActive("orderedList")}
                            title="번호 목록"
                        >
                            1—
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                            active={editor?.isActive("blockquote")}
                            title="인용"
                        >
                            ❝
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() => editor?.chain().focus().toggleCode().run()}
                            active={editor?.isActive("code")}
                            title="코드"
                        >
                            {"</>"}
                        </ToolbarBtn>
                        <ToolbarBtn
                            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
                            title="구분선"
                        >
                            —
                        </ToolbarBtn>

                        <div className="mx-1 h-3 w-px bg-stone-200" />

                        {/* 이미지 삽입 버튼 */}
                        <button
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                imageInputRef.current?.click();
                            }}
                            title="이미지 삽입"
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-800"
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
                            이미지
                        </button>
                    </div>

                    {/* 에디터 본문 */}
                    <div className="min-h-0 flex-1 overflow-y-auto rounded-b-lg border border-stone-200 bg-white focus-within:border-stone-400">
                        <EditorContent editor={editor} />
                    </div>
                </div>

                {/* 첨부파일 영역 (드래그앤드랍 전용) */}
                <div
                    className={`relative shrink-0 border-t px-6 py-3 transition-colors ${isDragging ? "border-stone-300 bg-stone-50" : "border-stone-100"}`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    {/* 드래그 오버레이 */}
                    {isDragging && (
                        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 rounded border-2 border-dashed border-stone-400 bg-stone-50/95">
                            <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                            </svg>
                            <span className="text-sm font-medium text-stone-600">파일을 여기에 놓으세요</span>
                        </div>
                    )}
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                            첨부파일 · 드래그 또는 Ctrl+V로 붙여넣기
                        </p>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-500 hover:bg-stone-50 disabled:opacity-50"
                        >
                            {uploading ? (
                                <div className="h-3 w-3 animate-spin rounded-full border border-stone-300 border-t-stone-600" />
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
                            파일 추가
                        </button>
                    </div>

                    {attachments.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            {attachments.map((f) => (
                                <div
                                    key={f.localId}
                                    className="flex items-center gap-2 rounded-lg border border-stone-100 bg-stone-50 px-3 py-2"
                                >
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-stone-400 ring-1 ring-stone-200">
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
                                        <p className="truncate text-xs font-medium text-stone-700">
                                            {f.name}
                                        </p>
                                        <p className="text-[10px] text-stone-400">
                                            {formatBytes(f.size)}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setAttachments((prev) =>
                                                prev.filter((a) => a.localId !== f.localId),
                                            )
                                        }
                                        className="shrink-0 text-stone-300 hover:text-red-400"
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

                {error && <p className="shrink-0 px-6 pb-2 text-xs text-red-500">{error}</p>}

                {/* 하단 액션 */}
                <div className="shrink-0 flex items-center justify-end gap-2 border-t border-stone-100 bg-stone-50 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-200"
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        disabled={saving || uploading}
                        className="rounded-lg bg-stone-800 px-5 py-2 text-sm font-medium text-white hover:bg-stone-950 disabled:opacity-50"
                    >
                        {saving ? "저장 중…" : isEdit ? "수정 완료" : "게시하기"}
                    </button>
                </div>
            </form>

            {/* 숨김 파일 input들 */}
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
            `}</style>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// 댓글용 미니 에디터
// ─────────────────────────────────────────────────────────────────────────────

function MiniEditor({
    placeholder,
    autoFocus,
    onSubmit,
    onCancel,
    submitLabel = "댓글 등록",
    submitting,
}: {
    placeholder?: string;
    autoFocus?: boolean;
    onSubmit: (html: string) => void;
    onCancel?: () => void;
    submitLabel?: string;
    submitting?: boolean;
}) {
    const [uploading, setUploading] = useState(false);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [showImageInput, setShowImageInput] = useState(false);
    const [imageUrl, setImageUrl] = useState("");

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Image.configure({ inline: true, allowBase64: false }),
            Link.configure({ openOnClick: false, autolink: true }),
            Placeholder.configure({ placeholder: placeholder ?? "댓글을 입력하세요…" }),
        ],
        editorProps: {
            attributes: {
                class: "prose prose-sm max-w-none min-h-[56px] px-3 py-2.5 focus:outline-none text-stone-700 [&_p]:my-0.5 [&_img]:max-w-full [&_img]:rounded [&_a]:text-blue-600 [&_a]:underline",
            },
        },
        autofocus: autoFocus,
    });

    async function uploadImageFiles(files: File[]) {
        setUploading(true);
        try {
            for (const file of files) {
                const res = await uploadTeamPostFileAction(file);
                if (res.ok) {
                    if (res.isImage) {
                        editor?.chain().focus().setImage({ src: res.url, alt: res.name }).run();
                    } else {
                        // 이미지가 아닌 파일은 링크로 삽입
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
        if (!linkUrl.trim()) { setShowLinkInput(false); return; }
        const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
        editor?.chain().focus().setLink({ href: url }).run();
        setLinkUrl("");
        setShowLinkInput(false);
    }

    function applyImageUrl() {
        if (!imageUrl.trim()) { setShowImageInput(false); return; }
        editor?.chain().focus().setImage({ src: imageUrl }).run();
        setImageUrl("");
        setShowImageInput(false);
    }

    return (
        <div className="rounded-xl border border-stone-200 bg-white transition-colors focus-within:border-stone-400">
            {/* 툴바 */}
            <div className="flex items-center gap-0.5 border-b border-stone-100 px-2 py-1">
                <button type="button"
                    onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBold().run(); }}
                    className={`rounded px-1.5 py-0.5 text-xs font-bold transition-colors ${editor?.isActive("bold") ? "bg-stone-200 text-stone-900" : "text-stone-400 hover:bg-stone-100 hover:text-stone-700"}`}>
                    B
                </button>
                <button type="button"
                    onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleItalic().run(); }}
                    className={`rounded px-1.5 py-0.5 text-xs italic transition-colors ${editor?.isActive("italic") ? "bg-stone-200 text-stone-900" : "text-stone-400 hover:bg-stone-100 hover:text-stone-700"}`}>
                    I
                </button>
                <div className="mx-1 h-3 w-px bg-stone-200" />
                {/* 링크 버튼 */}
                <button type="button"
                    onMouseDown={(e) => { e.preventDefault(); setShowLinkInput((v) => !v); setShowImageInput(false); }}
                    title="링크 삽입"
                    className={`rounded px-1.5 py-0.5 text-xs transition-colors ${showLinkInput ? "bg-stone-200 text-stone-700" : "text-stone-400 hover:bg-stone-100 hover:text-stone-700"}`}>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                    </svg>
                </button>
                {/* 이미지 URL 버튼 */}
                <button type="button"
                    onMouseDown={(e) => { e.preventDefault(); setShowImageInput((v) => !v); setShowLinkInput(false); }}
                    title="이미지 URL 삽입"
                    className={`rounded px-1.5 py-0.5 text-xs transition-colors ${showImageInput ? "bg-stone-200 text-stone-700" : "text-stone-400 hover:bg-stone-100 hover:text-stone-700"}`}>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                </button>
                {uploading && (
                    <div className="ml-1 h-3 w-3 animate-spin rounded-full border border-stone-300 border-t-stone-600" />
                )}
                <span className="ml-auto text-[10px] text-stone-300">이미지 붙여넣기 지원</span>
            </div>

            {/* 링크 입력 인라인 */}
            {showLinkInput && (
                <div className="flex items-center gap-1.5 border-b border-stone-100 px-3 py-1.5">
                    <input
                        autoFocus
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyLink(); } if (e.key === "Escape") setShowLinkInput(false); }}
                        placeholder="https://example.com 또는 YouTube 링크"
                        className="flex-1 rounded border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-700 outline-none focus:border-stone-400"
                    />
                    <button type="button" onClick={applyLink}
                        className="rounded bg-stone-700 px-2 py-1 text-xs font-medium text-white hover:bg-stone-800">
                        삽입
                    </button>
                    <button type="button" onClick={() => setShowLinkInput(false)}
                        className="text-xs text-stone-400 hover:text-stone-600">취소</button>
                </div>
            )}

            {/* 이미지 URL 입력 인라인 */}
            {showImageInput && (
                <div className="flex items-center gap-1.5 border-b border-stone-100 px-3 py-1.5">
                    <input
                        autoFocus
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyImageUrl(); } if (e.key === "Escape") setShowImageInput(false); }}
                        placeholder="이미지 URL (https://...)"
                        className="flex-1 rounded border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-700 outline-none focus:border-stone-400"
                    />
                    <button type="button" onClick={applyImageUrl}
                        className="rounded bg-stone-700 px-2 py-1 text-xs font-medium text-white hover:bg-stone-800">
                        삽입
                    </button>
                    <button type="button" onClick={() => setShowImageInput(false)}
                        className="text-xs text-stone-400 hover:text-stone-600">취소</button>
                </div>
            )}

            {/* 에디터 본문 */}
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

            {/* 하단 액션 */}
            <div className="flex items-center justify-end gap-1.5 border-t border-stone-100 px-3 py-2">
                {onCancel && (
                    <button type="button" onClick={onCancel}
                        className="rounded-lg px-3 py-1 text-xs font-medium text-stone-400 hover:bg-stone-100 hover:text-stone-600">
                        취소
                    </button>
                )}
                <button type="button" onClick={handleSubmit}
                    disabled={submitting || uploading}
                    className="rounded-lg bg-stone-800 px-3 py-1 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-40">
                    {submitting ? "전송 중…" : submitLabel}
                </button>
            </div>
        </div>
    );
}

// 트리 빌더: flat 배열 → 부모-자식 중첩 구조
// ─────────────────────────────────────────────────────────────────────────────

type CommentWithReplies = Omit<ApiTeamPostComment, "replies"> & { replies: CommentWithReplies[] };

function buildCommentTree(flat: ApiTeamPostComment[]): CommentWithReplies[] {
    const map = new Map<string, CommentWithReplies>();
    for (const c of flat) map.set(c.id, { ...c, replies: [] });

    const roots: CommentWithReplies[] = [];
    for (const c of flat) {
        const node = map.get(c.id)!;
        if (c.parentId && map.has(c.parentId)) {
            map.get(c.parentId)!.replies.push(node);
        } else {
            roots.push(node);
        }
    }
    return roots;
}

// ─────────────────────────────────────────────────────────────────────────────
// 재귀 댓글 노드
// ─────────────────────────────────────────────────────────────────────────────

const MAX_INDENT = 3; // depth 0~2까지만 들여쓰기, 그 이후는 같은 라인으로 이어짐

function CommentNode({
    comment,
    depth,
    postId,
    myUserId,
    isLeader,
    replyingTo,
    submittingReply,
    deletingComment,
    onToggleReply,
    onReplySubmit,
    onDelete,
}: {
    comment: CommentWithReplies;
    depth: number;
    postId: string;
    myUserId: string;
    isLeader: boolean;
    replyingTo: string | null;
    submittingReply: boolean;
    deletingComment: string | null;
    onToggleReply: (id: string) => void;
    onReplySubmit: (parentId: string, html: string) => void;
    onDelete: (id: string) => void;
}) {
    const isReplying = replyingTo === comment.id;
    const avatarSize = depth === 0 ? "h-7 w-7 shrink-0" : "h-6 w-6 shrink-0";

    const childProps = { postId, myUserId, isLeader, replyingTo, submittingReply, deletingComment, onToggleReply, onReplySubmit, onDelete };

    return (
        <div>
            <div className="group flex gap-2.5">
                <AuthorAvatar author={comment.author} sizeClass={avatarSize} />
                <div className="min-w-0 flex-1">
                    {/* 메타 */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-stone-700">{displayName(comment.author)}</span>
                        <span className="text-[10px] text-stone-400">{formatDate(comment.createdAt)}</span>
                        <button
                            type="button"
                            onClick={() => onToggleReply(comment.id)}
                            className={`text-[10px] font-medium transition-colors ${isReplying ? "text-stone-700" : "text-stone-400 hover:text-stone-600"}`}
                        >
                            {isReplying ? "취소" : "답글"}
                        </button>
                        {(comment.author.id === myUserId || isLeader) && (
                            <button
                                type="button"
                                onClick={() => onDelete(comment.id)}
                                disabled={deletingComment === comment.id}
                                className="ml-auto hidden text-stone-300 hover:text-red-400 group-hover:inline-flex disabled:opacity-50"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* 본문 (HTML 렌더링) */}
                    <div
                        className="mt-0.5 text-sm leading-relaxed text-stone-600 [&_a]:text-blue-600 [&_a]:underline [&_img]:max-w-full [&_img]:rounded [&_strong]:font-semibold [&_em]:italic [&_p]:my-0"
                        dangerouslySetInnerHTML={{ __html: comment.content }}
                    />

                    {/* 인라인 답글 에디터 */}
                    {isReplying && (
                        <div className="mt-2.5">
                            <MiniEditor
                                autoFocus
                                placeholder={`@${displayName(comment.author)}에게 답글…`}
                                submitLabel="답글 등록"
                                submitting={submittingReply}
                                onSubmit={(html) => onReplySubmit(comment.id, html)}
                                onCancel={() => onToggleReply(comment.id)}
                            />
                        </div>
                    )}

                    {/* 자식 댓글 (depth < MAX_INDENT): flex-1 안에서 들여쓰기 */}
                    {depth < MAX_INDENT && comment.replies.length > 0 && (
                        <div className="mt-3 flex flex-col gap-3 border-l-2 border-stone-300 pl-3">
                            {comment.replies.map((child) => (
                                <CommentNode key={child.id} comment={child} depth={depth + 1} {...childProps} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 자식 댓글 (depth >= MAX_INDENT): flex row 밖으로 꺼내 같은 라인 유지 */}
            {depth >= MAX_INDENT && comment.replies.length > 0 && (
                <div className="mt-3 flex flex-col gap-3">
                    {comment.replies.map((child) => (
                        <CommentNode key={child.id} comment={child} depth={depth + 1} {...childProps} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 게시글 상세 패널
// ─────────────────────────────────────────────────────────────────────────────

function PostDetailPanel({
    post,
    myUserId,
    isLeader,
    onClose,
    onEdit,
    onDelete,
    onPin,
    onCommentAdd,
    onCommentDelete,
}: {
    post: ApiTeamPost;
    myUserId: string;
    isLeader: boolean;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onPin: () => void;
    onCommentAdd: (comment: ApiTeamPostComment, parentId?: string) => void;
    onCommentDelete: (commentId: string) => void;
}) {
    const [submitting, startSubmit] = useTransition();
    const [deletingComment, setDeletingComment] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [submittingReply, setSubmittingReply] = useState(false);

    const badge = CATEGORY_BADGE[post.category as PostCategory] ?? CATEGORY_BADGE.general;
    const flatComments = post.comments ?? [];
    const commentTree = buildCommentTree(flatComments);

    function handleCommentSubmit(html: string) {
        if (!stripHtml(html).trim()) return;
        startSubmit(async () => {
            onCommentAdd({
                id: "",
                postId: post.id,
                parentId: null,
                content: html,
                author: { id: myUserId, name: null, email: "", avatarUrl: null },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        });
    }

    async function handleReplySubmit(parentId: string, html: string) {
        if (!stripHtml(html).trim() || submittingReply) return;
        setSubmittingReply(true);
        onCommentAdd(
            {
                id: "",
                postId: post.id,
                parentId,
                content: html,
                author: { id: myUserId, name: null, email: "", avatarUrl: null },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            parentId,
        );
        setReplyingTo(null);
        setSubmittingReply(false);
    }

    function handleDeleteComment(commentId: string) {
        setDeletingComment(commentId);
        onCommentDelete(commentId);
        setDeletingComment(null);
    }

    function toggleReply(commentId: string) {
        setReplyingTo((prev) => (prev === commentId ? null : commentId));
    }

    return (
        <div className="flex h-full flex-col">
            {/* ── 헤더 ── */}
            <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-4">
                <div className="flex-1 pr-4">
                    <div className="mb-2 flex items-center gap-2">
                        <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${badge.cls}`}
                        >
                            {badge.label}
                        </span>
                        {post.isPinned && (
                            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-500 ring-1 ring-amber-200">
                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                                </svg>
                                고정됨
                            </span>
                        )}
                    </div>
                    <h2 className="text-base font-bold leading-snug text-stone-900">
                        {post.title}
                    </h2>
                    <div className="mt-2 flex items-center gap-2 text-xs text-stone-400">
                        <AuthorAvatar author={post.author} sizeClass="h-5 w-5" />
                        <span className="font-medium text-stone-600">
                            {displayName(post.author)}
                        </span>
                        <span>·</span>
                        <span>{formatDate(post.createdAt)}</span>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    {isLeader && (
                        <button
                            type="button"
                            onClick={onPin}
                            title={post.isPinned ? "고정 해제" : "공지 고정"}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                                post.isPinned
                                    ? "text-amber-500 hover:bg-amber-50"
                                    : "text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                            }`}
                        >
                            <svg
                                className="h-4 w-4"
                                fill={post.isPinned ? "currentColor" : "none"}
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={post.isPinned ? 0 : 1.8}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"
                                />
                            </svg>
                        </button>
                    )}
                    {post.author.id === myUserId && (
                        <button
                            type="button"
                            onClick={onEdit}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                            title="수정"
                        >
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.8}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
                                />
                            </svg>
                        </button>
                    )}
                    {(post.author.id === myUserId || isLeader) && (
                        <button
                            type="button"
                            onClick={onDelete}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-500"
                            title="삭제"
                        >
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.8}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                                />
                            </svg>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600"
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
            </div>

            {/* ── 전체 스크롤 영역 (본문 + 첨부파일 + 댓글) ── */}
            <div className="flex-1 overflow-y-auto">
                {/* 본문 */}
                <div className="bg-white px-6 py-5">
                    <div
                        className="prose prose-sm max-w-none text-stone-700 [&_blockquote]:border-l-2 [&_blockquote]:border-stone-300 [&_blockquote]:pl-3 [&_blockquote]:text-stone-500 [&_code]:rounded [&_code]:bg-stone-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.82em] [&_h2]:text-base [&_h2]:font-bold [&_img]:max-w-full [&_img]:rounded-lg [&_ol]:pl-5 [&_p]:my-1 [&_ul]:pl-5"
                        dangerouslySetInnerHTML={{ __html: post.content }}
                    />
                </div>

                {/* 첨부파일 */}
                {(post.attachments ?? []).length > 0 && (
                    <div className="border-t border-stone-100 bg-stone-50/40 px-6 py-3">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                            첨부파일
                        </p>
                        <div className="flex flex-col gap-1.5">
                            {(post.attachments ?? []).map((att) => (
                                <a
                                    key={att.id}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={att.name}
                                    className="group flex items-center gap-2.5 rounded-lg border border-stone-100 bg-white px-3 py-2 transition-colors hover:border-stone-300 hover:bg-stone-50"
                                >
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-stone-100 text-stone-400 group-hover:bg-stone-200">
                                        {att.mimeType.startsWith("image/") ? (
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
                                        <p className="truncate text-xs font-medium text-stone-700 group-hover:text-stone-900">
                                            {att.name}
                                        </p>
                                        <p className="text-[10px] text-stone-400">
                                            {formatBytes(att.size)}
                                        </p>
                                    </div>
                                    <svg
                                        className="h-3.5 w-3.5 shrink-0 text-stone-300 group-hover:text-stone-500"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                                        />
                                    </svg>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* 댓글 영역 */}
                <div className="border-t border-stone-100 bg-stone-50/60">
                    {/* 댓글 헤더 */}
                    <div className="flex items-center gap-2 px-6 pt-4 pb-2">
                        <svg
                            className="h-3.5 w-3.5 text-stone-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.8}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                            />
                        </svg>
                        <span className="text-xs font-semibold text-stone-500">
                            댓글 <span className="text-stone-700">{flatComments.length}</span>
                        </span>
                    </div>

                    {/* 새 댓글 입력 (MiniEditor) */}
                    <div className="px-6 pb-3">
                        <MiniEditor
                            placeholder="댓글을 입력하세요… (Ctrl+Enter로 전송, 이미지 붙여넣기 지원)"
                            submitLabel="댓글 등록"
                            submitting={submitting}
                            onSubmit={handleCommentSubmit}
                        />
                    </div>

                    {/* 댓글 목록 (재귀 트리) */}
                    <div className="px-6 pb-6">
                        {commentTree.length === 0 ? (
                            <p className="py-4 text-center text-xs text-stone-400">
                                아직 댓글이 없어요. 첫 댓글을 남겨보세요!
                            </p>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {commentTree.map((c) => (
                                    <CommentNode
                                        key={c.id}
                                        comment={c}
                                        depth={0}
                                        postId={post.id}
                                        myUserId={myUserId}
                                        isLeader={isLeader}
                                        replyingTo={replyingTo}
                                        submittingReply={submittingReply}
                                        deletingComment={deletingComment}
                                        onToggleReply={toggleReply}
                                        onReplySubmit={handleReplySubmit}
                                        onDelete={handleDeleteComment}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 커뮤니티 탭
// ─────────────────────────────────────────────────────────────────────────────

export function TeamCommunityTab({
    teamId,
    myUserId,
    isLeader,
}: {
    teamId: string;
    myUserId: string;
    isLeader: boolean;
}) {
    const [posts, setPosts] = useState<ApiTeamPost[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<PostCategory | "all">("all");

    // 선택된 게시글 (상세 패널)
    const [selectedPost, setSelectedPost] = useState<ApiTeamPost | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // 게시글 작성/수정 인라인 패널
    const [composeOpen, setComposeOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<ApiTeamPost | null>(null);

    // 삭제 확인
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // 페이지네이션 (일반 게시글)
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(1);

    // ── 목록 로드 ──────────────────────────────────────────────────────────────
    const loadPosts = useCallback(
        async (category: PostCategory | "all") => {
            setLoading(true);
            const res = await listTeamPostsAction(teamId, {
                category: category === "all" ? undefined : category,
                take: 100,
            });
            if (res.ok) {
                setPosts(res.posts);
                setTotal(res.total);
            }
            setLoading(false);
        },
        [teamId],
    );

    useEffect(() => {
        void loadPosts(activeCategory);
        setPage(1);
    }, [loadPosts, activeCategory]);

    // ── 게시글 클릭 → 상세 로드 ────────────────────────────────────────────────
    async function handleSelectPost(post: ApiTeamPost) {
        setSelectedPost({ ...post, comments: [] });
        setDetailLoading(true);
        const res = await getTeamPostAction(teamId, post.id);
        if (res.ok) setSelectedPost(res.post);
        setDetailLoading(false);
    }

    // ── 게시글 저장 (작성 or 수정) ────────────────────────────────────────────
    async function handleSavePost(data: {
        title: string;
        content: string;
        category: PostCategory;
        attachments: { url: string; name: string; mimeType: string; size: number }[];
    }) {
        if (editTarget) {
            const res = await updateTeamPostAction(teamId, editTarget.id, data);
            if (res.ok) {
                setPosts((prev) =>
                    prev.map((p) => (p.id === res.post.id ? { ...res.post, _count: p._count } : p)),
                );
                if (selectedPost?.id === editTarget.id) {
                    setSelectedPost((prev) => (prev ? { ...prev, ...res.post } : prev));
                }
            }
        } else {
            const res = await createTeamPostAction(teamId, data);
            if (res.ok) {
                const newPost = { ...res.post, _count: { comments: 0 } };
                setPosts((prev) => [newPost, ...prev]);
                setTotal((n) => n + 1);
                setSelectedPost({ ...newPost, comments: [] });
            }
        }
        setComposeOpen(false);
        setEditTarget(null);
    }

    // ── 게시글 삭제 ────────────────────────────────────────────────────────────
    async function handleDeletePost(postId: string) {
        if (deleting) return;
        setDeleting(true);
        try {
            const res = await deleteTeamPostAction(teamId, postId);
            if (res.ok) {
                setPosts((prev) => prev.filter((p) => p.id !== postId));
                setTotal((n) => Math.max(0, n - 1));
                if (selectedPost?.id === postId) setSelectedPost(null);
                setDeleteConfirmId(null);
            }
        } finally {
            setDeleting(false);
        }
    }

    // ── 고정 토글 ──────────────────────────────────────────────────────────────
    async function handlePin(postId: string) {
        const res = await toggleTeamPostPinAction(teamId, postId);
        if (res.ok) {
            setPosts((prev) =>
                prev.map((p) => (p.id === res.post.id ? { ...res.post, _count: p._count } : p)),
            );
            if (selectedPost?.id === postId)
                setSelectedPost((prev) => (prev ? { ...prev, isPinned: res.post.isPinned } : prev));
        }
    }

    // ── 댓글/답글 추가 ────────────────────────────────────────────────────────
    // ── 댓글/답글 추가 (flat 상태에 append) ──────────────────────────────────
    async function handleCommentAdd(optimistic: ApiTeamPostComment, parentId?: string) {
        const res = await createTeamPostCommentAction(
            teamId,
            optimistic.postId,
            optimistic.content,
            parentId,
        );
        if (res.ok) {
            const newComment = res.comment;
            const isTopLevel = !parentId;
            setSelectedPost((prev) =>
                prev
                    ? {
                          ...prev,
                          comments: [...(prev.comments ?? []), newComment],
                          _count: isTopLevel
                              ? { comments: (prev._count?.comments ?? 0) + 1 }
                              : prev._count,
                      }
                    : prev,
            );
            if (isTopLevel) {
                setPosts((prev) =>
                    prev.map((p) =>
                        p.id === optimistic.postId
                            ? { ...p, _count: { comments: (p._count?.comments ?? 0) + 1 } }
                            : p,
                    ),
                );
            }
        }
    }

    // ── 댓글/답글 삭제 (flat 상태에서 제거 + cascade 자식도 제거) ────────────
    async function handleCommentDelete(commentId: string) {
        if (!selectedPost) return;
        const res = await deleteTeamPostCommentAction(teamId, selectedPost.id, commentId);
        if (res.ok) {
            const flat = selectedPost.comments ?? [];
            const deletedComment = flat.find((c) => c.id === commentId);
            const isTopLevel = !deletedComment?.parentId;

            // 삭제된 댓글 및 모든 하위 댓글 ID 수집 (cascade)
            function collectDescendants(id: string): string[] {
                const children = flat.filter((c) => c.parentId === id);
                return [id, ...children.flatMap((c) => collectDescendants(c.id))];
            }
            const toRemove = new Set(collectDescendants(commentId));

            setSelectedPost((prev) =>
                prev
                    ? {
                          ...prev,
                          comments: (prev.comments ?? []).filter((c) => !toRemove.has(c.id)),
                          _count: isTopLevel
                              ? { comments: Math.max(0, (prev._count?.comments ?? 0) - 1) }
                              : prev._count,
                      }
                    : prev,
            );
            if (isTopLevel) {
                setPosts((prev) =>
                    prev.map((p) =>
                        p.id === selectedPost.id
                            ? {
                                  ...p,
                                  _count: { comments: Math.max(0, (p._count?.comments ?? 0) - 1) },
                              }
                            : p,
                    ),
                );
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    const pinnedPosts = posts.filter((p) => p.isPinned);
    const regularPosts = posts.filter((p) => !p.isPinned);
    const totalPages = Math.max(1, Math.ceil(regularPosts.length / PAGE_SIZE));
    const pagedRegularPosts = regularPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // 모바일에서 상세/작성 패널을 슬라이드 인/아웃 제어
    const showDetail = composeOpen || !!selectedPost;

    return (
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
            {/* ── 왼쪽: 게시글 목록 ────────────────────────────────────────────────
                모바일: absolute full-screen, showDetail 시 왼쪽으로 슬라이드 아웃
                데스크톱(md+): relative 고정 너비 패널로 복귀
            ── */}
            <div
                className={[
                    "flex min-h-0 flex-col overflow-hidden border-r border-stone-200 bg-white",
                    "absolute inset-0 z-10 transition-transform duration-300 ease-in-out",
                    "md:relative md:w-72 md:shrink-0 md:translate-x-0 lg:w-80 xl:w-96",
                    showDetail ? "-translate-x-full" : "translate-x-0",
                ].join(" ")}
            >
                {/* 툴바 */}
                <div className="flex shrink-0 items-center justify-between border-b border-stone-100 px-4 py-3">
                    <div className="flex items-center gap-1 overflow-x-auto">
                        {CATEGORIES.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => setActiveCategory(c.id)}
                                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                                    activeCategory === c.id
                                        ? "bg-stone-800 text-white"
                                        : "text-stone-500 hover:bg-stone-100 hover:text-stone-700"
                                }`}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setEditTarget(null);
                            setComposeOpen(true);
                            setSelectedPost(null);
                        }}
                        className="ml-2 flex shrink-0 items-center gap-1 rounded-lg bg-stone-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-stone-700"
                    >
                        <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 4.5v15m7.5-7.5h-15"
                            />
                        </svg>
                        글쓰기
                    </button>
                </div>

                {/* 게시글 목록 */}
                <div className="min-h-0 flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-stone-500" />
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-300">
                                <svg
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.4}
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                                    />
                                </svg>
                            </div>
                            <p className="text-sm font-medium text-stone-500">게시글이 없어요</p>
                            <p className="mt-0.5 text-xs text-stone-400">
                                첫 번째 게시글을 작성해보세요!
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {/* ── 고정 게시글 섹션 ── */}
                            {pinnedPosts.length > 0 && (
                                <>
                                    <div className="flex items-center gap-1.5 border-b border-amber-100 bg-amber-50/70 px-4 py-2">
                                        <svg
                                            className="h-3 w-3 text-amber-500"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                                        </svg>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                                            고정
                                        </span>
                                        <span className="ml-auto text-[10px] text-amber-400">
                                            {pinnedPosts.length}
                                        </span>
                                    </div>
                                    {pinnedPosts.map((post) => (
                                        <PostCard
                                            key={post.id}
                                            post={post}
                                            isSelected={selectedPost?.id === post.id}
                                            onClick={() => handleSelectPost(post)}
                                        />
                                    ))}
                                </>
                            )}

                            {/* ── 일반 게시글 섹션 ── */}
                            {regularPosts.length > 0 && (
                                <>
                                    <div className="flex items-center gap-1.5 border-b border-stone-100 bg-stone-50 px-4 py-2">
                                        <svg
                                            className="h-3 w-3 text-stone-400"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2}
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                                            />
                                        </svg>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                                            게시글
                                        </span>
                                        <span className="ml-auto text-[10px] text-stone-400">
                                            {regularPosts.length}
                                        </span>
                                    </div>
                                    {pagedRegularPosts.map((post) => (
                                        <PostCard
                                            key={post.id}
                                            post={post}
                                            isSelected={selectedPost?.id === post.id}
                                            onClick={() => handleSelectPost(post)}
                                        />
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                    <div className="shrink-0 flex items-center justify-between border-t border-stone-100 px-3 py-2">
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30"
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
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPage(p)}
                                    className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                                        p === page
                                            ? "bg-stone-800 text-white"
                                            : "text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30"
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
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* ── 오른쪽: 작성 패널 / 게시글 상세 / 빈 상태 ─────────────────────────
                모바일: absolute full-screen, showDetail 시 오른쪽에서 슬라이드 인
                데스크톱(md+): relative flex-1 패널로 복귀
            ── */}
            <div
                className={[
                    "flex min-h-0 flex-col overflow-hidden bg-[#f8f7f5]",
                    "absolute inset-0 z-20 transition-transform duration-300 ease-in-out",
                    "md:relative md:flex-1 md:translate-x-0",
                    showDetail ? "translate-x-0" : "translate-x-full",
                ].join(" ")}
            >
                {/* ── 모바일 전용 뒤로 가기 바 ─────────────────────────────────────── */}
                <div className="flex shrink-0 items-center gap-2 border-b border-stone-100 bg-white px-4 py-3 md:hidden">
                    <button
                        type="button"
                        onClick={() => {
                            if (composeOpen) {
                                setComposeOpen(false);
                                setEditTarget(null);
                            } else {
                                setSelectedPost(null);
                            }
                        }}
                        className="flex shrink-0 items-center gap-0.5 rounded-lg py-1 pr-2 text-sm font-medium text-stone-500 active:bg-stone-100"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.2}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                        목록
                    </button>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-800">
                        {composeOpen
                            ? editTarget
                                ? "게시글 수정"
                                : "새 게시글"
                            : (selectedPost?.title ?? "")}
                    </span>
                </div>

                {composeOpen ? (
                    <PostComposePanel
                        key={editTarget?.id ?? "new"}
                        initial={editTarget}
                        onClose={() => {
                            setComposeOpen(false);
                            setEditTarget(null);
                        }}
                        onSave={handleSavePost}
                    />
                ) : !selectedPost ? (
                    /* 빈 상태 */
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
                            <svg
                                className="h-8 w-8 text-stone-300"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.3}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                                />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-stone-500">
                                게시글을 선택하세요
                            </p>
                            <p className="mt-1 text-xs text-stone-400">
                                왼쪽 목록에서 글을 클릭하면 내용이 여기에 표시됩니다
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setEditTarget(null);
                                setComposeOpen(true);
                            }}
                            className="flex items-center gap-1.5 rounded-xl bg-stone-800 px-4 py-2 text-xs font-medium text-white hover:bg-stone-950"
                        >
                            <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2.5}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 4.5v15m7.5-7.5h-15"
                                />
                            </svg>
                            새 게시글 작성
                        </button>
                    </div>
                ) : detailLoading ? (
                    <div className="flex flex-1 items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-stone-500" />
                    </div>
                ) : (
                    <PostDetailPanel
                        post={selectedPost}
                        myUserId={myUserId}
                        isLeader={isLeader}
                        onClose={() => setSelectedPost(null)}
                        onEdit={() => {
                            setEditTarget(selectedPost);
                            setComposeOpen(true);
                        }}
                        onDelete={() => setDeleteConfirmId(selectedPost.id)}
                        onPin={() => handlePin(selectedPost.id)}
                        onCommentAdd={handleCommentAdd}
                        onCommentDelete={handleCommentDelete}
                    />
                )}
            </div>

            {/* ── 삭제 확인 모달 ─────────────────────────────────────────────────── */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                        onClick={() => setDeleteConfirmId(null)}
                    />
                    <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                        <h3 className="text-base font-semibold text-stone-800">
                            게시글을 삭제할까요?
                        </h3>
                        <p className="mt-1.5 text-sm text-stone-500">
                            삭제하면 댓글을 포함해 복구할 수 없습니다.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeletePost(deleteConfirmId)}
                                disabled={deleting}
                                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                            >
                                {deleting ? "삭제 중…" : "삭제"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PostCard
// ─────────────────────────────────────────────────────────────────────────────

function PostCard({
    post,
    isSelected,
    onClick,
}: {
    post: ApiTeamPost;
    isSelected: boolean;
    onClick: () => void;
}) {
    const badge = CATEGORY_BADGE[post.category as PostCategory] ?? CATEGORY_BADGE.general;
    const card = CATEGORY_CARD[post.category as PostCategory] ?? CATEGORY_CARD.general;

    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                w-full border-l-[3px] px-4 py-3.5 text-left transition-all
                ${card.border}
                ${isSelected ? card.selectedBg + " shadow-sm" : `bg-white ${card.hoverBg}`}
            `}
        >
            {/* 고정 배너 */}
            {post.isPinned && (
                <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-500">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                    </svg>
                    고정됨
                </div>
            )}

            {/* 카테고리 + 작성자 */}
            <div className="mb-1.5 flex items-center gap-1.5">
                <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${badge.cls}`}
                >
                    {badge.label}
                </span>
                <span className="truncate text-[10px] text-stone-400">
                    {displayName(post.author)}
                </span>
                <span className="ml-auto shrink-0 text-[10px] text-stone-400">
                    {formatDate(post.createdAt)}
                </span>
            </div>

            {/* 제목 */}
            <p
                className={`line-clamp-1 text-sm font-semibold leading-snug ${isSelected ? "text-stone-900" : "text-stone-800"}`}
            >
                {post.title}
            </p>

            {/* 본문 미리보기 */}
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-stone-500">
                {stripHtml(post.content)}
            </p>

            {/* 댓글 수 */}
            {(post._count?.comments ?? 0) > 0 && (
                <div className="mt-2 flex items-center gap-1 text-stone-400">
                    <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.8}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                        />
                    </svg>
                    <span className="text-[10px]">{post._count?.comments}개 댓글</span>
                </div>
            )}
        </button>
    );
}
