"use client";

import {
    useEffect,
    useId,
    useRef,
    useState,
    type KeyboardEvent,
} from "react";

export type ElivisFilterSelectOption<T extends string = string> = { value: T; label: string };

export type ElivisFilterSelectProps<T extends string = string> = {
    value: T;
    options: ElivisFilterSelectOption<T>[];
    onChange: (v: T) => void;
    /** 비선택(첫 옵션)일 때 트리거에 보이는 요약 라벨 */
    label: string;
    searchPlaceholder: string;
    noResultsText: string;
    /** 이 값이면 `label`만 트리거에 표시 (기본: `options[0]?.value`) */
    neutralValue?: T;
    className?: string;
};

export function ElivisFilterSelect<T extends string>({
    value,
    options,
    onChange,
    label,
    searchPlaceholder,
    noResultsText,
    neutralValue: neutralValueProp,
    className = "",
}: ElivisFilterSelectProps<T>) {
    const listId = useId();
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [highlight, setHighlight] = useState(0);

    const neutralValue = neutralValueProp ?? options[0]?.value;
    const isActive = neutralValue !== undefined && value !== neutralValue;
    const current = options.find((o) => o.value === value);

    const q = query.trim().toLowerCase();
    const filtered = !q ? options : options.filter((o) => o.label.toLowerCase().includes(q));

    useEffect(() => {
        if (!open) return;
        setQuery("");
        const id = window.requestAnimationFrame(() => inputRef.current?.focus());
        return () => window.cancelAnimationFrame(id);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const list = !q ? options : options.filter((o) => o.label.toLowerCase().includes(q));
        const i = list.findIndex((o) => o.value === value);
        setHighlight(i >= 0 ? i : 0);
    }, [open, options, q, value]);

    useEffect(() => {
        if (!open) return;
        setHighlight((h) => Math.min(h, Math.max(0, filtered.length - 1)));
    }, [filtered.length, open]);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: PointerEvent) => {
            if (containerRef.current?.contains(e.target as Node)) return;
            setOpen(false);
        };
        document.addEventListener("pointerdown", onDoc, true);
        return () => document.removeEventListener("pointerdown", onDoc, true);
    }, [open]);

    function pick(v: T) {
        onChange(v);
        setOpen(false);
    }

    function onListKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, Math.max(0, filtered.length - 1)));
            return;
        }
        if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
            return;
        }
        if (e.key === "Enter") {
            e.preventDefault();
            const row = filtered[highlight];
            if (row) pick(row.value);
        }
    }

    const triggerText = isActive ? (current?.label ?? label) : label;

    const triggerClass = `flex w-full min-w-0 max-w-full items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
        isActive
            ? "border-stone-800 bg-stone-800 text-white dark:border-elivis-accent dark:bg-elivis-accent dark:text-white"
            : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50 dark:border-elivis-line dark:bg-elivis-surface dark:text-elivis-ink-secondary dark:hover:border-elivis-line dark:hover:bg-elivis-surface-elevated"
    }`;

    return (
        <div ref={containerRef} className={`relative ${className}`.trim()}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                className={triggerClass}
                onKeyDown={(e) => {
                    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpen(true);
                    }
                }}
            >
                <span className="min-w-0 flex-1 truncate text-left">{triggerText}</span>
                <svg
                    className={`h-3 w-3 shrink-0 ${isActive ? "opacity-80" : "opacity-60"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div
                    className="absolute left-0 top-full z-[100] mt-1 flex max-h-72 min-w-full w-[max(100%,12rem)] max-w-[min(28rem,calc(100vw-1.25rem))] flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl dark:border-elivis-line dark:bg-elivis-surface-elevated dark:shadow-none"
                    role="presentation"
                >
                    <div className="shrink-0 border-b border-stone-100 p-2 dark:border-elivis-line dark:bg-elivis-surface">
                        <input
                            ref={inputRef}
                            type="search"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setHighlight(0);
                            }}
                            onKeyDown={onListKeyDown}
                            placeholder={searchPlaceholder}
                            className="w-full rounded-md border border-stone-200 bg-stone-50 px-2 py-1.5 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-stone-400 dark:border-elivis-line dark:bg-elivis-surface dark:text-elivis-ink dark:placeholder:text-elivis-ink-muted dark:focus:border-elivis-ink-muted"
                            autoComplete="off"
                            aria-autocomplete="list"
                            aria-controls={listId}
                        />
                    </div>
                    <ul
                        id={listId}
                        role="listbox"
                        tabIndex={-1}
                        className="max-h-52 overflow-y-auto py-1"
                        onKeyDown={onListKeyDown}
                    >
                        {filtered.length === 0 ? (
                            <li className="px-3 py-2 text-xs text-stone-400 dark:text-elivis-ink-secondary">
                                {noResultsText}
                            </li>
                        ) : (
                            filtered.map((opt, i) => (
                                <li key={String(opt.value)} role="presentation">
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={value === opt.value}
                                        onMouseEnter={() => setHighlight(i)}
                                        onClick={() => pick(opt.value)}
                                        className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition-colors ${
                                            i === highlight
                                                ? "bg-stone-100 text-stone-900 dark:bg-elivis-surface dark:text-elivis-ink"
                                                : "text-stone-600 hover:bg-stone-50 dark:text-elivis-ink-secondary dark:hover:bg-elivis-surface"
                                        } ${value === opt.value ? "font-semibold" : ""}`}
                                    >
                                        <span className="min-w-0 truncate">{opt.label}</span>
                                        {value === opt.value && (
                                            <svg
                                                className="ml-1 h-3 w-3 shrink-0 text-stone-800 dark:text-elivis-ink"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                aria-hidden
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2.5}
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
                                        )}
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
