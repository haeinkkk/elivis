"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NotificationTypeIcon } from "@repo/ui";

import { useNotificationContext } from "@/context/NotificationContext";
import type { NotificationItem } from "@/hooks/useNotifications";
import { useNotificationCopy } from "@/hooks/useNotificationCopy";
import { getNotificationDeepLink } from "@/lib/notification-links";

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
    const { t, typeLabel, formatDateTime } = useNotificationCopy();
    const navUrl = getNotificationDeepLink(notification.type, notification.data);

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                    aria-label={t("ariaBack")}
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                        />
                    </svg>
                </button>
                <span className="flex-1 text-sm font-semibold text-stone-800">
                    {t("detailTitle")}
                </span>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                    aria-label={t("ariaClose")}
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            <div className="flex items-start gap-3 border-b border-stone-50 px-5 py-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600">
                    <NotificationTypeIcon type={notification.type} size="lg" />
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

            <div className="flex-1 overflow-y-auto px-5 py-5">
                {notification.message ? (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-stone-600">
                        {notification.message}
                    </p>
                ) : (
                    <p className="text-sm text-stone-400">{t("noBody")}</p>
                )}
                <p className="mt-4 text-xs text-stone-400">
                    {formatDateTime(notification.createdAt)}
                </p>
            </div>

            <div className="flex gap-2 border-t border-stone-100 px-4 py-3">
                {navUrl ? (
                    <>
                        <button
                            type="button"
                            onClick={onBack}
                            className="flex-1 rounded-lg border border-stone-200 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
                        >
                            {t("back")}
                        </button>
                        <button
                            type="button"
                            onClick={() => onNavigate(navUrl)}
                            className="flex-1 rounded-lg bg-stone-800 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
                        >
                            {t("goShortcut")}
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={onBack}
                        className="w-full rounded-lg bg-stone-100 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-200"
                    >
                        {t("back")}
                    </button>
                )}
            </div>
        </div>
    );
}

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
    const { t, timeAgo } = useNotificationCopy();
    const hasUnread = notifications.some((n) => !n.isRead);

    function handleItemClick(n: NotificationItem) {
        if (!n.isRead) onMarkAsRead(n.id);
        onSelectItem(n);
    }

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
                <div className="flex items-center gap-2">
                    <svg
                        className="h-5 w-5 text-stone-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                        />
                    </svg>
                    <span className="text-base font-semibold text-stone-800">{t("listTitle")}</span>
                    {hasUnread && (
                        <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                            {notifications.filter((n) => !n.isRead).length}
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
                            {t("markAllRead")}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                        aria-label={t("ariaClose")}
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            <ul className="flex-1 overflow-y-auto divide-y divide-stone-50">
                {notifications.length === 0 ? (
                    <li className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
                        <svg
                            className="h-10 w-10 text-stone-200"
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
                        <p className="text-sm text-stone-400">{t("emptyInbox")}</p>
                    </li>
                ) : (
                    notifications.map((n) => {
                        const navUrl = getNotificationDeepLink(n.type, n.data);
                        const rawMsg = n.message ? n.message.replace(/\n/g, " ") : null;
                        const shortMsg = rawMsg
                            ? rawMsg.length > 50
                                ? rawMsg.slice(0, 50) + "…"
                                : rawMsg
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
                                        !n.isRead
                                            ? "bg-amber-100 text-amber-600"
                                            : "bg-stone-100 text-stone-400"
                                    }`}
                                >
                                    <NotificationTypeIcon type={n.type} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <button
                                        type="button"
                                        onClick={() => handleItemClick(n)}
                                        className={`w-full text-left text-sm leading-snug hover:underline ${
                                            !n.isRead
                                                ? "font-medium text-stone-800"
                                                : "text-stone-600"
                                        }`}
                                    >
                                        {n.title}
                                    </button>
                                    {shortMsg && (
                                        <p className="mt-0.5 text-xs text-stone-400">{shortMsg}</p>
                                    )}
                                    <div className="mt-1.5 flex items-center gap-2">
                                        <span className="text-xs text-stone-400">
                                            {timeAgo(n.createdAt)}
                                        </span>
                                        {navUrl && (
                                            <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-500">
                                                {t("goShortcut")}
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

export function NotificationPanel() {
    const router = useRouter();
    const { t } = useNotificationCopy();
    const { notifications, markAsRead, markAllAsRead, panelOpen, closePanel } =
        useNotificationContext();
    const [detailItem, setDetailItem] = useState<NotificationItem | null>(null);

    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (panelOpen) {
            if (hideTimer.current) clearTimeout(hideTimer.current);
            setMounted(true);
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
        } else {
            setVisible(false);
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
            <div
                className={`fixed inset-0 z-[60] bg-stone-900/30 backdrop-blur-[1px] transition-opacity duration-300 ${
                    visible ? "opacity-100" : "opacity-0"
                }`}
                aria-hidden
                onClick={closePanel}
            />

            <div
                className={`fixed right-0 top-0 z-[70] flex h-full w-full max-w-sm flex-col border-l border-stone-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
                    visible ? "translate-x-0" : "translate-x-full"
                }`}
                role="dialog"
                aria-modal
                aria-label={t("panelAria")}
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

export function NotificationBellButton({ className }: { className?: string }) {
    const { t } = useNotificationCopy();
    const { unreadCount, openPanel } = useNotificationContext();

    return (
        <button
            type="button"
            onClick={openPanel}
            className={`relative flex items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700 focus:outline-none ${className ?? "h-9 w-9"}`}
            aria-label={t("bellAria")}
        >
            <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                />
            </svg>
            {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                </span>
            )}
        </button>
    );
}
