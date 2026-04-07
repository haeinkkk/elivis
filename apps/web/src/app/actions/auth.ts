"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import {
    clearSession,
    getRefreshToken,
    loginWithCredentials,
    type LoginWithCredentialsMode,
    signupWithCredentials,
} from "@/lib/server/auth.server";
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

async function getSignupMessages() {
    const jar = await cookies();
    const lang = jar.get("elivis_lang")?.value;
    const locale: Locale = (SUPPORTED_LOCALES as string[]).includes(lang ?? "")
        ? (lang as Locale)
        : "ko";
    return getWebMessages(locale).signup;
}

// ─────────────────────────────────────────────────────────────────────────────
// 로그인
// ─────────────────────────────────────────────────────────────────────────────

export interface LoginActionState {
    error: string | null;
}

function parseLoginMode(raw: unknown): LoginWithCredentialsMode {
    const s = typeof raw === "string" ? raw.trim() : "";
    if (s === "local" || s === "ldap" || s === "auto") return s;
    return "auto";
}

export async function loginAction(
    _prev: LoginActionState,
    formData: FormData,
): Promise<LoginActionState> {
    const email = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;
    const mode = parseLoginMode(formData.get("loginMode"));
    const msg = await getAuthMessages();

    if (!email || !password) {
        return { error: msg.emailRequired };
    }

    try {
        await loginWithCredentials(email, password, { mode });
    } catch (err) {
        return {
            error: err instanceof Error ? err.message : msg.loginFailed,
        };
    }

    redirect("/");
}

// ─────────────────────────────────────────────────────────────────────────────
// 회원가입
// ─────────────────────────────────────────────────────────────────────────────

export interface SignupActionState {
    error: string | null;
}

export async function signupAction(
    _prev: SignupActionState,
    formData: FormData,
): Promise<SignupActionState> {
    const email = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const nameRaw = (formData.get("name") as string)?.trim();
    const name = nameRaw && nameRaw.length > 0 ? nameRaw : undefined;

    const authMsg = await getAuthMessages();
    const signupMsg = await getSignupMessages();

    if (!email || !password) {
        return { error: authMsg.emailRequired };
    }
    if (password !== confirmPassword) {
        return { error: signupMsg.passwordMismatch };
    }

    try {
        await signupWithCredentials(email, password, name);
    } catch (err) {
        return {
            error: err instanceof Error ? err.message : signupMsg.signupFailed,
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
