"use client";

import { useState, useRef, useEffect } from "react";

import type { ProjectUser } from "../types/project-ui";
import type { CreateProjectTaskRequestFn } from "../types/project-task-request-action";

export function TaskRequestModal({
    projectId,
    currentUserId,
    participants,
    prefillTitle = "",
    onClose,
    createTaskRequest,
}: {
    projectId: string;
    currentUserId: string;
    participants: ProjectUser[];
    prefillTitle?: string;
    onClose: () => void;
    createTaskRequest: CreateProjectTaskRequestFn;
}) {
    const [toUserId, setToUserId] = useState<string>(participants[0]?.id ?? "");
    const [title, setTitle] = useState(prefillTitle);
    const [content, setContent] = useState("");
    const [isUrgent, setIsUrgent] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const titleRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        titleRef.current?.focus();
    }, []);

    useEffect(() => {
        function handler(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    if (participants.length === 0) {
        return (
            <>
                <div className="fixed inset-0 z-50 bg-stone-900/50" aria-hidden onClick={onClose} />
                <div
                    className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface p-6 shadow-xl"
                    role="dialog"
                    aria-modal
                >
                    <p className="text-center text-sm text-stone-600 dark:text-elivis-ink-secondary">
                        요청할 수 있는 팀원이 없습니다.
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-4 w-full rounded-lg bg-stone-100 dark:bg-elivis-surface-elevated py-2 text-sm font-medium text-stone-700 dark:text-elivis-ink hover:bg-stone-200"
                    >
                        닫기
                    </button>
                </div>
            </>
        );
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!toUserId || !title.trim()) {
            setError("대상자와 제목을 입력해주세요.");
            return;
        }
        if (toUserId === currentUserId) {
            setError("자신에게는 업무를 요청할 수 없습니다.");
            return;
        }

        setSubmitting(true);
        setError(null);

        const result = await createTaskRequest(projectId, {
            toUserId,
            title: title.trim(),
            content: content.trim() || undefined,
            isUrgent,
        });

        setSubmitting(false);

        if (!result.ok) {
            setError(result.message);
            return;
        }

        setSuccess(true);
        setTimeout(() => onClose(), 1200);
    }

    return (
        <>
            <div className="fixed inset-0 z-50 bg-stone-900/50" aria-hidden onClick={onClose} />

            <div
                className="fixed left-1/2 top-1/2 z-50 flex w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface shadow-xl"
                role="dialog"
                aria-modal
                aria-labelledby="request-modal-title"
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-elivis-line px-5 py-4">
                    <div>
                        <h2 id="request-modal-title" className="text-base font-semibold text-stone-800 dark:text-elivis-ink">
                            업무 요청
                        </h2>
                        <p className="mt-0.5 text-xs text-stone-400 dark:text-elivis-ink-secondary">팀원에게 업무를 요청합니다</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 dark:text-elivis-ink-secondary hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated hover:text-stone-600"
                        aria-label="닫기"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {success ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 dark:bg-elivis-surface-elevated">
                            <svg className="h-6 w-6 text-stone-700 dark:text-elivis-ink" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </span>
                        <p className="text-sm font-semibold text-stone-700 dark:text-elivis-ink">요청이 전송되었습니다!</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto p-5">
                        {/* 대상자 */}
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-elivis-ink-secondary">
                                대상자 <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={toUserId}
                                onChange={(e) => setToUserId(e.target.value)}
                                className="w-full rounded-lg border border-stone-200 dark:border-elivis-line px-3 py-2 text-sm text-stone-800 dark:text-elivis-ink outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
                                required
                            >
                                {participants.map((p) => {
                                    const name = p.name?.trim() || p.userId;
                                    return (
                                        <option key={p.id} value={p.id}>
                                            {name}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* 제목 */}
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-elivis-ink-secondary">
                                제목 <span className="text-red-500">*</span>
                            </label>
                            <input
                                ref={titleRef}
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="업무 제목을 입력하세요"
                                className="w-full rounded-lg border border-stone-200 dark:border-elivis-line px-3 py-2 text-sm text-stone-800 dark:text-elivis-ink outline-none placeholder:text-stone-300 focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
                                required
                            />
                        </div>

                        {/* 내용 */}
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-elivis-ink-secondary">
                                내용
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="요청 내용을 작성하세요"
                                rows={4}
                                className="w-full resize-none rounded-lg border border-stone-200 dark:border-elivis-line px-3 py-2 text-sm text-stone-800 dark:text-elivis-ink outline-none placeholder:text-stone-300 focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
                            />
                        </div>

                        {/* 긴급 요청 체크박스 */}
                        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-stone-200 dark:border-elivis-line px-3 py-2.5 transition-colors hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated">
                            <input
                                type="checkbox"
                                checked={isUrgent}
                                onChange={(e) => setIsUrgent(e.target.checked)}
                                className="h-4 w-4 rounded border-stone-300 dark:border-elivis-line accent-red-500"
                            />
                            <span className="text-sm font-medium text-stone-700 dark:text-elivis-ink">
                                긴급 요청입니다
                            </span>
                            {isUrgent && (
                                <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
                                    긴급
                                </span>
                            )}
                        </label>

                        {error && (
                            <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                                {error}
                            </p>
                        )}

                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 rounded-lg border border-stone-200 dark:border-elivis-line py-2 text-sm font-medium text-stone-700 dark:text-elivis-ink hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated"
                                disabled={submitting}
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 rounded-lg bg-stone-800 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
                            >
                                {submitting ? "전송 중…" : "요청 전송"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </>
    );
}
