"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { ElivisSelect } from "../../ElivisSelect";
import type { TeamDetail } from "../../types/team-detail";

const ACTIVITY_PAGE_SIZES = [10, 25, 50, 100] as const;
type ActivityPageSize = (typeof ACTIVITY_PAGE_SIZES)[number];

type ActivityKind = "team_created" | "member_joined" | "member_leader" | "project_linked";

type ActivityEvent = {
    id: string;
    kind: ActivityKind;
    actorName: string;
    targetName?: string;
    date: string;
};

function buildActivityLog(team: TeamDetail): ActivityEvent[] {
    const events: ActivityEvent[] = [];

    events.push({
        id: `created-${team.id}`,
        kind: "team_created",
        actorName: team.createdBy.name?.trim() || team.createdBy.email,
        date: team.createdAt,
    });

    for (const m of team.members) {
        events.push({
            id: `joined-${m.user.id}`,
            kind: m.role === "LEADER" ? "member_leader" : "member_joined",
            actorName: m.user.name?.trim() || m.user.email,
            date: m.joinedAt,
        });
    }

    for (const p of team.projects ?? []) {
        events.push({
            id: `project-${p.id}`,
            kind: "project_linked",
            actorName: "",
            targetName: p.name,
            date: p.createdAt,
        });
    }

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const ACTIVITY_ICON: Record<ActivityKind, { path: string; color: string }> = {
    team_created: {
        path: "M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
        color: "bg-sky-50 text-sky-500",
    },
    member_joined: {
        path: "M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z",
        color: "bg-emerald-50 text-emerald-500",
    },
    member_leader: {
        path: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z",
        color: "bg-amber-50 text-amber-500",
    },
    project_linked: {
        path: "M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z",
        color: "bg-violet-50 text-violet-500",
    },
};

export function TeamActivityLogSection({ team }: { team: TeamDetail }) {
    const t = useTranslations("teams.detail.activityLog");
    const locale = useLocale();
    const events = buildActivityLog(team);
    const [pageSize, setPageSize] = useState<ActivityPageSize>(10);
    const [page, setPage] = useState(1);

    const total = events.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => {
        const maxPage = Math.max(1, Math.ceil(total / pageSize));
        setPage((p) => Math.min(Math.max(1, p), maxPage));
    }, [total, pageSize]);

    const safePage = Math.min(Math.max(1, page), totalPages);
    const offset = (safePage - 1) * pageSize;
    const pageEvents = total === 0 ? [] : events.slice(offset, offset + pageSize);
    const rangeStart = total === 0 ? 0 : offset + 1;
    const rangeEnd = total === 0 ? 0 : offset + pageEvents.length;

    function eventLabel(ev: ActivityEvent): string {
        switch (ev.kind) {
            case "team_created":
                return t("eventTeamCreated", { actor: ev.actorName });
            case "member_joined":
                return t("memberJoined", { actor: ev.actorName });
            case "member_leader":
                return t("memberLeader", { actor: ev.actorName });
            case "project_linked":
                return t("projectLinked", { name: ev.targetName ?? "" });
        }
    }

    function formatWhen(iso: string) {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "—";
        const tag = locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "en-US";
        return d.toLocaleDateString(tag, {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }

    return (
        <div>
            <h2 className="mb-1 text-base font-semibold text-stone-800 dark:text-elivis-ink">{t("title")}</h2>
            <p className="mb-5 text-sm text-stone-500 dark:text-elivis-ink-secondary">{t("subtitle")}</p>
            {events.length === 0 ? (
                <p className="text-sm text-stone-400 dark:text-elivis-ink-secondary">{t("empty")}</p>
            ) : (
                <>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-elivis-ink-secondary">
                            <span className="shrink-0">{t("pagination.pageSize")}</span>
                            <ElivisSelect
                                variant="field"
                                className="w-auto min-w-[4.25rem] py-1"
                                aria-label={t("pagination.pageSize")}
                                value={String(pageSize)}
                                onChange={(e) => {
                                    const n = Number(e.target.value);
                                    if (
                                        n === 10 ||
                                        n === 25 ||
                                        n === 50 ||
                                        n === 100
                                    ) {
                                        setPageSize(n);
                                        setPage(1);
                                    }
                                }}
                            >
                                {ACTIVITY_PAGE_SIZES.map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </ElivisSelect>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-elivis-ink-secondary">
                            {t("pagination.summary", {
                                start: rangeStart,
                                end: rangeEnd,
                                total,
                                page: safePage,
                                pages: totalPages,
                            })}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={safePage <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-elivis-line dark:bg-elivis-surface dark:text-elivis-ink dark:hover:bg-elivis-surface-elevated"
                            >
                                {t("pagination.prev")}
                            </button>
                            <button
                                type="button"
                                disabled={safePage >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                className="rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-elivis-line dark:bg-elivis-surface dark:text-elivis-ink dark:hover:bg-elivis-surface-elevated"
                            >
                                {t("pagination.next")}
                            </button>
                        </div>
                    </div>
                    <ol className="relative border-l border-stone-200 dark:border-elivis-line">
                    {pageEvents.map((ev) => {
                        const icon = ACTIVITY_ICON[ev.kind];
                        return (
                            <li key={ev.id} className="mb-6 ml-6 last:mb-0">
                                <span
                                    className={`absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-white ${icon.color}`}
                                >
                                    <svg
                                        className="h-3.5 w-3.5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.8}
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d={icon.path}
                                        />
                                    </svg>
                                </span>
                                <p className="text-sm font-medium text-stone-800 dark:text-elivis-ink">{eventLabel(ev)}</p>
                                <time className="mt-0.5 block text-xs text-stone-400 dark:text-elivis-ink-secondary">
                                    {formatWhen(ev.date)}
                                </time>
                            </li>
                        );
                    })}
                    </ol>
                </>
            )}
        </div>
    );
}
