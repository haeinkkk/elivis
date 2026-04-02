"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { TeamAddMemberModal } from "./TeamAddMemberModal";
import { TeamIntroEditModal } from "./TeamIntroEditModal";
import { TeamIntroPageContent, type TeamIntroPageContentHandle } from "./TeamIntroPageContent";
import { TeamIntroBannerBlock } from "./TeamIntroBannerBlock";
import { delegateTeamLeaderAction, deleteTeamAction, removeTeamMemberAction, updateTeamFieldsAction } from "@/app/actions/teams";
import { UserAvatar } from "@/components/UserAvatar";
import type { TeamDetail, TeamMemberRow } from "@/lib/teams.server";

type TeamTab = "intro" | "projects" | "members" | "settings";

const TABS: TeamTab[] = ["intro", "projects", "members", "settings"];

type TeamSettingsSubTab = "team" | "security";

/** 내 설정(SettingsClient)과 동일: 모바일 가로 스크롤 / lg 세로 사이드바 */
const TEAM_SETTINGS_SUB_TABS: { id: TeamSettingsSubTab; icon: string }[] = [
    {
        id: "team",
        icon: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z",
    },
    {
        id: "security",
        icon: "M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z",
    },
];

/** 비멤버: 공개 팀만 조회 가능(멤버 전용 탭 없음) */
function TeamPublicDetail({ team }: { team: TeamDetail }) {
    const router = useRouter();
    const t = useTranslations("teams.detail");
    const memberCount = team._count?.members ?? team.members.length;

    return (
        <div className="flex min-h-full w-full flex-col">
            <TeamIntroBannerBlock teamId={team.id} bannerUrl={team.bannerUrl} canEdit={false} variant="pageTop" />
            <div className="border-b border-stone-200 bg-white px-4 py-3 sm:px-5 md:px-6">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.push("/teams")}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
                        aria-label={t("aria.backToTeams")}
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-lg font-semibold text-stone-800 sm:text-xl">
                            {team.name}
                        </h1>
                        <p className="truncate text-xs text-stone-500 sm:text-sm">
                            {team.shortDescription?.trim() || t("public.shortDescriptionFallback")}
                        </p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-sm font-medium text-stone-600">
                        {t("labels.membersCount", { count: memberCount })}
                    </span>
                </div>
            </div>

            <div className="border-b border-stone-200 bg-amber-50/60 px-4 py-2.5 text-sm text-stone-700 sm:px-5 md:px-6">
                {t("public.notMemberNotice")}
            </div>

            <div className="min-h-0 flex-1 p-4 sm:p-5 md:p-6">
                <TeamIntroPageContent team={team} />
            </div>
        </div>
    );
}

