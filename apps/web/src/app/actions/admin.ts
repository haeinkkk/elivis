"use server";

import { revalidatePath } from "next/cache";

import { normalizeAdminUserRow, type ApiAdminUserRow } from "@/lib/server/admin.server";
import {
    actionFail,
    actionNetworkError,
    envelopeMessage,
    fetchApiEnvelope,
    requireActionSession,
} from "@/lib/http/server-action-http";

export async function updateAdminUserAction(
    userId: string,
    data: {
        name?: string;
        systemRole?: "SUPER_ADMIN" | "USER";
        password?: string;
    },
): Promise<{ ok: true; user: ApiAdminUserRow } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiAdminUserRow>(`/api/admin/users/${userId}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            return actionFail(envelopeMessage(body, "수정에 실패했습니다."));
        }

        revalidatePath("/admin/users");
        revalidatePath(`/admin/users/${userId}`);
        return { ok: true, user: normalizeAdminUserRow(body.data) };
    } catch {
        return actionNetworkError();
    }
}

export async function createAdminUserAction(data: {
    email: string;
    password: string;
    name?: string;
    systemRole: "SUPER_ADMIN" | "USER";
}): Promise<{ ok: true; user: ApiAdminUserRow } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiAdminUserRow>("/api/admin/users", {
            method: "POST",
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            return actionFail(envelopeMessage(body, "사용자 생성에 실패했습니다."));
        }

        revalidatePath("/admin");
        revalidatePath("/admin/users");
        return { ok: true, user: normalizeAdminUserRow(body.data) };
    } catch {
        return actionNetworkError();
    }
}

export async function updateUserSystemRoleAction(
    userId: string,
    systemRole: "SUPER_ADMIN" | "USER",
): Promise<{ ok: true } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<unknown>(`/api/admin/users/${userId}/role`, {
            method: "PATCH",
            body: JSON.stringify({ systemRole }),
        });

        if (!res.ok) {
            return actionFail(envelopeMessage(body, "역할 변경에 실패했습니다."));
        }

        revalidatePath("/admin");
        revalidatePath("/admin/users");
        return { ok: true };
    } catch {
        return actionNetworkError();
    }
}
