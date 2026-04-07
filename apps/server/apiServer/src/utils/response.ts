/**
 * 표준 API 응답 포맷
 *
 * 성공: { code: 2xx, message: string, data: T }
 * 실패: { code: 4xx|5xx, message: string, data: null }
 */
export interface ApiResponse<T = unknown> {
    code: number;
    message: string;
    data: T;
}

// ─────────────────────────────────────────────────────────────────────────────
// 성공 응답
// ─────────────────────────────────────────────────────────────────────────────

/** 200 OK */
export function ok<T>(data: T, message: string): ApiResponse<T> {
    return { code: 200, message, data };
}

/** 201 Created */
export function created<T>(data: T, message: string): ApiResponse<T> {
    return { code: 201, message, data };
}

/** 204 No Content — body 없이 사용 */
export function noContent(message: string): ApiResponse<null> {
    return { code: 204, message, data: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// 실패 응답
// ─────────────────────────────────────────────────────────────────────────────

/** 400 Bad Request */
export function badRequest(message: string): ApiResponse<null> {
    return { code: 400, message, data: null };
}

/** 401 Unauthorized */
export function unauthorized(message: string): ApiResponse<null> {
    return { code: 401, message, data: null };
}

/** 403 Forbidden */
export function forbidden(message: string): ApiResponse<null> {
    return { code: 403, message, data: null };
}

/** 403 — 계정 접근 차단 (클라이언트가 `data.accessBlocked`로 구분) */
export function forbiddenAccessBlocked(
    message: string,
    accessBlockReason: string | null,
): ApiResponse<{ accessBlocked: true; accessBlockReason: string | null }> {
    return {
        code: 403,
        message,
        data: { accessBlocked: true, accessBlockReason },
    };
}

/** 404 Not Found */
export function notFound(message: string): ApiResponse<null> {
    return { code: 404, message, data: null };
}

/** 409 Conflict */
export function conflict(message: string): ApiResponse<null> {
    return { code: 409, message, data: null };
}

/** 503 Service Unavailable */
export function serviceUnavailable(message: string): ApiResponse<null> {
    return { code: 503, message, data: null };
}
