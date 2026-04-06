"use server";

import {
    actionFail,
    actionServerError,
    envelopeMessage,
    fetchApiEnvelope,
    requireActionSession,
} from "@/lib/http/server-action-http";

export type ApiNotification = {
    id: string;
    type: string;
    title: string;
    message: string | null;
    data: string | null;
    isRead: boolean;
    createdAt: string;
};

export type ApiNotificationListData = {
    notifications: ApiNotification[];
    total: number;
    unreadCount: number;
    page: number;
    pageSize: number;
};

export async function fetchNotificationsAction(page = 1): Promise<{
    ok: true;
    data: ApiNotificationListData;
} | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiNotificationListData>(
            `/api/notifications?page=${page}`,
        );
        if (!res.ok)
            return actionFail(envelopeMessage(body, "알림을 불러오지 못했습니다."));
        return { ok: true, data: body.data };
    } catch {
        return actionServerError();
    }
}

export async function markNotificationReadAction(notificationId: string): Promise<{
    ok: boolean;
    message?: string;
}> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<null>(
            `/api/notifications/${encodeURIComponent(notificationId)}/read`,
            {
                method: "PATCH",
                body: JSON.stringify({}),
            },
        );
        if (!res.ok) {
            return { ok: false, message: envelopeMessage(body, "처리에 실패했습니다.") };
        }
        return { ok: true };
    } catch {
        return actionServerError();
    }
}

export async function markAllNotificationsReadAction(): Promise<{
    ok: boolean;
    message?: string;
}> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<null>("/api/notifications/read-all", {
            method: "PATCH",
            body: JSON.stringify({}),
        });
        if (!res.ok) {
            return { ok: false, message: envelopeMessage(body, "처리에 실패했습니다.") };
        }
        return { ok: true };
    } catch {
        return actionServerError();
    }
}
