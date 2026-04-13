"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import {
    changePasswordAction,
    deleteAvatarAction,
    patchNotificationPreferencesAction,
    updateProfileAction,
    updateStatusAction,
    uploadAvatarAction,
    type ChangePasswordState,
    type UpdateProfileState,
} from "@/app/actions/users";
import { getApiBaseUrl } from "@/lib/http/api-base-url";
import type { ApiNotificationPreferences } from "@/lib/mappers/user";
import type { UserProfile } from "@/lib/user/user-types";
import { StatusDropdown } from "@repo/ui";

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "profile" | "security" | "preferences";

interface SettingsClientProps {
    user: UserProfile | null;
    notificationPrefs: ApiNotificationPreferences | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

function getInitial(user: UserProfile | null): string {
    if (!user) return "?";
    if (user.name) return user.name[0].toUpperCase();
    if (user.email) return user.email[0].toUpperCase();
    return "?";
}

function toAbsoluteAvatarUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${getApiBaseUrl()}${url}`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// AvatarUpload 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

function AvatarUpload({ user }: { user: UserProfile | null }) {
    const t = useTranslations("settings.profile");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(
        toAbsoluteAvatarUrl(user?.avatarUrl),
    );

    function handleClick() {
        fileInputRef.current?.click();
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (!allowed.includes(file.type)) {
            setError(t("avatarInvalidType"));
            return;
        }
        const maxSize =
            (Number(process.env.NEXT_PUBLIC_UPLOAD_MAX_FILE_SIZE_MB) || 2) * 1024 * 1024;
        if (file.size > maxSize) {
            setError(t("avatarFileTooLarge"));
            return;
        }

        const localUrl = URL.createObjectURL(file);
        setPreviewUrl(localUrl);
        setError(null);

        const formData = new FormData();
        formData.append("avatar", file);

        startTransition(async () => {
            const result = await uploadAvatarAction(formData);
            if (!result.ok) {
                setError(result.message ?? "업로드 실패");
                setPreviewUrl(toAbsoluteAvatarUrl(user?.avatarUrl));
            } else {
                setPreviewUrl(result.avatarUrl ?? null);
            }
        });

        e.target.value = "";
    }

    function handleRemove() {
        startTransition(async () => {
            const result = await deleteAvatarAction();
            if (!result.ok) {
                setError(result.message ?? "삭제 실패");
            } else {
                setPreviewUrl(null);
                setError(null);
            }
        });
    }

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative">
                <button
                    type="button"
                    onClick={handleClick}
                    disabled={isPending}
                    aria-label={t("avatarChange")}
                    className="group relative flex h-24 w-24 shrink-0 overflow-hidden rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                >
                    {previewUrl ? (
                        <img
                            src={previewUrl}
                            alt="avatar"
                            className="h-full w-full object-cover transition-opacity group-hover:opacity-70"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-stone-800 text-2xl font-semibold text-white transition-opacity group-hover:opacity-70">
                            {getInitial(user)}
                        </div>
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        {isPending ? (
                            <svg
                                className="h-5 w-5 animate-spin text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v8H4z"
                                />
                            </svg>
                        ) : (
                            <>
                                <svg
                                    className="h-5 w-5 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
                                    />
                                </svg>
                                <span className="text-[10px] font-medium text-white">
                                    {t("avatarChange")}
                                </span>
                            </>
                        )}
                    </div>
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>

            {previewUrl && (
                <button
                    type="button"
                    onClick={handleRemove}
                    disabled={isPending}
                    className="text-xs text-stone-400 dark:text-elivis-ink-secondary underline-offset-2 transition hover:text-red-500 hover:underline disabled:opacity-50"
                >
                    {t("avatarRemove")}
                </button>
            )}

            {error && <p className="max-w-[200px] text-center text-xs text-red-500">{error}</p>}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 탭 콘텐츠: 개인정보
// ─────────────────────────────────────────────────────────────────────────────

function ProfileTab({ user }: { user: UserProfile | null }) {
    const t = useTranslations("settings");

    const initial: UpdateProfileState = {};
    const [state, action, isPending] = useActionState(updateProfileAction, initial);

    const roleLabel =
        user?.systemRole === "SUPER_ADMIN" ? t("profile.roleAdmin") : t("profile.roleUser");

    return (
        <div className="space-y-8">
            {/* 프로필 사진 */}
            <div>
                <p className="mb-4 text-sm font-medium text-stone-700 dark:text-elivis-ink">
                    {t("profile.avatarLabel")}
                </p>
                <AvatarUpload user={user} />
            </div>

            <div className="h-px bg-stone-100 dark:bg-elivis-surface-elevated" />

            {/* 기본 정보 폼 */}
            <div>
                <h2 className="mb-5 text-base font-semibold text-stone-800 dark:text-elivis-ink">
                    {t("profile.sectionTitle")}
                </h2>

                <form action={action} className="space-y-5">
                    {/* 이름 */}
                    <div className="space-y-1.5">
                        <label htmlFor="name" className="block text-sm font-medium text-stone-700 dark:text-elivis-ink">
                            {t("profile.nameLabel")}
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            defaultValue={user?.name ?? ""}
                            placeholder={t("profile.namePlaceholder")}
                            className="w-full rounded-lg border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-3 py-2 text-sm text-stone-800 dark:text-elivis-ink outline-none transition placeholder:text-stone-300 focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
                        />
                    </div>

                    {/* 프로필 메시지 */}
                    <div className="space-y-1.5">
                        <label htmlFor="bio" className="block text-sm font-medium text-stone-700 dark:text-elivis-ink">
                            {t("profile.bioLabel")}
                        </label>
                        <textarea
                            id="bio"
                            name="bio"
                            rows={3}
                            maxLength={200}
                            defaultValue={user?.bio ?? ""}
                            placeholder={t("profile.bioPlaceholder")}
                            className="w-full resize-none rounded-lg border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-3 py-2 text-sm text-stone-800 dark:text-elivis-ink outline-none transition placeholder:text-stone-300 focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
                        />
                        <p className="text-right text-xs text-stone-300">최대 200자</p>
                    </div>

                    {/* 이메일 (읽기 전용) */}
                    <div className="space-y-1.5">
                        <label htmlFor="email" className="block text-sm font-medium text-stone-700 dark:text-elivis-ink">
                            {t("profile.emailLabel")}
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={user?.email ?? ""}
                            readOnly
                            className="w-full cursor-not-allowed rounded-lg border border-stone-100 dark:border-elivis-line bg-stone-50 dark:bg-elivis-surface px-3 py-2 text-sm text-stone-400 dark:text-elivis-ink-secondary outline-none"
                        />
                        <p className="text-xs text-stone-400 dark:text-elivis-ink-secondary">{t("profile.emailNote")}</p>
                    </div>

                    {/* 역할 */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-stone-700 dark:text-elivis-ink">
                            {t("profile.roleLabel")}
                        </label>
                        <p className="rounded-lg border border-stone-100 dark:border-elivis-line bg-stone-50 dark:bg-elivis-surface px-3 py-2 text-sm text-stone-400 dark:text-elivis-ink-secondary">
                            {roleLabel}
                        </p>
                    </div>

                    {/* 가입일 */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-stone-700 dark:text-elivis-ink">
                            {t("profile.joinedLabel")}
                        </label>
                        <p className="rounded-lg border border-stone-100 dark:border-elivis-line bg-stone-50 dark:bg-elivis-surface px-3 py-2 text-sm text-stone-400 dark:text-elivis-ink-secondary">
                            {user ? formatDate(user.createdAt) : "—"}
                        </p>
                    </div>

                    {/* 메시지 */}
                    {state.error && (
                        <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-500">
                            {state.error}
                        </p>
                    )}
                    {state.success && (
                        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">
                            {t("profile.saveSuccess")}
                        </p>
                    )}

                    {/* 저장 버튼 */}
                    <div className="pt-1">
                        <button
                            type="submit"
                            disabled={isPending}
                            className="rounded-lg bg-stone-800 px-5 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isPending ? t("profile.saving") : t("profile.saveButton")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function inputClassName(): string {
    return "mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition placeholder:text-stone-300 focus:border-stone-400 focus:ring-2 focus:ring-stone-100";
}

function NotifySwitch({
    enabled,
    pending,
    onToggle,
    ariaOn,
    ariaOff,
}: {
    enabled: boolean;
    pending: boolean;
    onToggle: () => void;
    ariaOn: string;
    ariaOff: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={pending}
            aria-label={enabled ? ariaOn : ariaOff}
            onClick={onToggle}
            className={[
                "relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:opacity-50",
                enabled ? "bg-emerald-600" : "bg-stone-300",
            ].join(" ")}
        >
            <span
                className={[
                    "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                    enabled ? "left-5" : "left-0.5",
                ].join(" ")}
            />
        </button>
    );
}

function SecurityTab({ user }: { user: UserProfile | null }) {
    const t = useTranslations("settings.securityAccount");
    const initial: ChangePasswordState = {};
    const [state, action, isPending] = useActionState(changePasswordAction, initial);

    if (user?.authProvider === "LDAP") {
        return <p className="text-sm text-stone-600 dark:text-elivis-ink-secondary">{t("ldapOnly")}</p>;
    }

    return (
        <div className="max-w-md space-y-5">
            <h2 className="text-base font-semibold text-stone-800 dark:text-elivis-ink">{t("title")}</h2>
            <form action={action} className="space-y-4">
                <div className="space-y-1.5">
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-stone-700 dark:text-elivis-ink">
                        {t("current")}
                    </label>
                    <input
                        id="currentPassword"
                        name="currentPassword"
                        type="password"
                        autoComplete="current-password"
                        required
                        className={inputClassName()}
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="newPassword" className="block text-sm font-medium text-stone-700 dark:text-elivis-ink">
                        {t("new")}
                    </label>
                    <input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        className={inputClassName()}
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-stone-700 dark:text-elivis-ink">
                        {t("confirm")}
                    </label>
                    <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        className={inputClassName()}
                    />
                </div>
                {state.error && (
                    <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-500">{state.error}</p>
                )}
                {state.success && (
                    <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">
                        {t("success")}
                    </p>
                )}
                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-stone-800 px-5 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isPending ? t("submitting") : t("submit")}
                </button>
            </form>
        </div>
    );
}

function PreferencesTab({ initial }: { initial: ApiNotificationPreferences | null }) {
    const t = useTranslations("settings.preferences");
    const [teams, setTeams] = useState(() => initial?.teams ?? []);
    const [projects, setProjects] = useState(() => initial?.projects ?? []);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    useEffect(() => {
        setTeams(initial?.teams ?? []);
        setProjects(initial?.projects ?? []);
    }, [initial]);

    if (!initial) {
        return <p className="text-sm text-red-500">{t("loadError")}</p>;
    }

    function applyServerData(data: ApiNotificationPreferences) {
        setTeams(data.teams);
        setProjects(data.projects);
    }

    function toggleTeamPush(id: string, notifyPushEnabled: boolean) {
        const snapT = teams;
        const snapP = projects;
        setTeams((rows) => rows.map((r) => (r.id === id ? { ...r, notifyPushEnabled } : r)));
        setError(null);
        startTransition(async () => {
            const r = await patchNotificationPreferencesAction({
                teams: [{ teamId: id, notifyPushEnabled }],
            });
            if (!r.ok) {
                setTeams(snapT);
                setProjects(snapP);
                setError(r.message);
                return;
            }
            applyServerData(r.data);
        });
    }

    function toggleTeamEmail(id: string, notifyEmailEnabled: boolean) {
        const snapT = teams;
        const snapP = projects;
        setTeams((rows) => rows.map((r) => (r.id === id ? { ...r, notifyEmailEnabled } : r)));
        setError(null);
        startTransition(async () => {
            const r = await patchNotificationPreferencesAction({
                teams: [{ teamId: id, notifyEmailEnabled }],
            });
            if (!r.ok) {
                setTeams(snapT);
                setProjects(snapP);
                setError(r.message);
                return;
            }
            applyServerData(r.data);
        });
    }

    function toggleProjectPush(id: string, notifyPushEnabled: boolean) {
        const snapT = teams;
        const snapP = projects;
        setProjects((rows) => rows.map((r) => (r.id === id ? { ...r, notifyPushEnabled } : r)));
        setError(null);
        startTransition(async () => {
            const r = await patchNotificationPreferencesAction({
                projects: [{ projectId: id, notifyPushEnabled }],
            });
            if (!r.ok) {
                setTeams(snapT);
                setProjects(snapP);
                setError(r.message);
                return;
            }
            applyServerData(r.data);
        });
    }

    function toggleProjectEmail(id: string, notifyEmailEnabled: boolean) {
        const snapT = teams;
        const snapP = projects;
        setProjects((rows) => rows.map((r) => (r.id === id ? { ...r, notifyEmailEnabled } : r)));
        setError(null);
        startTransition(async () => {
            const r = await patchNotificationPreferencesAction({
                projects: [{ projectId: id, notifyEmailEnabled }],
            });
            if (!r.ok) {
                setTeams(snapT);
                setProjects(snapP);
                setError(r.message);
                return;
            }
            applyServerData(r.data);
        });
    }

    return (
        <div className="space-y-8">
            <p className="text-sm text-stone-600 dark:text-elivis-ink-secondary">{t("intro")}</p>
            {error && (
                <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-500">{error}</p>
            )}
            <section>
                <h2 className="mb-3 text-base font-semibold text-stone-800 dark:text-elivis-ink">{t("teamsTitle")}</h2>
                {teams.length === 0 ? (
                    <p className="text-sm text-stone-400 dark:text-elivis-ink-secondary">{t("emptyTeams")}</p>
                ) : (
                    <ul className="divide-y divide-stone-100 dark:divide-elivis-line rounded-xl border border-stone-200 dark:border-elivis-line">
                        {teams.map((row) => (
                            <li
                                key={row.id}
                                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <span className="min-w-0 truncate text-sm font-medium text-stone-800 dark:text-elivis-ink">
                                    {row.name}
                                </span>
                                <div className="flex flex-wrap items-center gap-5 sm:shrink-0 sm:gap-6">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-stone-500 dark:text-elivis-ink-secondary">{t("pushLabel")}</span>
                                        <NotifySwitch
                                            enabled={row.notifyPushEnabled}
                                            pending={pending}
                                            ariaOn={t("pushOn")}
                                            ariaOff={t("pushOff")}
                                            onToggle={() =>
                                                toggleTeamPush(row.id, !row.notifyPushEnabled)
                                            }
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-stone-500 dark:text-elivis-ink-secondary">{t("emailLabel")}</span>
                                        <NotifySwitch
                                            enabled={row.notifyEmailEnabled}
                                            pending={pending}
                                            ariaOn={t("emailOn")}
                                            ariaOff={t("emailOff")}
                                            onToggle={() =>
                                                toggleTeamEmail(row.id, !row.notifyEmailEnabled)
                                            }
                                        />
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
            <section>
                <h2 className="mb-3 text-base font-semibold text-stone-800 dark:text-elivis-ink">{t("projectsTitle")}</h2>
                {projects.length === 0 ? (
                    <p className="text-sm text-stone-400 dark:text-elivis-ink-secondary">{t("emptyProjects")}</p>
                ) : (
                    <ul className="divide-y divide-stone-100 dark:divide-elivis-line rounded-xl border border-stone-200 dark:border-elivis-line">
                        {projects.map((row) => (
                            <li
                                key={row.id}
                                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <span className="min-w-0 truncate text-sm font-medium text-stone-800 dark:text-elivis-ink">
                                    {row.name}
                                </span>
                                <div className="flex flex-wrap items-center gap-5 sm:shrink-0 sm:gap-6">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-stone-500 dark:text-elivis-ink-secondary">{t("pushLabel")}</span>
                                        <NotifySwitch
                                            enabled={row.notifyPushEnabled}
                                            pending={pending}
                                            ariaOn={t("pushOn")}
                                            ariaOff={t("pushOff")}
                                            onToggle={() =>
                                                toggleProjectPush(row.id, !row.notifyPushEnabled)
                                            }
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-stone-500 dark:text-elivis-ink-secondary">{t("emailLabel")}</span>
                                        <NotifySwitch
                                            enabled={row.notifyEmailEnabled}
                                            pending={pending}
                                            ariaOn={t("emailOn")}
                                            ariaOff={t("emailOff")}
                                            onToggle={() =>
                                                toggleProjectEmail(row.id, !row.notifyEmailEnabled)
                                            }
                                        />
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 탭 목록
// ─────────────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; labelKey: string; icon: string }[] = [
    {
        id: "profile",
        labelKey: "tabs.profile",
        icon: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z",
    },
    {
        id: "security",
        labelKey: "tabs.security",
        icon: "M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z",
    },
    {
        id: "preferences",
        labelKey: "tabs.preferences",
        icon: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.132a1.125 1.125 0 0 1-.26 1.243l-1.066 1.06c-.265.263-.37.665-.252 1.03.015.044.03.088.043.133.12.375.073.779-.127 1.091-.058.09-.122.183-.19.273-.24.332-.655.56-1.11.56h-2.593c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87-.074-.04-.147-.083-.22-.127-.324-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 0 1-1.184-.29L4.69 9.992a1.125 1.125 0 0 1-.026-1.43l1.034-1.17a1.125 1.125 0 0 1 1.652-.755l1.285-.471c.356-.133.75-.072 1.075.124.073.044.146.087.22.127.332.184.582.496.645.87l.213 1.281ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

export function SettingsClient({ user, notificationPrefs }: SettingsClientProps) {
    const [activeTab, setActiveTab] = useState<Tab>("profile");
    const t = useTranslations("settings");

    const avatarUrl = toAbsoluteAvatarUrl(user?.avatarUrl);

    return (
        <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {/* ── 프로필 헤더 ── */}
            <div className="mb-6 flex items-center gap-4 sm:mb-8 sm:gap-5">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full shadow-sm sm:h-20 sm:w-20">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-stone-800 text-xl font-semibold text-white sm:text-2xl">
                            {getInitial(user)}
                        </div>
                    )}
                </div>

                <div className="min-w-0">
                    <h1 className="truncate text-xl font-bold text-stone-800 dark:text-elivis-ink sm:text-2xl">
                        {user?.name ?? user?.email ?? "—"}
                    </h1>
                    {user?.name && (
                        <p className="mt-0.5 truncate text-sm text-stone-400 dark:text-elivis-ink-secondary">{user.email}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {/* 역할 배지 */}
                        <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-stone-200 dark:bg-elivis-surface-elevated px-2.5 text-xs font-medium text-stone-600 dark:text-elivis-ink-secondary">
                            <span className="text-stone-400 dark:text-elivis-ink-secondary">#</span>
                            {user?.systemRole === "SUPER_ADMIN"
                                ? t("profile.roleAdmin")
                                : t("profile.roleUser")}
                        </span>
                        {/* 상태 배지 — 클릭하면 드롭다운으로 변경 가능 */}
                        {user?.status && (
                            <StatusDropdown
                                persistStatus={async (s) => {
                                    const r = await updateStatusAction(s);
                                    return { ok: r.ok };
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* ── 탭 레이아웃 ──
          모바일/태블릿: 탭이 상단 가로 스크롤 바
          데스크톱(lg+): 왼쪽 세로 사이드바
      ── */}
            <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
                {/* 탭 메뉴 — 모바일: 가로 스크롤 / 데스크톱: 세로 사이드바 */}
                <nav
                    className="flex shrink-0 gap-1 overflow-x-auto pb-1 lg:w-44 lg:flex-col lg:overflow-x-visible lg:pb-0"
                    aria-label="설정 탭"
                >
                    {TABS.map(({ id, labelKey, icon }) => {
                        const isActive = activeTab === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setActiveTab(id)}
                                className={[
                                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                    "whitespace-nowrap lg:w-full",
                                    isActive
                                        ? "bg-stone-100 text-stone-800"
                                        : "text-stone-500 hover:bg-stone-50 hover:text-stone-700",
                                ].join(" ")}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="h-4 w-4 shrink-0"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                                </svg>
                                {t(labelKey)}
                            </button>
                        );
                    })}
                </nav>

                {/* 콘텐츠 영역 */}
                <div className="min-w-0 flex-1 rounded-2xl border border-stone-200/80 bg-white dark:bg-elivis-surface p-5 shadow-sm sm:p-7">
                    {activeTab === "profile" ? (
                        <ProfileTab user={user} />
                    ) : activeTab === "security" ? (
                        <SecurityTab user={user} />
                    ) : (
                        <PreferencesTab initial={notificationPrefs} />
                    )}
                </div>
            </div>
        </div>
    );
}
