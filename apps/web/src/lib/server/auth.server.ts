import "server-only";

import { cookies } from "next/headers";

import type { ApiEnvelope } from "../http/api-envelope";
import type { ApiAuthLoginData, ApiAuthUser } from "../mappers/auth";
import { apiUrl } from "../http/api-base-url";

// ─────────────────────────────────────────────────────────────────────────────
// 쿠키 키
// ─────────────────────────────────────────────────────────────────────────────

export const AT_COOKIE = "elivis_at"; // Access Token  (1일)
export const RT_COOKIE = "elivis_rt"; // Refresh Token (15일)

const COOKIE_BASE = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
};

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼 — 현재 언어를 Accept-Language 헤더로 전달
// ─────────────────────────────────────────────────────────────────────────────

async function getLangHeader(): Promise<string> {
    const jar = await cookies();
    return jar.get("elivis_lang")?.value ?? "ko";
}

// ─────────────────────────────────────────────────────────────────────────────
// 토큰 읽기
// ─────────────────────────────────────────────────────────────────────────────

export async function getAccessToken(): Promise<string | null> {
    const jar = await cookies();
    return jar.get(AT_COOKIE)?.value ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
    const jar = await cookies();
    return jar.get(RT_COOKIE)?.value ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 로그인
// ─────────────────────────────────────────────────────────────────────────────

export type LoginResult = ApiAuthUser;

export async function loginWithCredentials(email: string, password: string): Promise<LoginResult> {
    const lang = await getLangHeader();

    const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept-Language": lang,
        },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
    });

    const body = (await res.json().catch(() => ({}))) as ApiEnvelope<ApiAuthLoginData> & {
        message?: string;
    };

    if (!res.ok) {
        throw new Error(body.message ?? "로그인에 실패했습니다.");
    }

    const { accessToken, refreshToken, user } = body.data;

    const jar = await cookies();
    jar.set(AT_COOKIE, accessToken, {
        ...COOKIE_BASE,
        maxAge: 60 * 60 * 24, // 1일
    });
    jar.set(RT_COOKIE, refreshToken, {
        ...COOKIE_BASE,
        maxAge: 60 * 60 * 24 * 15, // 15일
    });

    return user;
}

// ─────────────────────────────────────────────────────────────────────────────
// 로그아웃
// ─────────────────────────────────────────────────────────────────────────────

export async function clearSession(refreshToken?: string): Promise<void> {
    if (refreshToken) {
        const lang = await getLangHeader();
        try {
            await fetch(apiUrl("/api/auth/logout"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept-Language": lang,
                },
                body: JSON.stringify({ refreshToken }),
                cache: "no-store",
            });
        } catch {
            // 네트워크 실패 시에도 로컬 쿠키는 삭제
        }
    }

    const jar = await cookies();
    jar.delete(AT_COOKIE);
    jar.delete(RT_COOKIE);
}
