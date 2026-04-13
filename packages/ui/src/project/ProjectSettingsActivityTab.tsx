"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { ElivisSelect } from "../ElivisSelect";

const ACTIVITY_PAGE_SIZES = [10, 25, 50, 100] as const;
type ActivityPageSize = (typeof ACTIVITY_PAGE_SIZES)[number];

export type ProjectActivityRow = {
    id: string;
    resourceType: string;
    action: string;
    /** 한 줄 요약 (이미 번역·포맷됨) */
    line: string;
    /** ISO 8601 — `<time dateTime>`용 */
    createdAtIso: string;
};

/** 팀 설정 활동 로그(TeamActivityLogSection)와 동일한 타임라인 + 아이콘 톤 */
function iconForProjectActivity(resourceType: string, action: string): { path: string; color: string } {
    if (resourceType === "PROJECT" && action === "CREATED") {
        return {
            path: "M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
            color: "bg-sky-50 text-sky-500",
        };
    }
    if (resourceType === "PROJECT_MEMBER" && action === "CREATED") {
        return {
            path: "M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z",
            color: "bg-emerald-50 text-emerald-500",
        };
    }
    if (resourceType === "PROJECT_MEMBER" && action === "UPDATED") {
        return {
            path: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z",
            color: "bg-amber-50 text-amber-500",
        };
    }
    if (resourceType === "WIKI_PAGE") {
        if (action === "DELETED") {
            return {
                path: "m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0",
                color: "bg-rose-50 text-rose-500",
            };
        }
        return {
            path: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
            color: "bg-violet-50 text-violet-500",
        };
    }
    if (resourceType === "TASK") {
        if (action === "DELETED") {
            return {
                path: "m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0",
                color: "bg-rose-50 text-rose-500",
            };
        }
        return {
            path: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.495 3.16 8.47 4.108 8.47 5.234V19.5a2.25 2.25 0 0 0 2.25 2.25h3.75",
            color: "bg-indigo-50 text-indigo-500",
        };
    }
    return {
        path: "M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z",
        color: "bg-stone-100 text-stone-500",
    };
}

export function ProjectSettingsActivityTab({
    title,
    subtitle,
    rows,
    emptyMessage,
}: {
    title: string;
    subtitle: string;
    rows: ProjectActivityRow[];
    emptyMessage: string;
}) {
    const locale = useLocale();
    const tp = useTranslations("projects.detail.activity");
    const [pageSize, setPageSize] = useState<ActivityPageSize>(10);
    const [page, setPage] = useState(1);

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => {
        const maxPage = Math.max(1, Math.ceil(total / pageSize));
        setPage((p) => Math.min(Math.max(1, p), maxPage));
    }, [total, pageSize]);

    const safePage = Math.min(Math.max(1, page), totalPages);
    const offset = (safePage - 1) * pageSize;
    const pageRows = total === 0 ? [] : rows.slice(offset, offset + pageSize);
    const rangeStart = total === 0 ? 0 : offset + 1;
    const rangeEnd = total === 0 ? 0 : offset + pageRows.length;

    function formatWhen(iso: string) {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "—";
        const tag = locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "en-US";
        return d.toLocaleDateString(tag, {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }

    return (
        <div>
            <h2 className="mb-1 text-base font-semibold text-stone-800 dark:text-elivis-ink">{title}</h2>
            <p className="mb-5 text-sm text-stone-500 dark:text-elivis-ink-secondary">{subtitle}</p>
            {rows.length === 0 ? (
                <p className="text-sm text-stone-400 dark:text-elivis-ink-secondary">{emptyMessage}</p>
            ) : (
                <>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-elivis-ink-secondary">
                            <span className="shrink-0">{tp("pagination.pageSize")}</span>
                            <ElivisSelect
                                variant="field"
                                className="w-auto min-w-[4.25rem] py-1"
                                aria-label={tp("pagination.pageSize")}
                                value={String(pageSize)}
                                onChange={(e) => {
                                    const n = Number(e.target.value);
                                    if (
                                        n === 10 ||
                                        n === 25 ||
                                        n === 50 ||
                                        n === 100
                                    ) {
                                        setPageSize(n);
                                        setPage(1);
                                    }
                                }}
                            >
                                {ACTIVITY_PAGE_SIZES.map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </ElivisSelect>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-elivis-ink-secondary">
                            {tp("pagination.summary", {
                                start: rangeStart,
                                end: rangeEnd,
                                total,
                                page: safePage,
                                pages: totalPages,
                            })}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={safePage <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-elivis-line dark:bg-elivis-surface dark:text-elivis-ink dark:hover:bg-elivis-surface-elevated"
                            >
                                {tp("pagination.prev")}
                            </button>
                            <button
                                type="button"
                                disabled={safePage >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                className="rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-elivis-line dark:bg-elivis-surface dark:text-elivis-ink dark:hover:bg-elivis-surface-elevated"
                            >
                                {tp("pagination.next")}
                            </button>
                        </div>
                    </div>
                    <ol className="relative border-l border-stone-200 dark:border-elivis-line">
                    {pageRows.map((row) => {
                        const icon = iconForProjectActivity(row.resourceType, row.action);
                        return (
                            <li key={row.id} className="mb-6 ml-6 last:mb-0">
                                <span
                                    className={`absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-white ${icon.color}`}
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
                                            d={icon.path}
                                        />
                                    </svg>
                                </span>
                                <p className="text-sm font-medium text-stone-800 dark:text-elivis-ink">{row.line}</p>
                                <time
                                    className="mt-0.5 block text-xs text-stone-400 dark:text-elivis-ink-secondary"
                                    dateTime={row.createdAtIso}
                                >
                                    {formatWhen(row.createdAtIso)}
                                </time>
                            </li>
                        );
                    })}
                    </ol>
                </>
            )}
        </div>
    );
}
