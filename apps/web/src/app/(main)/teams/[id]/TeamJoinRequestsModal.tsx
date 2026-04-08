"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { UserAvatar } from "@repo/ui";
import {
    acceptTeamJoinRequestAction,
    listTeamJoinRequestsAction,
    rejectTeamJoinRequestAction,
} from "@/app/actions/teams";
import type { ApiTeamJoinRequestRow } from "@/lib/mappers/team";

function displayUserName(u: { name: string | null; email: string }): string {
    return u.name?.trim() || u.email.split("@")[0] || u.email;
}

function formatRequestedAt(iso: string, locale: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const tag = locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "en-US";
    return d.toLocaleString(tag, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function TeamJoinRequestsModal({
    open,
    onClose,
    teamId,
    teamName,
}: {
    open: boolean;
    onClose: () => void;
    teamId: string;
    teamName: string;
}) {
    const router = useRouter();
    const t = useTranslations("teams.detail.joinRequests");
    const tCommon = useTranslations("teams.detail.common");
    const locale = useLocale();
    const [requests, setRequests] = useState<ApiTeamJoinRequestRow[]>([]);
    const [loadState, setLoadState] = useState<"idle" | "loading" | "error">("idle");
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<"accept" | "reject" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, startTransition] = useTransition();

    useEffect(() => {
        if (!open) {
            setLoadState("idle");
            setRequests([]);
            setError(null);
            return;
        }

        let cancelled = false;
        setLoadState("loading");
        setError(null);

        void (async () => {
            const r = await listTeamJoinRequestsAction(teamId);
            if (cancelled) return;
            if (r.ok) {
                setRequests(r.requests);
                setLoadState("idle");
            } else {
                setLoadState("error");
                setError(r.message);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open, teamId]);

    function removeRow(applicantId: string) {
        setRequests((prev) => prev.filter((row) => row.applicant.id !== applicantId));
    }

    function handleAccept(applicantUserId: string) {
        setError(null);
        setPendingId(applicantUserId);
        setPendingAction("accept");
        startTransition(async () => {
            const r = await acceptTeamJoinRequestAction(teamId, applicantUserId);
            setPendingId(null);
            setPendingAction(null);
            if (r.ok) {
                removeRow(applicantUserId);
                router.refresh();
            } else {
                setError(r.message);
            }
        });
    }

    function handleReject(applicantUserId: string) {
        setError(null);
        setPendingId(applicantUserId);
        setPendingAction("reject");
        startTransition(async () => {
            const r = await rejectTeamJoinRequestAction(teamId, applicantUserId);
            setPendingId(null);
            setPendingAction(null);
            if (r.ok) {
                removeRow(applicantUserId);
                router.refresh();
            } else {
                setError(r.message);
            }
        });
    }

    const rowBusy = (id: string) => busy && pendingId === id;

    if (!open) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-40 bg-stone-900/40"
                aria-hidden
                onClick={() => !busy && onClose()}
            />
            <div
                className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(85vh,640px)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-stone-200 bg-white shadow-xl sm:w-full"
                role="dialog"
                aria-modal
                aria-labelledby="team-join-requests-modal-title"
            >
                <div className="border-b border-stone-100 px-5 py-4">
                    <h2
                        id="team-join-requests-modal-title"
                        className="text-base font-semibold text-stone-800"
                    >
                        {t("title")}
                    </h2>
                    <p className="mt-0.5 text-sm text-stone-500">
                        <span className="font-medium text-stone-700">{teamName}</span>
                        {" · "}
                        {t("desc")}
                    </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
                    {loadState === "loading" ? (
                        <p className="py-8 text-center text-sm text-stone-500">{t("loading")}</p>
                    ) : null}

                    {loadState === "error" && error ? (
                        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                            {error}
                        </p>
                    ) : null}

                    {loadState === "idle" && error ? (
                        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                            {error}
                        </p>
                    ) : null}

                    {loadState === "idle" && !error && requests.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50/80 px-4 py-10 text-center text-sm text-stone-500">
                            {t("empty")}
                        </p>
                    ) : null}

                    {loadState === "idle" && requests.length > 0 ? (
                        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-100">
                            {requests.map((row) => {
                                const u = row.applicant;
                                const isRowBusy = rowBusy(u.id);
                                return (
                                    <li
                                        key={row.id}
                                        className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <UserAvatar
                                                userId={u.id}
                                                label={displayUserName(u)}
                                                avatarUrl={u.avatarUrl}
                                                sizeClass="h-9 w-9 text-sm"
                                                ringClass="ring-0"
                                            />
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-stone-800">
                                                    {displayUserName(u)}
                                                </p>
                                                <p className="truncate text-xs text-stone-500">{u.email}</p>
                                                <p className="mt-0.5 text-xs text-stone-400">
                                                    {t("requestedAt")}:{" "}
                                                    {formatRequestedAt(row.createdAt, locale)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => handleReject(u.id)}
                                                className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50 sm:text-sm"
                                            >
                                                {isRowBusy && pendingAction === "reject"
                                                    ? t("processing")
                                                    : t("reject")}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => handleAccept(u.id)}
                                                className="rounded-lg bg-stone-800 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-50 sm:text-sm"
                                            >
                                                {isRowBusy && pendingAction === "accept"
                                                    ? t("processing")
                                                    : t("accept")}
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : null}
                </div>

                <div className="border-t border-stone-100 px-5 py-3">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onClose}
                        className="w-full rounded-lg border border-stone-200 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                    >
                        {tCommon("close")}
                    </button>
                </div>
            </div>
        </>
    );
}
