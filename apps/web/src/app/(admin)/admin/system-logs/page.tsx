import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { fetchAdminSystemLogs } from "@/lib/server/admin-system-logs.server";

import { AdminSystemLogsClient } from "./AdminSystemLogsClient";

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
    if (v === undefined) return undefined;
    return Array.isArray(v) ? v[0] : v;
}

export default async function AdminSystemLogsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const sp = await searchParams;
    const t = await getTranslations("admin.systemLogsPage");

    const fileParam = first(sp.file);
    const limitNum = Math.min(500, Math.max(1, Number.parseInt(first(sp.limit) ?? "100", 10) || 100));
    const levelMin = first(sp.levelMin);
    const search = first(sp.search);

    const listOnly = await fetchAdminSystemLogs({});
    if (!listOnly) {
        return (
            <div className="w-full rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface p-6 shadow-sm">
                <p className="text-sm text-stone-600 dark:text-elivis-ink-secondary">{t("loadError")}</p>
            </div>
        );
    }

    if (listOnly.files.length === 0) {
        return (
            <div className="w-full max-w-full space-y-4">
                <p className="text-sm text-stone-600 dark:text-elivis-ink-secondary">{t("intro")}</p>
                <div className="rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface p-6 shadow-sm">
                    <p className="text-sm text-stone-600 dark:text-elivis-ink-secondary">{t("noFiles")}</p>
                </div>
            </div>
        );
    }

    let effectiveFile = fileParam;
    if (!effectiveFile || !listOnly.files.some((f) => f.name === effectiveFile)) {
        effectiveFile = listOnly.files[0]!.name;
        const q = new URLSearchParams();
        q.set("file", effectiveFile);
        q.set("limit", String(limitNum));
        if (levelMin) q.set("levelMin", levelMin);
        if (search) q.set("search", search);
        redirect(`/admin/system-logs?${q.toString()}`);
    }

    const data = await fetchAdminSystemLogs({
        file: effectiveFile,
        limit: limitNum,
        levelMin,
        search,
    });

    if (!data || !Array.isArray(data.entries)) {
        return (
            <div className="w-full rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface p-6 shadow-sm">
                <p className="text-sm text-stone-600 dark:text-elivis-ink-secondary">{t("loadError")}</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-full">
            <AdminSystemLogsClient
                files={data.files}
                entries={data.entries}
                query={{
                    file: effectiveFile,
                    limit: limitNum,
                    levelMin: levelMin ?? "",
                    search: search ?? "",
                }}
            />
        </div>
    );
}
