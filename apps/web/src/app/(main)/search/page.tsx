import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { fetchSearchQuick } from "@/lib/server/search.server";

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const { q } = await searchParams;
    const query = (q ?? "").trim();
    const t = await getTranslations("search.page");

    if (query.length < 1) {
        return (
            <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
                <h1 className="text-xl font-semibold text-stone-900 dark:text-elivis-ink">{t("title")}</h1>
                <p className="mt-2 text-sm text-stone-600 dark:text-elivis-ink-secondary">{t("emptyQuery")}</p>
                <form action="/search" method="get" className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label className="sr-only" htmlFor="search-q">
                        {t("inputLabel")}
                    </label>
                    <input
                        id="search-q"
                        name="q"
                        type="search"
                        placeholder={t("inputPlaceholder")}
                        className="min-w-0 flex-1 rounded-xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-3 py-2 text-sm text-stone-800 dark:text-elivis-ink shadow-sm placeholder:text-stone-400 dark:placeholder:text-elivis-ink-muted focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/20"
                    />
                    <button
                        type="submit"
                        className="shrink-0 rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
                    >
                        {t("submit")}
                    </button>
                </form>
            </div>
        );
    }

    const data = await fetchSearchQuick(query);

    if (!data) {
        return (
            <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
                <h1 className="text-xl font-semibold text-stone-900 dark:text-elivis-ink">{t("title")}</h1>
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{t("loadError")}</p>
            </div>
        );
    }

    const total = data.teams.length + data.projects.length + data.tasks.length;

    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
            <h1 className="text-xl font-semibold text-stone-900 dark:text-elivis-ink">{t("title")}</h1>
            <p className="mt-1 text-sm text-stone-600 dark:text-elivis-ink-secondary">{t("resultFor", { q: query })}</p>

            <form action="/search" method="get" className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="sr-only" htmlFor="search-q-refine">
                    {t("inputLabel")}
                </label>
                <input
                    id="search-q-refine"
                    name="q"
                    type="search"
                    defaultValue={query}
                    placeholder={t("inputPlaceholder")}
                    className="min-w-0 flex-1 rounded-xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-3 py-2 text-sm text-stone-800 dark:text-elivis-ink shadow-sm placeholder:text-stone-400 dark:placeholder:text-elivis-ink-muted focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/20"
                />
                <button
                    type="submit"
                    className="shrink-0 rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
                >
                    {t("submit")}
                </button>
            </form>

            {total === 0 ? (
                <p className="mt-8 text-sm text-stone-500 dark:text-elivis-ink-secondary">{t("noResults")}</p>
            ) : (
                <div className="mt-8 space-y-8">
                    {data.teams.length > 0 && (
                        <section>
                            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-elivis-ink-secondary">
                                {t("teamsTitle")}
                            </h2>
                            <ul className="mt-2 divide-y divide-stone-100 dark:divide-elivis-line rounded-xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface">
                                {data.teams.map((team) => (
                                    <li key={team.id}>
                                        <Link
                                            href={`/teams/${encodeURIComponent(team.id)}`}
                                            className="flex flex-col px-4 py-3 text-sm hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated"
                                        >
                                            <span className="font-medium text-stone-900 dark:text-elivis-ink">{team.name}</span>
                                            <span className="text-xs text-stone-400 dark:text-elivis-ink-secondary">{t("hintTeam")}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {data.projects.length > 0 && (
                        <section>
                            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-elivis-ink-secondary">
                                {t("projectsTitle")}
                            </h2>
                            <ul className="mt-2 divide-y divide-stone-100 dark:divide-elivis-line rounded-xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface">
                                {data.projects.map((p) => (
                                    <li key={p.id}>
                                        <Link
                                            href={`/projects/${encodeURIComponent(p.id)}`}
                                            className="flex flex-col px-4 py-3 text-sm hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated"
                                        >
                                            <span className="font-medium text-stone-900 dark:text-elivis-ink">{p.name}</span>
                                            <span className="text-xs text-stone-400 dark:text-elivis-ink-secondary">
                                                {p.teamName
                                                    ? `${p.teamName} · ${t("hintProject")}`
                                                    : t("hintProject")}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {data.tasks.length > 0 && (
                        <section>
                            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-elivis-ink-secondary">
                                {t("tasksTitle")}
                            </h2>
                            <ul className="mt-2 divide-y divide-stone-100 dark:divide-elivis-line rounded-xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface">
                                {data.tasks.map((task) => (
                                    <li key={task.id}>
                                        <Link
                                            href={`/mywork/${encodeURIComponent(task.workspaceId)}`}
                                            className="flex flex-col px-4 py-3 text-sm hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated"
                                        >
                                            <span className="font-medium text-stone-900 dark:text-elivis-ink">{task.title}</span>
                                            <span className="text-xs text-stone-400 dark:text-elivis-ink-secondary">
                                                {task.workspaceLabel
                                                    ? `${task.workspaceLabel} · ${task.projectName}`
                                                    : task.projectName}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}
