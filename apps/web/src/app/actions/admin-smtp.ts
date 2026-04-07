"use server";

import { revalidatePath } from "next/cache";

import {
    actionFail,
    actionNetworkError,
    envelopeMessage,
    fetchApiEnvelope,
    requireActionSession,
} from "@/lib/http/server-action-http";
import type { ApiAdminSmtpSettings } from "@/lib/mappers/smtp";

export type PatchAdminSmtpPayload = {
    enabled?: boolean;
    host?: string;
    port?: number;
    secure?: boolean;
    rejectUnauthorized?: boolean;
    authUser?: string;
    authPass?: string;
    clearAuthPass?: boolean;
    fromEmail?: string;
    fromName?: string;
};

export async function patchAdminSmtpAction(
    data: PatchAdminSmtpPayload,
): Promise<{ ok: true; settings: ApiAdminSmtpSettings } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiAdminSmtpSettings>("/api/admin/smtp", {
            method: "PATCH",
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            return actionFail(envelopeMessage(body, "저장에 실패했습니다."));
        }

        revalidatePath("/admin/settings/email");
        revalidatePath("/admin/email");
        return { ok: true, settings: body.data };
    } catch {
        return actionNetworkError();
    }
}

export async function testAdminSmtpAction(
    to: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<unknown>("/api/admin/smtp/test", {
            method: "POST",
            body: JSON.stringify({ to }),
        });

        if (!res.ok) {
            return actionFail(envelopeMessage(body, "테스트 메일을 보내지 못했습니다."));
        }

        return { ok: true };
    } catch {
        return actionNetworkError();
    }
}