function TeamSecuritySection({ team }: { team: TeamDetail }) {
    const router = useRouter();
    const t = useTranslations("teams.detail");
    const isLeader = team.viewerRole === "LEADER";
    const [hiddenFromUsers, setHiddenFromUsers] = useState(team.hiddenFromUsers);
    const [hiddenError, setHiddenError] = useState<string | null>(null);
    const [hiddenPending, startHiddenSave] = useTransition();

    const [deleteNameModalOpen, setDeleteNameModalOpen] = useState(false);
    const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
    const [deleteNameInput, setDeleteNameInput] = useState("");
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deletePending, startDelete] = useTransition();

    useEffect(() => {
        setHiddenFromUsers(team.hiddenFromUsers);
    }, [team.id, team.hiddenFromUsers]);

    const closeDeleteModals = () => {
        setDeleteNameModalOpen(false);
        setDeleteConfirmModalOpen(false);
        setDeleteNameInput("");
        setDeleteError(null);
    };

    const openDeleteNameModal = () => {
        setDeleteError(null);
        setDeleteNameInput("");
        setDeleteNameModalOpen(true);
    };

    const proceedToDeleteConfirm = () => {
        const trimmed = deleteNameInput.trim();
        if (trimmed !== team.name) {
            setDeleteError(t("errors.teamNameMismatch"));
            return;
        }
        setDeleteError(null);
        setDeleteNameModalOpen(false);
        setDeleteConfirmModalOpen(true);
    };

    return (
        <div className="space-y-10">
            <div>
                <h2 className="mb-1 text-base font-semibold text-stone-800">{t("security.hideTeam.title")}</h2>
                <p className="text-sm text-stone-500">
                    {t("security.hideTeam.desc")}
                </p>
                {isLeader ? (
                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-3">
                        <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-stone-800 focus:ring-stone-400"
                            checked={hiddenFromUsers}
                            disabled={hiddenPending}
                            onChange={(e) => {
                                const next = e.target.checked;
                                setHiddenError(null);
                                setHiddenFromUsers(next);
                                startHiddenSave(async () => {
                                    const r = await updateTeamFieldsAction(team.id, {
                                        hiddenFromUsers: next,
                                    });
                                    if (!r.ok) {
                                        setHiddenFromUsers(!next);
                                        setHiddenError(r.message ?? t("errors.saveFailed"));
                                    } else {
                                        setHiddenFromUsers(r.hiddenFromUsers);
                                        router.refresh();
                                    }
                                });
                            }}
                        />
                        <span className="text-sm text-stone-800">
                            {t("security.hideTeam.toggleLabel")}
                        </span>
                    </label>
                ) : (
                    <p className="mt-4 rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-sm text-stone-600">
                        {hiddenFromUsers
                            ? t("security.hideTeam.stateHidden")
                            : t("security.hideTeam.stateVisible")}
                        <span className="block text-stone-400">{t("security.hideTeam.leaderOnlyNote")}</span>
                    </p>
                )}
                {hiddenError ? <p className="mt-2 text-sm text-red-600">{hiddenError}</p> : null}
            </div>

            <div className="h-px bg-stone-100" />

            <div>
                <h2 className="mb-1 text-base font-semibold text-stone-800">{t("security.deleteTeam.title")}</h2>
                <p className="text-sm text-stone-500">
                    {t("security.deleteTeam.desc")}
                </p>
                {isLeader ? (
                    <button
                        type="button"
                        onClick={openDeleteNameModal}
                        className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                    >
                        {t("security.deleteTeam.button")}
                    </button>
                ) : (
                    <p className="mt-4 text-sm text-stone-400">{t("security.deleteTeam.leaderOnlyNote")}</p>
                )}
            </div>

            {deleteNameModalOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-stone-900/40"
                        aria-hidden
                        onClick={() => !deletePending && closeDeleteModals()}
                    />
                    <div
                        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-stone-200 bg-white p-6 shadow-xl"
                        role="dialog"
                        aria-modal
                        aria-labelledby="team-delete-name-title"
                    >
                        <h3
                            id="team-delete-name-title"
                            className="text-base font-semibold text-stone-800"
                        >
                            {t("security.deleteTeam.modalName.title")}
                        </h3>
                        <p className="mt-2 text-sm text-stone-600">
                            {t("security.deleteTeam.modalName.desc")}
                        </p>
                        <p className="mt-1 font-mono text-sm font-medium text-stone-800">{team.name}</p>
                        <input
                            type="text"
                            value={deleteNameInput}
                            onChange={(e) => {
                                setDeleteNameInput(e.target.value);
                                setDeleteError(null);
                            }}
                            disabled={deletePending}
                            autoComplete="off"
                            placeholder={t("security.deleteTeam.modalName.placeholder")}
                            className="mt-4 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 disabled:opacity-60"
                        />
                        {deleteError ? (
                            <p className="mt-2 text-sm text-red-600">{deleteError}</p>
                        ) : null}
                        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeDeleteModals}
                                disabled={deletePending}
                                className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={proceedToDeleteConfirm}
                                disabled={deletePending}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                            >
                                {t("common.delete")}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {deleteConfirmModalOpen && (
                <>
                    <div
                        className="fixed inset-0 z-[45] bg-stone-900/50"
                        aria-hidden
                        onClick={() => !deletePending && setDeleteConfirmModalOpen(false)}
                    />
                    <div
                        className="fixed left-1/2 top-1/2 z-[55] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-stone-200 bg-white p-6 shadow-xl"
                        role="dialog"
                        aria-modal
                        aria-labelledby="team-delete-confirm-title"
                    >
                        <h3
                            id="team-delete-confirm-title"
                            className="text-base font-semibold text-stone-800"
                        >
                            {t("security.deleteTeam.modalConfirm.title")}
                        </h3>
                        <p className="mt-2 text-sm text-stone-600">
                            {t("security.deleteTeam.modalConfirm.desc")}
                        </p>
                        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setDeleteConfirmModalOpen(false);
                                    setDeleteNameModalOpen(true);
                                }}
                                disabled={deletePending}
                                className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                            >
                                {t("common.back")}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setDeleteError(null);
                                    startDelete(async () => {
                                        const r = await deleteTeamAction(team.id, team.name);
                                        if (!r.ok) {
                                            setDeleteError(r.message ?? t("errors.deleteFailed"));
                                            setDeleteConfirmModalOpen(false);
                                            setDeleteNameModalOpen(true);
                                        } else {
                                            closeDeleteModals();
                                            router.push("/teams");
                                        }
                                    });
                                }}
                                disabled={deletePending}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                            >
                                {deletePending ? t("common.deleting") : t("common.delete")}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function truncateText(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + "…";
}

