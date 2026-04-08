"use client";

import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Locale } from "@repo/i18n";

import { LanguageSelector } from "./LanguageSelector";
import { NotificationBell } from "./notifications/NotificationBell";
import { StatusDropdown } from "./StatusDropdown";
import type { UserProfile } from "./types/user-profile";
import type { UserStatus } from "./types/user-status";
import { toAvatarSrc } from "./utils/avatar";
import { apiUrl } from "./utils/api-base-url";

export type QuickSearchResult = {
    teams: { id: string; name: string }[];
    projects: { id: string; name: string; teamName: string | null }[];
    tasks: {
        id: string;
        title: string;
        workspaceId: string;
        projectName: string;
        workspaceLabel: string | null;
    }[];
};

interface AppHeaderProps {
    onMenuClick: () => void;
    title?: string;
    user?: UserProfile | null;
    /** 설정 시 헤더 검색이 `/api/search/quick`을 호출합니다. */
    accessToken?: string | null;
    /** Enter 시 호출(예: 전체 검색 페이지로 이동). 검색어는 trim 된 상태입니다. */
    onSearchEnter?: (trimmedQuery: string) => void;
    logoutAction: NonNullable<ComponentProps<"form">["action"]>;
    persistUserStatus: (status: UserStatus) => Promise<{ ok: boolean }>;
    onSelectLocale: (locale: Locale) => void | Promise<void>;
}

