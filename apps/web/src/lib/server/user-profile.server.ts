import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { ApiEnvelope } from "../http/api-envelope";
import type { ApiUserProfile } from "../mappers/user";
import { apiUrl } from "../http/api-base-url";
import { AT_COOKIE, clearSession, getRefreshToken } from "./auth.server";
import { apiFetchHeaders } from "../http/api-auth-headers.server";

export type { UserProfile, UserStatus } from "../user/user-types";
export { USER_STATUS_LABEL } from "../user/user-types";

import type { UserProfile, UserStatus } from "../user/user-types";

/**
 * 현재 로그인 유저의 프로필을 서버에서 직접 조회합니다.
 * 토큰이 없거나 응답 실패 시 null 반환.
 */
export async function getMyProfile(): Promise<UserProfile | null> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return null;

    try {
        const res = await fetch(apiUrl("/api/users/me"), {
            headers: await apiFetchHeaders(),
            cache: "no-store",
        });

        const body = (await res.json().catch(() => null)) as ApiEnvelope<unknown> | null;

        if (res.status === 403 && body?.data && typeof body.data === "object") {
            const d = body.data as { accessBlocked?: boolean; accessBlockReason?: string | null };
            if (d.accessBlocked === true) {
                const rt = await getRefreshToken();
                await clearSession(rt ?? undefined);
                const reason = d.accessBlockReason?.trim();
                redirect(
                    reason
                        ? `/account-suspended?reason=${encodeURIComponent(reason)}`
                        : "/account-suspended",
                );
            }
        }

        if (!res.ok || !body || body.data == null) return null;

        return body.data as ApiUserProfile;
    } catch (err: unknown) {
        if (
            typeof err === "object" &&
            err !== null &&
            "digest" in err &&
            typeof (err as { digest: unknown }).digest === "string" &&
            String((err as { digest: string }).digest).startsWith("NEXT_REDIRECT")
        ) {
            throw err;
        }
        return null;
    }
}

/**
 * 현재 로그인 유저의 프로필을 수정합니다.
 */
export async function updateMyProfile(data: {
    name?: string;
    bio?: string | null;
    status?: UserStatus;
}): Promise<{ ok: true; user: UserProfile } | { ok: false; message: string }> {
    try {
        const res = await fetch(apiUrl("/api/users/me"), {
            method: "PATCH",
            headers: await apiFetchHeaders(),
            body: JSON.stringify(data),
            cache: "no-store",
        });

        const body = (await res.json()) as ApiEnvelope<ApiUserProfile>;

        if (!res.ok) {
            return { ok: false, message: body.message ?? "오류가 발생했습니다." };
        }

        return { ok: true, user: body.data };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}
