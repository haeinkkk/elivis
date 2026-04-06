/**
 * 서버/클라이언트 양쪽에서 사용하는 User 관련 타입·상수.
 * 공통 프로필·상태 타입은 `@repo/ui`와 동기화됩니다.
 */

import type { UserStatus } from "@repo/ui";

export type { UserProfile, UserStatus } from "@repo/ui";

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
    WORKING: "열일중",
    VACATION: "휴가중",
    OFF_WORK: "퇴근",
    DEEP_FOCUS: "초집중모드",
};
