"use client";

import { useLocale, useTranslations } from "next-intl";

import { MarkdownContent } from "../MarkdownContent";
import type { TeamDetail, TeamMemberRow } from "../types/team-detail";
import { UserAvatar } from "../UserAvatar";

const MEMBERS_PREVIEW_MAX = 3;

function displayUserName(u: { name: string | null; email: string }): string {
    return u.name?.trim() || u.email.split("@")[0] || u.email;
}

function formatDetailDate(iso: string, locale: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const tag = locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "en-US";
    return d.toLocaleDateString(tag, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

export function TeamIntroPageContent({
    team,
    /** false: 비회원 공개 화면 — 팀원 표·이메일 비노출 */
    showFullRoster = true,
    /** 있으면 팀원은 최근 참여 순 미리보기 + 버튼으로 팀원 탭 이동 */
    onOpenMembersTab,
}: {
    team: TeamDetail;
    showFullRoster?: boolean;
    onOpenMembersTab?: () => void;
}) {
    const t = useTranslations("teams.detail");
    const locale = useLocale();
    const projects = team.projects ?? [];
    const projectCount = projects.length;

    const leader = team.members.find((m) => m.role === "LEADER") ?? null;

    const sortedMembers = [...team.members].sort((a, b) => {
        if (a.role !== b.role) return a.role === "LEADER" ? -1 : 1;
        return displayUserName(a.user).localeCompare(displayUserName(b.user), locale, {
            sensitivity: "base",
        });
    });

    const recentMembersPreview = [...team.members]
        .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
        .slice(0, MEMBERS_PREVIEW_MAX);

    const membersPreviewMode = Boolean(showFullRoster && onOpenMembersTab);

    const hasIntro = Boolean(team.introMessage?.trim());

    return (
        <div className="space-y-8 pb-12 md:pb-16">
            <section
                className="relative"
                aria-labelledby="team-intro-hero-heading"
            >
                <div className="overflow-hidden rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface shadow-sm">
                    <div className="border-b border-stone-100 dark:border-elivis-line px-5 py-4 sm:px-6">
                        <h2
                            id="team-intro-hero-heading"
                            className="text-base font-semibold text-stone-800 dark:text-elivis-ink sm:text-lg"
                        >
                            {t("intro.messageTitle")}
                        </h2>
                    </div>
                    <div className="px-5 py-6 sm:px-6 sm:py-8">
                        {hasIntro ? (
                            <MarkdownContent
                                markdown={team.introMessage!}
                                className="prose-lg prose-headings:font-semibold"
                            />
                        ) : (
                            <p className="text-center text-base leading-relaxed text-stone-400 dark:text-elivis-ink-secondary sm:text-lg">
                                {t("intro.messageEmpty")}
                            </p>
                        )}
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
                <section
                    className="flex min-h-0 lg:col-span-8"
                    aria-labelledby="team-intro-members-heading"
                >
                    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface shadow-sm">
                        <div className="shrink-0 border-b border-stone-100 dark:border-elivis-line px-5 pt-4 pb-5 sm:px-6 sm:pb-6">
                            <h3
                                id="team-intro-members-heading"
                                className="text-base font-semibold text-stone-800 dark:text-elivis-ink"
                            >
                                {t("members.title")}
                            </h3>
                            {showFullRoster ? (
                                <>
                                    <p className="mt-1 text-sm text-stone-500 dark:text-elivis-ink-secondary">
                                        {membersPreviewMode ? t("intro.dashboard.recentMembersPreview") : t("members.desc")}
                                    </p>
                                    <p className="mt-2 text-xs font-medium text-stone-400 dark:text-elivis-ink-secondary">
                                        {t("labels.membersTotal", { count: team.members.length })}
                                    </p>
                                </>
                            ) : (
                                <p className="mt-1 text-sm text-stone-500 dark:text-elivis-ink-secondary">
                                    {t("intro.dashboard.publicMembersSummary")}
                                </p>
                            )}
                        </div>

                        {showFullRoster && membersPreviewMode ? (
                            <div className="flex min-h-0 flex-1 flex-col px-5 pt-4 pb-5 sm:px-6 sm:pb-6">
                                <ul className="min-h-0 flex-1 divide-y divide-stone-100 dark:divide-elivis-line">
                                    {recentMembersPreview.map((m) => (
                                        <li key={m.user.id} className="flex items-center gap-3 py-3 first:pt-0">
                                            <UserAvatar
                                                userId={m.user.id}
                                                label={displayUserName(m.user)}
                                                avatarUrl={m.user.avatarUrl}
                                                sizeClass="h-10 w-10 text-sm"
                                                ringClass="ring-0"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-medium text-stone-800 dark:text-elivis-ink">
                                                        {displayUserName(m.user)}
                                                    </span>
                                                    <span
                                                        className={[
                                                            "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                                                            m.role === "LEADER"
                                                                ? "bg-stone-200 text-stone-800"
                                                                : "bg-stone-100 text-stone-600",
                                                        ].join(" ")}
                                                    >
                                                        {t(`roles.${m.role}`)}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 truncate text-sm text-stone-500 dark:text-elivis-ink-secondary">{m.user.email}</p>
                                                <p className="mt-0.5 text-xs text-stone-400 dark:text-elivis-ink-secondary">
                                                    {t("members.table.joinedAt")}: {formatDetailDate(m.joinedAt, locale)}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-auto shrink-0 border-t border-stone-100 dark:border-elivis-line pt-4">
                                    <button
                                        type="button"
                                        onClick={onOpenMembersTab}
                                        className="w-full rounded-lg border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface py-2.5 text-sm font-medium text-stone-800 dark:text-elivis-ink transition-colors hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated"
                                        aria-label={t("intro.dashboard.openMembersTabAria")}
                                    >
                                        {t("intro.dashboard.openMembersTab")}
                                    </button>
                                </div>
                            </div>
                        ) : showFullRoster ? (
                            <div className="overflow-x-auto px-5 pt-4 pb-5 sm:px-6 sm:pb-6">
                                <table className="w-full min-w-[480px] text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-stone-200 dark:border-elivis-line">
                                            <th className="pb-2 pr-4 font-medium text-stone-600 dark:text-elivis-ink-secondary">
                                                {t("members.table.name")}
                                            </th>
                                            <th className="pb-2 pr-4 font-medium text-stone-600 dark:text-elivis-ink-secondary">
                                                {t("members.table.email")}
                                            </th>
                                            <th className="pb-2 pr-4 font-medium text-stone-600 dark:text-elivis-ink-secondary">
                                                {t("members.table.role")}
                                            </th>
                                            <th className="pb-2 pr-4 font-medium text-stone-600 dark:text-elivis-ink-secondary">
                                                {t("members.table.joinedAt")}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-stone-600 dark:text-elivis-ink-secondary">
                                        {sortedMembers.map((m: TeamMemberRow) => (
                                            <tr key={m.user.id} className="border-b border-stone-100 dark:border-elivis-line last:border-0">
                                                <td className="py-3 pr-4">
                                                    <div className="flex items-center gap-3">
                                                        <UserAvatar
                                                            userId={m.user.id}
                                                            label={displayUserName(m.user)}
                                                            avatarUrl={m.user.avatarUrl}
                                                            sizeClass="h-9 w-9 text-sm"
                                                            ringClass="ring-0"
                                                        />
                                                        <span className="font-medium text-stone-800 dark:text-elivis-ink">
                                                            {displayUserName(m.user)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="max-w-[200px] truncate py-3 pr-4">{m.user.email}</td>
                                                <td className="py-3 pr-4">
                                                    <span
                                                        className={[
                                                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                                            m.role === "LEADER"
                                                                ? "bg-stone-200 text-stone-800"
                                                                : "bg-stone-100 text-stone-600",
                                                        ].join(" ")}
                                                    >
                                                        {t(`roles.${m.role}`)}
                                                    </span>
                                                </td>
                                                <td className="py-3 pr-4 whitespace-nowrap">
                                                    {formatDetailDate(m.joinedAt, locale)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="px-5 pt-4 pb-8 text-center sm:px-6">
                                <p className="text-3xl font-bold tabular-nums text-stone-900 dark:text-elivis-ink">
                                    {t("labels.membersCount", { count: team.members.length })}
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                <aside
                    className="flex h-full min-h-0 flex-col gap-4 lg:col-span-4"
                    aria-label={t("intro.dashboard.asideAria")}
                >
                    <div className="rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface p-5 shadow-sm sm:p-6">
                        <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-elivis-ink-secondary">
                            {t("meta.createdAt")}
                        </p>
                        <p className="mt-2 text-2xl font-bold tabular-nums text-stone-900 dark:text-elivis-ink">
                            {formatDetailDate(team.createdAt, locale)}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface p-5 shadow-sm sm:p-6">
                        <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-elivis-ink-secondary">
                            {t("roles.LEADER")}
                        </p>
                        {leader ? (
                            <div className="mt-4 flex items-center gap-4">
                                <UserAvatar
                                    userId={leader.user.id}
                                    label={displayUserName(leader.user)}
                                    avatarUrl={leader.user.avatarUrl}
                                    sizeClass="h-14 w-14 text-lg"
                                    ringClass="ring-2 ring-stone-200"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-lg font-semibold text-stone-900 dark:text-elivis-ink">
                                        {displayUserName(leader.user)}
                                    </p>
                                    {showFullRoster ? (
                                        <p className="mt-0.5 truncate text-sm text-stone-500 dark:text-elivis-ink-secondary">{leader.user.email}</p>
                                    ) : null}
                                </div>
                            </div>
                        ) : (
                            <p className="mt-2 text-sm text-stone-400 dark:text-elivis-ink-secondary">—</p>
                        )}
                    </div>

                    <div className="rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface p-5 shadow-sm sm:p-6">
                        <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-elivis-ink-secondary">
                            {t("projects.title")}
                        </p>
                        <p className="mt-2 text-3xl font-bold tabular-nums text-stone-900 dark:text-elivis-ink">{projectCount}</p>
                        <p className="mt-1 text-sm text-stone-500 dark:text-elivis-ink-secondary">{t("intro.dashboard.projectsHint")}</p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
