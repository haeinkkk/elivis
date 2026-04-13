"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { useTranslations } from "next-intl";

import type { ApiSystemLogFile } from "@/lib/mappers/system-logs";

interface AdminSystemLogsClientProps {
    files: ApiSystemLogFile[];
    entries: Array<Record<string, unknown> & { raw?: string }>;
    query: {
        file: string;
        limit: number;
        levelMin: string;
        search: string;
    };
}

function levelLabel(level: unknown): string {
    if (typeof level === "string") return level;
    if (typeof level === "number") {
        if (level >= 60) return "fatal";
        if (level >= 50) return "error";
        if (level >= 40) return "warn";
        if (level >= 30) return "info";
        if (level >= 20) return "debug";
        return "trace";
    }
    return "—";
}

function levelBadgeClass(label: string): string {
    const l = label.toLowerCase();
    if (l === "fatal" || l === "error")
        return "bg-red-50 text-red-800 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900/60";
    if (l === "warn")
        return "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/35 dark:text-amber-100 dark:ring-amber-800/50";
    if (l === "info")
        return "bg-sky-50 text-sky-900 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-100 dark:ring-sky-800/50";
    if (l === "debug" || l === "trace")
        return "bg-stone-100 text-stone-700 ring-stone-200 dark:bg-elivis-surface-elevated dark:text-elivis-ink-secondary dark:ring-elivis-line";
    return "bg-stone-100 text-stone-700 ring-stone-200 dark:bg-elivis-surface-elevated dark:text-elivis-ink-secondary dark:ring-elivis-line";
}

function formatTime(entry: Record<string, unknown>): string {
    const t = entry.time;
    if (typeof t === "number") {
        try {
            return new Date(t).toISOString();
        } catch {
            return String(t);
        }
    }
    if (typeof t === "string") return t;
    return "—";
}

function formatMsg(entry: Record<string, unknown>): string {
    const m = entry.msg;
    if (typeof m === "string") return m;
    if (m != null) return JSON.stringify(m);
    return "—";
}

export function AdminSystemLogsClient({ files, entries, query }: AdminSystemLogsClientProps) {
    const t = useTranslations("admin.systemLogsPage");
    const router = useRouter();
    const [openRow, setOpenRow] = useState<number | null>(null);

    const rows = entries.map((e, i) => ({ e, i }));

    return (
        <div className="space-y-6">
            <p className="text-sm text-stone-600 dark:text-elivis-ink-secondary">{t("intro")}</p>

            <form
                method="get"
                action="/admin/system-logs"
                className="flex flex-col gap-3 rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
            >
                <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-stone-500 dark:text-elivis-ink-secondary">
                    {t("fileLabel")}
                    <select
                        name="file"
                        defaultValue={query.file}
                        className="rounded-lg border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-3 py-2 text-sm text-stone-800 dark:text-elivis-ink"
                    >
                        {files.map((f) => (
                            <option key={f.name} value={f.name}>
                                {f.name} ({(f.size / 1024).toFixed(1)} KiB)
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex w-28 flex-col gap-1 text-xs font-medium text-stone-500 dark:text-elivis-ink-secondary">
                    {t("limitLabel")}
                    <input
                        type="number"
                        name="limit"
                        min={1}
                        max={500}
                        defaultValue={query.limit}
                        className="rounded-lg border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-3 py-2 text-sm text-stone-800 dark:text-elivis-ink"
                    />
                </label>
                <label className="flex min-w-[140px] flex-col gap-1 text-xs font-medium text-stone-500 dark:text-elivis-ink-secondary">
                    {t("levelLabel")}
                    <select
                        name="levelMin"
                        defaultValue={query.levelMin}
                        className="rounded-lg border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-3 py-2 text-sm text-stone-800 dark:text-elivis-ink"
                    >
                        <option value="">{t("levelAll")}</option>
                        <option value="trace">{t("levelTrace")}</option>
                        <option value="debug">{t("levelDebug")}</option>
                        <option value="info">{t("levelInfo")}</option>
                        <option value="warn">{t("levelWarn")}</option>
                        <option value="error">{t("levelError")}</option>
                        <option value="fatal">{t("levelFatal")}</option>
                    </select>
                </label>
                <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs font-medium text-stone-500 dark:text-elivis-ink-secondary">
                    {t("searchLabel")}
                    <input
                        type="search"
                        name="search"
                        defaultValue={query.search}
                        placeholder={t("searchPlaceholder")}
                        className="rounded-lg border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-3 py-2 text-sm text-stone-800 dark:text-elivis-ink"
                    />
                </label>
                <div className="flex gap-2">
                    <button
                        type="submit"
                        className="rounded-xl bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 dark:bg-elivis-accent-strong dark:hover:bg-elivis-accent-hover"
                    >
                        {t("apply")}
                    </button>
                    <button
                        type="button"
                        className="rounded-xl border border-stone-300 dark:border-elivis-line bg-white dark:bg-elivis-surface px-4 py-2 text-sm font-medium text-stone-800 dark:text-elivis-ink hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated"
                        onClick={() => router.refresh()}
                    >
                        {t("refresh")}
                    </button>
                </div>
            </form>

            <div className="overflow-hidden rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-stone-100 dark:border-elivis-line bg-stone-50/80 dark:bg-elivis-surface/80 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-elivis-ink-secondary">
                            <tr>
                                <th className="px-4 py-3">{t("colTime")}</th>
                                <th className="px-4 py-3">{t("colLevel")}</th>
                                <th className="px-4 py-3">{t("colService")}</th>
                                <th className="px-4 py-3">{t("colEvent")}</th>
                                <th className="px-4 py-3">{t("colMessage")}</th>
                                <th className="px-4 py-3 w-28" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-elivis-line">
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-stone-500 dark:text-elivis-ink-secondary">
                                        {t("noEntries")}
                                    </td>
                                </tr>
                            ) : (
                                rows.map(({ e, i }) => {
                                    const lvl = levelLabel(e.level);
                                    const isOpen = openRow === i;
                                    return (
                                        <Fragment key={i}>
                                            <tr className="align-top hover:bg-stone-50/80 dark:hover:bg-elivis-surface-elevated/60">
                                                <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-stone-600 dark:text-elivis-ink-secondary">
                                                    {formatTime(e)}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span
                                                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${levelBadgeClass(lvl)}`}
                                                    >
                                                        {lvl}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-stone-700 dark:text-elivis-ink">
                                                    {typeof e.service === "string" ? e.service : "—"}
                                                </td>
                                                <td className="max-w-[140px] truncate px-4 py-2 text-stone-700 dark:text-elivis-ink">
                                                    {typeof e.event === "string" ? e.event : "—"}
                                                </td>
                                                <td className="max-w-md truncate px-4 py-2 text-stone-800 dark:text-elivis-ink">
                                                    {formatMsg(e)}
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                    {e.raw ? (
                                                        <button
                                                            type="button"
                                                            className="text-xs font-medium text-orange-700 hover:underline dark:text-elivis-accent-hover"
                                                            onClick={() => setOpenRow(isOpen ? null : i)}
                                                        >
                                                            {isOpen ? t("collapseRaw") : t("expandRaw")}
                                                        </button>
                                                    ) : null}
                                                </td>
                                            </tr>
                                            {isOpen && e.raw ? (
                                                <tr className="bg-stone-50/90 dark:bg-elivis-surface-elevated/80">
                                                    <td colSpan={6} className="px-4 py-3">
                                                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-stone-700 dark:text-elivis-ink">
                                                            {e.raw}
                                                        </pre>
                                                    </td>
                                                </tr>
                                            ) : null}
                                        </Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
