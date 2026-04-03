"use client";

import { NotificationBellButton } from "./NotificationPanel";

/**
 * 헤더에 사용하는 알림 벨 버튼.
 * NotificationBellButton의 alias — Context에서 unreadCount, openPanel을 직접 읽습니다.
 */
export function NotificationBell() {
    return <NotificationBellButton />;
}
