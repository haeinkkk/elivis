import type { Redis } from "ioredis";

export const NOTIFICATION_CHANNEL = "notification:send";

export type NotificationEventType =
  | "TASK_ASSIGNED"
  | "TASK_COMMENT"
  | "TASK_DUE_SOON"
  | "TASK_STATUS_CHANGED"
  | "PROJECT_MEMBER_ADDED"
  | "TEAM_MEMBER_ADDED"
  | "TASK_REQUEST_RECEIVED"
  | "TASK_REQUEST_ACCEPTED"
  | "TASK_REQUEST_REJECTED"
  | "MENTION"
  | "SYSTEM";

export interface NotificationPayload {
  userId: string;
  type: NotificationEventType;
  title: string;
  message?: string;
  data?: Record<string, string>;
}

/**
 * Redis Pub/Sub을 통해 알림 서버에 알림 발행.
 *
 * 알림 서버가 해당 채널을 구독하고 있으며,
 * 메시지를 수신하면 DB 저장 후 Socket.IO로 실시간 전송합니다.
 */
export async function publishNotification(
  redis: Redis,
  payload: NotificationPayload,
): Promise<void> {
  await redis.publish(NOTIFICATION_CHANNEL, JSON.stringify(payload));
}
