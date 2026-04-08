/**
 * 알림 payload(JSON)에서 클라이언트 라우트 URL 추출
 */
export function getNotificationDeepLink(type: string, dataStr: string | null): string | null {
    if (!dataStr) return null;
    try {
        const data = JSON.parse(dataStr) as Record<string, string | null>;
        if (type === "TASK_REQUEST_RECEIVED" && data.workspaceId) {
            return `/mywork/${data.workspaceId}?tab=requests`;
        }
        if (
            (type === "TASK_ASSIGNED" || type === "TASK_COMMENT" || type === "TASK_STATUS_CHANGED") &&
            data.workspaceId
        ) {
            return `/mywork/${data.workspaceId}`;
        }
        if (type === "PROJECT_MEMBER_ADDED" && data.projectId) {
            return `/projects/${data.projectId}`;
        }
        if (type === "TEAM_JOIN_REQUEST" && data.teamId) {
            return `/teams/${data.teamId}?tab=members&joinRequests=1`;
        }
        if (type === "SYSTEM" && data.teamId) {
            return `/teams/${data.teamId}`;
        }
    } catch {
        // ignore invalid JSON
    }
    return null;
}
