"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { signupAction } from "@/app/actions/auth";
import { setLanguageAction } from "@/app/actions/language";
import { LanguageSelector } from "@repo/ui";

import { SignupFormContent } from "./SignupFormContent";

const initialState = { error: null };

export interface SignupPageClientProps {
    ldapEnabled: boolean;
}

export function SignupPageClient({ ldapEnabled }: SignupPageClientProps) {
    const tAuth = useTranslations("auth");
    const [state, formAction, isPending] = useActionState(signupAction, initialState);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f7f5] px-4 py-8 sm:px-6">
            <div className="w-full max-w-[400px]">
                <div className="mb-10 text-center">
                    <span className="inline-block font-sans text-5xl font-semibold tracking-tight text-stone-800">
                        Elivis
                    </span>
                </div>

                <div className="rounded-2xl border border-stone-200/80 bg-white shadow-sm shadow-stone-200/50 transition-shadow hover:shadow-md">
                    <div className="border-b border-stone-100 px-5 py-3">
                        <LanguageSelector
                            variant="full"
                            align="right"
                            onSelectLocale={(locale) => void setLanguageAction(locale)}
                        />
                    </div>

                    <form action={formAction} className="space-y-5 p-8">
                        <SignupFormContent
                            state={state}
                            isPending={isPending}
                            showLdapHint={ldapEnabled}
                            showTitle
                        />
                    </form>
                </div>

                <p className="mt-4 text-center text-sm text-stone-600 sm:mt-5">
                    <Link
                        href="/login"
                        className="font-medium text-stone-700 underline-offset-2 hover:text-stone-900 hover:underline"
                    >
                        {tAuth("goToLogin")}
                    </Link>
                </p>
            </div>
        </div>
    );
}
