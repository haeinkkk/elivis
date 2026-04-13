"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { TAG_COLORS, COLOR_KEYS } from "../utils/tag-colors";
import type { ApiWorkspaceStatusSemantic } from "../types/workspace-api";

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

export interface StatusModalValue {
    name: string;
    color: string;
    notifyOnChange: boolean;
    semantic: ApiWorkspaceStatusSemantic;
}

const SEMANTIC_VALUES: ApiWorkspaceStatusSemantic[] = [
    "WAITING",
    "REVIEW",
    "IN_PROGRESS",
    "ON_HOLD",
    "DONE",
];

interface StatusModalProps {
    /** "create" | "edit" */
    mode: "create" | "edit";
    initialValue?: Partial<StatusModalValue>;
    onSave: (value: StatusModalValue) => Promise<void>;
    onClose: () => void;
    isPending?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

export function StatusModal({ mode, initialValue, onSave, onClose }: StatusModalProps) {
    const t = useTranslations("workspace");
    const [name, setName] = useState(initialValue?.name ?? "");
    const [color, setColor] = useState(initialValue?.color ?? "gray");
    const [notifyOnChange, setNotifyOnChange] = useState(initialValue?.notifyOnChange ?? false);
    const [semantic, setSemantic] = useState<ApiWorkspaceStatusSemantic | null>(
        initialValue?.semantic ?? null,
    );
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();
    const [mounted, setMounted] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const semanticLabels = {
        WAITING: t("statusModal.semantic.WAITING"),
        REVIEW: t("statusModal.semantic.REVIEW"),
        IN_PROGRESS: t("statusModal.semantic.IN_PROGRESS"),
        ON_HOLD: t("statusModal.semantic.ON_HOLD"),
        DONE: t("statusModal.semantic.DONE"),
    };

    useEffect(() => {
        setMounted(true);
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    useEffect(() => {
        setName(initialValue?.name ?? "");
        setColor(initialValue?.color ?? "gray");
        setNotifyOnChange(initialValue?.notifyOnChange ?? false);
        setSemantic(initialValue?.semantic ?? null);
        setError("");
    }, [initialValue, mode]);

    // ESC 키로 닫기
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) {
            setError(t("statusModal.errNameRequired"));
            return;
        }
        if (!semantic) {
            setError(t("statusModal.errSemanticRequired"));
            return;
        }
        setError("");
        startTransition(async () => {
            await onSave({ name: trimmed, color, notifyOnChange, semantic });
        });
    }

    if (!mounted) return null;

    const dialogAria = mode === "create" ? t("statusModal.ariaCreate") : t("statusModal.ariaEdit");
    const title = mode === "create" ? t("statusModal.titleCreate") : t("statusModal.titleEdit");

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-label={dialogAria}
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-elivis-line px-5 py-4">
                    <h2 className="text-sm font-semibold text-stone-800 dark:text-elivis-ink">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-stone-400 dark:text-elivis-ink-secondary hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated hover:text-stone-600"
                        aria-label={t("statusModal.closeAria")}
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 폼 */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4">
                    {/* 이름 */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-stone-600 dark:text-elivis-ink-secondary">{t("statusModal.nameLabel")}</label>
                        <input
                            ref={inputRef}
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                setError("");
                            }}
                            placeholder={t("statusModal.namePlaceholder")}
                            className="rounded-lg border border-stone-200 dark:border-elivis-line px-3 py-2 text-sm text-stone-800 dark:text-elivis-ink outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                        />
                        {error && <p className="text-xs text-red-500">{error}</p>}
                    </div>

                    {/* 색상 */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-stone-600 dark:text-elivis-ink-secondary">{t("priority.colorLabel")}</label>
                        <div className="flex flex-wrap items-center gap-2">
                            {COLOR_KEYS.map((ck) => (
                                <button
                                    key={ck}
                                    type="button"
                                    title={t(`colors.${ck}`)}
                                    onClick={() => setColor(ck)}
                                    className={`h-6 w-6 rounded-full ${TAG_COLORS[ck].dot} ring-offset-1 transition-transform hover:scale-110 ${
                                        color === ck ? "ring-2 ring-amber-500 ring-offset-2" : ""
                                    }`}
                                />
                            ))}
                            {/* 커스텀 색상 피커 */}
                            <label
                                title={t("common.customColor")}
                                className={`relative h-6 w-6 cursor-pointer overflow-hidden rounded-full ring-offset-1 transition-transform hover:scale-110 ${
                                    !COLOR_KEYS.includes(color) ? "ring-2 ring-amber-500 ring-offset-2" : ""
                                }`}
                            >
                                <div
                                    className="h-full w-full rounded-full"
                                    style={{
                                        background: !COLOR_KEYS.includes(color)
                                            ? color
                                            : "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
                                    }}
                                />
                                <input
                                    type="color"
                                    value={COLOR_KEYS.includes(color) ? "#6366f1" : color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                />
                            </label>

                            {/* 미리보기 */}
                            <span
                                className={`ml-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    COLOR_KEYS.includes(color) ? TAG_COLORS[color].badge : ""
                                }`}
                                style={
                                    !COLOR_KEYS.includes(color)
                                        ? { backgroundColor: color + "22", color }
                                        : undefined
                                }
                            >
                                {name || t("priority.preview")}
                            </span>
                        </div>
                    </div>

                    {/* 알림 체크박스 */}
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 dark:border-elivis-line bg-stone-50 dark:bg-elivis-surface p-3 transition-colors hover:bg-amber-50/60 has-[:checked]:border-amber-300 has-[:checked]:bg-amber-50">
                        <input
                            type="checkbox"
                            checked={notifyOnChange}
                            onChange={(e) => setNotifyOnChange(e.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-amber-500"
                        />
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-700 dark:text-elivis-ink">{t("statusModal.notifyTitle")}</p>
                            <p className="mt-0.5 text-xs text-stone-400 dark:text-elivis-ink-secondary">{t("statusModal.notifyDesc")}</p>
                        </div>
                    </label>

                    {/* 상태 의미 (5택1, 체크박스 UI) */}
                    <div className="flex flex-col gap-2 rounded-xl border border-stone-200 dark:border-elivis-line bg-stone-50/80 dark:bg-elivis-surface/80 p-3">
                        <p className="text-sm font-medium text-stone-700 dark:text-elivis-ink">{t("statusModal.meaningTitle")}</p>
                        <p className="text-xs leading-relaxed text-stone-500 dark:text-elivis-ink-secondary">{t("statusModal.meaningDesc")}</p>
                        <div className="mt-1 flex flex-col gap-2">
                            {SEMANTIC_VALUES.map((value) => (
                                <label
                                    key={value}
                                    className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent px-1 py-0.5 transition-colors hover:bg-white/80 has-[:checked]:border-amber-200 has-[:checked]:bg-amber-50/50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={semantic === value}
                                        onChange={() => setSemantic(value)}
                                        className="h-4 w-4 shrink-0 cursor-pointer accent-amber-500"
                                    />
                                    <span className="text-sm text-stone-700 dark:text-elivis-ink">{semanticLabels[value]}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 버튼 */}
                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-3.5 py-2 text-sm text-stone-500 dark:text-elivis-ink-secondary hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated"
                        >
                            {t("common.cancel")}
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
                        >
                            {isPending
                                ? t("statusModal.saving")
                                : mode === "create"
                                  ? t("statusModal.add")
                                  : t("statusModal.save")}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body,
    );
}
