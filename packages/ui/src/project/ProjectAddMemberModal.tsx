"use client";

import { useEffect, useState } from "react";

import type { Project } from "../types/project-ui";
import type { SearchableUserForProject } from "../types/project-user-search";
import type { ProjectSettingsActions } from "../types/project-settings-actions";

type ProjectAddMemberModalProps = {
    open: boolean;
    onClose: () => void;
    projectId: string;
    existingUserIds: string[];
    onSuccess: (project: Project) => void;
    searchUsers: ProjectSettingsActions["searchUsers"];
    addProjectMember: ProjectSettingsActions["addProjectMember"];
};

export function ProjectAddMemberModal({
    open,
    onClose,
    projectId,
    existingUserIds,
    onSuccess,
    searchUsers,
    addProjectMember,
}: ProjectAddMemberModalProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchableUserForProject[]>([]);
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
        const timer = window.setTimeout(async () => {
            const r = await searchUsers(q);
            setLoading(false);
            if (r.ok) {
                setResults(r.users.filter((u) => !already.has(u.id)));
            } else {
                setResults([]);
                setError(r.message);
            }
        }, 350);
        return () => window.clearTimeout(timer);
    }, [query, open, existingUserIds, searchUsers]);

    const handlePick = async (user: SearchableUserForProject) => {
        setError("");
        setAddingId(user.id);
        const r = await addProjectMember(projectId, user.id, "MEMBER");
        setAddingId(null);
        if (r.ok) {
            onSuccess(r.project);
            onClose();
        } else {
            setError(r.message);
        }
    };

    if (!open) return null;

    return (
        <>
            <div className="fixed inset-0 z-40 bg-stone-900/40" aria-hidden onClick={onClose} />
            <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface shadow-xl">
                <div className="border-b border-stone-100 dark:border-elivis-line px-4 py-3">
                    <h3 className="text-base font-semibold text-stone-800 dark:text-elivis-ink">프로젝트 멤버 초대</h3>
                    <p className="mt-1 text-xs text-stone-500 dark:text-elivis-ink-secondary">
                        이름 또는 이메일로 검색해 초대합니다. 초대된 사용자는{" "}
                        <strong>프로젝트 멤버</strong>로 등록됩니다.
                    </p>
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
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setError("");
                            }}
                            placeholder="검색…"
                            className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 dark:text-elivis-ink placeholder:text-stone-400 dark:placeholder:text-elivis-ink-muted focus:outline-none"
                            autoFocus
                        />
                    </div>
                    {error ? <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p> : null}
                </div>
                <ul className="max-h-64 overflow-y-auto py-2">
                    {query.trim().length < 1 ? (
                        <li className="px-4 py-6 text-center text-sm text-stone-500 dark:text-elivis-ink-secondary">
                            검색어를 입력하세요.
                        </li>
                    ) : loading ? (
                        <li className="flex justify-center py-8">
                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-stone-200 dark:border-elivis-line border-t-stone-600" />
                        </li>
                    ) : results.length === 0 ? (
                        <li className="px-4 py-6 text-center text-sm text-stone-500 dark:text-elivis-ink-secondary">
                            검색 결과가 없습니다.
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
                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated disabled:opacity-60"
                                    >
                                        <span className="h-9 w-9 shrink-0 rounded-full bg-stone-300 dark:bg-elivis-surface-elevated" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-stone-800 dark:text-elivis-ink">
                                                {displayName}
                                            </p>
                                            <p className="text-xs text-stone-500 dark:text-elivis-ink-secondary">{user.email}</p>
                                        </div>
                                        {busy ? (
                                            <span className="text-xs text-stone-400 dark:text-elivis-ink-secondary">추가 중…</span>
                                        ) : (
                                            <span className="text-xs font-medium text-stone-600 dark:text-elivis-ink-secondary">
                                                초대
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
                        onClick={onClose}
                        className="w-full rounded-lg border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-4 py-2 text-sm font-medium text-stone-700 dark:text-elivis-ink transition-colors hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </>
    );
}
