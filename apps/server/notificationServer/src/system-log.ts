import { appendFileSync, mkdirSync } from "fs";
import path from "path";

import { getDefaultLogsRootDir } from "./config/system-log-dir";

const SERVICE = "notification-server";

const DATE_DIR_RE = /^\d{4}-\d{2}-\d{2}$/;

const FILE_NOTIFICATION = "notification.ndjson";
const FILE_ERRORS_NOTIFICATION = "errors-notification.ndjson";
const FILE_HTTP_NOTIFICATION = "http-notification.ndjson";

const MAX_ERROR_STACK_CHARS = 48_000;

export function getNotificationLogDir(): string {
    const raw = process.env.SYSTEM_LOG_DIR?.trim();
    if (raw) return path.resolve(raw);
    return getDefaultLogsRootDir();
}

function todayDateStr(): string {
    return new Date().toISOString().slice(0, 10);
}

function ensureDayDir(dateStr: string): void {
    if (!DATE_DIR_RE.test(dateStr)) return;
    mkdirSync(path.join(getNotificationLogDir(), dateStr), { recursive: true });
}

function truncateErrorStack(s: string | undefined): string | undefined {
    if (!s) return undefined;
    if (s.length <= MAX_ERROR_STACK_CHARS) return s;
    return `${s.slice(0, MAX_ERROR_STACK_CHARS)}…(truncated)`;
}

/**
 * 메트릭 연동용 오류 전용 NDJSON (`…/YYYY-MM-DD/errors-notification.ndjson`).
 */
export function appendNotificationErrorLog(input: {
    event: string;
    level?: number;
    error?: Error;
    msg?: string;
    extra?: Record<string, unknown>;
}): void {
    const d = todayDateStr();
    ensureDayDir(d);
    const e = input.error;
    const line = JSON.stringify({
        time: Date.now(),
        service: SERVICE,
        event: input.event,
        level: input.level ?? 50,
        errorName: e?.name,
        errorMessage: e ? e.message : input.msg,
        errorStack: truncateErrorStack(e?.stack),
        pid: process.pid,
        node: process.version,
        ...input.extra,
    });
    appendFileSync(path.join(getNotificationLogDir(), d, FILE_ERRORS_NOTIFICATION), `${line}\n`);
}

/** HTTP 요청 한 줄 (`…/YYYY-MM-DD/http-notification.ndjson`) */
export function appendNotificationHttpRequestLog(input: {
    method: string;
    path: string;
    url?: string;
    statusCode: number;
    durationMs: number;
    userAgent?: string;
}): void {
    const d = todayDateStr();
    ensureDayDir(d);
    const line = JSON.stringify({
        level: 30,
        time: Date.now(),
        service: SERVICE,
        event: "http_request",
        method: input.method,
        path: input.path,
        url: input.url,
        statusCode: input.statusCode,
        durationMs: Math.round(input.durationMs * 100) / 100,
        userAgent: input.userAgent,
        pid: process.pid,
    });
    appendFileSync(path.join(getNotificationLogDir(), d, FILE_HTTP_NOTIFICATION), `${line}\n`);
}

/** 일반 NDJSON (`…/YYYY-MM-DD/notification.ndjson`) */
export function appendNotificationLog(
    level: number,
    msg: string,
    extra?: Record<string, unknown>,
): void {
    const d = todayDateStr();
    ensureDayDir(d);
    const line = JSON.stringify({
        level,
        time: Date.now(),
        service: SERVICE,
        msg,
        pid: process.pid,
        node: process.version,
        ...extra,
    });
    appendFileSync(path.join(getNotificationLogDir(), d, FILE_NOTIFICATION), `${line}\n`);
}