const AVATAR_STACK_MAX = 4;

function displayUserName(u: { name: string | null; email: string }): string {
    return u.name?.trim() || u.email.split("@")[0] || u.email;
}

function formatDateKo(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function roleLabel(role: TeamMemberRow["role"]): string {
    return role === "LEADER" ? "LEADER" : "MEMBER";
}

function AvatarStack({
    members,
    size = "md",
}: {
    members: { id: string; label: string; avatarUrl: string | null }[];
    size?: "sm" | "md";
}) {
    const displayCount = Math.min(members.length, AVATAR_STACK_MAX);
    const overflow = members.length - displayCount;
    const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm";

    return (
        <div className="flex items-center -space-x-2" aria-label={`팀원 ${members.length}명`}>
            {members.slice(0, displayCount).map((m) => (
                <UserAvatar
                    key={m.id}
                    userId={m.id}
                    label={m.label}
                    avatarUrl={m.avatarUrl}
                    sizeClass={sizeClass}
                />
            ))}
            {overflow > 0 && (
                <div
                    className={`${sizeClass} shrink-0 rounded-full ring-2 ring-white bg-stone-600 flex items-center justify-center font-medium text-white shadow-sm`}
                    title={`외 ${overflow}명`}
                >
                    +{overflow}
                </div>
            )}
        </div>
    );
}

export function TeamDetailPageClient({ team }: { team: TeamDetail }) {
    const router = useRouter();
    const t = useTranslations("teams.detail");
    const [activeTab, setActiveTab] = useState<TeamTab>("intro");
    const [membersModalOpen, setMembersModalOpen] = useState(false);
    const [memberModalOpen, setMemberModalOpen] = useState(false);
    const [composeChangeOpen, setComposeChangeOpen] = useState(false);
    const [introEditOpen, setIntroEditOpen] = useState(false);
    const introRef = useRef<TeamIntroPageContentHandle | null>(null);
    const [introLayoutEditMode, setIntroLayoutEditMode] = useState(false);
    const [settingsSubTab, setSettingsSubTab] = useState<TeamSettingsSubTab>("team");
    const [nameDraft, setNameDraft] = useState(team.name);
    const [nameError, setNameError] = useState<string | null>(null);
    const [namePending, startNameSave] = useTransition();
    const [shortDescDraft, setShortDescDraft] = useState(team.shortDescription ?? "");
    const [shortDescError, setShortDescError] = useState<string | null>(null);
    const [shortDescPending, startShortDescSave] = useTransition();

    const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
    const [removeConfirmUserId, setRemoveConfirmUserId] = useState<string | null>(null);
    const [removePending, startRemove] = useTransition();

    const [delegateConfirmUserId, setDelegateConfirmUserId] = useState<string | null>(null);
    const [delegatingUserId, setDelegatingUserId] = useState<string | null>(null);
    const [delegateError, setDelegateError] = useState<string | null>(null);
    const [delegatePending, startDelegate] = useTransition();

    useEffect(() => {
        setNameDraft(team.name);
    }, [team.id, team.name]);

    useEffect(() => {
        setShortDescDraft(team.shortDescription ?? "");
    }, [team.id, team.shortDescription]);

    const memberUserIds = useMemo(
        () => team.members.map((m) => m.user.id),
        [team.members],
    );

    const stackMembers = team.members.map((m) => ({
        id: m.user.id,
        label: displayUserName(m.user),
        avatarUrl: m.user.avatarUrl,
    }));

    const projects = team.projects ?? [];

    if (team.viewerRole === null) {
        return <TeamPublicDetail team={team} />;
    }

    const isLeader = team.viewerRole === "LEADER";

    useEffect(() => {
        if (activeTab !== "intro") {
            introRef.current?.exitLayoutEditMode();
        }
    }, [activeTab]);

    return (
        <div className="flex min-h-full w-full flex-col">
            <TeamIntroBannerBlock
                teamId={team.id}
                bannerUrl={team.bannerUrl}
                canEdit={isLeader}
                variant="pageTop"
            />
            <div className="border-b border-stone-200 bg-white px-4 py-3 sm:px-5 md:px-6">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.push("/teams")}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
                        aria-label={t("aria.backToTeams")}
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-lg font-semibold text-stone-800 sm:text-xl">
                            {team.name}
                        </h1>
                        <p className="truncate text-xs text-stone-500 sm:text-sm">
                            {team.shortDescription?.trim() || t("header.shortDescriptionFallback")}
                        </p>
                    </div>
                    <>
                        <button
                            type="button"
                            onClick={() => setMembersModalOpen(true)}
                            className="relative shrink-0 flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 pl-3 text-left transition-colors hover:bg-stone-100"
                            aria-haspopup="dialog"
                            aria-expanded={membersModalOpen}
                        >
                            <span className="whitespace-nowrap text-sm font-medium text-stone-600">
                                {t("labels.membersTotal", { count: team.members.length })}
                            </span>
                            {stackMembers.length > 0 && (
                                <AvatarStack members={stackMembers} size="md" />
                            )}
                        </button>

                        {membersModalOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-40 bg-stone-900/40"
                                    aria-hidden
                                    onClick={() => setMembersModalOpen(false)}
                                />
                                <div
                                    className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(80vh,520px)] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-stone-200 bg-white shadow-xl"
                                    role="dialog"
                                    aria-modal
                                    aria-labelledby="team-members-modal-title"
                                >
                                    <div className="border-b border-stone-100 px-5 py-4">
                                        <h2
                                            id="team-members-modal-title"
                                            className="text-base font-semibold text-stone-800"
                                        >
                                            {t("labels.members")}
                                        </h2>
                                        <p className="mt-0.5 text-sm text-stone-500">
                                            {t("labels.membersTotal", { count: team.members.length })}
                                        </p>
                                    </div>
                                    <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                                        {team.members.map((m) => (
                                            <li
                                                key={m.user.id}
                                                className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-stone-700"
                                            >
                                                <UserAvatar
                                                    userId={m.user.id}
                                                    label={displayUserName(m.user)}
                                                    avatarUrl={m.user.avatarUrl}
                                                    sizeClass="h-10 w-10 text-sm"
                                                    ringClass="ring-0"
                                                />
                                                <div className="min-w-0 flex-1 truncate">
                                                    <span className="font-medium text-stone-800">
                                                        {displayUserName(m.user)}
                                                    </span>
                                                    <p className="truncate text-xs text-stone-500">
                                                        {m.user.email}
                                                    </p>
                                                </div>
                                                <span className="shrink-0 text-xs text-stone-500">
                                                    {t(`roles.${roleLabel(m.role)}` as any)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="border-t border-stone-100 px-5 py-3">
                                        <button
                                            type="button"
                                            onClick={() => setMembersModalOpen(false)}
                                            className="w-full rounded-lg border border-stone-200 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                                        >
                                            {t("common.close")}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                </div>
            </div>

            <div className="border-b border-stone-200 bg-white/95">
                <div className="flex items-end justify-between gap-2 px-4 sm:px-5 md:px-6">
                    <nav className="flex gap-0 overflow-x-auto" aria-label="팀 서브메뉴">
                        {TABS.map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`
                    shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors
                    sm:px-5
                    ${
                        activeTab === tab
                            ? "border-stone-800 text-stone-800"
                            : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700"
                    }
                  `}
                            >
                                {t(`tabs.${tab}` as any)}
                            </button>
                        ))}
                    </nav>

                    {/* PC/Tablet: 탭 우측 작은 버튼들 */}
                    {isLeader && activeTab === "intro" ? (
                        <div className="hidden sm:flex items-center gap-2 pb-2">
                            <button
                                type="button"
                                onClick={() => introRef.current?.toggleLayoutEditMode()}
                                className={[
                                    "inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium shadow-sm transition-colors",
                                    introLayoutEditMode
                                        ? "border-amber-300 bg-amber-50 text-amber-900"
                                        : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50",
                                ].join(" ")}
                                aria-pressed={introLayoutEditMode}
                            >
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    aria-hidden
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-2.25z"
                                    />
                                </svg>
                                {t("intro.layoutEdit.toggle")}
                            </button>

                            {introLayoutEditMode ? (
                                <button
                                    type="button"
                                    onClick={() => introRef.current?.openLayoutSettingsPanel()}
                                    className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50"
                                >
                                    <svg
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                        aria-hidden
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M10.5 6h9.75M10.5 18h9.75M3.75 6h4.5m-4.5 4.5h4.5m-4.5 4.5h4.5m-4.5 4.5h4.5"
                                        />
                                    </svg>
                                    {t("intro.layoutEdit.openSettings")}
                                </button>
                            ) : null}
                        </div>
                    ) : (
                        <span className="hidden sm:block pb-2" aria-hidden />
                    )}
                </div>
            </div>

            <div className="min-h-0 flex-1 p-4 sm:p-5 md:p-6">
                {activeTab === "projects" && (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2 className="text-base font-semibold text-stone-800 sm:text-lg">
                                    {t("projects.title")}
                                </h2>
                                <p className="mt-1 text-sm text-stone-500">
                                    {t("projects.desc")}
                                </p>
                            </div>
                            <Link
                                href={`/projects/new?teamIds=${encodeURIComponent(team.id)}`}
                                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
                            >
                                {t("projects.create")}
                            </Link>
                        </div>

                        {projects.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-6 py-12 text-center">
                                <p className="text-sm text-stone-600">
                                    {t("projects.emptyTitle")}
                                </p>
                                <p className="mt-2 text-xs text-stone-400">
                                    {t("projects.emptyDesc")}
                                </p>
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {projects.map((p) => (
                                    <li key={p.id}>
                                        <Link
                                            href={`/projects/${p.id}`}
                                            className="group flex cursor-pointer items-start gap-4 rounded-xl border border-stone-200 bg-white p-4 transition-all hover:border-stone-300 hover:shadow-md sm:p-5"
                                        >
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500 transition-colors group-hover:bg-stone-200 group-hover:text-stone-600 sm:h-11 sm:w-11">
                                                <svg
                                                    className="h-5 w-5 sm:h-6 sm:w-6"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    strokeWidth={1.5}
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                                                    />
                                                </svg>
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-semibold text-stone-800 transition-colors group-hover:text-stone-900">
                                                    {p.name}
                                                </h3>
                                                <p
                                                    className="mt-1 text-sm text-stone-500 line-clamp-2"
                                                    title={p.description ?? undefined}
                                                >
                                                    {p.description?.trim()
                                                        ? truncateText(p.description.trim(), 120)
                                                        : t("projects.noDescription")}
                                                </p>
                                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                                                    <span>
                                                        {t("projects.meta.members")}{" "}
                                                        <span className="font-medium text-stone-600">
                                                            {t("projects.meta.membersCount", { count: p._count.members })}
                                                        </span>
                                                    </span>
                                                    <span className="text-stone-300">|</span>
                                                    <span>
                                                        {t("projects.meta.tasks")}{" "}
                                                        <span className="font-medium text-stone-600">
                                                            {t("projects.meta.tasksCount", { count: p._count.tasks })}
                                                        </span>
                                                    </span>
                                                    <span className="text-stone-300">|</span>
                                                    <span>
                                                        {t("projects.meta.created")}{" "}
                                                        {formatDateKo(p.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="shrink-0 self-center text-stone-400">
                                                <svg
                                                    className="h-5 w-5"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    strokeWidth={2}
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                                                    />
                                                </svg>
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {activeTab === "intro" && (
                    <div className="space-y-6">
                        <TeamIntroPageContent
                            ref={introRef}
                            team={team}
                            onLayoutEditModeChange={setIntroLayoutEditMode}
                        />
                    </div>
                )}

                {activeTab === "members" && (
                    <div className="rounded-xl border border-stone-200 bg-white p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                                <h2 className="text-base font-semibold text-stone-800 sm:text-lg">
                                    {t("members.title")}
                                </h2>
                                <p className="mt-1 text-sm text-stone-500">
                                    {t("members.desc")}
                                </p>
                            </div>
                            {team.viewerRole === "LEADER" ? (
                                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:pt-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setMemberModalOpen(true)}
                                        className="inline-flex items-center gap-2 rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
                                    >
                                        <svg
                                            className="h-4 w-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2}
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M12 4.5v15m7.5-7.5h-15"
                                            />
                                        </svg>
                                        {t("members.add")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setComposeChangeOpen(true)}
                                        className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                                    >
                                        <svg
                                            className="h-4 w-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2}
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.723 6.723 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.37.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                        </svg>
                                        {t("members.composeChange")}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full min-w-[480px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-stone-200">
                                        <th className="pb-2 pr-4 font-medium text-stone-600">{t("members.table.name")}</th>
                                        <th className="pb-2 pr-4 font-medium text-stone-600">{t("members.table.email")}</th>
                                        <th className="pb-2 pr-4 font-medium text-stone-600">{t("members.table.role")}</th>
                                        <th className="pb-2 pr-4 font-medium text-stone-600">{t("members.table.joinedAt")}</th>
                                    </tr>
                                </thead>
                                <tbody className="text-stone-600">
                                    {team.members.map((m) => (
                                        <tr key={m.user.id} className="border-b border-stone-100">
                                            <td className="py-3 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar
                                                        userId={m.user.id}
                                                        label={displayUserName(m.user)}
                                                        avatarUrl={m.user.avatarUrl}
                                                        sizeClass="h-9 w-9 text-sm"
                                                        ringClass="ring-0"
                                                    />
                                                    <span className="font-medium text-stone-800">
                                                        {displayUserName(m.user)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 pr-4">{m.user.email}</td>
                                            <td className="py-3 pr-4">{t(`roles.${roleLabel(m.role)}` as any)}</td>
                                            <td className="py-3 pr-4">{formatDateKo(m.joinedAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === "settings" && (
                    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
                        <nav
                            className="flex shrink-0 gap-1 overflow-x-auto pb-1 lg:w-44 lg:flex-col lg:overflow-x-visible lg:pb-0"
                            aria-label="팀 설정 하위 탭"
                        >
                            {TEAM_SETTINGS_SUB_TABS.map(({ id, icon }) => {
                                const isActive = settingsSubTab === id;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setSettingsSubTab(id)}
                                        className={[
                                            "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                            "whitespace-nowrap lg:w-full",
                                            isActive
                                                ? "bg-stone-200 text-stone-900"
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
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d={icon}
                                            />
                                        </svg>
                                        {t(`settings.subTabs.${id}` as any)}
                                    </button>
                                );
                            })}
                        </nav>

                        <div className="min-w-0 flex-1 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm sm:p-7">
                            {settingsSubTab === "team" && (
                                <div className="space-y-8">
                                    <div>
                                        <h2 className="mb-1 text-base font-semibold text-stone-800">
                                            {t("settings.team.name.title")}
                                        </h2>
                                        <p className="text-sm text-stone-500">
                                            {t("settings.team.name.desc")}
                                        </p>
                                        {team.viewerRole === "LEADER" ? (
                                            <div className="mt-4 space-y-3">
                                                <input
                                                    id="team-name-settings"
                                                    type="text"
                                                    value={nameDraft}
                                                    onChange={(e) => setNameDraft(e.target.value)}
                                                    disabled={namePending}
                                                    placeholder={t("settings.team.name.placeholder")}
                                                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition placeholder:text-stone-300 focus:border-stone-400 focus:ring-2 focus:ring-stone-100 disabled:opacity-60"
                                                />
                                                {nameError ? (
                                                    <p className="text-sm text-red-600">{nameError}</p>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    disabled={namePending}
                                                    onClick={() => {
                                                        setNameError(null);
                                                        startNameSave(async () => {
                                                            const r = await updateTeamFieldsAction(
                                                                team.id,
                                                                {
                                                                    teamName: nameDraft.trim(),
                                                                },
                                                            );
                                                            if (!r.ok) {
                                                                setNameError(
                                                                    r.message ?? "저장에 실패했습니다.",
                                                                );
                                                            } else {
                                                                router.refresh();
                                                            }
                                                        });
                                                    }}
                                                    className="rounded-lg bg-stone-800 px-5 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {namePending ? t("common.saving") : t("settings.team.name.save")}
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="mt-4 rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-sm text-stone-700">
                                                {team.name}
                                            </p>
                                        )}
                                    </div>

                                    <div className="h-px bg-stone-100" />

                                    <div>
                                        <h2 className="mb-1 text-base font-semibold text-stone-800">
                                            {t("settings.team.shortDesc.title")}
                                        </h2>
                                        <p className="text-sm text-stone-500">
                                            {t("settings.team.shortDesc.desc")}
                                        </p>
                                        {team.viewerRole === "LEADER" ? (
                                            <div className="mt-4 space-y-3">
                                                <input
                                                    id="team-short-desc"
                                                    type="text"
                                                    value={shortDescDraft}
                                                    onChange={(e) => setShortDescDraft(e.target.value)}
                                                    disabled={shortDescPending}
                                                    placeholder={t("settings.team.shortDesc.placeholder")}
                                                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition placeholder:text-stone-300 focus:border-stone-400 focus:ring-2 focus:ring-stone-100 disabled:opacity-60"
                                                />
                                                {shortDescError ? (
                                                    <p className="text-sm text-red-600">
                                                        {shortDescError}
                                                    </p>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    disabled={shortDescPending}
                                                    onClick={() => {
                                                        setShortDescError(null);
                                                        startShortDescSave(async () => {
                                                            const r = await updateTeamFieldsAction(
                                                                team.id,
                                                                {
                                                                    shortDescription:
                                                                        shortDescDraft.trim() ===
                                                                        ""
                                                                            ? null
                                                                            : shortDescDraft.trim(),
                                                                },
                                                            );
                                                            if (!r.ok) {
                                                                setShortDescError(
                                                                    r.message ??
                                                                        "저장에 실패했습니다.",
                                                                );
                                                            } else {
                                                                router.refresh();
                                                            }
                                                        });
                                                    }}
                                                    className="rounded-lg bg-stone-800 px-5 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {shortDescPending
                                                        ? t("common.saving")
                                                        : t("settings.team.shortDesc.save")}
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="mt-4 rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-sm text-stone-700">
                                                {team.shortDescription?.trim() ||
                                                    t("settings.team.shortDesc.empty")}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {settingsSubTab === "security" && <TeamSecuritySection team={team} />}
                        </div>
                    </div>
                )}
            </div>

            <TeamAddMemberModal
                open={memberModalOpen}
                onClose={() => setMemberModalOpen(false)}
                teamId={team.id}
                existingUserIds={memberUserIds}
                onSuccess={() => router.refresh()}
            />

            <TeamIntroEditModal
                open={introEditOpen}
                onClose={() => setIntroEditOpen(false)}
                teamId={team.id}
                initialIntroMessage={team.introMessage}
            />

            {composeChangeOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-stone-900/40"
                        aria-hidden
                        onClick={() => {
                            if (!delegatePending && !removePending) {
                                setComposeChangeOpen(false);
                                setDelegateConfirmUserId(null);
                                setRemoveConfirmUserId(null);
                                setDelegateError(null);
                            }
                        }}
                    />
                    <div
                        className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(80vh,560px)] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-stone-200 bg-white shadow-xl"
                        role="dialog"
                        aria-modal
                        aria-labelledby="compose-change-modal-title"
                    >
                        <div className="flex items-start justify-between border-b border-stone-100 px-5 py-4">
                            <div>
                                <h3
                                    id="compose-change-modal-title"
                                    className="text-base font-semibold text-stone-800"
                                >
                                    {t("members.composeChangeModal.title")}
                                </h3>
                                <p className="mt-0.5 text-sm text-stone-500">
                                    {t("members.composeChangeModal.desc")}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setComposeChangeOpen(false);
                                    setDelegateConfirmUserId(null);
                                    setRemoveConfirmUserId(null);
                                    setDelegateError(null);
                                }}
                                disabled={delegatePending || removePending}
                                className="ml-4 shrink-0 rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 disabled:opacity-40"
                                aria-label={t("common.close")}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                            {team.members.map((m) => {
                                const isLeaderRow = m.role === "LEADER";
                                const isDelegateConfirming = delegateConfirmUserId === m.user.id;
                                const isRemoveConfirming = removeConfirmUserId === m.user.id;
                                const isDelegating = delegatingUserId === m.user.id && delegatePending;
                                const isRemoving = removingMemberId === m.user.id && removePending;

                                return (
                                    <li
                                        key={m.user.id}
                                        className="flex flex-col gap-2 border-b border-stone-100 px-2 py-3 last:border-0"
                                    >
                                        <div className="flex items-center gap-3">
                                            <UserAvatar
                                                userId={m.user.id}
                                                label={displayUserName(m.user)}
                                                avatarUrl={m.user.avatarUrl}
                                                sizeClass="h-9 w-9 text-sm"
                                                ringClass="ring-0"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-stone-800 truncate">
                                                        {displayUserName(m.user)}
                                                    </span>
                                                    <span
                                                        className={[
                                                            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                                                            isLeaderRow
                                                                ? "bg-amber-100 text-amber-800"
                                                                : "bg-stone-100 text-stone-600",
                                                        ].join(" ")}
                                                    >
                                                        {t(`roles.${roleLabel(m.role)}` as any)}
                                                    </span>
                                                </div>
                                                <p className="truncate text-xs text-stone-500">{m.user.email}</p>
                                            </div>
                                            {!isLeaderRow && !isDelegateConfirming && !isRemoveConfirming && (
                                                <div className="flex shrink-0 items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        disabled={delegatePending || removePending}
                                                        onClick={() => {
                                                            setDelegateError(null);
                                                            setRemoveConfirmUserId(null);
                                                            setDelegateConfirmUserId(m.user.id);
                                                        }}
                                                        className="rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-600 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-40"
                                                    >
                                                        {t("members.composeChangeModal.delegateLeader")}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={delegatePending || removePending}
                                                        onClick={() => {
                                                            setDelegateError(null);
                                                            setDelegateConfirmUserId(null);
                                                            setRemoveConfirmUserId(m.user.id);
                                                        }}
                                                        className="rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                                    >
                                                        {t("members.composeChangeModal.removeMember")}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {isDelegateConfirming && (
                                            <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                                                <span className="text-xs text-amber-800">
                                                    {t("members.composeChangeModal.delegateConfirmLabel")}
                                                </span>
                                                <div className="flex shrink-0 items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        disabled={isDelegating}
                                                        onClick={() => {
                                                            setDelegatingUserId(m.user.id);
                                                            setDelegateError(null);
                                                            startDelegate(async () => {
                                                                const r = await delegateTeamLeaderAction(team.id, m.user.id);
                                                                setDelegatingUserId(null);
                                                                setDelegateConfirmUserId(null);
                                                                if (!r.ok) {
                                                                    setDelegateError(r.message ?? t("members.composeChangeModal.delegateError"));
                                                                } else {
                                                                    setComposeChangeOpen(false);
                                                                    router.refresh();
                                                                }
                                                            });
                                                        }}
                                                        className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
                                                    >
                                                        {isDelegating ? t("members.composeChangeModal.delegating") : t("members.composeChangeModal.delegateConfirm")}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isDelegating}
                                                        onClick={() => setDelegateConfirmUserId(null)}
                                                        className="rounded-md border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-60"
                                                    >
                                                        {t("common.cancel")}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {isRemoveConfirming && (
                                            <div className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                                                <span className="text-xs text-red-700">
                                                    {t("members.composeChangeModal.removeConfirmLabel")}
                                                </span>
                                                <div className="flex shrink-0 items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        disabled={isRemoving}
                                                        onClick={() => {
                                                            setRemovingMemberId(m.user.id);
                                                            setDelegateError(null);
                                                            startRemove(async () => {
                                                                const r = await removeTeamMemberAction(team.id, m.user.id);
                                                                setRemovingMemberId(null);
                                                                setRemoveConfirmUserId(null);
                                                                if (!r.ok) {
                                                                    setDelegateError(r.message ?? t("members.composeChangeModal.delegateError"));
                                                                } else {
                                                                    router.refresh();
                                                                }
                                                            });
                                                        }}
                                                        className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                                                    >
                                                        {isRemoving ? t("members.composeChangeModal.removing") : t("members.composeChangeModal.removeConfirm")}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isRemoving}
                                                        onClick={() => setRemoveConfirmUserId(null)}
                                                        className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                                                    >
                                                        {t("common.cancel")}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>

                        {delegateError && (
                            <div className="border-t border-stone-100 px-5 py-3">
                                <p className="text-sm text-red-600">{delegateError}</p>
                            </div>
                        )}

                        <div className="border-t border-stone-100 px-5 py-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setComposeChangeOpen(false);
                                    setDelegateConfirmUserId(null);
                                    setRemoveConfirmUserId(null);
                                    setDelegateError(null);
                                }}
                                disabled={delegatePending || removePending}
                                className="w-full rounded-lg border border-stone-200 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                            >
                                {t("common.close")}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Mobile: 우측 하단 플로팅 버튼 */}
            {isLeader && activeTab === "intro" ? (
                <>
                    {introLayoutEditMode ? (
                        <button
                            type="button"
                            onClick={() => introRef.current?.openLayoutSettingsPanel()}
                            className="fixed bottom-20 right-6 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-lg transition-colors hover:bg-stone-50 sm:hidden"
                            aria-label="레이아웃 선택"
                        >
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                aria-hidden
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M10.5 6h9.75M10.5 18h9.75M3.75 6h4.5m-4.5 4.5h4.5m-4.5 4.5h4.5m-4.5 4.5h4.5"
                                />
                            </svg>
                        </button>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => introRef.current?.toggleLayoutEditMode()}
                        className={[
                            "fixed bottom-6 right-6 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition-colors sm:hidden",
                            introLayoutEditMode
                                ? "border-amber-300 bg-amber-50 text-amber-900"
                                : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50",
                        ].join(" ")}
                        aria-label={
                            introLayoutEditMode ? t("intro.layoutEdit.toggleOffAria") : t("intro.layoutEdit.toggleOnAria")
                        }
                        aria-pressed={introLayoutEditMode}
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            aria-hidden
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-2.25z"
                            />
                        </svg>
                    </button>
                </>
            ) : null}
        </div>
    );
}
