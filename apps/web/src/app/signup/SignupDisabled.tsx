"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { setLanguageAction } from "@/app/actions/language";
import { LanguageSelector } from "@repo/ui";

export function SignupDisabled() {
    const t = useTranslations("signup");
    const tAuth = useTranslations("auth");

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f7f5] px-4 py-8 sm:px-6">
            <div className="w-full max-w-[400px]">
                <div className="mb-10 text-center">
                    <span className="inline-block font-sans text-5xl font-semibold tracking-tight text-stone-800">
                        Elivis
                    </span>
                </div>

                <div className="rounded-2xl border border-stone-200/80 bg-white p-8 shadow-sm">
                    <div className="mb-6 border-b border-stone-100 pb-4">
                        <LanguageSelector
                            variant="full"
                            align="right"
                            onSelectLocale={(locale) => void setLanguageAction(locale)}
                        />
                    </div>
                    <h1 className="text-center text-lg font-semibold text-stone-800">{t("disabledTitle")}</h1>
                    <p className="mt-3 text-center text-sm leading-relaxed text-stone-600">
                        {t("disabledBody")}
                    </p>
                    <div className="mt-8 text-center">
                        <Link
                            href="/login"
                            className="inline-flex rounded-xl bg-stone-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
                        >
                            {tAuth("goToLogin")}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
