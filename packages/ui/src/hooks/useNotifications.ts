"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

// ─────────────────────────────────────────────────────────────────────────────
// 타입 (알림 서버와 동일한 구조)
// ─────────────────────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  data: string | null;
  isRead: boolean;
  createdAt: string;
}

interface ServerToClientEvents {
  "notification:new": (notification: NotificationItem) => void;
  "notification:updated": (data: { id: string; isRead: boolean }) => void;
  "notification:all_read": () => void;
  "notification:list": (data: {
    notifications: NotificationItem[];
    unreadCount: number;
  }) => void;
}

interface ClientToServerEvents {
  "notification:read": (notificationId: string) => void;
  "notification:read_all": () => void;
  "notification:get_list": (page?: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// OS 데스크톱 알림 (Web Notifications API)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 브라우저 알림 권한을 요청합니다.
 * Chrome 등은 **사용자 제스처(클릭 등)** 가 있을 때만 프롬프트가 뜨고 granted 됩니다.
 * 페이지 로드 직후 자동 호출만으로는 permission이 default에 머물러 OS 알림이 나오지 않는 경우가 많습니다.
 */
export async function requestDesktopNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * 탭이 비활성 또는 브라우저가 최소화된 상태일 때만 OS 알림을 표시합니다.
 * (이 탭을 보고 있으면 앱 내 토스트로 충분)
 */
function showDesktopNotification(title: string, body: string | null, notificationId: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  // 창 최소화·다른 창 포커스·백그라운드 탭: document.hidden 이 true 이거나 hasFocus() 가 false
  if (!document.hidden && document.hasFocus()) return;

  try {
    const n = new Notification(title, {
      body: body ?? undefined,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      // 고정 태그면 연속 알림이 서로 덮어써져 "알림이 안 뜨는 것처럼" 보일 수 있음
      tag: `elivis-${notificationId}`,
    });

    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // 일부 환경(비보안 컨텍스트 등)에서 생성 실패
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 훅
// ─────────────────────────────────────────────────────────────────────────────

export type UseNotificationsOptions = {
  /** 탭이 보일 때(실시간 수신) 앱 내 토스트 등 — OS 알림과 별개 */
  onNotificationNew?: (notification: NotificationItem) => void;
};

export function useNotifications(accessToken: string | null, options?: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);
  const onNotificationNewRef = useRef(options?.onNotificationNew);

  useEffect(() => {
    onNotificationNewRef.current = options?.onNotificationNew;
  }, [options?.onNotificationNew]);

  useEffect(() => {
    if (!accessToken) return;

    const notificationUrl =
      process.env.NEXT_PUBLIC_NOTIFICATION_URL ?? "http://localhost:4001";

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      notificationUrl,
      {
        auth: { token: accessToken },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      },
    );

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("notification:list", ({ notifications: list, unreadCount: count }) => {
      setNotifications(list);
      setUnreadCount(count);
    });

    socket.on("notification:new", (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      // 브라우저 최소화·탭 비활성 시 OS 데스크톱 알림 표시
      showDesktopNotification(notification.title, notification.message, notification.id);
      // 현재 탭이 보이는 경우 앱 내 토스트(우측 상단 등)
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        onNotificationNewRef.current?.(notification);
      }
    });

    socket.on("notification:updated", ({ id, isRead }) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead } : n)),
      );
      if (isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    });

    socket.on("notification:all_read", () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  function markAsRead(notificationId: string) {
    socketRef.current?.emit("notification:read", notificationId);
  }

  function markAllAsRead() {
    socketRef.current?.emit("notification:read_all");
  }

  function loadMore(page: number) {
    socketRef.current?.emit("notification:get_list", page);
  }

  return {
    notifications,
    unreadCount,
    connected,
    markAsRead,
    markAllAsRead,
    loadMore,
  };
}
