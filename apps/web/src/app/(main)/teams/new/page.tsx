"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
    createTeamAction,
    searchUsersForTeamAction,
    type SearchableUser,
} from "@/app/actions/teams";

type SelectedMember = { id: string; name: string; email: string };

export default function NewTeamPage() {
    const t = useTranslations("teamsNew");
    const router = useRouter();
    const [name, setName] = useState("");
    const [shortDescription, setShortDescription] = useState("");
    const [introMessage, setIntroMessage] = useState("");
    const [members, setMembers] = useState<SelectedMember[]>([]);
    const [memberModalOpen, setMemberModalOpen] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchableUser[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [hiddenFromUsers, setHiddenFromUsers] = useState(false);

    useEffect(() => {
        if (!memberModalOpen) return;
        const q = userSearchQuery.trim();
        if (q.length < 1) {
            setSearchResults([]);
            return;
        }
        setSearchLoading(true);
        const t = window.setTimeout(async () => {
            const r = await searchUsersForTeamAction(q);
            setSearchLoading(false);
            if (r.ok) setSearchResults(r.users);
            else setSearchResults([]);
        }, 350);
        return () => window.clearTimeout(t);
    }, [userSearchQuery, memberModalOpen]);

    const addMember = (user: SearchableUser) => {
        if (members.some((m) => m.id === user.id)) return;
        const displayName =
            user.name?.trim() || user.email.split("@")[0] || user.email;
        setMembers((prev) => [
            ...prev,
            { id: user.id, name: displayName, email: user.email },
        ]);
        setMemberModalOpen(false);
        setUserSearchQuery("");
        setSearchResults([]);
    };

    const removeMember = (index: number) => {
        setMembers((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError("");
        if (!name.trim()) {
            setSubmitError(t("nameRequired"));
            return;
        }
        setSubmitting(true);
        const r = await createTeamAction({
            name: name.trim(),
            shortDescription: shortDescription.trim() || undefined,
            introMessage: introMessage.trim() || undefined,
            hiddenFromUsers,
            memberUserIds: members.map((m) => m.id),
        });
        setSubmitting(false);
        if (r.ok) {
            router.push("/teams");
        } else {
            setSubmitError(r.message);
        }
    };

    return (
        <div className="w-full p-4 text-left sm:p-5 md:p-6 lg:p-8">
            <div className="w-full max-w-full">
                <Link
                    href="/teams"
                    className="inline-flex items-center gap-1.5 text-sm text-stone-500 dark:text-elivis-ink-secondary transition-colors hover:text-stone-700"
                >
                    <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    {t("backToList")}
                </Link>
                <div className="mt-4">
                    <h2 className="text-2xl font-semibold text-stone-800 dark:text-elivis-ink sm:text-3xl">{t("title")}</h2>
                    <p className="mt-2 text-stone-600 dark:text-elivis-ink-secondary">{t("subtitle")}</p>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-6 sm:mt-8">
                    {submitError ? (
                        <p className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-800">
                            {submitError}
                        </p>
                    ) : null}

                    <div>
                        <label
                            htmlFor="team-name"
                            className="block text-sm font-medium text-stone-700 dark:text-elivis-ink"
                        >
                            {t("nameLabel")}
                        </label>
                        <input
                            id="team-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t("namePlaceholder")}
                            required
                            className="mt-1.5 w-full rounded-lg border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-3 py-2.5 text-sm text-stone-800 dark:text-elivis-ink placeholder:text-stone-400 dark:placeholder:text-elivis-ink-muted focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="team-short-desc"
                            className="block text-sm font-medium text-stone-700 dark:text-elivis-ink"
                        >
                            {t("shortLabel")}
                        </label>
                        <input
                            id="team-short-desc"
                            type="text"
                            value={shortDescription}
                            onChange={(e) => setShortDescription(e.target.value)}
                            placeholder={t("shortPlaceholder")}
                            className="mt-1.5 w-full rounded-lg border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-3 py-2.5 text-sm text-stone-800 dark:text-elivis-ink placeholder:text-stone-400 dark:placeholder:text-elivis-ink-muted focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="team-intro"
                            className="block text-sm font-medium text-stone-700 dark:text-elivis-ink"
                        >
                            {t("introLabel")}
                        </label>
                        <textarea
                            id="team-intro"
                            value={introMessage}
                            onChange={(e) => setIntroMessage(e.target.value)}
                            placeholder={t("introPlaceholder")}
                            rows={5}
                            className="mt-1.5 w-full resize-y rounded-lg border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-3 py-2.5 font-mono text-sm text-stone-800 dark:text-elivis-ink placeholder:text-stone-400 dark:placeholder:text-elivis-ink-muted focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
                        />
                        <p className="mt-1 text-xs text-stone-400 dark:text-elivis-ink-secondary">
                            {t("introNote")}
                        </p>
                    </div>

                    <div>
                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 dark:border-elivis-line bg-stone-50/80 dark:bg-elivis-surface/80 px-4 py-3">
                            <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 dark:border-elivis-line text-stone-800 dark:text-elivis-ink focus:ring-stone-400"
                                checked={hiddenFromUsers}
                                onChange={(e) => setHiddenFromUsers(e.target.checked)}
                            />
                            <span className="text-sm text-stone-800 dark:text-elivis-ink">
                                <span className="font-medium">{t("hideTeamTitle")}</span>
                                <span className="mt-0.5 block text-xs font-normal text-stone-500 dark:text-elivis-ink-secondary">
                                    {t("hideTeamNote")}
                                </span>
                            </span>
                        </label>
                    </div>

                    <div>
                        <p className="text-sm font-medium text-stone-700 dark:text-elivis-ink">{t("addMembersTitle")}</p>
                        <p className="mt-0.5 text-xs text-stone-400 dark:text-elivis-ink-secondary">{t("addMembersNote")}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {members.map((p, i) => (
                                <span
                                    key={p.id}
                                    className="inline-flex items-center gap-2 rounded-full border border-stone-200 dark:border-elivis-line bg-stone-50/80 dark:bg-elivis-surface/80 py-1.5 pl-1.5 pr-2"
                                >
                                    <span className="flex h-7 w-7 shrink-0 rounded-full bg-stone-300 dark:bg-elivis-surface-elevated" />
                                    <span className="flex flex-col items-start">
                                        <span className="text-sm font-medium text-stone-800 dark:text-elivis-ink leading-tight">
                                            {p.name}
                                        </span>
                                        <span className="text-xs text-stone-500 dark:text-elivis-ink-secondary leading-tight">
                                            {p.email}
                                        </span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeMember(i)}
                                        className="shrink-0 rounded-full p-0.5 text-stone-400 dark:text-elivis-ink-secondary hover:bg-stone-200 hover:text-stone-600"
                                        aria-label={t("memberRemoveAria")}
                                    >
                                        <svg
                                            className="h-3.5 w-3.5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2}
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </button>
                                </span>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => setMemberModalOpen(true)}
                            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-3 py-2 text-sm font-medium text-stone-600 dark:text-elivis-ink-secondary transition-colors hover:border-stone-300 hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated"
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
                            {t("openMemberModal")}
                        </button>
                    </div>

                    {memberModalOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40 bg-stone-900/40"
                                aria-hidden
                                onClick={() => {
                                    setMemberModalOpen(false);
                                    setUserSearchQuery("");
                                    setSearchResults([]);
                                }}
                            />
                            <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface shadow-xl">
                                <div className="border-b border-stone-100 dark:border-elivis-line px-4 py-3">
                                    <h3 className="text-base font-semibold text-stone-800 dark:text-elivis-ink">
                                        {t("openMemberModal")}
                                    </h3>
                                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-stone-200 dark:border-elivis-line bg-stone-50/50 px-3 py-2">
                                        <svg
                                            className="h-4 w-4 shrink-0 text-stone-400 dark:text-elivis-ink-secondary"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={1.5}
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                                            />
                                        </svg>
                                        <input
                                            type="search"
                                            value={userSearchQuery}
                                            onChange={(e) => setUserSearchQuery(e.target.value)}
                                            placeholder={t("userSearchPlaceholder")}
                                            className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 dark:text-elivis-ink placeholder:text-stone-400 dark:placeholder:text-elivis-ink-muted focus:outline-none"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <ul className="max-h-64 overflow-y-auto py-2">
                                    {userSearchQuery.trim().length < 1 ? (
                                        <li className="px-4 py-6 text-center text-sm text-stone-500 dark:text-elivis-ink-secondary">
                                            {t("userSearchMin")}
                                        </li>
                                    ) : searchLoading ? (
                                        <li className="flex justify-center py-8">
                                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-stone-200 dark:border-elivis-line border-t-stone-600" />
                                        </li>
                                    ) : searchResults.length === 0 ? (
                                        <li className="px-4 py-6 text-center text-sm text-stone-500 dark:text-elivis-ink-secondary">
                                            {t("userSearchEmpty")}
                                        </li>
                                    ) : (
                                        searchResults.map((user) => {
                                            const isAdded = members.some((m) => m.id === user.id);
                                            return (
                                                <li key={user.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => !isAdded && addMember(user)}
                                                        disabled={isAdded}
                                                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                                            isAdded
                                                                ? "cursor-default opacity-50"
                                                                : "hover:bg-stone-50"
                                                        }`}
                                                    >
                                                        <span className="h-9 w-9 shrink-0 rounded-full bg-stone-300 dark:bg-elivis-surface-elevated" />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-stone-800 dark:text-elivis-ink">
                                                                {user.name?.trim() ||
                                                                    user.email.split("@")[0]}
                                                            </p>
                                                            <p className="text-xs text-stone-500 dark:text-elivis-ink-secondary">
                                                                {user.email}
                                                            </p>
                                                        </div>
                                                        {isAdded && (
                                                            <span className="text-xs text-stone-400 dark:text-elivis-ink-secondary">
                                                                {t("modalDone")}
                                                            </span>
                                                        )}
                                                    </button>
                                                </li>
                                            );
                                        })
                                    )}
                                </ul>
                                <div className="border-t border-stone-100 dark:border-elivis-line px-4 py-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMemberModalOpen(false);
                                            setUserSearchQuery("");
                                            setSearchResults([]);
                                        }}
                                        className="w-full rounded-lg border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-4 py-2 text-sm font-medium text-stone-700 dark:text-elivis-ink transition-colors hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated"
                                    >
                                        {t("modalDone")}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 disabled:opacity-60"
                        >
                            {submitting ? t("submitting") : t("submit")}
                        </button>
                        <Link
                            href="/teams"
                            className="rounded-lg border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-4 py-2.5 text-sm font-medium text-stone-700 dark:text-elivis-ink transition-colors hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2"
                        >
                            {t("cancel")}
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