export function AppHeader({
    onMenuClick,
    title = "",
    user,
    accessToken = null,
    onSearchEnter,
    logoutAction,
    persistUserStatus,
    onSelectLocale,
}: AppHeaderProps) {
    const t = useTranslations("header");
    const tCommon = useTranslations("common");

    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [quickOpen, setQuickOpen] = useState(false);
    const [quickLoading, setQuickLoading] = useState(false);
    const [quickError, setQuickError] = useState(false);
    const [quickData, setQuickData] = useState<QuickSearchResult | null>(null);

    const userMenuRef = useRef<HTMLDivElement | null>(null);
    const quickSearchRef = useRef<HTMLDivElement | null>(null);
    const quickInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const id = window.setTimeout(() => setDebouncedQuery(searchQuery.trim()), 280);
        return () => window.clearTimeout(id);
    }, [searchQuery]);

    useEffect(() => {
        if (!accessToken || debouncedQuery.length < 1) {
            setQuickData(null);
            setQuickLoading(false);
            setQuickError(false);
            return;
        }

        const ac = new AbortController();
        setQuickLoading(true);
        setQuickError(false);

        void (async () => {
            try {
                const res = await fetch(
                    apiUrl(
                        `/api/search/quick?${new URLSearchParams({ q: debouncedQuery, take: "8" })}`,
                    ),
                    {
                        headers: { Authorization: `Bearer ${accessToken}` },
                        signal: ac.signal,
                    },
                );
                const json = (await res.json()) as { data?: QuickSearchResult };
                if (!res.ok) throw new Error("search failed");
                setQuickData(
                    json.data ?? {
                        teams: [],
                        projects: [],
                        tasks: [],
                    },
                );
            } catch (e) {
                if ((e as Error).name === "AbortError") return;
                setQuickError(true);
                setQuickData(null);
            } finally {
                if (!ac.signal.aborted) setQuickLoading(false);
            }
        })();

        return () => ac.abort();
    }, [accessToken, debouncedQuery]);

    useEffect(() => {
        if (!quickOpen) return;
        const onPointerDown = (e: PointerEvent) => {
            if (quickSearchRef.current && !quickSearchRef.current.contains(e.target as Node)) {
                setQuickOpen(false);
                quickInputRef.current?.blur();
            }
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [quickOpen]);

    useEffect(() => {
        if (!quickOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setQuickOpen(false);
                quickInputRef.current?.blur();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [quickOpen]);

    useEffect(() => {
        if (!userMenuOpen) return;
        const onPointerDown = (e: PointerEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [userMenuOpen]);

    const showQuickPanel =
        !!accessToken && quickOpen && debouncedQuery.length >= 1;
    const totalQuickHits =
        (quickData?.teams.length ?? 0) +
        (quickData?.projects.length ?? 0) +
        (quickData?.tasks.length ?? 0);

    return (
        <header className="relative z-50 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-stone-100 bg-white/80 px-3 backdrop-blur-sm sm:gap-3 sm:px-4 md:gap-4">
            {/* 좌측: 사이드바 토글(모바일 전용) */}
            <button
                type="button"
                onClick={onMenuClick}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700 md:hidden"
                aria-label={t("openMenu")}
            >
                <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                    />
                </svg>
            </button>

            {/* 가운데: 검색 */}
            <div className="flex min-w-0 flex-1 items-center justify-center px-1 sm:justify-start">
                <div
                    ref={quickSearchRef}
                    className="relative hidden w-full sm:block sm:max-w-[200px] md:max-w-xs lg:max-w-md"
                >
                    <div
                        className={`
              flex w-full items-center gap-2 rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2 transition-all
              focus-within:border-amber-300 focus-within:ring-2 focus-within:ring-amber-300/20
            `}
                    >
                        <svg
                            className="h-4 w-4 shrink-0 text-stone-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            aria-hidden
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                            />
                        </svg>
                        <input
                            ref={quickInputRef}
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key !== "Enter") return;
                                const trimmed = searchQuery.trim();
                                if (!onSearchEnter || trimmed.length < 1) return;
                                e.preventDefault();
                                onSearchEnter(trimmed);
                                setSearchQuery("");
                                setQuickOpen(false);
                                quickInputRef.current?.blur();
                            }}
                            placeholder={t("searchPlaceholder")}
                            aria-label={`${title} ${tCommon("search")}`}
                            aria-expanded={showQuickPanel}
                            aria-haspopup="listbox"
                            autoComplete="off"
                            onFocus={() => accessToken && setQuickOpen(true)}
                            className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none"
                        />
                    </div>

                    {showQuickPanel && (
                        <div
                            className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-[min(70vh,24rem)] overflow-auto rounded-xl border border-stone-200 bg-white py-2 text-left shadow-lg"
                            role="listbox"
                        >
                            {quickLoading && (
                                <p className="px-3 py-2 text-sm text-stone-500">{t("searchLoading")}</p>
                            )}
                            {!quickLoading && quickError && (
                                <p className="px-3 py-2 text-sm text-red-600">{t("searchError")}</p>
                            )}
                            {!quickLoading && !quickError && quickData && totalQuickHits === 0 && (
                                <p className="px-3 py-2 text-sm text-stone-500">{t("searchEmpty")}</p>
                            )}
                            {!quickLoading && !quickError && quickData && quickData.teams.length > 0 && (
                                <div className="mb-1">
                                    <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
                                        {t("searchSectionTeams")}
                                    </p>
                                    <ul className="space-y-0.5">
                                        {quickData.teams.map((team) => (
                                            <li key={team.id}>
                                                <Link
                                                    href={`/teams/${encodeURIComponent(team.id)}`}
                                                    className="flex flex-col px-3 py-2 text-sm text-stone-800 hover:bg-stone-50"
                                                    onClick={() => {
                                                        setQuickOpen(false);
                                                        setSearchQuery("");
                                                    }}
                                                >
                                                    <span className="truncate font-medium">{team.name}</span>
                                                    <span className="text-xs text-stone-400">{t("searchHintTeam")}</span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {!quickLoading && !quickError && quickData && quickData.projects.length > 0 && (
                                <div className="mb-1">
                                    <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
                                        {t("searchSectionProjects")}
                                    </p>
                                    <ul className="space-y-0.5">
                                        {quickData.projects.map((p) => (
                                            <li key={p.id}>
                                                <Link
                                                    href={`/projects/${encodeURIComponent(p.id)}`}
                                                    className="flex flex-col px-3 py-2 text-sm text-stone-800 hover:bg-stone-50"
                                                    onClick={() => {
                                                        setQuickOpen(false);
                                                        setSearchQuery("");
                                                    }}
                                                >
                                                    <span className="truncate font-medium">{p.name}</span>
                                                    <span className="truncate text-xs text-stone-400">
                                                        {p.teamName
                                                            ? `${p.teamName} · ${t("searchHintProject")}`
                                                            : t("searchHintProject")}
                                                    </span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {!quickLoading && !quickError && quickData && quickData.tasks.length > 0 && (
                                <div>
                                    <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
                                        {t("searchSectionMyTasks")}
                                    </p>
                                    <ul className="space-y-0.5">
                                        {quickData.tasks.map((task) => (
                                            <li key={task.id}>
                                                <Link
                                                    href={`/mywork/${encodeURIComponent(task.workspaceId)}`}
                                                    className="flex flex-col px-3 py-2 text-sm text-stone-800 hover:bg-stone-50"
                                                    onClick={() => {
                                                        setQuickOpen(false);
                                                        setSearchQuery("");
                                                    }}
                                                >
                                                    <span className="truncate font-medium">{task.title}</span>
                                                    <span className="truncate text-xs text-stone-400">
                                                        {task.workspaceLabel
                                                            ? `${task.workspaceLabel} · ${task.projectName}`
                                                            : task.projectName}
                                                    </span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 우측: 언어 + 알림 + 프로필 */}
            <div className="flex items-center gap-1 shrink-0">
                {/* 언어 전환 드롭다운 */}
                <LanguageSelector variant="header" align="right" onSelectLocale={onSelectLocale} />

                {/* 알림 벨 */}
                <NotificationBell />

                {/* 프로필 드롭다운 */}
                <div ref={userMenuRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setUserMenuOpen((v) => !v)}
                        className="flex items-center justify-center rounded-lg p-1 transition-colors hover:bg-stone-100 focus:outline-none"
                        aria-label={t("userMenu")}
                        aria-expanded={userMenuOpen}
                    >
                        <div className="h-8 w-8 overflow-hidden rounded-full">
                            {toAvatarSrc(user?.avatarUrl) ? (
                                <img
                                    src={toAvatarSrc(user?.avatarUrl)!}
                                    alt="avatar"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-amber-100 text-sm font-semibold text-amber-700">
                                    {(user?.name ?? user?.email ?? "?")[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                    </button>

                    {userMenuOpen && (
                        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-stone-200 bg-white shadow-lg">
                            <div className="flex items-center gap-3 rounded-t-xl px-4 py-3">
                                {/* 아바타 */}
                                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full">
                                    {toAvatarSrc(user?.avatarUrl) ? (
                                        <img
                                            src={toAvatarSrc(user?.avatarUrl)!}
                                            alt="avatar"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-amber-100 text-sm font-semibold text-amber-700">
                                            {(user?.name ?? user?.email ?? "?")[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-stone-800">
                                        {user?.name ?? "—"}
                                    </p>
                                    <p className="truncate text-xs text-stone-500">
                                        {user?.email ?? "—"}
                                    </p>
                                    {user?.status && (
                                        <div className="mt-1">
                                            <StatusDropdown
                                                align="right"
                                                persistStatus={persistUserStatus}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="h-px bg-stone-100" />

                            <Link
                                href="/settings"
                                className="flex w-full items-center gap-2 px-4 py-3 text-sm text-stone-700 hover:bg-stone-50"
                                onClick={() => setUserMenuOpen(false)}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="h-4 w-4 shrink-0 text-stone-400"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                                    />
                                </svg>
                                <span>{t("mySettings")}</span>
                            </Link>

                            <div className="h-px bg-stone-100" />

                            <form action={logoutAction}>
                                <button
                                    type="submit"
                                    className="flex w-full items-center justify-between rounded-b-xl px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                                >
                                    <span>{t("logout")}</span>
                                    <svg
                                        className="h-4 w-4 text-red-400"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15"
                                        />
                                    </svg>
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
