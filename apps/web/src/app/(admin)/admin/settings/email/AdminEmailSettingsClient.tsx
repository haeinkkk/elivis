"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import {
    patchAdminSmtpAction,
    testAdminSmtpAction,
    type PatchAdminSmtpPayload,
} from "@/app/actions/admin-smtp";
import type { ApiAdminSmtpSettings } from "@/lib/mappers/smtp";

interface AdminEmailSettingsClientProps {
    initial: ApiAdminSmtpSettings;
}

export function AdminEmailSettingsClient({ initial }: AdminEmailSettingsClientProps) {
    const t = useTranslations("admin.emailPage");
    const router = useRouter();

    const [enabled, setEnabled] = useState(initial.enabled);
    const [host, setHost] = useState(initial.host);
    const [port, setPort] = useState(String(initial.port));
    const [secure, setSecure] = useState(initial.secure);
    const [rejectUnauthorized, setRejectUnauthorized] = useState(initial.rejectUnauthorized);
    const [authUser, setAuthUser] = useState(initial.authUser);
    const [authPass, setAuthPass] = useState("");
    const [clearStoredPass, setClearStoredPass] = useState(false);
    const [fromEmail, setFromEmail] = useState(initial.fromEmail);
    const [fromName, setFromName] = useState(initial.fromName);
    const [hasAuthPass, setHasAuthPass] = useState(initial.hasAuthPass);

    const [savePending, startSave] = useTransition();
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveOk, setSaveOk] = useState(false);

    const [testTo, setTestTo] = useState("");
    const [testPending, startTest] = useTransition();
    const [testError, setTestError] = useState<string | null>(null);
    const [testOk, setTestOk] = useState(false);

    useEffect(() => {
        setEnabled(initial.enabled);
        setHost(initial.host);
        setPort(String(initial.port));
        setSecure(initial.secure);
        setRejectUnauthorized(initial.rejectUnauthorized);
        setAuthUser(initial.authUser);
        setFromEmail(initial.fromEmail);
        setFromName(initial.fromName);
        setHasAuthPass(initial.hasAuthPass);
        setAuthPass("");
        setClearStoredPass(false);
    }, [initial]);

    function onSave(e: React.FormEvent) {
        e.preventDefault();
        setSaveError(null);
        setSaveOk(false);

        const portNum = Number.parseInt(port, 10);
        if (!Number.isFinite(portNum) || portNum < 1 || portNum > 65535) {
            setSaveError(t("portInvalid"));
            return;
        }

        startSave(async () => {
            const payload: PatchAdminSmtpPayload = {
                enabled,
                host: host.trim(),
                port: portNum,
                secure,
                rejectUnauthorized,
                authUser: authUser.trim(),
                fromEmail: fromEmail.trim(),
                fromName: fromName.trim(),
            };
            if (clearStoredPass) {
                payload.clearAuthPass = true;
            } else if (authPass.trim().length > 0) {
                payload.authPass = authPass.trim();
            }

            const r = await patchAdminSmtpAction(payload);
            if (!r.ok) {
                setSaveError(r.message);
                return;
            }
            setSaveOk(true);
            setAuthPass("");
            setClearStoredPass(false);
            setHasAuthPass(r.settings.hasAuthPass);
            router.refresh();
        });
    }

    function onTest(e: React.FormEvent) {
        e.preventDefault();
        setTestError(null);
        setTestOk(false);
        startTest(async () => {
            const r = await testAdminSmtpAction(testTo.trim());
            if (!r.ok) {
                setTestError(r.message);
                return;
            }
            setTestOk(true);
        });
    }

    const inputClass =
        "mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-200";

    return (
        <div className="space-y-6">
            <p className="text-sm text-stone-600">{t("intro")}</p>

            <form onSubmit={onSave} className="space-y-6">
                <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                    <div className="border-b border-stone-100 px-5 py-4">
                        <h2 className="text-sm font-semibold text-stone-800">{t("sectionServer")}</h2>
                    </div>
                    <div className="space-y-4 p-5">
                        <label className="flex cursor-pointer items-center gap-3">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                                checked={enabled}
                                onChange={(e) => setEnabled(e.target.checked)}
                            />
                            <span className="text-sm font-medium text-stone-800">{t("enabled")}</span>
                        </label>

                        <div>
                            <label htmlFor="smtp-host" className="text-xs font-medium text-stone-500">
                                {t("host")}
                            </label>
                            <input
                                id="smtp-host"
                                className={inputClass}
                                value={host}
                                onChange={(e) => setHost(e.target.value)}
                                autoComplete="off"
                            />
                        </div>

                        <div>
                            <label htmlFor="smtp-port" className="text-xs font-medium text-stone-500">
                                {t("port")}
                            </label>
                            <input
                                id="smtp-port"
                                type="number"
                                min={1}
                                max={65535}
                                className={inputClass}
                                value={port}
                                onChange={(e) => setPort(e.target.value)}
                            />
                        </div>

                        <label className="flex cursor-pointer items-center gap-3">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                                checked={secure}
                                onChange={(e) => setSecure(e.target.checked)}
                            />
                            <span className="text-sm text-stone-800">{t("secure")}</span>
                        </label>

                        <div>
                            <label className="flex cursor-pointer items-center gap-3">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                                    checked={rejectUnauthorized}
                                    onChange={(e) => setRejectUnauthorized(e.target.checked)}
                                />
                                <span className="text-sm text-stone-800">{t("rejectUnauthorized")}</span>
                            </label>
                            <p className="mt-1 pl-7 text-xs text-stone-500">{t("rejectUnauthorizedHint")}</p>
                        </div>

                        <div>
                            <label htmlFor="smtp-user" className="text-xs font-medium text-stone-500">
                                {t("authUser")}
                            </label>
                            <input
                                id="smtp-user"
                                className={inputClass}
                                value={authUser}
                                onChange={(e) => setAuthUser(e.target.value)}
                                autoComplete="off"
                            />
                        </div>

                        <div>
                            <label htmlFor="smtp-pass" className="text-xs font-medium text-stone-500">
                                {t("authPass")}
                            </label>
                            <input
                                id="smtp-pass"
                                type="password"
                                className={inputClass}
                                value={authPass}
                                onChange={(e) => setAuthPass(e.target.value)}
                                placeholder={t("authPassPlaceholder")}
                                autoComplete="new-password"
                            />
                            {hasAuthPass && (
                                <p className="mt-1 text-xs text-stone-500">{t("authPassHint")}</p>
                            )}
                        </div>

                        <label className="flex cursor-pointer items-center gap-3">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                                checked={clearStoredPass}
                                onChange={(e) => setClearStoredPass(e.target.checked)}
                            />
                            <span className="text-sm text-stone-800">{t("clearAuthPass")}</span>
                        </label>
                    </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                    <div className="border-b border-stone-100 px-5 py-4">
                        <h2 className="text-sm font-semibold text-stone-800">{t("sectionFrom")}</h2>
                    </div>
                    <div className="space-y-4 p-5">
                        <div>
                            <label htmlFor="smtp-from-email" className="text-xs font-medium text-stone-500">
                                {t("fromEmail")}
                            </label>
                            <input
                                id="smtp-from-email"
                                type="email"
                                className={inputClass}
                                value={fromEmail}
                                onChange={(e) => setFromEmail(e.target.value)}
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label htmlFor="smtp-from-name" className="text-xs font-medium text-stone-500">
                                {t("fromName")}
                            </label>
                            <input
                                id="smtp-from-name"
                                className={inputClass}
                                value={fromName}
                                onChange={(e) => setFromName(e.target.value)}
                                autoComplete="off"
                            />
                        </div>
                    </div>
                </section>

                {saveError && (
                    <p className="text-sm text-red-600" role="alert">
                        {saveError}
                    </p>
                )}
                {saveOk && <p className="text-sm text-emerald-700">{t("saveSuccess")}</p>}

                <button
                    type="submit"
                    disabled={savePending}
                    className="inline-flex items-center justify-center rounded-xl bg-stone-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-60"
                >
                    {savePending ? t("saving") : t("save")}
                </button>
            </form>

            <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                <div className="border-b border-stone-100 px-5 py-4">
                    <h2 className="text-sm font-semibold text-stone-800">{t("sectionTest")}</h2>
                </div>
                <form onSubmit={onTest} className="space-y-4 p-5">
                    <div>
                        <label htmlFor="smtp-test-to" className="text-xs font-medium text-stone-500">
                            {t("testTo")}
                        </label>
                        <input
                            id="smtp-test-to"
                            type="email"
                            className={inputClass}
                            value={testTo}
                            onChange={(e) => setTestTo(e.target.value)}
                            autoComplete="off"
                        />
                    </div>
                    {testError && (
                        <p className="text-sm text-red-600" role="alert">
                            {testError}
                        </p>
                    )}
                    {testOk && <p className="text-sm text-emerald-700">{t("testSuccess")}</p>}
                    <button
                        type="submit"
                        disabled={testPending || !testTo.trim()}
                        className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50 disabled:opacity-60"
                    >
                        {testPending ? t("testSending") : t("testSubmit")}
                    </button>
                </form>
            </section>
        </div>
    );
}
