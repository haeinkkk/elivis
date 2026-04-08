import type { NotificationType } from "@repo/database";

// ─────────────────────────────────────────────────────────────────────────────
// Redis Pub/Sub 메시지 타입
// ─────────────────────────────────────────────────────────────────────────────

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  /** 연관 리소스 정보 (taskId, workspaceId 등) */
  data?: Record<string, string>;
  projectId?: string;
  push?: boolean;
  email?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO 이벤트 타입
// ─────────────────────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  data: string | null;
  isRead: boolean;
  createdAt: Date;
}

/** 서버 → 클라이언트 이벤트 맵 */
export interface ServerToClientEvents {
  "notification:new": (notification: NotificationItem) => void;
  "notification:updated": (data: { id: string; isRead: boolean }) => void;
  "notification:all_read": () => void;
  "notification:list": (data: {
    notifications: NotificationItem[];
    unreadCount: number;
  }) => void;
}

/** 클라이언트 → 서버 이벤트 맵 */
export interface ClientToServerEvents {
  "notification:read": (notificationId: string) => void;
  "notification:read_all": () => void;
  "notification:get_list": (page?: number) => void;
}

/** 서버 → 서버 이벤트 맵 (내부) */
export type InterServerEvents = Record<never, never>;

/** 소켓별 저장 데이터 */
export interface SocketData {
  userId: string;
}
