import "server-only";

import { cookies } from "next/headers";

import { apiUrl } from "./api-base-url";
import type { ApiEnvelope } from "./api-envelope";
import { AT_COOKIE } from "../server/auth.server";
import { apiFetchHeaders } from "./api-auth-headers.server";

/** 로그인 필요 (세션 쿠키 없음) */
export const ACTION_MSG_LOGIN_REQUIRED = "로그인이 필요합니다." as const;
/** `fetch` 예외·JSON 파싱 실패 등 — 대부분의 액션 `catch`에 사용 */
export const ACTION_MSG_NETWORK_ERROR = "네트워크 오류가 발생했습니다." as const;
/** 일부 액션에서 기존에 쓰이던 대체 문구 (워크스페이스 등) */
export const ACTION_MSG_SERVER_ERROR = "서버 오류가 발생했습니다." as const;

export type ActionFailure = { ok: false; message: string };
export type ActionSuccess<T extends Record<string, unknown> = Record<string, never>> = { ok: true } & T;
export type ActionResult<T extends Record<string, unknown> = Record<string, never>> =
    | ActionSuccess<T>
    | ActionFailure;

export function actionFail(message: string): ActionFailure {
    return { ok: false, message };
}

export function actionLoginRequired(): ActionFailure {
    return { ok: false, message: ACTION_MSG_LOGIN_REQUIRED };
}

export function actionNetworkError(): ActionFailure {
    return { ok: false, message: ACTION_MSG_NETWORK_ERROR };
}

export function actionServerError(): ActionFailure {
    return { ok: false, message: ACTION_MSG_SERVER_ERROR };
}

/**
 * 세션(액세스 토큰 쿠키) 없으면 실패, 있으면 `undefined`.
 * `if (const denied = await requireActionSession()) return denied` 패턴.
 */
export async function requireActionSession(): Promise<ActionFailure | undefined> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) {
        return actionLoginRequired();
    }
    return undefined;
}

export async function hasActionSession(): Promise<boolean> {
    const jar = await cookies();
    return Boolean(jar.get(AT_COOKIE)?.value);
}

/**
 * 인증 JSON API용 `fetch`.
 * `init.headers`를 넘기면 기본 `apiFetchHeaders()` 대신 사용 (DELETE·multipart 등).
 */
export async function apiFetchAuthenticated(path: string, init: RequestInit = {}): Promise<Response> {
    const defaultHeaders = await apiFetchHeaders();
    return fetch(apiUrl(path), {
        cache: init.cache ?? "no-store",
        ...init,
        headers: init.headers !== undefined ? init.headers : defaultHeaders,
    });
}

/** DELETE 등에서 `Content-Type: application/json`을 빼야 할 때 */
export async function apiFetchHeadersWithoutContentType(): Promise<Record<string, string>> {
    const base = await apiFetchHeaders();
    const { "Content-Type": _ct, ...rest } = base;
    return rest;
}

export function envelopeMessage(body: ApiEnvelope<unknown>, fallback: string): string {
    const m = body.message?.trim();
    return m || fallback;
}

export async function readApiEnvelope<T>(res: Response): Promise<ApiEnvelope<T>> {
    return (await res.json()) as ApiEnvelope<T>;
}

/** `fetch` + `res.json()`을 `ApiEnvelope<T>`로 파싱 */
export async function fetchApiEnvelope<T>(
    path: string,
    init?: RequestInit,
): Promise<{ res: Response; body: ApiEnvelope<T> }> {
    const res = await apiFetchAuthenticated(path, init);
    const body = await readApiEnvelope<T>(res);
    return { res, body };
}
