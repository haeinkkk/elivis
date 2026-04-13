"use client";

import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Locale } from "@repo/i18n";

import { DarkModeSwitch } from "./theme/DarkModeSwitch";
import { LanguageSelector } from "./LanguageSelector";
import { StatusDropdown } from "./StatusDropdown";
import type { UserProfile } from "./types/user-profile";
import type { UserStatus } from "./types/user-status";
import { toAvatarSrc } from "./utils/avatar";

interface AdminHeaderProps {
    onMenuClick: () => void;
    title?: string;
    user?: UserProfile | null;
    logoutAction: NonNullable<ComponentProps<"form">["action"]>;
    persistUserStatus: (status: UserStatus) => Promise<{ ok: boolean }>;
    onSelectLocale: (locale: Locale) => void | Promise<void>;
}

/** 일반 AppHeader와 동일한 우측(언어·프로필) 동작, 검색 영역 없음 */
export function AdminHeader({
    onMenuClick,
    title = "",
    user,
    logoutAction,
    persistUserStatus,
    onSelectLocale,
}: AdminHeaderProps) {
    const t = useTranslations("header");
    const tAdmin = useTranslations("admin.header");

    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement | null>(null);

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

    return (
        <header className="relative z-50 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-stone-100 dark:border-elivis-line bg-white/80 dark:bg-elivis-surface/90 px-3 backdrop-blur-sm sm:gap-3 sm:px-4 md:gap-4">
            <button
                type="button"
                onClick={onMenuClick}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 dark:text-elivis-ink-secondary transition-colors hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated hover:text-stone-700 md:hidden"
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

            <div className="flex min-w-0 flex-1 items-center px-1 sm:px-2">
                {title ? (
                    <h1 className="truncate text-sm font-semibold text-stone-800 dark:text-elivis-ink sm:text-base">
                        {title}
                    </h1>
                ) : (
                    <span className="text-sm text-stone-400 dark:text-elivis-ink-secondary">{tAdmin("fallback")}</span>
                )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
                <DarkModeSwitch />
                <LanguageSelector variant="header" align="right" onSelectLocale={onSelectLocale} />

                <div ref={userMenuRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setUserMenuOpen((v) => !v)}
                        className="flex items-center justify-center rounded-lg p-1 transition-colors hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated focus:outline-none"
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
                                <div className="flex h-full w-full items-center justify-center bg-amber-100 dark:bg-elivis-accent-strong/35 text-sm font-semibold text-amber-700 dark:text-elivis-accent-hover">
                                    {(user?.name ?? user?.email ?? "?")[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                    </button>

                    {userMenuOpen && (
                        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface shadow-lg dark:shadow-none">
                            <div className="flex items-center gap-3 rounded-t-xl px-4 py-3">
                                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full">
                                    {toAvatarSrc(user?.avatarUrl) ? (
                                        <img
                                            src={toAvatarSrc(user?.avatarUrl)!}
                                            alt="avatar"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-amber-100 dark:bg-elivis-accent-strong/35 text-sm font-semibold text-amber-700 dark:text-elivis-accent-hover">
                                            {(user?.name ?? user?.email ?? "?")[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-stone-800 dark:text-elivis-ink">
                                        {user?.name ?? "—"}
                                    </p>
                                    <p className="truncate text-xs text-stone-500 dark:text-elivis-ink-secondary">
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

                            <div className="h-px bg-stone-100 dark:bg-elivis-surface-elevated" />

                            <Link
                                href="/settings"
                                className="flex w-full items-center gap-2 px-4 py-3 text-sm text-stone-700 dark:text-elivis-ink hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated"
                                onClick={() => setUserMenuOpen(false)}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="h-4 w-4 shrink-0 text-stone-400 dark:text-elivis-ink-secondary"
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

                            <div className="h-px bg-stone-100 dark:bg-elivis-surface-elevated" />

                            <form action={logoutAction}>
                                <button
                                    type="submit"
                                    className="flex w-full items-center justify-between rounded-b-xl px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
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
