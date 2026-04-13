"use client";

import {
    forwardRef,
    useEffect,
    useId,
    useRef,
    useState,
    type ComponentPropsWithoutRef,
    type KeyboardEvent,
    type ReactNode,
} from "react";

/** 업무 상세·에디터 툴바 등에서 쓰는 셀렉트 공통 스킨 (`appearance-none` + 커스텀 화살표). `searchable`이면 Select2처럼 드롭다운에 검색 입력이 붙습니다. */
export type ElivisSelectVariant = "field" | "toolbar" | "toolbarPlain";

export type ElivisSelectOption = { value: string; label: string };

type ElivisSelectCommon = {
    variant?: ElivisSelectVariant;
    /** `<select>` / 트리거에 추가 */
    className?: string;
    /** 바깥 래퍼 — 기본은 `relative inline-flex min-w-0 max-w-full items-stretch` */
    wrapperClassName?: string;
    disabled?: boolean;
};

export type ElivisSelectProps =
    | (ElivisSelectCommon &
          Omit<ComponentPropsWithoutRef<"select">, keyof ElivisSelectCommon | "className"> & {
              searchable?: false;
              children: ReactNode;
          })
    | (ElivisSelectCommon & {
          searchable: true;
          options: ElivisSelectOption[];
          value: string;
          onValueChange: (value: string) => void;
          /** 드롭다운 검색창 placeholder */
          searchPlaceholder?: string;
          /** 필터 결과가 없을 때 표시할 문구 */
          noResultsText?: string;
          children?: undefined;
      });

const selectBase =
    "min-w-0 max-w-full cursor-pointer appearance-none rounded border border-stone-200 bg-white outline-none focus:border-stone-400 disabled:cursor-default disabled:opacity-70 dark:border-elivis-line";

const variantSelect: Record<ElivisSelectVariant, string> = {
    field: "py-1 pl-2 pr-10 text-xs dark:bg-elivis-surface dark:text-elivis-ink dark:focus:border-elivis-ink-muted",
    toolbar:
        "py-0.5 pl-1 pr-8 text-xs text-stone-500 hover:bg-stone-50 dark:bg-elivis-surface-elevated dark:text-elivis-ink-secondary dark:hover:bg-elivis-surface dark:hover:text-elivis-ink dark:focus:border-elivis-ink-muted",
    toolbarPlain:
        "py-0.5 pl-1.5 pr-8 text-xs text-stone-600 dark:bg-elivis-surface dark:text-elivis-ink-secondary",
};

const variantChevron: Record<ElivisSelectVariant, string> = {
    field: "w-9 pr-2 text-stone-500 dark:text-elivis-ink-secondary",
    toolbar: "w-8 pr-1.5 text-stone-500 dark:text-elivis-ink-secondary",
    toolbarPlain: "w-8 pr-1.5 text-stone-500 dark:text-elivis-ink-secondary",
};

function ChevronDownIcon() {
    return (
        <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
    );
}

function ElivisSelectSearchable({
    variant = "field",
    className = "",
    wrapperClassName,
    disabled = false,
    options,
    value,
    onValueChange,
    searchPlaceholder,
    noResultsText,
}: Extract<ElivisSelectProps, { searchable: true }>) {
    const listId = useId();
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [highlight, setHighlight] = useState(0);

    const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

    const q = query.trim().toLowerCase();
    const filtered = !q ? options : options.filter((o) => o.label.toLowerCase().includes(q));

    useEffect(() => {
        if (!open) return;
        setQuery("");
        const id = window.requestAnimationFrame(() => {
            inputRef.current?.focus();
        });
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

    function pick(v: string) {
        onValueChange(v);
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

    const triggerClass = `${selectBase} ${variantSelect[variant]} flex w-full min-w-0 max-w-full items-center text-left ${className}`.trim();
    const wrapClass = wrapperClassName?.trim() || "relative inline-flex min-w-0 max-w-full items-stretch";

    return (
        <div ref={containerRef} className={wrapClass}>
            <button
                type="button"
                disabled={disabled}
                className={triggerClass}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => !disabled && setOpen((o) => !o)}
                onKeyDown={(e) => {
                    if (disabled) return;
                    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpen(true);
                    }
                }}
            >
                <span className="min-w-0 flex-1 truncate">{selectedLabel || "—"}</span>
            </button>
            <span
                className={`pointer-events-none absolute inset-y-0 right-0 flex items-center justify-end ${variantChevron[variant]}`}
                aria-hidden
            >
                <ChevronDownIcon />
            </span>

            {open && (
                <div
                    className="absolute left-0 top-full z-[10050] mt-1 flex max-h-64 min-w-full w-[max(100%,12rem)] max-w-[min(28rem,calc(100vw-1.25rem))] flex-col overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg dark:border-elivis-line dark:bg-elivis-surface-elevated dark:shadow-none"
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
                        className="max-h-48 overflow-y-auto py-1"
                        onKeyDown={onListKeyDown}
                    >
                        {filtered.length === 0 ? (
                            <li className="px-3 py-2 text-xs text-stone-400 dark:text-elivis-ink-secondary">
                                {noResultsText ?? "—"}
                            </li>
                        ) : (
                            filtered.map((o, i) => (
                                <li key={o.value === "" ? "__empty__" : o.value} role="presentation">
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={o.value === value}
                                        className={`flex w-full px-3 py-2 text-left text-xs transition-colors ${
                                            i === highlight
                                                ? "bg-stone-100 text-stone-900 dark:bg-elivis-surface dark:text-elivis-ink"
                                                : "text-stone-700 hover:bg-stone-50 dark:text-elivis-ink-secondary dark:hover:bg-elivis-surface"
                                        } ${o.value === value ? "font-medium" : ""}`}
                                        onMouseEnter={() => setHighlight(i)}
                                        onClick={() => pick(o.value)}
                                    >
                                        {o.label}
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

export const ElivisSelect = forwardRef<HTMLSelectElement, ElivisSelectProps>(function ElivisSelect(
    props,
    ref,
) {
    if ("searchable" in props && props.searchable) {
        return <ElivisSelectSearchable {...props} />;
    }

    const { variant = "field", className = "", wrapperClassName, children, ...rest } = props;

    return (
        <div
            className={
                wrapperClassName?.trim() || "relative inline-flex min-w-0 max-w-full items-stretch"
            }
        >
            <select
                ref={ref}
                className={`${selectBase} ${variantSelect[variant]} ${className}`.trim()}
                {...rest}
            >
                {children}
            </select>
            <span
                className={`pointer-events-none absolute inset-y-0 right-0 flex items-center justify-end ${variantChevron[variant]}`}
                aria-hidden
            >
                <ChevronDownIcon />
            </span>
        </div>
    );
});
