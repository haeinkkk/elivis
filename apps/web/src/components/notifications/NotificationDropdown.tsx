"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { NotificationItem } from "@/hooks/useNotifications";

interface NotificationDropdownProps {
    notifications: NotificationItem[];
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    onClose: () => void;
}

function timeAgo(dateStr: string): string {
    try {
        const diff = Date.now() - new Date(dateStr).getTime();
        const secs = Math.floor(diff / 1000);
        if (secs < 60) return "방금 전";
        const mins = Math.floor(secs / 60);
        if (mins < 60) return `${mins}분 전`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}시간 전`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}일 전`;
        return new Date(dateStr).toLocaleDateString("ko-KR");
    } catch {
        return "";
    }
}

function formatDateTime(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "";
    }
}

function NotificationIcon({ type, size = "sm" }: { type: string; size?: "sm" | "lg" }) {
    const cls = size === "lg" ? "h-6 w-6 shrink-0" : "h-4 w-4 shrink-0";

    if (type === "TASK_ASSIGNED") {
        return (
            <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
        );
    }
    if (type === "TASK_COMMENT") {
        return (
            <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
        );
    }
    if (type === "MENTION") {
        return (
            <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 1 0-2.636 6.364M16.5 12V8.25" />
            </svg>
        );
    }
    if (type === "TASK_REQUEST_RECEIVED") {
        return (
            <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
        );
    }
    if (type === "TASK_REQUEST_ACCEPTED") {
        return (
            <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
        );
    }
    if (type === "TASK_REQUEST_REJECTED") {
        return (
            <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
        );
    }

    return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
    );
}

/** 알림 타입 한국어 레이블 */
function typeLabel(type: string): string {
    const map: Record<string, string> = {
        TASK_ASSIGNED: "업무 할당",
        TASK_COMMENT: "댓글",
        TASK_DUE_SOON: "마감 임박",
        TASK_STATUS_CHANGED: "상태 변경",
        PROJECT_MEMBER_ADDED: "프로젝트 초대",
        TEAM_MEMBER_ADDED: "팀 초대",
        MENTION: "언급",
        TASK_REQUEST_RECEIVED: "업무 요청",
        TASK_REQUEST_ACCEPTED: "요청 수락",
        TASK_REQUEST_REJECTED: "요청 거절",
        SYSTEM: "시스템",
    };
    return map[type] ?? "알림";
}

