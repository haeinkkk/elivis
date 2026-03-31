"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { updateAdminUserAction } from "@/app/actions/admin";
import type { AdminUserDetail } from "@/lib/admin.server";

interface AdminEditUserClientProps {
    user: AdminUserDetail;
    isSelf: boolean;
}

function formatDate(
    iso: string,
    locale: string,
    opts?: Intl.DateTimeFormatOptions,
): string {
    try {
        return new Intl.DateTimeFormat(locale, opts ?? { dateStyle: "long" }).format(new Date(iso));
    } catch {
        return iso;
    }
}

function RoleBadge({ role }: { role: "SUPER_ADMIN" | "USER" }) {
    const t = useTranslations("domain.systemRole");
    return role === "SUPER_ADMIN" ? (
        <span className="inline-flex items-center rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
            {t("SUPER_ADMIN")}
        </span>
    ) : (
        <span className="inline-flex items-center rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">
            {t("USER")}
        </span>
    );
}

/* ──────────────────────────────────────────────
   사용자 정보 섹션
────────────────────────────────────────────── */
function InfoSection({
    user,
    isSelf,
}: {
    user: AdminUserDetail;
    isSelf: boolean;
}) {
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations("admin.detail");
    const tList = useTranslations("adminUsers");
    const [pending, startTransition] = useTransition();
    const [name, setName] = useState(user.name ?? "");
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) {
            setError(t("nameRequired"));
            return;
        }
        setError(null); setSuccess(false);
        startTransition(async () => {
            const result = await updateAdminUserAction(user.id, { name: name.trim() });
            if (!result.ok) { setError(result.message); return; }
            setSuccess(true);
            router.refresh();
        });
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-stone-800">{t("sectionUserInfo")}</h2>
            </div>
            <form onSubmit={onSubmit} className="divide-y divide-stone-100">
                {/* 이메일 */}
                <div className="flex items-center gap-4 px-5 py-4">
                    <span className="w-24 shrink-0 text-xs font-medium text-stone-500">{t("email")}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-stone-700">{user.email}</span>
                </div>

                {/* 이름 */}
                <div className="flex items-start gap-4 px-5 py-4">
                    <label htmlFor="edit-name" className="mt-2.5 w-24 shrink-0 text-xs font-medium text-stone-500">
                        {t("name")}
                    </label>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                        <input
                            id="edit-name"
                            type="text"
                            required
                            disabled={pending}
                            value={name}
                            onChange={(e) => { setName(e.target.value); setError(null); setSuccess(false); }}
                            className="w-full max-w-xs rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none transition-colors focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-200 disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={pending || name.trim() === (user.name ?? "")}
                            className="shrink-0 rounded-xl bg-stone-800 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-40"
                        >
                            {pending ? t("saving") : t("save")}
                        </button>
                    </div>
                </div>

                {/* 역할 (읽기 전용) */}
                <div className="flex items-center gap-4 px-5 py-4">
                    <span className="w-24 shrink-0 text-xs font-medium text-stone-500">{t("role")}</span>
                    <div className="flex items-center gap-2">
                        <RoleBadge role={user.systemRole} />
                        {isSelf && <span className="text-xs text-stone-400">{tList("selfSuffix")}</span>}
                    </div>
                </div>

                {/* 가입일 */}
                <div className="flex items-center gap-4 px-5 py-4">
                    <span className="w-24 shrink-0 text-xs font-medium text-stone-500">{t("joined")}</span>
                    <span className="text-sm text-stone-700">
                        {formatDate(user.createdAt, locale, { dateStyle: "long", timeStyle: "short" })}
                    </span>
                </div>

                {/* 인라인 피드백 */}
                {(error || success) && (
                    <div className="px-5 py-3">
                        {error && (
                            <p className="text-xs text-red-600" role="alert">{error}</p>
                        )}
                        {success && (
                            <p className="text-xs text-green-600" role="status">{t("saveSuccess")}</p>
                        )}
                    </div>
                )}
            </form>
        </section>
    );
}

/* ──────────────────────────────────────────────
   팀 섹션
────────────────────────────────────────────── */
function TeamsSection() {
    const t = useTranslations("admin.detail");
    return (
        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-stone-800">{t("sectionTeams")}</h2>
            </div>
            <div className="px-5 py-6 text-center">
                <p className="text-sm text-stone-400">{t("teamsNote")}</p>
            </div>
        </section>
    );
}

