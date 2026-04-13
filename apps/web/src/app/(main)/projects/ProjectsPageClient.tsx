"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";

import type { ProjectListItem } from "@/lib/server/projects.server";
import { addProjectFavoriteAction, removeProjectFavoriteAction } from "@/app/actions/projects";
import { ProjectFavoriteButton } from "@repo/ui";

const MY_PAGE_SIZE = 10;

function truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + "…";
}

function ProjectCard({
    project,
    compact,
    isFavorite = false,
}: {
    project: ProjectListItem;
    compact?: boolean;
    isFavorite?: boolean;
}) {
    const t = useTranslations("projects.list");
    const seenTeamIds = new Set<string>();
    const tags = [
        ...(project.team ? [project.team] : []),
        ...(project.projectTeams?.map((pt) => pt.team) ?? []),
    ].filter((t) => {
        if (seenTeamIds.has(t.id)) return false;
        seenTeamIds.add(t.id);
        return true;
    });

    const isPersonal = tags.length === 0;

    return (
        <li className="group rounded-xl border border-stone-200 bg-white transition-all hover:border-stone-300 hover:shadow-md dark:border-elivis-line dark:bg-elivis-surface dark:hover:border-elivis-line dark:hover:shadow-md">
            <div className={`flex items-start gap-4 ${compact ? "p-3 sm:p-4" : "p-4 sm:p-5"}`}>
                {/* 아이콘 — 클릭 시 프로젝트 이동 */}
                <Link href={`/projects/${project.id}`} tabIndex={-1} className="shrink-0">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-stone-500 transition-colors group-hover:bg-stone-200 group-hover:text-stone-600 dark:bg-elivis-surface-elevated dark:text-elivis-ink-secondary dark:group-hover:bg-white/10 dark:group-hover:text-elivis-ink sm:h-11 sm:w-11">
                        <svg
                            className="h-5 w-5 sm:h-6 sm:w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
                            />
                        </svg>
                    </span>
                </Link>

                {/* 텍스트 영역 */}
                <Link href={`/projects/${project.id}`} className="min-w-0 flex-1 block">
                    <div className="flex min-w-0 items-center gap-1.5">
                        <h3
                            className={`min-w-0 truncate font-semibold text-stone-800 transition-colors group-hover:text-stone-900 dark:text-elivis-ink dark:group-hover:text-elivis-ink ${
                                compact ? "text-sm" : ""
                            }`}
                        >
                            {project.name || t("noName")}
                        </h3>
                        <ProjectFavoriteButton
                            projectId={project.id}
                            initialIsFavorite={isFavorite}
                            size="md"
                            onAdd={() => addProjectFavoriteAction(project.id)}
                            onRemove={() => removeProjectFavoriteAction(project.id)}
                        />
                        {isPersonal ? (
                            <span className="shrink-0 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-600 dark:border-sky-500/35 dark:bg-sky-950/45 dark:text-sky-300">
                                {t("personalBadge")}
                            </span>
                        ) : (
                            <span className="flex min-w-0 flex-wrap items-center gap-1">
                                {tags.slice(0, 3).map((tm) => (
                                    <span
                                        key={tm.id}
                                        className="shrink-0 rounded-md border border-stone-200 dark:border-elivis-line bg-stone-50 dark:bg-elivis-surface px-2 py-0.5 text-[11px] font-medium text-stone-600 dark:text-elivis-ink-secondary"
                                    >
                                        {tm.name}
                                    </span>
                                ))}
                                {tags.length > 3 && (
                                    <span className="shrink-0 text-[11px] text-stone-500 dark:text-elivis-ink-secondary">
                                        {t("moreTeams", { count: tags.length - 3 })}
                                    </span>
                                )}
                            </span>
                        )}
                    </div>
                    <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <p
                            className={`line-clamp-1 text-stone-500 dark:text-elivis-ink-secondary ${compact ? "text-xs" : "text-sm"}`}
                            title={project.description ?? undefined}
                        >
                            {project.description ? truncate(project.description, 50) : t("noDesc")}
                        </p>
                        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500 dark:text-elivis-ink-secondary sm:gap-x-4">
                            <span>
                                {t("membersLabel")}{" "}
                                <span className="font-medium text-stone-600 dark:text-elivis-ink-secondary">
                                    {t("membersCount", { count: project._count.members })}
                                </span>
                            </span>
                            <span className="text-stone-300 dark:text-elivis-line">|</span>
                            <span>
                                {t("tasksLabel")}{" "}
                                <span className="font-medium text-stone-600 dark:text-elivis-ink-secondary">
                                    {t("tasksCount", { count: project._count.tasks })}
                                </span>
                            </span>
                        </div>
                    </div>
                </Link>

                {/* 화살표 */}
                <Link
                    href={`/projects/${project.id}`}
                    tabIndex={-1}
                    className="shrink-0 self-center text-stone-300 transition-transform group-hover:translate-x-0.5 dark:text-elivis-ink-muted"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                </Link>
            </div>
        </li>
    );
}

