"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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
        <li className="group rounded-xl border border-stone-200 bg-white transition-all hover:border-stone-300 hover:shadow-md">
            <div className={`flex items-start gap-4 ${compact ? "p-3 sm:p-4" : "p-4 sm:p-5"}`}>
                {/* 아이콘 — 클릭 시 프로젝트 이동 */}
                <Link href={`/projects/${project.id}`} tabIndex={-1} className="shrink-0">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-stone-500 transition-colors group-hover:bg-stone-200 group-hover:text-stone-600 sm:h-11 sm:w-11">
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
                            className={`min-w-0 truncate font-semibold text-stone-800 transition-colors group-hover:text-stone-900 ${
                                compact ? "text-sm" : ""
                            }`}
                        >
                            {project.name || "이름 없음"}
                        </h3>
                        <ProjectFavoriteButton
                            projectId={project.id}
                            initialIsFavorite={isFavorite}
                            size="md"
                            onAdd={() => addProjectFavoriteAction(project.id)}
                            onRemove={() => removeProjectFavoriteAction(project.id)}
                        />
                        {isPersonal ? (
                            <span className="shrink-0 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-600">
                                개인 프로젝트
                            </span>
                        ) : (
                            <span className="flex min-w-0 flex-wrap items-center gap-1">
                                {tags.slice(0, 3).map((tm) => (
                                    <span
                                        key={tm.id}
                                        className="shrink-0 rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-600"
                                    >
                                        {tm.name}
                                    </span>
                                ))}
                                {tags.length > 3 && (
                                    <span className="shrink-0 text-[11px] text-stone-500">
                                        +{tags.length - 3}
                                    </span>
                                )}
                            </span>
                        )}
                    </div>
                    <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <p
                            className={`text-stone-500 line-clamp-1 ${compact ? "text-xs" : "text-sm"}`}
                            title={project.description ?? undefined}
                        >
                            {project.description ? truncate(project.description, 50) : "설명 없음"}
                        </p>
                        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500 sm:gap-x-4">
                            <span>
                                멤버{" "}
                                <span className="font-medium text-stone-600">
                                    {project._count.members}명
                                </span>
                            </span>
                            <span className="text-stone-300">|</span>
                            <span>
                                업무{" "}
                                <span className="font-medium text-stone-600">
                                    {project._count.tasks}개
                                </span>
                            </span>
                        </div>
                    </div>
                </Link>

                {/* 화살표 */}
                <Link href={`/projects/${project.id}`} tabIndex={-1} className="shrink-0 self-center text-stone-300 transition-transform group-hover:translate-x-0.5">
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
    const favoriteProjectIds = favoriteProjectIdsProp ?? new Set<string>();
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(myProjects.length / MY_PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pageList = useMemo(() => {
        const start = (safePage - 1) * MY_PAGE_SIZE;
        return myProjects.slice(start, start + MY_PAGE_SIZE);
    }, [myProjects, safePage]);

    const bothEmpty =
        myProjects.length === 0 &&
        otherProjects.length === 0 &&
        adminOnlyProjects.length === 0;

    return (
        <div className="w-full p-4 text-left sm:p-5 md:p-6 lg:p-8">
            <div className="w-full max-w-full">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold text-stone-800 sm:text-3xl">
                            프로젝트
                        </h2>
                        <p className="mt-2 text-stone-600">프로젝트 목록을 확인하고 관리하세요.</p>
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
                        프로젝트 생성
                    </Link>
                </div>

                {bothEmpty ? (
                    <div className="mt-12 flex flex-col items-center justify-center py-16 text-center sm:mt-16 sm:py-24">
                        <span className="flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
                            <svg
                                className="h-14 w-14 text-stone-800 sm:h-16 sm:w-16"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                            >
                                <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-6 6M9 9l6 6" />
                            </svg>
                        </span>
                        <p className="mt-4 text-xl font-medium text-stone-800 sm:text-2xl">
                            {searchQuery ? "검색 결과가 없습니다." : "현재 프로젝트가 없어요"}
                        </p>
                        {!searchQuery && (
                            <Link
                                href="/projects/new"
                                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-stone-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
                            >
                                프로젝트 생성하기
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
                                        className="text-base font-semibold text-stone-900 sm:text-lg"
                                    >
                                        내 프로젝트
                                    </h3>
                                    <p className="mt-1 text-xs text-stone-500">
                                        내가 생성했거나 직접 참여 중인 프로젝트입니다.
                                    </p>
                                </div>
                                {myProjects.length > MY_PAGE_SIZE && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs tabular-nums text-stone-400">
                                            {safePage}/{totalPages}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={safePage <= 1}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 transition-colors hover:bg-stone-50 disabled:pointer-events-none disabled:opacity-50"
                                            aria-label="이전 페이지"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={safePage >= totalPages}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 transition-colors hover:bg-stone-50 disabled:pointer-events-none disabled:opacity-50"
                                            aria-label="다음 페이지"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5 15.75 12l-7.5 7.5" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {myProjects.length === 0 ? (
                                <p className="mt-3 text-sm text-stone-500">
                                    {searchQuery
                                        ? "검색 조건에 맞는 내 프로젝트가 없습니다."
                                        : "아직 참여 중인 프로젝트가 없습니다."}
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
                                    className="text-base font-semibold text-stone-900 sm:text-lg"
                                >
                                    내가 참여하고 있는 프로젝트
                                </h3>
                                <p className="mt-1 text-xs text-stone-500">
                                    소속된 팀을 통해 참여 중인 공개 프로젝트입니다.
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
                                        className="text-base font-semibold text-stone-900 sm:text-lg"
                                    >
                                        다른 사용자 프로젝트
                                    </h3>
                                    <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                        관리자
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-stone-500">
                                    관리자 권한으로 조회 가능한 모든 프로젝트입니다.
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
