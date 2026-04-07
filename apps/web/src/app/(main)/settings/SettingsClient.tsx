"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { getApiBaseUrl } from "@/lib/http/api-base-url";
import type { UserProfile } from "@/lib/user/user-types";
import {
    deleteAvatarAction,
    updateProfileAction,
    updateStatusAction,
    uploadAvatarAction,
    type UpdateProfileState,
} from "@/app/actions/users";
import { StatusDropdown } from "@repo/ui";

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "profile" | "security" | "notifications" | "integrations";

interface SettingsClientProps {
    user: UserProfile | null;
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
                    className="text-xs text-stone-400 underline-offset-2 transition hover:text-red-500 hover:underline disabled:opacity-50"
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
                <p className="mb-4 text-sm font-medium text-stone-700">
                    {t("profile.avatarLabel")}
                </p>
                <AvatarUpload user={user} />
            </div>

            <div className="h-px bg-stone-100" />

            {/* 기본 정보 폼 */}
            <div>
                <h2 className="mb-5 text-base font-semibold text-stone-800">
                    {t("profile.sectionTitle")}
                </h2>

                <form action={action} className="space-y-5">
                    {/* 이름 */}
                    <div className="space-y-1.5">
                        <label htmlFor="name" className="block text-sm font-medium text-stone-700">
                            {t("profile.nameLabel")}
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            defaultValue={user?.name ?? ""}
                            placeholder={t("profile.namePlaceholder")}
                            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition placeholder:text-stone-300 focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
                        />
                    </div>

                    {/* 프로필 메시지 */}
                    <div className="space-y-1.5">
                        <label htmlFor="bio" className="block text-sm font-medium text-stone-700">
                            {t("profile.bioLabel")}
                        </label>
                        <textarea
                            id="bio"
                            name="bio"
                            rows={3}
                            maxLength={200}
                            defaultValue={user?.bio ?? ""}
                            placeholder={t("profile.bioPlaceholder")}
                            className="w-full resize-none rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition placeholder:text-stone-300 focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
                        />
                        <p className="text-right text-xs text-stone-300">최대 200자</p>
                    </div>

                    {/* 이메일 (읽기 전용) */}
                    <div className="space-y-1.5">
                        <label htmlFor="email" className="block text-sm font-medium text-stone-700">
                            {t("profile.emailLabel")}
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={user?.email ?? ""}
                            readOnly
                            className="w-full cursor-not-allowed rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-sm text-stone-400 outline-none"
                        />
                        <p className="text-xs text-stone-400">{t("profile.emailNote")}</p>
                    </div>

                    {/* 역할 */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-stone-700">
                            {t("profile.roleLabel")}
                        </label>
                        <p className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-sm text-stone-400">
                            {roleLabel}
                        </p>
                    </div>

                    {/* 가입일 */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-stone-700">
                            {t("profile.joinedLabel")}
                        </label>
                        <p className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-sm text-stone-400">
                            {user ? formatDate(user.createdAt) : "—"}
                        </p>
                    </div>

                    {/* 메시지 */}
                    {state.error && (
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">
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

function ComingSoonTab() {
    const t = useTranslations("settings");
    return (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/60">
            <p className="text-sm text-stone-400">{t("comingSoon")}</p>
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
        id: "notifications",
        labelKey: "tabs.notifications",
        icon: "M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0",
    },
    {
        id: "integrations",
        labelKey: "tabs.integrations",
        icon: "M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244",
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

export function SettingsClient({ user }: SettingsClientProps) {
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
                    <h1 className="truncate text-xl font-bold text-stone-800 sm:text-2xl">
                        {user?.name ?? user?.email ?? "—"}
                    </h1>
                    {user?.name && (
                        <p className="mt-0.5 truncate text-sm text-stone-400">{user.email}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {/* 역할 배지 */}
                        <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-stone-200 px-2.5 text-xs font-medium text-stone-600">
                            <span className="text-stone-400">#</span>
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
                <div className="min-w-0 flex-1 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm sm:p-7">
                    {activeTab === "profile" ? <ProfileTab user={user} /> : <ComingSoonTab />}
                </div>
            </div>
        </div>
    );
}