export function ProjectsPageClient({
    myProjects,
    otherProjects,
    adminOnlyProjects = [],
    isAdmin = false,
    searchQuery,
    favoriteProjectIds: favoriteProjectIdsProp,
}: {
    myProjects: ProjectListItem[];
    otherProjects: ProjectListItem[];
    adminOnlyProjects?: ProjectListItem[];
    isAdmin?: boolean;
    searchQuery: string;
    favoriteProjectIds?: Set<string>;
}) {
    const t = useTranslations("projects.list");
    const favoriteProjectIds = favoriteProjectIdsProp ?? new Set<string>();
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(myProjects.length / MY_PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pageStart = (safePage - 1) * MY_PAGE_SIZE;
    const pageList = myProjects.slice(pageStart, pageStart + MY_PAGE_SIZE);

    const bothEmpty =
        myProjects.length === 0 &&
        otherProjects.length === 0 &&
        adminOnlyProjects.length === 0;

    return (
        <div className="w-full p-4 text-left sm:p-5 md:p-6 lg:p-8">
            <div className="w-full max-w-full">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold text-stone-800 dark:text-elivis-ink sm:text-3xl">
                            {t("title")}
                        </h2>
                        <p className="mt-2 text-stone-600 dark:text-elivis-ink-secondary">{t("subtitle")}</p>
                    </div>
                    <Link
                        href="/projects/new"
                        className="inline-flex items-center gap-2 self-start rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        {t("create")}
                    </Link>
                </div>

                {bothEmpty ? (
                    <div className="mt-12 flex flex-col items-center justify-center py-16 text-center sm:mt-16 sm:py-24">
                        <span className="flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
                            <svg
                                className="h-14 w-14 text-stone-800 dark:text-elivis-ink sm:h-16 sm:w-16"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                            >
                                <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-6 6M9 9l6 6" />
                            </svg>
                        </span>
                        <p className="mt-4 text-xl font-medium text-stone-800 dark:text-elivis-ink sm:text-2xl">
                            {searchQuery ? t("emptySearch") : t("emptyNone")}
                        </p>
                        {!searchQuery && (
                            <Link
                                href="/projects/new"
                                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-stone-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
                            >
                                {t("createCta")}
                            </Link>
                        )}
                    </div>
                ) : (
                    <>
                        {/* ── 내 프로젝트 ── */}
                        <section className="mt-8 sm:mt-10" aria-labelledby="projects-mine-heading">
                            <div className="flex items-end justify-between gap-3">
                                <div>
                                    <h3
                                        id="projects-mine-heading"
                                        className="text-base font-semibold text-stone-900 dark:text-elivis-ink sm:text-lg"
                                    >
                                        {t("myTitle")}
                                    </h3>
                                    <p className="mt-1 text-xs text-stone-500 dark:text-elivis-ink-secondary">
                                        {t("myDesc")}
                                    </p>
                                </div>
                                {myProjects.length > MY_PAGE_SIZE && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs tabular-nums text-stone-400 dark:text-elivis-ink-secondary">
                                            {safePage}/{totalPages}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={safePage <= 1}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface text-stone-600 dark:text-elivis-ink-secondary transition-colors hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated disabled:pointer-events-none disabled:opacity-50"
                                            aria-label={t("pagePrev")}
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={safePage >= totalPages}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface text-stone-600 dark:text-elivis-ink-secondary transition-colors hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated disabled:pointer-events-none disabled:opacity-50"
                                            aria-label={t("pageNext")}
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5 15.75 12l-7.5 7.5" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {myProjects.length === 0 ? (
                                <p className="mt-3 text-sm text-stone-500 dark:text-elivis-ink-secondary">
                                    {searchQuery ? t("myEmptySearch") : t("myEmptyNone")}
                                </p>
                            ) : (
                                <ul className="mt-4 space-y-3">
                                    {pageList.map((project) => (
                                        <ProjectCard
                                            key={project.id}
                                            project={project}
                                            isFavorite={favoriteProjectIds.has(project.id)}
                                        />
                                    ))}
                                </ul>
                            )}
                        </section>

                        {/* ── 팀을 통해 참여 중인 프로젝트 ── */}
                        {otherProjects.length > 0 && (
                            <section
                                className="mt-10 border-t border-stone-200/80 pt-8 sm:mt-12 sm:pt-10"
                                aria-labelledby="projects-team-heading"
                            >
                                <h3
                                    id="projects-team-heading"
                                    className="text-base font-semibold text-stone-900 dark:text-elivis-ink sm:text-lg"
                                >
                                    {t("otherTitle")}
                                </h3>
                                <p className="mt-1 text-xs text-stone-500 dark:text-elivis-ink-secondary">
                                    {t("otherDesc")}
                                </p>
                                <ul className="mt-3 space-y-2">
                                    {otherProjects.map((project) => (
                                        <ProjectCard
                                            key={project.id}
                                            project={project}
                                            compact
                                            isFavorite={favoriteProjectIds.has(project.id)}
                                        />
                                    ))}
                                </ul>
                            </section>
                        )}

                        {/* ── 관리자 전용: 다른 사용자 프로젝트 ── */}
                        {isAdmin && adminOnlyProjects.length > 0 && (
                            <section
                                className="mt-10 border-t border-stone-200/80 pt-8 sm:mt-12 sm:pt-10"
                                aria-labelledby="projects-admin-heading"
                            >
                                <div className="flex items-center gap-2">
                                    <h3
                                        id="projects-admin-heading"
                                        className="text-base font-semibold text-stone-900 dark:text-elivis-ink sm:text-lg"
                                    >
                                        {t("adminTitle")}
                                    </h3>
                                    <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-elivis-accent-hover ring-1 ring-inset ring-amber-600/20">
                                        {t("adminBadge")}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-stone-500 dark:text-elivis-ink-secondary">
                                    {t("adminDesc")}
                                </p>
                                <ul className="mt-3 space-y-2">
                                    {adminOnlyProjects.map((project) => (
                                        <ProjectCard
                                            key={project.id}
                                            project={project}
                                            compact
                                            isFavorite={favoriteProjectIds.has(project.id)}
                                        />
                                    ))}
                                </ul>
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
