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
                <h1 className="text-xl font-semibold text-stone-900">{t("title")}</h1>
                <p className="mt-2 text-sm text-stone-600">{t("emptyQuery")}</p>
                <form action="/search" method="get" className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label className="sr-only" htmlFor="search-q">
                        {t("inputLabel")}
                    </label>
                    <input
                        id="search-q"
                        name="q"
                        type="search"
                        placeholder={t("inputPlaceholder")}
                        className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm placeholder:text-stone-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/20"
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
                <h1 className="text-xl font-semibold text-stone-900">{t("title")}</h1>
                <p className="mt-2 text-sm text-red-600">{t("loadError")}</p>
            </div>
        );
    }

    const total = data.teams.length + data.projects.length + data.tasks.length;

    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
            <h1 className="text-xl font-semibold text-stone-900">{t("title")}</h1>
            <p className="mt-1 text-sm text-stone-600">{t("resultFor", { q: query })}</p>

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
                    className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm placeholder:text-stone-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/20"
                />
                <button
                    type="submit"
                    className="shrink-0 rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
                >
                    {t("submit")}
                </button>
            </form>

            {total === 0 ? (
                <p className="mt-8 text-sm text-stone-500">{t("noResults")}</p>
            ) : (
                <div className="mt-8 space-y-8">
                    {data.teams.length > 0 && (
                        <section>
                            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                                {t("teamsTitle")}
                            </h2>
                            <ul className="mt-2 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
                                {data.teams.map((team) => (
                                    <li key={team.id}>
                                        <Link
                                            href={`/teams/${encodeURIComponent(team.id)}`}
                                            className="flex flex-col px-4 py-3 text-sm hover:bg-stone-50"
                                        >
                                            <span className="font-medium text-stone-900">{team.name}</span>
                                            <span className="text-xs text-stone-400">{t("hintTeam")}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {data.projects.length > 0 && (
                        <section>
                            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                                {t("projectsTitle")}
                            </h2>
                            <ul className="mt-2 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
                                {data.projects.map((p) => (
                                    <li key={p.id}>
                                        <Link
                                            href={`/projects/${encodeURIComponent(p.id)}`}
                                            className="flex flex-col px-4 py-3 text-sm hover:bg-stone-50"
                                        >
                                            <span className="font-medium text-stone-900">{p.name}</span>
                                            <span className="text-xs text-stone-400">
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
                            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                                {t("tasksTitle")}
                            </h2>
                            <ul className="mt-2 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
                                {data.tasks.map((task) => (
                                    <li key={task.id}>
                                        <Link
                                            href={`/mywork/${encodeURIComponent(task.workspaceId)}`}
                                            className="flex flex-col px-4 py-3 text-sm hover:bg-stone-50"
                                        >
                                            <span className="font-medium text-stone-900">{task.title}</span>
                                            <span className="text-xs text-stone-400">
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
