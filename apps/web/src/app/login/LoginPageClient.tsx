"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { loginAction } from "@/app/actions/auth";
import { setLanguageAction } from "@/app/actions/language";
import { LanguageSelector } from "@repo/ui";

import { SignupModal } from "./SignupModal";

const initialState = { error: null };
const SAVED_EMAIL_KEY = "elivis_saved_email";
const REMEMBER_PREF_KEY = "elivis_remember_pref";

export interface LoginPageClientProps {
    publicSignupEnabled: boolean;
    ldapEnabled: boolean;
}

export function LoginPageClient({ publicSignupEnabled, ldapEnabled }: LoginPageClientProps) {
    const t = useTranslations("auth");
    const [state, formAction, isPending] = useActionState(loginAction, initialState);

    const [emailValue, setEmailValue] = useState("");
    const [rememberEmail, setRememberEmail] = useState(false);
    const [loginTab, setLoginTab] = useState<"local" | "ldap">("local");
    const [signupOpen, setSignupOpen] = useState(false);

    useEffect(() => {
        const pref = localStorage.getItem(REMEMBER_PREF_KEY) === "1";
        const saved = localStorage.getItem(SAVED_EMAIL_KEY) ?? "";
        setRememberEmail(pref);
        if (pref && saved) setEmailValue(saved);
    }, []);

    function handleRememberChange(checked: boolean) {
        setRememberEmail(checked);
        localStorage.setItem(REMEMBER_PREF_KEY, checked ? "1" : "0");
        if (!checked) localStorage.removeItem(SAVED_EMAIL_KEY);
    }

    function handleSubmit() {
        if (rememberEmail && emailValue) {
            localStorage.setItem(SAVED_EMAIL_KEY, emailValue);
        } else {
            localStorage.removeItem(SAVED_EMAIL_KEY);
        }
    }

    const loginMode = ldapEnabled ? loginTab : "local";

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f7f5] dark:bg-elivis-bg px-4 py-8 sm:px-6">
            <div className="w-full max-w-[400px]">
                <div className="mb-10 text-center">
                    <span className="inline-block font-sans text-5xl font-semibold tracking-tight text-stone-800 dark:text-elivis-ink">
                        Elivis
                    </span>
                </div>

                <div className="rounded-2xl border border-stone-200/80 bg-white dark:bg-elivis-surface shadow-sm shadow-stone-200/50 transition-shadow hover:shadow-md">
                    <div className="border-b border-stone-100 dark:border-elivis-line px-5 py-3">
                        <LanguageSelector
                            variant="full"
                            align="right"
                            onSelectLocale={(locale) => void setLanguageAction(locale)}
                        />
                    </div>

                    {ldapEnabled ? (
                        <div
                            className="flex border-b border-stone-100 dark:border-elivis-line p-1.5"
                            role="tablist"
                            aria-label={t("loginTabsAria")}
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={loginTab === "local"}
                                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                                    loginTab === "local"
                                        ? "bg-orange-50 text-orange-900 shadow-sm"
                                        : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
                                }`}
                                onClick={() => setLoginTab("local")}
                            >
                                {t("loginTabLocal")}
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={loginTab === "ldap"}
                                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                                    loginTab === "ldap"
                                        ? "bg-orange-50 text-orange-900 shadow-sm"
                                        : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
                                }`}
                                onClick={() => setLoginTab("ldap")}
                            >
                                {t("loginTabLdap")}
                            </button>
                        </div>
                    ) : null}

                    <form action={formAction} onSubmit={handleSubmit} className="space-y-5 p-8">
                        <input type="hidden" name="loginMode" value={loginMode} />

                        {ldapEnabled && loginTab === "ldap" ? (
                            <p className="text-xs leading-relaxed text-stone-500 dark:text-elivis-ink-secondary">{t("ldapTabHelp")}</p>
                        ) : null}

                        {state.error && (
                            <p className="whitespace-pre-wrap rounded-xl bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                                {state.error}
                            </p>
                        )}

                        <div>
                            <label
                                htmlFor="email"
                                className="mb-1.5 block text-sm font-medium text-stone-600 dark:text-elivis-ink-secondary"
                            >
                                {t("emailLabel")}
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                placeholder={t("emailPlaceholder")}
                                value={emailValue}
                                onChange={(e) => setEmailValue(e.target.value)}
                                className="w-full rounded-xl border border-stone-200 dark:border-elivis-line bg-stone-50/50 px-4 py-3 text-stone-800 dark:text-elivis-ink placeholder:text-stone-400 dark:placeholder:text-elivis-ink-muted focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/20 disabled:opacity-60"
                                disabled={isPending}
                                required
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="mb-1.5 block text-sm font-medium text-stone-600 dark:text-elivis-ink-secondary"
                            >
                                {t("passwordLabel")}
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                placeholder={t("passwordPlaceholder")}
                                className="w-full rounded-xl border border-stone-200 dark:border-elivis-line bg-stone-50/50 px-4 py-3 text-stone-800 dark:text-elivis-ink placeholder:text-stone-400 dark:placeholder:text-elivis-ink-muted focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/20 disabled:opacity-60"
                                disabled={isPending}
                                required
                            />
                        </div>

                        <label className="flex cursor-pointer items-center gap-2.5 select-none">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    checked={rememberEmail}
                                    onChange={(e) => handleRememberChange(e.target.checked)}
                                    className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-stone-300 dark:border-elivis-line bg-white dark:bg-elivis-surface transition-colors checked:border-amber-400 checked:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300/30 disabled:opacity-60"
                                    disabled={isPending}
                                />
                                <svg
                                    className="pointer-events-none absolute left-0.5 top-0.5 h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="m1.5 6 3 3 6-6"
                                    />
                                </svg>
                            </div>
                            <span className="text-sm text-stone-500 dark:text-elivis-ink-secondary">{t("rememberEmail")}</span>
                        </label>

                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full rounded-xl bg-stone-800 py-3 text-sm font-medium text-white transition-all hover:bg-stone-700 active:scale-[0.99] disabled:opacity-70"
                        >
                            {isPending ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    {t("loggingIn")}
                                </span>
                            ) : (
                                t("loginButton")
                            )}
                        </button>
                    </form>

                    {publicSignupEnabled ? (
                        <div className="border-t border-stone-100 px-8 pb-8 pt-5 dark:border-elivis-line">
                            <button
                                type="button"
                                onClick={() => setSignupOpen(true)}
                                className="flex w-full items-center justify-center rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 shadow-sm transition-colors hover:border-amber-300/80 hover:bg-orange-50/50 hover:text-orange-950 dark:border-elivis-line dark:bg-elivis-surface dark:text-elivis-ink"
                            >
                                {t("signupButton")}
                            </button>
                        </div>
                    ) : null}
                </div>

                <SignupModal
                    open={signupOpen}
                    onClose={() => setSignupOpen(false)}
                    ldapEnabled={ldapEnabled}
                />
            </div>
        </div>
    );
}
