"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

import { signupAction } from "@/app/actions/auth";
import { SignupFormContent } from "@/app/signup/SignupFormContent";

const initialState = { error: null };

export function SignupModal({
    open,
    onClose,
    ldapEnabled,
}: {
    open: boolean;
    onClose: () => void;
    ldapEnabled: boolean;
}) {
    const t = useTranslations("signup");
    const tAuth = useTranslations("auth");
    const [state, formAction, isPending] = useActionState(signupAction, initialState);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !isPending) onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, isPending, onClose]);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    if (!mounted || !open) return null;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="signup-modal-title"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-[2px]"
            onPointerDown={(e) => {
                if (e.target === e.currentTarget && !isPending) onClose();
            }}
        >
            <div className="relative w-full max-w-[400px] rounded-2xl border border-stone-200/80 bg-white dark:bg-elivis-surface shadow-xl shadow-stone-300/40">
                <div className="flex items-center justify-between gap-3 border-b border-stone-100 dark:border-elivis-line px-5 py-3">
                    <h2 id="signup-modal-title" className="text-base font-semibold text-stone-800 dark:text-elivis-ink">
                        {t("title")}
                    </h2>
                    <button
                        type="button"
                        onClick={() => !isPending && onClose()}
                        className="rounded-lg px-2 py-1 text-sm font-medium text-stone-500 dark:text-elivis-ink-secondary transition-colors hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated hover:text-stone-800"
                        aria-label={tAuth("signupModalClose")}
                    >
                        {tAuth("signupModalClose")}
                    </button>
                </div>

                <form action={formAction} className="space-y-5 p-6 sm:p-8">
                    <SignupFormContent
                        state={state}
                        isPending={isPending}
                        showLdapHint={ldapEnabled}
                        idPrefix="modal-"
                    />
                </form>
            </div>
        </div>,
        document.body,
    );
}
