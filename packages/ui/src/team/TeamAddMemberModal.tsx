"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import type {
    SearchableUserForTeamInvite,
    TeamMemberInviteActions,
} from "../types/team-member-invite-actions";

type TeamAddMemberModalProps = {
    open: boolean;
    onClose: () => void;
    teamId: string;
    /** 이미 팀에 있는 유저 id — 검색 결과에서 제외 */
    existingUserIds: string[];
    onSuccess: () => void;
    inviteActions: TeamMemberInviteActions;
};

export function TeamAddMemberModal({
    open,
    onClose,
    teamId,
    existingUserIds,
    onSuccess,
    inviteActions,
}: TeamAddMemberModalProps) {
    const t = useTranslations("teams.detail");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchableUserForTeamInvite[]>([]);
    const [loading, setLoading] = useState(false);
    const [addingId, setAddingId] = useState<string | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open) {
            setQuery("");
            setResults([]);
            setError("");
            setAddingId(null);
            return;
        }
        const q = query.trim();
        if (q.length < 1) {
            setResults([]);
            return;
        }
        const already = new Set(existingUserIds);
        setLoading(true);
        const t = window.setTimeout(async () => {
            const r = await inviteActions.searchUsersForTeam(q);
            setLoading(false);
            if (r.ok) {
                setResults(r.users.filter((u) => !already.has(u.id)));
            } else {
                setResults([]);
            }
        }, 350);
        return () => window.clearTimeout(t);
    }, [query, open, existingUserIds, inviteActions]);

    const handlePick = async (user: SearchableUserForTeamInvite) => {
        setError("");
        setAddingId(user.id);
        const r = await inviteActions.addTeamMember(teamId, user.id);
        setAddingId(null);
        if (r.ok) {
            onSuccess();
            onClose();
        } else {
            setError(r.message);
        }
    };

    if (!open) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-40 bg-stone-900/40"
                aria-hidden
                onClick={onClose}
            />
            <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
                <div className="border-b border-stone-100 px-4 py-3">
                    <h3 className="text-base font-semibold text-stone-800">{t("addMember.title")}</h3>
                    <p className="mt-1 text-xs text-stone-500">
                        {t.rich("addMember.desc", {
                            strong: (chunks) => <strong>{chunks}</strong>,
                        })}
                    </p>
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-2">
                        <svg
                            className="h-4 w-4 shrink-0 text-stone-400"
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
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t("addMember.searchPlaceholder")}
                            className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none"
                            autoFocus
                        />
                    </div>
                    {error ? (
                        <p className="mt-2 text-sm text-red-700">{error}</p>
                    ) : null}
                </div>
                <ul className="max-h-64 overflow-y-auto py-2">
                    {query.trim().length < 1 ? (
                        <li className="px-4 py-6 text-center text-sm text-stone-500">
                            {t("addMember.emptyQuery")}
                        </li>
                    ) : loading ? (
                        <li className="flex justify-center py-8">
                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-stone-200 border-t-stone-600" />
                        </li>
                    ) : results.length === 0 ? (
                        <li className="px-4 py-6 text-center text-sm text-stone-500">
                            {t("addMember.emptyResults")}
                        </li>
                    ) : (
                        results.map((user) => {
                            const busy = addingId === user.id;
                            const displayName =
                                user.name?.trim() || user.email.split("@")[0] || user.email;
                            return (
                                <li key={user.id}>
                                    <button
                                        type="button"
                                        onClick={() => !busy && handlePick(user)}
                                        disabled={busy}
                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-stone-50 disabled:opacity-60"
                                    >
                                        <span className="h-9 w-9 shrink-0 rounded-full bg-stone-300" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-stone-800">
                                                {displayName}
                                            </p>
                                            <p className="text-xs text-stone-500">{user.email}</p>
                                        </div>
                                        {busy ? (
                                            <span className="text-xs text-stone-400">{t("addMember.adding")}</span>
                                        ) : (
                                            <span className="text-xs font-medium text-stone-600">
                                                {t("addMember.add")}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            );
                        })
                    )}
                </ul>
                <div className="border-t border-stone-100 px-4 py-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                    >
                        {t("common.cancel")}
                    </button>
                </div>
            </div>
        </>
    );
}