/* ──────────────────────────────────────────────
   참여 프로젝트 섹션
────────────────────────────────────────────── */
function ProjectsSection({ user }: { user: AdminUserDetail }) {
    const { memberships } = user;
    const locale = useLocale();
    const t = useTranslations("admin.detail");
    const tProj = useTranslations("domain.projectRole");

    return (
        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-stone-800">{t("sectionProjects")}</h2>
                <span className="text-xs text-stone-400">
                    {t("projectsTotal", { count: memberships.length })}
                </span>
            </div>

            {memberships.length === 0 ? (
                <div className="px-5 py-6 text-center">
                    <p className="text-sm text-stone-400">{t("projectsEmpty")}</p>
                </div>
            ) : (
                <ul className="divide-y divide-stone-100">
                    {memberships.map((m) => (
                        <li key={m.project.id} className="flex items-start gap-3 px-5 py-3.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100">
                                <svg
                                    className="h-4 w-4 text-stone-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
                                    />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-stone-800">
                                    {m.project.name}
                                </p>
                                {m.project.description && (
                                    <p className="mt-0.5 truncate text-xs text-stone-500">
                                        {m.project.description}
                                    </p>
                                )}
                            </div>
                            <div className="shrink-0 text-right">
                                <span className="inline-flex items-center rounded-lg bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                                    {tProj(m.role as "LEADER" | "DEPUTY_LEADER" | "MEMBER")}
                                </span>
                                <p className="mt-1 text-xs text-stone-400">
                                    {formatDate(m.joinedAt, locale)}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

/* ──────────────────────────────────────────────
   관리 섹션
────────────────────────────────────────────── */
function ManageSection({ user, isSelf }: { user: AdminUserDetail; isSelf: boolean }) {
    const router = useRouter();
    const tDetail = useTranslations("admin.detail");
    const tUsers = useTranslations("adminUsers");
    const tRole = useTranslations("domain.systemRole");

    /* 역할 변경 */
    const [role, setRole] = useState(user.systemRole);
    const [rolePending, startRoleTransition] = useTransition();
    const [roleError, setRoleError] = useState<string | null>(null);
    const [roleSuccess, setRoleSuccess] = useState(false);

    function onRoleSave() {
        setRoleError(null); setRoleSuccess(false);
        startRoleTransition(async () => {
            const result = await updateAdminUserAction(user.id, { systemRole: role });
            if (!result.ok) { setRoleError(result.message); return; }
            setRoleSuccess(true);
            router.refresh();
        });
    }

    /* 비밀번호 재설정 */
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [showCf, setShowCf] = useState(false);
    const [pwPending, startPwTransition] = useTransition();
    const [pwError, setPwError] = useState<string | null>(null);
    const [pwSuccess, setPwSuccess] = useState(false);

    const pwMismatch = confirm.length > 0 && password !== confirm;

    function onPasswordSave(e: React.FormEvent) {
        e.preventDefault();
        if (!password) {
            setPwError(tDetail("passwordRequired"));
            return;
        }
        if (pwMismatch) {
            setPwError(tDetail("passwordMismatch"));
            return;
        }
        setPwError(null); setPwSuccess(false);
        startPwTransition(async () => {
            const result = await updateAdminUserAction(user.id, { password });
            if (!result.ok) { setPwError(result.message); return; }
            setPwSuccess(true);
            setPassword(""); setConfirm("");
        });
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-stone-800">{tDetail("sectionManage")}</h2>
            </div>

            <div className="divide-y divide-stone-100">
                {/* 역할 변경 */}
                <div className="px-5 py-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                        {tDetail("systemRoleChange")}
                    </p>
                    {isSelf ? (
                        <p className="text-sm text-stone-400">{tDetail("selfRoleLocked")}</p>
                    ) : (
                        <div className="flex flex-wrap items-center gap-3">
                            <select
                                value={role}
                                disabled={rolePending}
                                onChange={(e) => { setRole(e.target.value as "SUPER_ADMIN" | "USER"); setRoleSuccess(false); setRoleError(null); }}
                                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none transition-colors focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-200 disabled:opacity-50"
                            >
                                <option value="USER">
                                    {tUsers("roleSelectOption", {
                                        code: "USER",
                                        label: tRole("USER"),
                                    })}
                                </option>
                                <option value="SUPER_ADMIN">
                                    {tUsers("roleSelectOption", {
                                        code: "SUPER_ADMIN",
                                        label: tRole("SUPER_ADMIN"),
                                    })}
                                </option>
                            </select>
                            <button
                                type="button"
                                onClick={onRoleSave}
                                disabled={rolePending || role === user.systemRole}
                                className="rounded-xl bg-stone-800 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-40"
                            >
                                {rolePending ? tDetail("roleSaving") : tDetail("roleSave")}
                            </button>
                            {roleError && <p className="w-full text-xs text-red-600">{roleError}</p>}
                            {roleSuccess && (
                                <p className="w-full text-xs text-green-600">{tDetail("roleSaved")}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* 비밀번호 재설정 */}
                <div className="px-5 py-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                        {tDetail("passwordReset")}
                    </p>
                    <form onSubmit={onPasswordSave} className="space-y-3">
                        {/* 새 비밀번호 */}
                        <div className="relative max-w-xs">
                            <input
                                type={showPw ? "text" : "password"}
                                autoComplete="new-password"
                                placeholder={tDetail("newPasswordPlaceholder")}
                                disabled={pwPending}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setPwError(null); setPwSuccess(false); }}
                                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 pr-10 text-sm text-stone-800 outline-none transition-colors placeholder:text-stone-400 focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-200 disabled:opacity-50"
                            />
                            <button type="button" tabIndex={-1} onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                                {showPw ? (
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                ) : (
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                                )}
                            </button>
                        </div>

                        {/* 비밀번호 확인 */}
                        <div className="relative max-w-xs">
                            <input
                                type={showCf ? "text" : "password"}
                                autoComplete="new-password"
                                placeholder={tDetail("confirmPasswordPlaceholder")}
                                disabled={pwPending}
                                value={confirm}
                                onChange={(e) => { setConfirm(e.target.value); setPwError(null); setPwSuccess(false); }}
                                className={`w-full rounded-xl border bg-stone-50 px-3.5 py-2.5 pr-16 text-sm text-stone-800 outline-none transition-colors placeholder:text-stone-400 focus:bg-white disabled:opacity-50 ${
                                    pwMismatch
                                        ? "border-red-300 focus:border-red-300 focus:ring-2 focus:ring-red-100"
                                        : confirm && !pwMismatch
                                          ? "border-green-300 focus:border-green-300 focus:ring-2 focus:ring-green-100"
                                          : "border-stone-200 focus:border-orange-300 focus:ring-2 focus:ring-orange-200"
                                }`}
                            />
                            {confirm && (
                                <span className="absolute right-9 top-1/2 -translate-y-1/2">
                                    {!pwMismatch ? (
                                        <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                                    ) : (
                                        <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                    )}
                                </span>
                            )}
                            <button type="button" tabIndex={-1} onClick={() => setShowCf((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                                {showCf ? (
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                ) : (
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                                )}
                            </button>
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                            <button
                                type="submit"
                                disabled={pwPending || pwMismatch || !password}
                                className="rounded-xl bg-stone-800 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-40"
                            >
                                {pwPending ? tDetail("passwordSaving") : tDetail("passwordSubmit")}
                            </button>
                            {pwError && <p className="text-xs text-red-600">{pwError}</p>}
                            {pwSuccess && (
                                <p className="text-xs text-green-600">{tDetail("passwordSaved")}</p>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </section>
    );
}

/* ──────────────────────────────────────────────
   페이지 루트
────────────────────────────────────────────── */
export function AdminEditUserClient({ user, isSelf }: AdminEditUserClientProps) {
    const t = useTranslations("admin.detail");
    return (
        <div className="w-full p-4 text-left sm:p-5 md:p-6 lg:p-8">
            <div className="w-full max-w-2xl space-y-1">
                {/* 뒤로 */}
                <Link
                    href="/admin/users"
                    className="inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-800"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                    {t("back")}
                </Link>

                <div className="space-y-4 pt-3">
                    <InfoSection user={user} isSelf={isSelf} />
                    <TeamsSection />
                    <ProjectsSection user={user} />
                    <ManageSection user={user} isSelf={isSelf} />
                </div>
            </div>
        </div>
    );
}
