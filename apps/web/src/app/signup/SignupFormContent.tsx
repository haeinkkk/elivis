"use client";

import { useTranslations } from "next-intl";

import type { SignupActionState } from "@/app/actions/auth";

export function SignupFormContent({
    state,
    isPending,
    showLdapHint,
    showTitle,
    idPrefix = "",
}: {
    state: SignupActionState;
    isPending: boolean;
    showLdapHint: boolean;
    /** 페이지 전용 상단 제목 */
    showTitle?: boolean;
    /** 모달·페이지 동시 마운트 시 input id 충돌 방지 */
    idPrefix?: string;
}) {
    const tAuth = useTranslations("auth");
    const t = useTranslations("signup");
    const p = idPrefix;

    return (
        <>
            {showTitle ? (
                <h1 className="text-center text-lg font-semibold text-stone-800">{t("title")}</h1>
            ) : null}

            {state.error && (
                <p className="whitespace-pre-wrap rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    {state.error}
                </p>
            )}

            <div>
                <label
                    htmlFor={`${p}signup-email`}
                    className="mb-1.5 block text-sm font-medium text-stone-600"
                >
                    {tAuth("emailLabel")}
                </label>
                <input
                    id={`${p}signup-email`}
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder={tAuth("emailPlaceholder")}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/20 disabled:opacity-60"
                    disabled={isPending}
                    required
                />
            </div>

            <div>
                <label
                    htmlFor={`${p}signup-name`}
                    className="mb-1.5 block text-sm font-medium text-stone-600"
                >
                    {t("nameLabel")}
                </label>
                <input
                    id={`${p}signup-name`}
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder={t("namePlaceholder")}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/20 disabled:opacity-60"
                    disabled={isPending}
                />
            </div>

            <div>
                <label
                    htmlFor={`${p}signup-password`}
                    className="mb-1.5 block text-sm font-medium text-stone-600"
                >
                    {tAuth("passwordLabel")}
                </label>
                <input
                    id={`${p}signup-password`}
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder={tAuth("passwordPlaceholder")}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/20 disabled:opacity-60"
                    disabled={isPending}
                    required
                    minLength={8}
                />
            </div>

            <div>
                <label
                    htmlFor={`${p}signup-confirm`}
                    className="mb-1.5 block text-sm font-medium text-stone-600"
                >
                    {t("confirmPasswordLabel")}
                </label>
                <input
                    id={`${p}signup-confirm`}
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder={t("confirmPasswordLabel")}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/20 disabled:opacity-60"
                    disabled={isPending}
                    required
                    minLength={8}
                />
            </div>

            <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl bg-stone-800 py-3 text-sm font-medium text-white transition-all hover:bg-stone-700 active:scale-[0.99] disabled:opacity-70"
            >
                {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        {t("signingUp")}
                    </span>
                ) : (
                    t("signupButton")
                )}
            </button>

            {showLdapHint ? (
                <p className="px-0.5 text-center text-xs text-stone-500">{tAuth("ldapLoginHint")}</p>
            ) : null}
        </>
    );
}
