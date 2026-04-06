"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { clearSession, getRefreshToken, loginWithCredentials } from "@/lib/server/auth.server";
import { getWebMessages, type Locale, SUPPORTED_LOCALES } from "@repo/i18n";

// ─────────────────────────────────────────────────────────────────────────────
// 현재 언어로 웹 메시지 가져오기
// ─────────────────────────────────────────────────────────────────────────────

async function getAuthMessages() {
    const jar = await cookies();
    const lang = jar.get("elivis_lang")?.value;
    const locale: Locale = (SUPPORTED_LOCALES as string[]).includes(lang ?? "")
        ? (lang as Locale)
        : "ko";
    return getWebMessages(locale).auth;
}

// ─────────────────────────────────────────────────────────────────────────────
// 로그인
// ─────────────────────────────────────────────────────────────────────────────

export interface LoginActionState {
    error: string | null;
}

export async function loginAction(
    _prev: LoginActionState,
    formData: FormData,
): Promise<LoginActionState> {
    const email = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;
    const msg = await getAuthMessages();

    if (!email || !password) {
        return { error: msg.emailRequired };
    }

    try {
        await loginWithCredentials(email, password);
    } catch (err) {
        return {
            error: err instanceof Error ? err.message : msg.loginFailed,
        };
    }

    redirect("/");
}

// ─────────────────────────────────────────────────────────────────────────────
// 로그아웃
// ─────────────────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
    const refreshToken = await getRefreshToken();
    await clearSession(refreshToken ?? undefined);
    redirect("/login");
}
