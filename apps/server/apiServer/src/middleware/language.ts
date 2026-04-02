import type { FastifyReply, FastifyRequest } from "fastify";
import { parseLocale, type Locale } from "@repo/i18n";

// ─────────────────────────────────────────────────────────────────────────────
// FastifyRequest 타입 확장
// ─────────────────────────────────────────────────────────────────────────────

declare module "fastify" {
    interface FastifyRequest {
        /** 요청 언어 — onRequest 훅에서 Accept-Language 헤더 기반으로 세팅됨 */
        lang: Locale;
    }
}

/**
 * Accept-Language 헤더를 파싱해 request.lang 을 세팅합니다.
 * 모든 라우트에 앞서 onRequest 훅으로 등록하세요.
 *
 * 우선순위: Accept-Language 헤더 → 기본값 "ko"
 */
export async function languageMiddleware(
    request: FastifyRequest,
    _reply: FastifyReply,
): Promise<void> {
    const header = request.headers["accept-language"];
    request.lang = parseLocale(header);
}
