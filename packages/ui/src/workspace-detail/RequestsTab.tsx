"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import type { ApiTaskRequest } from "../types/workspace-api";
import type { WorkspaceTaskRequestsActions } from "../types/workspace-detail-mutations";

export function RequestsTab({
    workspaceId,
    onAccepted,
    taskRequests,
}: {
    workspaceId: string;
    onAccepted: () => void;
    taskRequests: WorkspaceTaskRequestsActions;
}) {
    const t = useTranslations("workspace.requests");
    const locale = useLocale();
    const router = useRouter();
    const [requests, setRequests] = useState<ApiTaskRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        taskRequests
            .listTaskRequests(workspaceId)
            .then((res) => {
                if (res.ok) setRequests(res.requests);
                else setError(res.message);
            })
            .catch(() => setError(t("listLoadError")))
            .finally(() => setLoading(false));
    }, [workspaceId, t, taskRequests]);

    async function handleAccept(requestId: string) {
        setProcessingId(requestId);
        setActionError(null);
        const res = await taskRequests.acceptTaskRequest(requestId, workspaceId);
        setProcessingId(null);
        if (!res.ok) {
            setActionError(res.message);
            return;
        }
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        // 서버에서 새 업무 데이터 재조회 후 내 작업공간 탭으로 이동
        router.refresh();
        onAccepted();
    }

    async function handleReject(requestId: string) {
        setProcessingId(requestId);
        setActionError(null);
        const res = await taskRequests.rejectTaskRequest(requestId, workspaceId);
        setProcessingId(null);
        if (!res.ok) {
            setActionError(res.message);
            return;
        }
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
    }

    function formatDate(iso: string) {
        const tag = locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "en-US";
        return new Date(iso).toLocaleDateString(tag, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center py-20">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-stone-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-1 items-center justify-center py-20">
                <p className="text-sm text-red-500">{error}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            {/* 헤더 */}
            <div className="border-b border-stone-200 bg-white px-5 py-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-semibold text-stone-800">{t("headerTitle")}</h2>
                        <p className="text-xs text-stone-400">{t("headerSubtitle")}</p>
                    </div>
                    <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                        {t("countBadge", { count: requests.length })}
                    </span>
                </div>
            </div>

            {actionError && (
                <div className="mx-5 mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                    {actionError}
                </div>
            )}

            {/* 목록 */}
            {requests.length === 0 ? (
                <div className="flex flex-1 items-center justify-center py-20 text-center">
                    <div>
                        <p className="text-3xl" aria-hidden>
                            📬
                        </p>
                        <p className="mt-3 text-sm font-semibold text-stone-700">
                            {t("emptyTitle")}
                        </p>
                        <p className="mt-1 text-xs text-stone-400">{t("emptyDesc")}</p>
                    </div>
                </div>
            ) : (
                <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-5 pt-3">
                    {requests.map((req) => {
                        const senderName =
                            req.fromUser.name?.trim() || req.fromUser.email.split("@")[0];
                        const isProcessing = processingId === req.id;

                        return (
                            <li
                                key={req.id}
                                className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                            >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                                    {/* 요청자 */}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                                            {t("senderLabel")}
                                        </p>
                                        <div className="mt-2 flex items-start gap-2.5">
                                            {req.fromUser.avatarUrl ? (
                                                <img
                                                    src={req.fromUser.avatarUrl}
                                                    alt=""
                                                    className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-stone-200"
                                                />
                                            ) : (
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-600 text-xs font-semibold text-white">
                                                    {senderName[0]?.toUpperCase() ?? "?"}
                                                </span>
                                            )}
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                                                    <span className="text-sm font-semibold text-stone-800">
                                                        {senderName}
                                                    </span>
                                                    {req.project && (
                                                        <span className="text-xs text-stone-400">
                                                            · {req.project.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-0.5 truncate text-xs text-stone-500">
                                                    {req.fromUser.email}
                                                </p>
                                                <p className="mt-1 text-[11px] text-stone-400">
                                                    {formatDate(req.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 수락 / 거절 — 오른쪽 정렬 */}
                                    <div className="flex w-full shrink-0 flex-row justify-end gap-2 sm:w-auto sm:flex-col sm:items-end">
                                        <button
                                            type="button"
                                            onClick={() => handleAccept(req.id)}
                                            disabled={isProcessing}
                                            className="min-w-[88px] rounded-lg bg-stone-800 px-4 py-2 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-50"
                                        >
                                            {isProcessing ? t("processing") : t("accept")}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleReject(req.id)}
                                            disabled={isProcessing}
                                            className="min-w-[88px] rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
                                        >
                                            {isProcessing ? t("processing") : t("reject")}
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4 border-t border-stone-100 pt-4">
                                    {/* 제목 */}
                                    <p className="text-sm font-semibold text-stone-800">
                                        {req.title}
                                    </p>

                                    {/* 긴급 뱃지 */}
                                    {req.isUrgent && (
                                        <span className="mt-2 inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-600">
                                            {t("urgent")}
                                        </span>
                                    )}

                                    {/* 내용 */}
                                    {req.content && (
                                        <p className="mt-3 whitespace-pre-line rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600">
                                            {req.content}
                                        </p>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