/** 알림 data JSON에서 바로가기 URL을 추출 */
function getNotificationUrl(type: string, dataStr: string | null): string | null {
    if (!dataStr) return null;
    try {
        const data = JSON.parse(dataStr) as Record<string, string | null>;
        if (type === "TASK_REQUEST_RECEIVED" && data.workspaceId) {
            return `/mywork/${data.workspaceId}?tab=requests`;
        }
        if (
            (type === "TASK_ASSIGNED" ||
                type === "TASK_COMMENT" ||
                type === "TASK_STATUS_CHANGED") &&
            data.workspaceId
        ) {
            return `/mywork/${data.workspaceId}`;
        }
        if (type === "PROJECT_MEMBER_ADDED" && data.projectId) {
            return `/projects/${data.projectId}`;
        }
    } catch {
        // JSON 파싱 실패 무시
    }
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 알림 상세 모달
// ─────────────────────────────────────────────────────────────────────────────

function NotificationDetailModal({
    notification,
    onClose,
    onNavigate,
}: {
    notification: NotificationItem;
    onClose: () => void;
    onNavigate: (url: string) => void;
}) {
    const navUrl = getNotificationUrl(notification.type, notification.data);

    return (
        <>
            {/* 백드롭 */}
            <div className="fixed inset-0 z-[60] bg-stone-900/30" aria-hidden onClick={onClose} />

            {/* 우측 패널 */}
            <div
                className="fixed right-0 top-0 z-[70] flex h-full w-full max-w-sm flex-col border-l border-stone-200 bg-white shadow-2xl text-left"
                role="dialog"
                aria-modal
                aria-labelledby="noti-detail-title"
            >
                {/* 헤더 */}
                <div className="flex items-start gap-3 border-b border-stone-100 px-5 py-4">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600">
                        <NotificationIcon type={notification.type} size="lg" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <span className="inline-block rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                            {typeLabel(notification.type)}
                        </span>
                        <h2
                            id="noti-detail-title"
                            className="mt-1 text-sm font-semibold leading-snug text-stone-800"
                        >
                            {notification.title}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                        aria-label="닫기"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 본문 */}
                <div className="flex-1 overflow-y-auto px-5 py-5">
                    {notification.message ? (
                        <p className="whitespace-pre-line text-sm leading-relaxed text-stone-600">
                            {notification.message}
                        </p>
                    ) : (
                        <p className="text-sm text-stone-400">내용이 없습니다.</p>
                    )}
                    <p className="mt-4 text-xs text-stone-400">
                        {formatDateTime(notification.createdAt)}
                    </p>
                </div>

                {/* 푸터 */}
                <div className="flex gap-2 border-t border-stone-100 px-5 py-4">
                    {navUrl ? (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 rounded-lg border border-stone-200 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
                            >
                                닫기
                            </button>
                            <button
                                type="button"
                                onClick={() => onNavigate(navUrl)}
                                className="flex-1 rounded-lg bg-stone-800 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
                            >
                                바로가기 →
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full rounded-lg bg-stone-100 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-200"
                        >
                            닫기
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 드롭다운
// ─────────────────────────────────────────────────────────────────────────────

export function NotificationDropdown({
    notifications,
    onMarkAsRead,
    onMarkAllAsRead,
    onClose,
}: NotificationDropdownProps) {
    const router = useRouter();
    const hasUnread = notifications.some((n) => !n.isRead);
    const [detailItem, setDetailItem] = useState<NotificationItem | null>(null);

    function handleItemClick(n: NotificationItem) {
        if (!n.isRead) onMarkAsRead(n.id);
        setDetailItem(n);
    }

    function handleNavigate(url: string) {
        setDetailItem(null);
        onClose();
        router.push(url);
    }

    return (
        <>
            <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg text-left">
                {/* 헤더 */}
                <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
                    <span className="text-sm font-semibold text-stone-800">알림</span>
                    {hasUnread && (
                        <button
                            type="button"
                            onClick={onMarkAllAsRead}
                            className="text-xs font-medium text-amber-600 hover:text-amber-700"
                        >
                            모두 읽음
                        </button>
                    )}
                </div>

                {/* 목록 */}
                <ul className="max-h-96 overflow-y-auto divide-y divide-stone-50">
                    {notifications.length === 0 ? (
                        <li className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                            <svg
                                className="h-8 w-8 text-stone-300"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.2}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                                />
                            </svg>
                            <p className="text-sm text-stone-400">새 알림이 없습니다</p>
                        </li>
                    ) : (
                        notifications.map((n) => {
                            const navUrl = getNotificationUrl(n.type, n.data);
                            const rawMsg = n.message ? n.message.replace(/\n/g, " ") : null;
                            const shortMsg = rawMsg
                                ? rawMsg.length > 40
                                    ? rawMsg.slice(0, 40) + "…"
                                    : rawMsg
                                : null;
                            return (
                                <li
                                    key={n.id}
                                    className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-stone-50 ${
                                        !n.isRead ? "bg-amber-50/60" : ""
                                    }`}
                                >
                                    {/* 아이콘 */}
                                    <span
                                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                                            !n.isRead
                                                ? "bg-amber-100 text-amber-600"
                                                : "bg-stone-100 text-stone-400"
                                        }`}
                                    >
                                        <NotificationIcon type={n.type} />
                                    </span>

                                    {/* 내용 */}
                                    <div className="min-w-0 flex-1">
                                        {/* 제목 - 클릭 시 상세 모달 열기 */}
                                        <button
                                            type="button"
                                            onClick={() => handleItemClick(n)}
                                            className={`w-full cursor-pointer text-left text-sm leading-snug hover:underline ${
                                                !n.isRead
                                                    ? "font-medium text-stone-800"
                                                    : "text-stone-600"
                                            }`}
                                        >
                                            {n.title}
                                        </button>
                                        {shortMsg && (
                                            <p className="mt-0.5 text-xs text-stone-400">
                                                {shortMsg}
                                            </p>
                                        )}
                                        <div className="mt-1.5 flex items-center gap-2">
                                            <span className="text-xs text-stone-400">
                                                {timeAgo(n.createdAt)}
                                            </span>
                                            {navUrl && (
                                                <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-500">
                                                    바로가기 →
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* 읽지 않음 점 */}
                                    {!n.isRead && (
                                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                                    )}
                                </li>
                            );
                        })
                    )}
                </ul>
            </div>

            {/* 상세 모달 */}
            {detailItem && (
                <NotificationDetailModal
                    notification={detailItem}
                    onClose={() => setDetailItem(null)}
                    onNavigate={handleNavigate}
                />
            )}
        </>
    );
}
