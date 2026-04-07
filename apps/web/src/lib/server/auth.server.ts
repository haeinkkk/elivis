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

export type ApiPublicAuthConfig = {
    publicSignupEnabled: boolean;
    ldapEnabled: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼 — 현재 언어를 Accept-Language 헤더로 전달
// ─────────────────────────────────────────────────────────────────────────────

async function getLangHeader(): Promise<string> {
    const jar = await cookies();
    return jar.get("elivis_lang")?.value ?? "ko";
}

// ─────────────────────────────────────────────────────────────────────────────
// 공개 인증 설정 (로그인·회원가입 UI)
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchPublicAuthConfig(): Promise<ApiPublicAuthConfig> {
    try {
        const lang = await getLangHeader();
        const res = await fetch(apiUrl("/api/auth/config"), {
            headers: { Accept: "application/json", "Accept-Language": lang },
            cache: "no-store",
        });
        if (!res.ok) {
            return { publicSignupEnabled: false, ldapEnabled: false };
        }
        const body = (await res.json()) as ApiEnvelope<ApiPublicAuthConfig>;
        const d = body.data;
        if (!d || typeof d !== "object") {
            return { publicSignupEnabled: false, ldapEnabled: false };
        }
        return {
            publicSignupEnabled: Boolean(d.publicSignupEnabled),
            ldapEnabled: Boolean(d.ldapEnabled),
        };
    } catch {
        return { publicSignupEnabled: false, ldapEnabled: false };
    }
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
// 세션 쿠키
// ─────────────────────────────────────────────────────────────────────────────

export async function setAuthSessionCookies(
    accessToken: string,
    refreshToken: string,
): Promise<void> {
    const jar = await cookies();
    jar.set(AT_COOKIE, accessToken, {
        ...COOKIE_BASE,
        maxAge: 60 * 60 * 24, // 1일
    });
    jar.set(RT_COOKIE, refreshToken, {
        ...COOKIE_BASE,
        maxAge: 60 * 60 * 24 * 15, // 15일
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 로그인
// ─────────────────────────────────────────────────────────────────────────────

export type LoginResult = ApiAuthUser;

export type LoginWithCredentialsMode = "auto" | "local" | "ldap";

export async function loginWithCredentials(
    email: string,
    password: string,
    options?: { mode?: LoginWithCredentialsMode },
): Promise<LoginResult> {
    const lang = await getLangHeader();
    const mode = options?.mode ?? "auto";

    const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept-Language": lang,
        },
        body: JSON.stringify({ email, password, mode }),
        cache: "no-store",
    });

    const body = (await res.json().catch(() => ({}))) as ApiEnvelope<ApiAuthLoginData | null> & {
        message?: string;
    };

    if (!res.ok) {
        if (
            res.status === 403 &&
            body.data &&
            typeof body.data === "object" &&
            "accessBlocked" in body.data &&
            (body.data as { accessBlocked?: boolean }).accessBlocked === true
        ) {
            const r = (body.data as { accessBlockReason?: string | null }).accessBlockReason?.trim();
            const base = body.message ?? "로그인에 실패했습니다.";
            throw new Error(r ? `${base}\n\n${r}` : base);
        }
        throw new Error(body.message ?? "로그인에 실패했습니다.");
    }

    if (!body.data) {
        throw new Error("로그인에 실패했습니다.");
    }

    const { accessToken, refreshToken, user } = body.data as ApiAuthLoginData;
    await setAuthSessionCookies(accessToken, refreshToken);
    return user;
}

// ─────────────────────────────────────────────────────────────────────────────
// 회원가입 (공개 가입이 켜진 경우)
// ─────────────────────────────────────────────────────────────────────────────

export async function signupWithCredentials(
    email: string,
    password: string,
    name?: string,
): Promise<LoginResult> {
    const lang = await getLangHeader();

    const res = await fetch(apiUrl("/api/auth/signup"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept-Language": lang,
        },
        body: JSON.stringify({ email, password, ...(name ? { name } : {}) }),
        cache: "no-store",
    });

    const body = (await res.json().catch(() => ({}))) as ApiEnvelope<ApiAuthLoginData | null> & {
        message?: string;
    };

    if (!res.ok) {
        throw new Error(body.message ?? "회원가입에 실패했습니다.");
    }

    if (!body.data?.accessToken || !body.data.refreshToken || !body.data.user) {
        throw new Error("회원가입에 실패했습니다.");
    }

    const { accessToken, refreshToken, user } = body.data;
    await setAuthSessionCookies(accessToken, refreshToken);
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
