"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { NotificationItem } from "@/hooks/useNotifications";
import { getNotificationDeepLink } from "@/lib/notification-links";
import { NotificationTypeIcon } from "@repo/ui";

const TOAST_MS = 5200;
const MAX_STACK = 4;

export type ToastEntry = { key: string; notification: NotificationItem };

type Props = {
    items: ToastEntry[];
    onDismiss: (key: string) => void;
};

/**
 * 실시간 알림 수신 시 우측 상단에 표시되는 토스트 스택
 */
export function NotificationToastStack({ items, onDismiss }: Props) {
    const router = useRouter();

    return (
        <div
            className="pointer-events-none fixed right-4 top-16 z-[200] flex w-[min(100vw-2rem,22rem)] flex-col gap-2 sm:right-5 sm:top-[4.25rem]"
            aria-live="polite"
            aria-atomic="true"
        >
            {items.map(({ key, notification: n }) => {
                const href = getNotificationDeepLink(n.type, n.data);
                return (
                    <ToastCard
                        key={key}
                        toastKey={key}
                        notification={n}
                        href={href}
                        onDismiss={onDismiss}
                        onNavigate={(path) => {
                            router.push(path);
                            onDismiss(key);
                        }}
                    />
                );
            })}
        </div>
    );
}

/** MainLayout에서 토스트 큐 상태와 함께 사용 */
export function useNotificationToastQueue() {
    const [items, setItems] = useState<ToastEntry[]>([]);

    const push = useCallback((notification: NotificationItem) => {
        setItems((prev) => {
            const next = [{ key: `${notification.id}-${Date.now()}`, notification }, ...prev];
            return next.slice(0, MAX_STACK);
        });
    }, []);

    const dismiss = useCallback((key: string) => {
        setItems((prev) => prev.filter((t) => t.key !== key));
    }, []);

    return { items, push, dismiss };
}

function ToastCard({
    toastKey,
    notification: n,
    href,
    onDismiss,
    onNavigate,
}: {
    toastKey: string;
    notification: NotificationItem;
    href: string | null;
    onDismiss: (key: string) => void;
    onNavigate: (path: string) => void;
}) {
    const [entered, setEntered] = useState(false);

    useEffect(() => {
        const id = requestAnimationFrame(() => setEntered(true));
        return () => cancelAnimationFrame(id);
    }, []);

    useEffect(() => {
        const t = window.setTimeout(() => onDismiss(toastKey), TOAST_MS);
        return () => window.clearTimeout(t);
    }, [toastKey, onDismiss]);

    return (
        <div
            role="status"
            className={`pointer-events-auto flex gap-3 rounded-xl border border-stone-200/90 bg-white/95 px-3.5 py-3 shadow-lg shadow-stone-900/10 backdrop-blur-sm transition-all duration-300 ease-out ${
                entered ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
            } ${href ? "cursor-pointer hover:bg-stone-50/90" : ""}`}
            onClick={() => {
                if (href) onNavigate(href);
            }}
        >
            <div className="mt-0.5 shrink-0 text-stone-500">
                <NotificationTypeIcon type={n.type} size="md" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug text-stone-900">{n.title}</p>
                {n.message && (
                    <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-stone-500">
                        {n.message}
                    </p>
                )}
                {href && (
                    <p className="mt-1.5 text-[11px] font-medium text-stone-400">클릭하여 이동</p>
                )}
            </div>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(toastKey);
                }}
                className="shrink-0 rounded-lg p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                aria-label="닫기"
            >
                <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}
