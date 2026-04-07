"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import {
    patchAdminAuthSettingsAction,
    testAdminLdapAuthAction,
} from "@/app/actions/admin-auth-settings";
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

export function AdminLdapSettingsClient({ initial }: { initial: ApiAdminAuthSettings }) {
    const t = useTranslations("admin.securityLdapPage");
    const locale = useLocale();
    const router = useRouter();

    const [enabled, setEnabled] = useState(initial.ldap.enabled);
    const [url, setUrl] = useState(initial.ldap.url);
    const [userDnTemplate, setUserDnTemplate] = useState(initial.ldap.userDnTemplate);
    const [bindDn, setBindDn] = useState(initial.ldap.bindDn);
    const [bindPass, setBindPass] = useState("");
    const [clearBindPass, setClearBindPass] = useState(false);
    const [searchBase, setSearchBase] = useState(initial.ldap.searchBase);
    const [searchFilter, setSearchFilter] = useState(initial.ldap.searchFilter);
    const [nameAttribute, setNameAttribute] = useState(initial.ldap.nameAttribute);
    const [timeoutMs, setTimeoutMs] = useState(String(initial.ldap.timeoutMs));
    const [updatedAt, setUpdatedAt] = useState(initial.updatedAt);
    const [hasBindPassword, setHasBindPassword] = useState(initial.ldap.hasBindPassword);

    const [savePending, startSave] = useTransition();
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveOk, setSaveOk] = useState(false);

    const [testEmail, setTestEmail] = useState("");
    const [testPassword, setTestPassword] = useState("");
    const [testPending, startTest] = useTransition();
    const [testError, setTestError] = useState<string | null>(null);
    const [testOk, setTestOk] = useState(false);

    useEffect(() => {
        const l = initial.ldap;
        setEnabled(l.enabled);
        setUrl(l.url);
        setUserDnTemplate(l.userDnTemplate);
        setBindDn(l.bindDn);
        setBindPass("");
        setClearBindPass(false);
        setSearchBase(l.searchBase);
        setSearchFilter(l.searchFilter);
        setNameAttribute(l.nameAttribute);
        setTimeoutMs(String(l.timeoutMs));
        setUpdatedAt(initial.updatedAt);
        setHasBindPassword(l.hasBindPassword);
    }, [initial]);

    const dirty = useMemo(() => {
        const l0 = initial.ldap;
        const tm = Number.parseInt(timeoutMs, 10);
        const tmOk = Number.isFinite(tm) ? tm : l0.timeoutMs;
        return (
            enabled !== l0.enabled ||
            url.trim() !== l0.url.trim() ||
            userDnTemplate.trim() !== l0.userDnTemplate.trim() ||
            bindDn.trim() !== l0.bindDn.trim() ||
            searchBase.trim() !== l0.searchBase.trim() ||
            searchFilter.trim() !== l0.searchFilter.trim() ||
            nameAttribute.trim() !== l0.nameAttribute.trim() ||
            tmOk !== l0.timeoutMs ||
            bindPass.trim().length > 0 ||
            clearBindPass
        );
    }, [
        initial.ldap,
        enabled,
        url,
        userDnTemplate,
        bindDn,
        searchBase,
        searchFilter,
        nameAttribute,
        timeoutMs,
        bindPass,
        clearBindPass,
    ]);

    const ldapTabVisible = enabled && url.trim().length > 0;

    function onSave() {
        setSaveError(null);
        setSaveOk(false);
        const tm = Number.parseInt(timeoutMs, 10);
        if (!Number.isFinite(tm) || tm < 1000 || tm > 120_000) {
            setSaveError(t("timeoutMs"));
            return;
        }

        startSave(async () => {
            const payload: Parameters<typeof patchAdminAuthSettingsAction>[0] = {
                ldapEnabled: enabled,
                ldapUrl: url.trim(),
                ldapUserDnTemplate: userDnTemplate.trim(),
                ldapBindDn: bindDn.trim(),
                ldapSearchBase: searchBase.trim(),
                ldapSearchFilter: searchFilter.trim() || "(mail={{email}})",
                ldapNameAttribute: nameAttribute.trim() || "cn",
                ldapTimeoutMs: tm,
            };
            if (clearBindPass) {
                payload.clearLdapBindPassword = true;
            } else if (bindPass.trim().length > 0) {
                payload.ldapBindPassword = bindPass.trim();
            }

            const r = await patchAdminAuthSettingsAction(payload);
            if (!r.ok) {
                setSaveError(r.message);
                return;
            }
            setSaveOk(true);
            setBindPass("");
            setClearBindPass(false);
            setUpdatedAt(r.settings.updatedAt);
            setHasBindPassword(r.settings.ldap.hasBindPassword);
            router.refresh();
        });
    }

    function onTest(e: React.FormEvent) {
        e.preventDefault();
        setTestError(null);
        setTestOk(false);
        startTest(async () => {
            const r = await testAdminLdapAuthAction(testEmail, testPassword);
            if (!r.ok) {
                setTestError(r.message);
                return;
            }
            setTestOk(true);
            setTestPassword("");
        });
    }

    const inputClass =
        "mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-200";

    return (
        <div className="w-full max-w-full space-y-6">
            <div>
                <h1 className="text-lg font-semibold text-stone-800">{t("pageTitle")}</h1>
                <p className="mt-2 text-sm text-stone-600">{t("intro")}</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <label className="flex cursor-pointer items-start gap-3">
                    <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                        checked={enabled}
                        onChange={(e) => {
                            setEnabled(e.target.checked);
                            setSaveOk(false);
                        }}
                        disabled={savePending}
                    />
                    <span className="text-sm font-semibold text-stone-800">{t("enabled")}</span>
                </label>

                <div className="mt-5 space-y-4">
                    <div>
                        <label htmlFor="ldap-url" className="text-xs font-medium text-stone-500">
                            {t("url")}
                        </label>
                        <input
                            id="ldap-url"
                            className={inputClass}
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="ldaps://…"
                            autoComplete="off"
                            disabled={savePending}
                        />
                        <p className="mt-1 text-xs text-stone-500">{t("urlHint")}</p>
                    </div>

                    <div>
                        <label htmlFor="ldap-dn-template" className="text-xs font-medium text-stone-500">
                            {t("userDnTemplate")}
                        </label>
                        <input
                            id="ldap-dn-template"
                            className={inputClass}
                            value={userDnTemplate}
                            onChange={(e) => setUserDnTemplate(e.target.value)}
                            placeholder="uid={{localPart}},ou=users,dc=example,dc=com"
                            autoComplete="off"
                            disabled={savePending}
                        />
                        <p className="mt-1 text-xs text-stone-500">{t("userDnTemplateHint")}</p>
                    </div>

                    <div>
                        <label htmlFor="ldap-search-base" className="text-xs font-medium text-stone-500">
                            {t("searchBase")}
                        </label>
                        <input
                            id="ldap-search-base"
                            className={inputClass}
                            value={searchBase}
                            onChange={(e) => setSearchBase(e.target.value)}
                            autoComplete="off"
                            disabled={savePending}
                        />
                    </div>

                    <div>
                        <label htmlFor="ldap-filter" className="text-xs font-medium text-stone-500">
                            {t("searchFilter")}
                        </label>
                        <input
                            id="ldap-filter"
                            className={inputClass}
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            autoComplete="off"
                            disabled={savePending}
                        />
                        <p className="mt-1 text-xs text-stone-500">{t("searchFilterHint")}</p>
                    </div>

                    <div>
                        <label htmlFor="ldap-bind-dn" className="text-xs font-medium text-stone-500">
                            {t("bindDn")}
                        </label>
                        <input
                            id="ldap-bind-dn"
                            className={inputClass}
                            value={bindDn}
                            onChange={(e) => setBindDn(e.target.value)}
                            autoComplete="off"
                            disabled={savePending}
                        />
                    </div>

                    <div>
                        <label htmlFor="ldap-bind-pass" className="text-xs font-medium text-stone-500">
                            {t("bindPassword")}
                        </label>
                        <input
                            id="ldap-bind-pass"
                            type="password"
                            className={inputClass}
                            value={bindPass}
                            onChange={(e) => setBindPass(e.target.value)}
                            placeholder={t("bindPasswordPlaceholder")}
                            autoComplete="new-password"
                            disabled={savePending}
                        />
                        {hasBindPassword ? (
                            <p className="mt-1 text-xs text-stone-500">{t("bindPasswordHint")}</p>
                        ) : null}
                        <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-stone-600">
                            <input
                                type="checkbox"
                                className="h-3.5 w-3.5 rounded border-stone-300 text-orange-600"
                                checked={clearBindPass}
                                onChange={(e) => setClearBindPass(e.target.checked)}
                                disabled={savePending}
                            />
                            {t("clearBindPassword")}
                        </label>
                    </div>

                    <div>
                        <label htmlFor="ldap-name-attr" className="text-xs font-medium text-stone-500">
                            {t("nameAttribute")}
                        </label>
                        <input
                            id="ldap-name-attr"
                            className={inputClass}
                            value={nameAttribute}
                            onChange={(e) => setNameAttribute(e.target.value)}
                            autoComplete="off"
                            disabled={savePending}
                        />
                    </div>

                    <div>
                        <label htmlFor="ldap-timeout" className="text-xs font-medium text-stone-500">
                            {t("timeoutMs")}
                        </label>
                        <input
                            id="ldap-timeout"
                            type="number"
                            min={1000}
                            max={120000}
                            className={inputClass}
                            value={timeoutMs}
                            onChange={(e) => setTimeoutMs(e.target.value)}
                            disabled={savePending}
                        />
                    </div>
                </div>

                <p className="mt-4 text-xs text-stone-500">
                    {t("updatedAtLabel")}: {formatUpdated(updatedAt, locale)}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={savePending || !dirty}
                        className="rounded-xl bg-stone-800 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-40"
                    >
                        {savePending ? t("saving") : t("save")}
                    </button>
                    {saveError && (
                        <p className="text-xs text-red-600" role="alert">
                            {saveError}
                        </p>
                    )}
                    {saveOk && !saveError && (
                        <p className="text-xs text-green-600" role="status">
                            {t("saveSuccess")}
                        </p>
                    )}
                </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">{t("statusLabel")}</p>
                <p className="mt-2 text-sm font-medium text-stone-800">
                    {ldapTabVisible ? (
                        <span className="inline-flex items-center rounded-lg bg-green-50 px-2.5 py-1 text-green-800">
                            {t("statusOn")}
                        </span>
                    ) : (
                        <span className="inline-flex items-center rounded-lg bg-stone-100 px-2.5 py-1 text-stone-700">
                            {t("statusOff")}
                        </span>
                    )}
                </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-stone-800">{t("testSection")}</h2>
                <form onSubmit={onTest} className="mt-4 space-y-4">
                    <div>
                        <label htmlFor="ldap-test-email" className="text-xs font-medium text-stone-500">
                            {t("testEmail")}
                        </label>
                        <input
                            id="ldap-test-email"
                            type="email"
                            className={inputClass}
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            autoComplete="off"
                            disabled={testPending}
                        />
                    </div>
                    <div>
                        <label htmlFor="ldap-test-pass" className="text-xs font-medium text-stone-500">
                            {t("testPassword")}
                        </label>
                        <input
                            id="ldap-test-pass"
                            type="password"
                            className={inputClass}
                            value={testPassword}
                            onChange={(e) => setTestPassword(e.target.value)}
                            autoComplete="off"
                            disabled={testPending}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={testPending}
                        className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50"
                    >
                        {testPending ? t("testing") : t("testButton")}
                    </button>
                    {testError && (
                        <p className="text-xs text-red-600" role="alert">
                            {testError}
                        </p>
                    )}
                    {testOk && !testError && (
                        <p className="text-xs text-green-600" role="status">
                            {t("testOk")}
                        </p>
                    )}
                </form>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold text-stone-700">{t("hintTitle")}</p>
                <p className="mt-2 whitespace-pre-line text-sm text-stone-600">{t("hintBody")}</p>
            </div>
        </div>
    );
}
