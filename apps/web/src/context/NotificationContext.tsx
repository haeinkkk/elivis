"use client";

import { createContext, useContext } from "react";
import type { NotificationItem } from "@/hooks/useNotifications";

interface NotificationContextValue {
    notifications: NotificationItem[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    /** 알림 패널 열림 여부 */
    panelOpen: boolean;
    openPanel: () => void;
    closePanel: () => void;
}

export const NotificationContext = createContext<NotificationContextValue>({
    notifications: [],
    unreadCount: 0,
    markAsRead: () => {},
    markAllAsRead: () => {},
    panelOpen: false,
    openPanel: () => {},
    closePanel: () => {},
});

export function useNotificationContext() {
    return useContext(NotificationContext);
}
