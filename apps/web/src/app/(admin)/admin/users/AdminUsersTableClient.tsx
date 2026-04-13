"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import type { AdminUserRow } from "@/lib/server/admin.server";
import { AdminCreateUserModal } from "./AdminCreateUserModal";

const PAGE_SIZE = 10;

interface AdminUsersTableClientProps {
    users: AdminUserRow[];
    currentUserId: string;
}

function dashIfEmpty(value: string | null | undefined): string {
    if (value == null || String(value).trim() === "") return "-";
    return String(value);
}

function projectNamesText(u: AdminUserRow | null | undefined): string {
    if (u == null) return "-";
    const raw = u.memberships;
    if (!Array.isArray(raw) || raw.length === 0) return "-";
    const names: string[] = [];
    for (const m of raw) {
        const n = String(m?.project?.name ?? "").trim();
        if (n.length > 0) names.push(n);
    }
    if (names.length === 0) return "-";
    return names.join(", ");
}

function teamListText(
    u: AdminUserRow | null | undefined,
    teamRoleLabel: (role: "LEADER" | "MEMBER") => string,
): string {
    if (u == null) return "-";
    const raw = u.teamMemberships;
    if (!Array.isArray(raw) || raw.length === 0) return "-";
    const parts: string[] = [];
    for (const m of raw) {
        const n = String(m?.team?.name ?? "").trim();
        if (n.length === 0) continue;
        if (m.role === "LEADER") {
            parts.push(`${n} (${teamRoleLabel("LEADER")})`);
        } else {
            parts.push(n);
        }
    }
    if (parts.length === 0) return "-";
    return parts.join(", ");
}

/* ── 페이지네이션 컴포넌트 ── */
interface PaginationProps {
    current: number;
    total: number;
    onChange: (page: number) => void;
}

