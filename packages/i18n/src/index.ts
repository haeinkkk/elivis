import { en } from "./locales/en";
import { ja } from "./locales/ja";
import { ko } from "./locales/ko";
import type { LocaleMessages } from "./locale-messages";

export type { LocaleMessages };

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

export type Locale = "ko" | "en" | "ja";

export const SUPPORTED_LOCALES: Locale[] = ["ko", "en", "ja"];

/**
 * 번역 키 누락 시 사용하는 기본 언어 (개발자 언어)
 * t() / getWebMessages() 의 폴백으로만 사용
 */
export const DEFAULT_LOCALE: Locale = "ko";

/**
 * 자동 감지 시 한국·일본 외 모든 국가에 적용하는 언어
 * Accept-Language 헤더에서 ko/ja 가 아닌 경우 이 값을 사용
 */
export const AUTO_DETECT_FALLBACK: Locale = "en";

const locales: Record<Locale, LocaleMessages> = { ko, en, ja };

// ─────────────────────────────────────────────────────────────────────────────
// 서버용 t() — 중첩 객체를 점(.) 표기법으로 순회
// 예: t("ko", "server.auth.login") → "로그인이 완료되었습니다."
// ─────────────────────────────────────────────────────────────────────────────

function get(obj: unknown, path: string): string | undefined {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj) as string | undefined;
}

export function t(locale: string, path: string): string {
  const dict = locales[locale as Locale] ?? locales[DEFAULT_LOCALE];
  return get(dict, path) ?? get(locales[DEFAULT_LOCALE], path) ?? path;
}

// ─────────────────────────────────────────────────────────────────────────────
// 웹용 — next-intl 에 전달하는 web 메시지 객체
// ─────────────────────────────────────────────────────────────────────────────

export type WebMessages = LocaleMessages["web"];

export function getWebMessages(locale: string): WebMessages {
  return (locales[locale as Locale] ?? locales[DEFAULT_LOCALE]).web;
}

/**
 * Accept-Language 헤더 값에서 Locale 자동 감지
 *
 * 우선순위:
 *   ko-KR, ko        → "ko"
 *   ja-JP, ja        → "ja"
 *   (없거나 그 외)   → "en"  ← 한국·일본 외 모든 국가는 영어
 */
export function parseLocale(raw: string | undefined | null): Locale {
  if (!raw) return AUTO_DETECT_FALLBACK;

  // Accept-Language 는 "ko-KR,ko;q=0.9,en-US;q=0.8" 형식
  // 콤마로 분리한 후 q값 순서대로 지원 언어를 찾는다
  for (const part of raw.split(",")) {
    const lang = part.split(";")[0]?.trim().toLowerCase().slice(0, 2) ?? "";
    if (lang === "ko") return "ko";
    if (lang === "ja") return "ja";
  }

  return AUTO_DETECT_FALLBACK;
}
