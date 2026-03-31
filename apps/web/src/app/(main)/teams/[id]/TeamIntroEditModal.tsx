"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateTeamFieldsAction } from "@/app/actions/teams";
import { MarkdownContent } from "@/components/MarkdownContent";
import { TeamIntroRichEditor } from "./TeamIntroRichEditor";

type EditorMode = "markdown" | "rich";

type TeamIntroEditModalProps = {
    open: boolean;
    onClose: () => void;
    teamId: string;
    initialIntroMessage: string | null;
};

export function TeamIntroEditModal({
    open,
    onClose,
    teamId,
    initialIntroMessage,
}: TeamIntroEditModalProps) {
    const router = useRouter();
    const [draft, setDraft] = useState("");
    const [editorMode, setEditorMode] = useState<EditorMode>("markdown");
    const [richKey, setRichKey] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (open) {
            setDraft(initialIntroMessage ?? "");
            setEditorMode("markdown");
            setRichKey(0);
            setError(null);
        }
    }, [open, initialIntroMessage]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    function handleSave() {
        setError(null);
        const introMessage = draft.trim() === "" ? null : draft;
        startTransition(async () => {
            const r = await updateTeamFieldsAction(teamId, { introMessage });
            if (r.ok) {
                router.refresh();
                onClose();
            } else {
                setError(r.message ?? "저장에 실패했습니다.");
            }
        });
    }

    function goRich() {
        setRichKey((k) => k + 1);
        setEditorMode("rich");
    }

    function goMarkdown() {
        setEditorMode("markdown");
    }

    return (
        <>
            <div
                className="fixed inset-0 z-[60] bg-stone-900/40"
                aria-hidden
                onClick={onClose}
            />
            <div
                className="fixed left-1/2 top-1/2 z-[61] flex max-h-[min(90vh,720px)] w-[calc(100%-1.5rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl sm:w-full"
                role="dialog"
                aria-modal
                aria-labelledby="team-intro-edit-title"
            >
                <div className="border-b border-stone-100 px-4 py-3 sm:px-5">
                    <h3 id="team-intro-edit-title" className="text-base font-semibold text-stone-800">
                        팀 소개 메시지 편집
                    </h3>
                    <p className="mt-1 text-xs text-stone-500">
                        소개 탭에 표시되는 본문입니다. Markdown 또는 게시판형 에디터로 작성할 수
                        있으며, 저장 시 마크다운으로 통일됩니다. 팀장만 저장할 수 있어요.
                    </p>
                    <div
                        className="mt-3 inline-flex rounded-lg border border-stone-200 bg-stone-100/90 p-0.5"
                        role="group"
                        aria-label="편집기 종류"
                    >
                        <button
                            type="button"
                            onClick={goMarkdown}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                editorMode === "markdown"
                                    ? "bg-white text-stone-900 shadow-sm"
                                    : "text-stone-600 hover:text-stone-900"
                            }`}
                        >
                            Markdown
                        </button>
                        <button
                            type="button"
                            onClick={goRich}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                editorMode === "rich"
                                    ? "bg-white text-stone-900 shadow-sm"
                                    : "text-stone-600 hover:text-stone-900"
                            }`}
                        >
                            게시판
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                    <div className="grid h-[min(60vh,480px)] grid-cols-1 divide-y divide-stone-100 md:grid-cols-2 md:divide-x md:divide-y-0">
                        <div className="flex min-h-0 flex-col p-3 sm:p-4">
                            <label
                                htmlFor="team-intro-markdown"
                                className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400"
                            >
                                {editorMode === "markdown" ? "Markdown" : "게시판 에디터"}
                            </label>
                            {editorMode === "markdown" ? (
                                <textarea
                                    id="team-intro-markdown"
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    disabled={isPending}
                                    spellCheck={false}
                                    className="min-h-0 flex-1 resize-none rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2 font-mono text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 disabled:opacity-60"
                                    placeholder={"# 우리 팀\n\n- 목표\n- 문화"}
                                />
                            ) : (
                                <div className="min-h-0 flex-1">
                                    <TeamIntroRichEditor
                                        key={richKey}
                                        initialMarkdown={draft}
                                        onChangeMarkdown={setDraft}
                                        disabled={isPending}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex min-h-0 flex-col overflow-hidden p-3 sm:p-4">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400">
                                미리보기
                            </p>
                            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-stone-100 bg-white px-3 py-2 text-sm">
                                {draft.trim() ? (
                                    <MarkdownContent markdown={draft} />
                                ) : (
                                    <p className="text-sm text-stone-400">내용을 입력하면 미리보기가 표시됩니다.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {error ? (
                    <p className="border-t border-stone-100 bg-amber-50 px-4 py-2 text-xs text-amber-900 sm:px-5">
                        {error}
                    </p>
                ) : null}

                <div className="flex justify-end gap-2 border-t border-stone-100 px-4 py-3 sm:px-5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isPending}
                        className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50"
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isPending}
                        className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-50"
                    >
                        {isPending ? "저장 중…" : "저장"}
                    </button>
                </div>
            </div>
        </>
    );
}
