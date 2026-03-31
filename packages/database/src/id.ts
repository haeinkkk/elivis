import { randomBytes } from "node:crypto";

/** A–Z, a–z, 0–9 (62진) */
const ALPHANUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const BASE = ALPHANUM.length;

/**
 * 공개 ID — 8자 영문 대소문자 + 숫자 조합.
 * DB 기본값 대신 앱에서 생성해 `id` 필드에 넣습니다.
 */
export function generatePublicId(length = 8): string {
    const n = Math.max(4, Math.min(32, length));
    const bytes = randomBytes(n);
    let s = "";
    for (let i = 0; i < n; i++) {
        s += ALPHANUM[bytes[i] % BASE];
    }
    return s;
}
