"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale } from "next-intl";

import type { Locale } from "@repo/i18n";

const LANG_OPTIONS: { value: Locale; label: string; flag: string }[] = [
    { value: "ko", label: "한국어", flag: "🇰🇷" },
    { value: "en", label: "English", flag: "🇺🇸" },
    { value: "ja", label: "日本語", flag: "🇯🇵" },
];

interface LanguageSelectorProps {
    /**
     * "header" → 헤더용 compact 스타일
     * "login"  → 로그인 화면용 독립 버튼 스타일
     * "full"   → 카드 상단 full-width 버튼 스타일
     */
    variant?: "header" | "login" | "full";
    /** 드롭다운이 열리는 방향 */
    align?: "left" | "right";
    /** 선택한 로케일 적용(서버 액션 등) */
    onSelectLocale: (locale: Locale) => void | Promise<void>;
}

export function LanguageSelector({
    variant = "header",
    align = "right",
    onSelectLocale,
}: LanguageSelectorProps) {
    const locale = useLocale() as Locale;
    const [open, setOpen] = useState(false);
    const [, startTransition] = useTransition();
    const ref = useRef<HTMLDivElement | null>(null);

    const current = LANG_OPTIONS.find((o) => o.value === locale) ?? LANG_OPTIONS[0];

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: PointerEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open]);

    function handleSelect(value: Locale) {
        setOpen(false);
        startTransition(() => {
            void onSelectLocale(value);
        });
    }

    if (variant === "header") {
        return (
            <div ref={ref} className="relative">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-stone-500 dark:text-elivis-ink-secondary transition-colors hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated hover:text-stone-700"
                >
                    <span className="text-base leading-none">{current.flag}</span>
                    <span>{current.label}</span>
                    <svg
                        className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m19.5 8.25-7.5 7.5-7.5-7.5"
                        />
                    </svg>
                </button>

                {open && (
                    <div
                        className={`absolute top-full z-50 mt-1 w-36 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg ${
                            align === "right" ? "right-0" : "left-0"
                        }`}
                    >
                        {LANG_OPTIONS.map(({ value, label, flag }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => handleSelect(value)}
                                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                                    value === locale
                                        ? "bg-stone-50 font-medium text-stone-900"
                                        : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                                }`}
                            >
                                <span className="text-base">{flag}</span>
                                <span className="flex-1 text-left">{label}</span>
                                {value === locale && (
                                    <svg
                                        className="h-3.5 w-3.5 text-amber-500"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        strokeWidth={2.5}
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="m4.5 12.75 6 6 9-13.5"
                                        />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (variant === "full") {
        return (
            <div ref={ref} className="relative w-full">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-sm font-medium text-stone-500 dark:text-elivis-ink-secondary transition-colors hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated hover:text-stone-700"
                >
                    <span className="flex items-center gap-2">
                        <span className="text-base leading-none">{current.flag}</span>
                        <span>{current.label}</span>
                    </span>
                    <svg
                        className={`h-4 w-4 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m19.5 8.25-7.5 7.5-7.5-7.5"
                        />
                    </svg>
                </button>

                {open && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface shadow-lg">
                        {LANG_OPTIONS.map(({ value, label, flag }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => handleSelect(value)}
                                className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                                    value === locale
                                        ? "bg-amber-50 font-semibold text-amber-800"
                                        : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                                }`}
                            >
                                <span className="text-base">{flag}</span>
                                <span className="flex-1 text-left">{label}</span>
                                {value === locale && (
                                    <svg
                                        className="h-3.5 w-3.5 text-amber-500"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        strokeWidth={2.5}
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="m4.5 12.75 6 6 9-13.5"
                                        />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex items-center gap-2 rounded-xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-3 py-2 text-sm font-medium text-stone-600 dark:text-elivis-ink-secondary shadow-sm transition-all hover:border-stone-300 hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated hover:shadow"
            >
                <span className="text-base leading-none">{current.flag}</span>
                <span>{current.label}</span>
                <svg
                    className={`h-4 w-4 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m19.5 8.25-7.5 7.5-7.5-7.5"
                    />
                </svg>
            </button>

            {open && (
                <div
                    className={`absolute top-full z-50 mt-1.5 w-40 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl ${
                        align === "right" ? "right-0" : "left-0"
                    }`}
                >
                    {LANG_OPTIONS.map(({ value, label, flag }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => handleSelect(value)}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors ${
                                value === locale
                                    ? "bg-amber-50 font-semibold text-amber-800"
                                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                            }`}
                        >
                            <span className="text-base">{flag}</span>
                            <span className="flex-1 text-left">{label}</span>
                            {value === locale && (
                                <svg
                                    className="h-4 w-4 text-amber-500"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    strokeWidth={2.5}
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="m4.5 12.75 6 6 9-13.5"
                                    />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
