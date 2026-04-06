import "server-only";

import { cookies } from "next/headers";

import { AT_COOKIE } from "../server/auth.server";

/** 인증된 `fetch(apiUrl(...))` 호출용 공통 헤더 */
export async function apiFetchHeaders(): Promise<Record<string, string>> {
    const jar = await cookies();
    return {
        Authorization: `Bearer ${jar.get(AT_COOKIE)?.value ?? ""}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Language": jar.get("elivis_lang")?.value ?? "ko",
    };
}
