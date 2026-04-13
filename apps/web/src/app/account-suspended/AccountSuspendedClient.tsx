"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { LanguageSelector } from "@repo/ui";

import { setLanguageAction } from "@/app/actions/language";

export function AccountSuspendedClient() {
    const t = useTranslations("accountSuspended");
    const searchParams = useSearchParams();
    const raw = searchParams.get("reason");
    let reasonText: string | null = null;
    if (raw) {
        try {
            reasonText = decodeURIComponent(raw);
        } catch {
            reasonText = raw;
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-stretch justify-center bg-[#f8f7f5] dark:bg-elivis-bg px-4 py-8 sm:px-6 md:px-8">
            <div className="mx-auto w-full max-w-3xl">
                <div className="mb-6 text-center sm:mb-8">
                    <span className="inline-block font-sans text-3xl font-semibold tracking-tight text-stone-800 dark:text-elivis-ink sm:text-4xl md:text-5xl">
                        Elivis
                    </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white dark:bg-elivis-surface shadow-sm shadow-stone-200/50">
                    <div className="border-b border-stone-100 dark:border-elivis-line px-4 py-3 sm:px-5">
                        <LanguageSelector
                            variant="full"
                            align="right"
                            onSelectLocale={(locale) => void setLanguageAction(locale)}
                        />
                    </div>

                    <div className="space-y-4 px-5 py-8 sm:px-8 sm:py-10 md:px-10 md:py-12">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30 sm:h-12 sm:w-12">
                                <svg
                                    className="h-6 w-6 text-red-600 dark:text-red-400 sm:h-7 sm:w-7"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    aria-hidden
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                                    />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1 text-left">
                                <h1 className="text-lg font-semibold text-stone-900 dark:text-elivis-ink sm:text-xl">
                                    {t("title")}
                                </h1>
                                <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-elivis-ink-secondary sm:text-base">
                                    {t("body")}
                                </p>
                            </div>
                        </div>

                        {reasonText ? (
                            <div className="rounded-xl border border-stone-200 dark:border-elivis-line bg-stone-50/80 dark:bg-elivis-surface/80 px-4 py-3 sm:px-5 sm:py-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-elivis-ink-secondary">
                                    {t("reasonHeading")}
                                </p>
                                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-800 dark:text-elivis-ink sm:text-base">
                                    {reasonText}
                                </p>
                            </div>
                        ) : null}

                        <div className="pt-2">
                            <Link
                                href="/login"
                                className="inline-flex w-full items-center justify-center rounded-xl bg-stone-800 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-700 sm:w-auto sm:min-w-[200px]"
                            >
                                {t("backToLogin")}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
