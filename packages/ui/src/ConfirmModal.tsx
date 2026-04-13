"use client";

import { useEffect, useId } from "react";

export type ConfirmModalProps = {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel: string;
    /** 삭제 등 파괴적 동작 시 확인 버튼을 강조 */
    variant?: "danger" | "default";
    pending?: boolean;
    onClose: () => void;
    onConfirm: () => void;
};

/**
 * 확인 / 취소가 있는 범용 다이얼로그. `window.confirm` 대신 사용합니다.
 */
export function ConfirmModal({
    open,
    title,
    description,
    confirmLabel,
    cancelLabel,
    variant = "default",
    pending = false,
    onClose,
    onConfirm,
}: ConfirmModalProps) {
    const titleId = useId();

    useEffect(() => {
        if (!open) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape" && !pending) onClose();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, pending, onClose]);

    if (!open) return null;

    const confirmClass =
        variant === "danger"
            ? "rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            : "rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50";

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-stone-900/40"
                aria-hidden
                onClick={() => !pending && onClose()}
            />
            <div
                role="dialog"
                aria-modal
                aria-labelledby={titleId}
                className="relative z-10 w-full max-w-md rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface p-6 shadow-xl"
            >
                <h3 id={titleId} className="text-base font-semibold text-stone-800 dark:text-elivis-ink">
                    {title}
                </h3>
                <p className="mt-2 text-sm text-stone-600 dark:text-elivis-ink-secondary">{description}</p>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={pending}
                        className="rounded-lg border border-stone-200 dark:border-elivis-line px-4 py-2 text-sm font-medium text-stone-700 dark:text-elivis-ink hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={pending}
                        className={confirmClass}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
