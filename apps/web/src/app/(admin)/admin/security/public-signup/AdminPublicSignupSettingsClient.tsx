"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { patchAdminAuthSettingsAction } from "@/app/actions/admin-auth-settings";
import type { ApiAdminAuthSettings } from "@/lib/mappers/auth-settings";

function formatUpdated(iso: string, locale: string): string {
    if (!iso) return "—";
    try {
        return new Intl.DateTimeFormat(locale, {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(new Date(iso));
    } catch {
        return iso;
    }
}

export function AdminPublicSignupSettingsClient({ initial }: { initial: ApiAdminAuthSettings }) {
    const t = useTranslations("admin.securitySignupPage");
    const locale = useLocale();
    const router = useRouter();
    const [enabled, setEnabled] = useState(initial.publicSignupEnabled);
    const [updatedAt, setUpdatedAt] = useState(initial.updatedAt);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [pending, startTransition] = useTransition();

    useEffect(() => {
        setEnabled(initial.publicSignupEnabled);
        setUpdatedAt(initial.updatedAt);
    }, [initial.publicSignupEnabled, initial.updatedAt]);

    function onSave() {
        setError(null);
        setSuccess(false);
        startTransition(async () => {
            const r = await patchAdminAuthSettingsAction({ publicSignupEnabled: enabled });
            if (!r.ok) {
                setError(r.message);
                return;
            }
            setUpdatedAt(r.settings.updatedAt);
            setSuccess(true);
            router.refresh();
        });
    }

    const dirty = enabled !== initial.publicSignupEnabled;

    return (
        <div className="w-full max-w-full space-y-6">
            <div>
                <h1 className="text-lg font-semibold text-stone-800 dark:text-elivis-ink">{t("pageTitle")}</h1>
                <p className="mt-2 text-sm text-stone-600 dark:text-elivis-ink-secondary">{t("intro")}</p>
            </div>

            <div className="rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface p-6 shadow-sm">
                <label className="flex cursor-pointer items-start gap-3">
                    <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-stone-300 dark:border-elivis-line text-orange-600 focus:ring-orange-500"
                        checked={enabled}
                        onChange={(e) => {
                            setEnabled(e.target.checked);
                            setSuccess(false);
                        }}
                        disabled={pending}
                    />
                    <div className="min-w-0 flex-1">
                        <span className="text-sm font-semibold text-stone-800 dark:text-elivis-ink">{t("toggleLabel")}</span>
                        <p className="mt-1 text-xs text-stone-500 dark:text-elivis-ink-secondary">
                            {t("updatedAtLabel")}: {formatUpdated(updatedAt, locale)}
                        </p>
                    </div>
                </label>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={pending || !dirty}
                        className="rounded-xl bg-stone-800 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-40"
                    >
                        {pending ? t("saving") : t("save")}
                    </button>
                    {error && (
                        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                            {error}
                        </p>
                    )}
                    {success && !error && (
                        <p className="text-xs text-green-600" role="status">
                            {t("saveSuccess")}
                        </p>
                    )}
                </div>
            </div>

            <div className="rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface p-6 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400 dark:text-elivis-ink-secondary">{t("statusLabel")}</p>
                <p className="mt-2 text-sm font-medium text-stone-800 dark:text-elivis-ink">
                    {enabled ? (
                        <span className="inline-flex items-center rounded-lg bg-green-50 dark:bg-green-950/30 px-2.5 py-1 text-green-800">
                            {t("statusOn")}
                        </span>
                    ) : (
                        <span className="inline-flex items-center rounded-lg bg-stone-100 dark:bg-elivis-surface-elevated px-2.5 py-1 text-stone-700 dark:text-elivis-ink">
                            {t("statusOff")}
                        </span>
                    )}
                </p>
                <div className="mt-6 border-t border-stone-100 dark:border-elivis-line pt-6">
                    <p className="text-xs font-semibold text-stone-700 dark:text-elivis-ink">{t("hintTitle")}</p>
                    <p className="mt-2 whitespace-pre-line text-sm text-stone-600 dark:text-elivis-ink-secondary">{t("hintBody")}</p>
                </div>
            </div>
        </div>
    );
}