function Pagination({ current, total, onChange }: PaginationProps) {
    const t = useTranslations("adminUsers");
    /* 표시할 페이지 번호 목록 (최대 7개, 현재 기준으로 슬라이딩) */
    function getPages(): (number | "…")[] {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
        const pages: (number | "…")[] = [];
        pages.push(1);
        if (current > 4) pages.push("…");
        const start = Math.max(2, current - 2);
        const end = Math.min(total - 1, current + 2);
        for (let i = start; i <= end; i++) pages.push(i);
        if (current < total - 3) pages.push("…");
        pages.push(total);
        return pages;
    }

    const pages = getPages();

    return (
        <div className="flex flex-row flex-wrap items-center justify-between gap-3 border-t border-stone-100 dark:border-elivis-line px-4 py-3 sm:px-6">
            <p className="shrink-0 text-xs text-stone-500 dark:text-elivis-ink-secondary tabular-nums">
                {t("paginationPageOf", { current, total })}
            </p>
            <nav className="flex items-center gap-1" aria-label={t("paginationNav")}>
                {/* 이전 */}
                <button
                    type="button"
                    onClick={() => onChange(current - 1)}
                    disabled={current === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 dark:text-elivis-ink-secondary transition-colors hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label={t("paginationPrev")}
                >
                    <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 19.5 8.25 12l7.5-7.5"
                        />
                    </svg>
                </button>

                {/* 페이지 번호 */}
                {pages.map((p, idx) =>
                    p === "…" ? (
                        <span
                            key={`ellipsis-${idx}`}
                            className="flex h-8 w-8 items-center justify-center text-xs text-stone-400 dark:text-elivis-ink-secondary"
                        >
                            …
                        </span>
                    ) : (
                        <button
                            key={p}
                            type="button"
                            onClick={() => onChange(p as number)}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                                p === current
                                    ? "bg-stone-800 text-white dark:bg-zinc-600 dark:text-white"
                                    : "text-stone-600 hover:bg-stone-100 dark:text-elivis-ink-secondary dark:hover:bg-elivis-surface-elevated"
                            }`}
                            aria-current={p === current ? "page" : undefined}
                        >
                            {p}
                        </button>
                    ),
                )}

                {/* 다음 */}
                <button
                    type="button"
                    onClick={() => onChange(current + 1)}
                    disabled={current === total}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 dark:text-elivis-ink-secondary transition-colors hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label={t("paginationNext")}
                >
                    <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8.25 4.5l7.5 7.5-7.5 7.5"
                        />
                    </svg>
                </button>
            </nav>
        </div>
    );
}

/* ── 메인 컴포넌트 ── */
export function AdminUsersTableClient({ users, currentUserId }: AdminUsersTableClientProps) {
    const router = useRouter();
    const t = useTranslations("adminUsers");
    const tRole = useTranslations("domain.systemRole");
    const tTeamRole = useTranslations("teams.detail.roles");
    const [localUsers, setLocalUsers] = useState<AdminUserRow[]>(() =>
        Array.isArray(users) ? users : [],
    );
    const [modalOpen, setModalOpen] = useState(false);
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (Array.isArray(users)) setLocalUsers(users);
    }, [users]);

    const list = Array.isArray(localUsers) ? localUsers : [];
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageUsers = list.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    function onCreated(newUser: AdminUserRow) {
        setLocalUsers((prev) => [newUser, ...prev]);
        setPage(1);
        router.refresh();
    }

    function onPageChange(next: number) {
        setPage(next);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    return (
        <>
            <div className="w-full max-w-full">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <p className="text-stone-600 dark:text-elivis-ink-secondary">{t("intro")}</p>
                        <button
                            type="button"
                            onClick={() => setModalOpen(true)}
                            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 dark:bg-elivis-accent-strong dark:hover:bg-elivis-accent-hover"
                        >
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2.5}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 5v14M5 12h14"
                                />
                            </svg>
                            {t("addUser")}
                        </button>
                    </div>

                    <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface shadow-sm sm:mt-8">
                        {/* 헤더 */}
                        <div className="border-b border-stone-100 dark:border-elivis-line px-4 py-3 sm:px-6">
                            <h2 className="text-sm font-semibold text-stone-800 dark:text-elivis-ink">{t("listTitle")}</h2>
                            <p className="mt-0.5 text-xs text-stone-500 dark:text-elivis-ink-secondary">
                                {t("listSubtitle", {
                                    count: list.length,
                                    superAdmin: tRole("SUPER_ADMIN"),
                                    userRole: tRole("USER"),
                                })}
                            </p>
                        </div>

                        {/* 테이블 */}
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[960px] text-center text-sm">
                                <thead>
                                    <tr className="border-b border-stone-100 dark:border-elivis-line bg-stone-50/80 dark:bg-elivis-surface/80 text-xs font-medium text-stone-600 dark:text-elivis-ink-secondary">
                                        <th className="px-4 py-3 sm:px-6">{t("colEmail")}</th>
                                        <th className="px-4 py-3 sm:px-6">{t("colName")}</th>
                                        <th className="px-4 py-3 sm:px-6">{t("colRole")}</th>
                                        <th className="whitespace-nowrap px-4 py-3 sm:px-6">
                                            {t("colAccess")}
                                        </th>
                                        <th className="px-4 py-3 sm:px-6">{t("colTeam")}</th>
                                        <th className="px-4 py-3 sm:px-6">{t("colProject")}</th>
                                        <th className="whitespace-nowrap px-4 py-3 sm:px-6">
                                            {t("colJoined")}
                                        </th>
                                        <th className="px-4 py-3 text-right sm:px-6">{t("colManage")}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 dark:divide-elivis-line">
                                    {list.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="py-12 text-center text-sm text-stone-400 dark:text-elivis-ink-secondary"
                                            >
                                                {t("empty")}
                                            </td>
                                        </tr>
                                    ) : (
                                        pageUsers.map((u) => {
                                            const isSelf = u.id === currentUserId;
                                            const teamCell = teamListText(u, (r) => tTeamRole(r));
                                            return (
                                                <tr key={u.id} className="text-stone-700 dark:text-elivis-ink">
                                                    <td className="max-w-[200px] truncate px-4 py-3 font-medium sm:max-w-none sm:px-6">
                                                        {dashIfEmpty(u.email) === "-" ? (
                                                            <span className="text-stone-400 dark:text-elivis-ink-secondary">
                                                                -
                                                            </span>
                                                        ) : (
                                                            <Link
                                                                href={`/admin/users/${u.id}`}
                                                                className="cursor-pointer text-stone-800 dark:text-elivis-ink underline-offset-2 hover:text-orange-700 hover:underline dark:hover:text-elivis-accent-hover"
                                                            >
                                                                {u.email}
                                                            </Link>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 sm:px-6">
                                                        <span
                                                            className={
                                                                u.name == null ||
                                                                String(u.name).trim() === ""
                                                                    ? "text-stone-400 dark:text-elivis-ink-secondary"
                                                                    : ""
                                                            }
                                                        >
                                                            {dashIfEmpty(u.name)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 sm:px-6">
                                                        <span className="text-xs font-medium text-stone-800 dark:text-elivis-ink">
                                                            {u.systemRole === "SUPER_ADMIN"
                                                                ? tRole("SUPER_ADMIN")
                                                                : tRole("USER")}
                                                            {isSelf ? (
                                                                <span className="ml-1.5 text-stone-400 dark:text-elivis-ink-secondary">
                                                                    {t("selfSuffix")}
                                                                </span>
                                                            ) : null}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 sm:px-6">
                                                        {u.accessBlocked ? (
                                                            <span className="inline-flex items-center rounded-lg bg-red-50 dark:bg-red-950/30 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300">
                                                                {t("accessSuspendedBadge")}
                                                            </span>
                                                        ) : (
                                                            <span className="text-stone-300 dark:text-elivis-ink-muted">—</span>
                                                        )}
                                                    </td>
                                                    <td className="max-w-[220px] px-4 py-3 text-left sm:max-w-[260px] sm:px-6">
                                                        <span
                                                            className={
                                                                teamCell === "-"
                                                                    ? "text-stone-400 dark:text-elivis-ink-secondary"
                                                                    : "text-stone-700 dark:text-elivis-ink"
                                                            }
                                                        >
                                                            {teamCell}
                                                        </span>
                                                    </td>
                                                    <td className="max-w-[220px] px-4 py-3 sm:max-w-[280px] sm:px-6">
                                                        <span
                                                            className={
                                                                projectNamesText(u) === "-"
                                                                    ? "text-stone-400 dark:text-elivis-ink-secondary"
                                                                    : ""
                                                            }
                                                        >
                                                            {projectNamesText(u)}
                                                        </span>
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 text-stone-600 dark:text-elivis-ink-secondary sm:px-6">
                                                        {u.createdAtLabel ?? "-"}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6">
                                                        <Link
                                                            href={`/admin/users/${u.id}`}
                                                            className="text-xs font-medium text-orange-700 underline-offset-2 hover:underline dark:text-elivis-accent-hover"
                                                        >
                                                            {t("detailLink")}
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* 페이지네이션 */}
                        <Pagination current={safePage} total={totalPages} onChange={onPageChange} />
                    </div>
            </div>

            <AdminCreateUserModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreated={onCreated}
            />
        </>
    );
}
