"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotificationContext } from "@/context/NotificationContext";
import type { NotificationItem } from "@/hooks/useNotifications";

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

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
        // ignore
    }
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 알림 아이콘
// ─────────────────────────────────────────────────────────────────────────────

function NotificationIcon({ type, size = "sm" }: { type: string; size?: "sm" | "lg" }) {
    const cls = size === "lg" ? "h-6 w-6 shrink-0" : "h-4 w-4 shrink-0";
    if (type === "TASK_ASSIGNED" || type === "TASK_REQUEST_ACCEPTED") {
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

// ─────────────────────────────────────────────────────────────────────────────
// 상세 패널
// ─────────────────────────────────────────────────────────────────────────────

function NotificationDetailView({
    notification,
    onClose,
    onNavigate,
    onBack,
}: {
    notification: NotificationItem;
    onClose: () => void;
    onNavigate: (url: string) => void;
    onBack: () => void;
}) {
    const navUrl = getNotificationUrl(notification.type, notification.data);

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                    aria-label="뒤로가기"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <span className="flex-1 text-sm font-semibold text-stone-800">알림 상세</span>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                    aria-label="닫기"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* 알림 타입 + 제목 */}
            <div className="flex items-start gap-3 border-b border-stone-50 px-5 py-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600">
                    <NotificationIcon type={notification.type} size="lg" />
                </span>
                <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                        {typeLabel(notification.type)}
                    </span>
                    <h2 className="mt-1 text-sm font-semibold leading-snug text-stone-800">
                        {notification.title}
                    </h2>
                </div>
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
                <p className="mt-4 text-xs text-stone-400">{formatDateTime(notification.createdAt)}</p>
            </div>

            {/* 푸터 */}
            <div className="flex gap-2 border-t border-stone-100 px-4 py-3">
                {navUrl ? (
                    <>
                        <button
                            type="button"
                            onClick={onBack}
                            className="flex-1 rounded-lg border border-stone-200 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
                        >
                            뒤로
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
                        onClick={onBack}
                        className="w-full rounded-lg bg-stone-100 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-200"
                    >
                        뒤로
                    </button>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 알림 목록 뷰
// ─────────────────────────────────────────────────────────────────────────────

function NotificationListView({
    notifications,
    onMarkAllAsRead,
    onMarkAsRead,
    onClose,
    onSelectItem,
}: {
    notifications: NotificationItem[];
    onMarkAllAsRead: () => void;
    onMarkAsRead: (id: string) => void;
    onClose: () => void;
    onSelectItem: (n: NotificationItem) => void;
}) {
    const hasUnread = notifications.some((n) => !n.isRead);

    function handleItemClick(n: NotificationItem) {
        if (!n.isRead) onMarkAsRead(n.id);
        onSelectItem(n);
    }

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
                <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-stone-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                    <span className="text-base font-semibold text-stone-800">알림</span>
                    {hasUnread && (
                        <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                            {notifications.filter(n => !n.isRead).length}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {hasUnread && (
                        <button
                            type="button"
                            onClick={onMarkAllAsRead}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                        >
                            모두 읽음
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                        aria-label="닫기"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* 목록 */}
            <ul className="flex-1 overflow-y-auto divide-y divide-stone-50">
                {notifications.length === 0 ? (
                    <li className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
                        <svg className="h-10 w-10 text-stone-200" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                        </svg>
                        <p className="text-sm text-stone-400">새 알림이 없습니다</p>
                    </li>
                ) : (
                    notifications.map((n) => {
                        const navUrl = getNotificationUrl(n.type, n.data);
                        const rawMsg = n.message ? n.message.replace(/\n/g, " ") : null;
                        const shortMsg = rawMsg
                            ? rawMsg.length > 50 ? rawMsg.slice(0, 50) + "…" : rawMsg
                            : null;
                        return (
                            <li
                                key={n.id}
                                className={`flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-stone-50 ${
                                    !n.isRead ? "bg-amber-50/50" : ""
                                }`}
                            >
                                <span
                                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                                        !n.isRead ? "bg-amber-100 text-amber-600" : "bg-stone-100 text-stone-400"
                                    }`}
                                >
                                    <NotificationIcon type={n.type} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <button
                                        type="button"
                                        onClick={() => handleItemClick(n)}
                                        className={`w-full text-left text-sm leading-snug hover:underline ${
                                            !n.isRead ? "font-medium text-stone-800" : "text-stone-600"
                                        }`}
                                    >
                                        {n.title}
                                    </button>
                                    {shortMsg && (
                                        <p className="mt-0.5 text-xs text-stone-400">{shortMsg}</p>
                                    )}
                                    <div className="mt-1.5 flex items-center gap-2">
                                        <span className="text-xs text-stone-400">{timeAgo(n.createdAt)}</span>
                                        {navUrl && (
                                            <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-500">
                                                바로가기 →
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {!n.isRead && (
                                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                                )}
                            </li>
                        );
                    })
                )}
            </ul>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NotificationPanel (고정 우측 드로어)
// ─────────────────────────────────────────────────────────────────────────────

export function NotificationPanel() {
    const router = useRouter();
    const { notifications, markAsRead, markAllAsRead, panelOpen, closePanel } =
        useNotificationContext();
    const [detailItem, setDetailItem] = useState<NotificationItem | null>(null);

    // 마운트 여부 (panelOpen이 false → 슬라이드 아웃 후 언마운트)
    const [mounted, setMounted] = useState(false);
    // CSS 트랜지션 활성 여부 (true = translate-x-0, false = translate-x-full)
    const [visible, setVisible] = useState(false);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (panelOpen) {
            // 이전 hide 타이머 취소
            if (hideTimer.current) clearTimeout(hideTimer.current);
            setMounted(true);
            // 마운트된 다음 프레임에 visible=true → 슬라이드 인
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
        } else {
            // 슬라이드 아웃
            setVisible(false);
            // 트랜지션(300ms) 후 언마운트
            hideTimer.current = setTimeout(() => setMounted(false), 300);
        }
        return () => {
            if (hideTimer.current) clearTimeout(hideTimer.current);
        };
    }, [panelOpen]);

    if (!mounted) return null;

    function handleNavigate(url: string) {
        setDetailItem(null);
        closePanel();
        router.push(url);
    }

    return (
        <>
            {/* 백드롭 */}
            <div
                className={`fixed inset-0 z-[60] bg-stone-900/30 backdrop-blur-[1px] transition-opacity duration-300 ${
                    visible ? "opacity-100" : "opacity-0"
                }`}
                aria-hidden
                onClick={closePanel}
            />

            {/* 우측 드로어 — 오른쪽에서 왼쪽으로 슬라이드 인 */}
            <div
                className={`fixed right-0 top-0 z-[70] flex h-full w-full max-w-sm flex-col border-l border-stone-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
                    visible ? "translate-x-0" : "translate-x-full"
                }`}
                role="dialog"
                aria-modal
                aria-label="알림 패널"
            >
                {detailItem ? (
                    <NotificationDetailView
                        notification={detailItem}
                        onClose={closePanel}
                        onNavigate={handleNavigate}
                        onBack={() => setDetailItem(null)}
                    />
                ) : (
                    <NotificationListView
                        notifications={notifications}
                        onMarkAllAsRead={markAllAsRead}
                        onMarkAsRead={markAsRead}
                        onClose={closePanel}
                        onSelectItem={setDetailItem}
                    />
                )}
            </div>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NotificationBellButton (헤더/사이드바에서 공용으로 쓰는 벨 버튼)
// ─────────────────────────────────────────────────────────────────────────────

export function NotificationBellButton({ className }: { className?: string }) {
    const { unreadCount, openPanel } = useNotificationContext();

    return (
        <button
            type="button"
            onClick={openPanel}
            className={`relative flex items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700 focus:outline-none ${className ?? "h-9 w-9"}`}
            aria-label="알림"
        >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                </span>
            )}
        </button>
    );
}
