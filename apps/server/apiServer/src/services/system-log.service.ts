import { appendFileSync, createWriteStream, existsSync, mkdirSync, readdirSync, statSync } from "fs";
import { open, stat } from "fs/promises";
import path from "path";
import { Writable } from "stream";

import type { FastifyRequest } from "fastify";
import pino from "pino";

import { getDefaultLogsRootDir } from "../config/system-log-dir";

export const SYSTEM_LOG_SERVICE_API = "api-server";

const DATE_DIR_RE = /^\d{4}-\d{2}-\d{2}$/;
const FILE_SUFFIX = ".ndjson";
const MAX_TAIL_BYTES = 4 * 1024 * 1024;
const MAX_ERROR_STACK_CHARS = 48_000;

/** 일별 폴더 안의 고정 파일명 (날짜는 상위 디렉터리명) */
export const DAY_LOG_FILES = {
    system: `system${FILE_SUFFIX}`,
    httpApi: `http-api${FILE_SUFFIX}`,
    errorsApi: `errors-api${FILE_SUFFIX}`,
    notification: `notification${FILE_SUFFIX}`,
    httpNotification: `http-notification${FILE_SUFFIX}`,
    errorsNotification: `errors-notification${FILE_SUFFIX}`,
} as const;

/** 관리자·tail API용 상대 경로: `YYYY-MM-DD/system.ndjson` */
const SAFE_REL_LOG_PATH =
    /^(\d{4}-\d{2}-\d{2})\/(system|http-api|errors-api|notification|http-notification|errors-notification)\.ndjson$/;

/**
 * 로그 루트 (기본: 모노레포 `.logs`). `SYSTEM_LOG_DIR`이 있으면 그 경로.
 * 실제 파일은 `루트/YYYY-MM-DD/*.ndjson`.
 */
export function getSystemLogDir(): string {
    const raw = process.env.SYSTEM_LOG_DIR?.trim();
    if (raw) return path.resolve(raw);
    return getDefaultLogsRootDir();
}

function todayDateStr(): string {
    return new Date().toISOString().slice(0, 10);
}

export function ensureLogRoot(): void {
    mkdirSync(getSystemLogDir(), { recursive: true });
}

function ensureDailyDir(dateStr: string): void {
    if (!DATE_DIR_RE.test(dateStr)) return;
    mkdirSync(path.join(getSystemLogDir(), dateStr), { recursive: true });
}

function pathInDay(dateStr: string, fileName: keyof typeof DAY_LOG_FILES): string {
    ensureDailyDir(dateStr);
    return path.join(getSystemLogDir(), dateStr, DAY_LOG_FILES[fileName]);
}

function isPathUnderLogRoot(resolved: string): boolean {
    const root = path.resolve(getSystemLogDir());
    const rel = path.relative(root, resolved);
    return (rel === "" || !rel.startsWith("..")) && !path.isAbsolute(rel);
}

export function resolveLogFilePath(relativeName: string): string {
    if (!SAFE_REL_LOG_PATH.test(relativeName.replace(/\\/g, "/"))) {
        throw new Error("invalid log file name");
    }
    const norm = relativeName.replace(/\\/g, "/");
    const full = path.join(getSystemLogDir(), ...norm.split("/"));
    const resolved = path.resolve(full);
    if (!isPathUnderLogRoot(resolved)) throw new Error("invalid log path");
    return resolved;
}

export function isAllowedLogFileName(name: string): boolean {
    return SAFE_REL_LOG_PATH.test(name.replace(/\\/g, "/"));
}

function truncateErrorStack(s: string | undefined): string | undefined {
    if (!s) return undefined;
    if (s.length <= MAX_ERROR_STACK_CHARS) return s;
    return `${s.slice(0, MAX_ERROR_STACK_CHARS)}…(truncated)`;
}

/**
 * 메트릭/알림 연동용 서버 오류 전용 NDJSON (`…/YYYY-MM-DD/errors-api.ndjson`).
 */
export function appendApiServerErrorLog(input: {
    event: string;
    level?: number;
    reqId?: string;
    method?: string;
    path?: string;
    statusCode?: number;
    userId?: string;
    error?: Error;
    msg?: string;
    extra?: Record<string, unknown>;
}): void {
    ensureLogRoot();
    const d = todayDateStr();
    const e = input.error;
    const line = JSON.stringify({
        time: Date.now(),
        service: SYSTEM_LOG_SERVICE_API,
        event: input.event,
        level: input.level ?? 50,
        reqId: input.reqId,
        method: input.method,
        path: input.path,
        statusCode: input.statusCode,
        userId: input.userId,
        errorName: e?.name,
        errorMessage: e ? e.message : input.msg,
        errorStack: truncateErrorStack(e?.stack),
        ...input.extra,
    });
    appendFileSync(pathInDay(d, "errorsApi"), `${line}\n`);
}

/**
 * 날짜가 바뀌면 디렉터리·파일을 바꾸는 쓰기 스트림 (pino multistream용 → `system.ndjson`)
 */
class DailyRotatingNdjsonStream extends Writable {
    private currentDate = "";
    private sink: ReturnType<typeof createWriteStream> | null = null;

    override _write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
        try {
            const d = new Date().toISOString().slice(0, 10);
            if (d !== this.currentDate || !this.sink) {
                if (this.sink) {
                    this.sink.end();
                }
                this.currentDate = d;
                ensureLogRoot();
                const p = pathInDay(d, "system");
                this.sink = createWriteStream(p, { flags: "a" });
            }
            this.sink.write(chunk, callback);
        } catch (e) {
            callback(e instanceof Error ? e : new Error(String(e)));
        }
    }

    override _destroy(err: Error | null, callback: (error: Error | null) => void): void {
        if (this.sink) {
            this.sink.end();
            this.sink = null;
        }
        callback(err);
    }
}

/** Fastify / Pino용 로거 인스턴스 생성 (stdout + 일별 `system.ndjson`) */
export function createApiServerLogger(): pino.Logger {
    ensureLogRoot();

    const redactPaths = [
        "req.headers.authorization",
        "req.headers.cookie",
        "*.password",
        "password",
        "authPass",
        "body.password",
        "req.body.password",
    ];

    const streams = pino.multistream([
        { level: "trace", stream: pino.destination(1) },
        { level: "trace", stream: new DailyRotatingNdjsonStream() },
    ]);

    return pino(
        {
            level: process.env.LOG_LEVEL ?? "info",
            base: {
                service: SYSTEM_LOG_SERVICE_API,
                pid: process.pid,
                node: process.version,
            },
            timestamp: pino.stdTimeFunctions.isoTime,
            redact: {
                paths: redactPaths,
                remove: true,
            },
        },
        streams,
    );
}

export interface LogFileInfo {
    name: string;
    size: number;
    mtime: string;
}

export function listSystemLogFiles(): LogFileInfo[] {
    const root = getSystemLogDir();
    if (!existsSync(root)) return [];
    const out: LogFileInfo[] = [];
    let dayEntries: import("fs").Dirent[];
    try {
        dayEntries = readdirSync(root, { withFileTypes: true });
    } catch {
        return [];
    }
    const dayFiles = Object.values(DAY_LOG_FILES);
    for (const ent of dayEntries) {
        const dayName = String(ent.name);
        if (!ent.isDirectory() || !DATE_DIR_RE.test(dayName)) continue;
        const dayDir = path.join(root, dayName);
        for (const fn of dayFiles) {
            const fp = path.join(dayDir, fn);
            try {
                const s = statSync(fp);
                if (!s.isFile()) continue;
                out.push({
                    name: `${dayName}/${fn}`,
                    size: s.size,
                    mtime: s.mtime.toISOString(),
                });
            } catch {
                /* skip */
            }
        }
    }
    out.sort((a, b) => b.name.localeCompare(a.name));
    return out;
}

export type ParsedLogEntry = Record<string, unknown> & {
    raw: string;
};

function pinoLevelToLabel(level: unknown): string {
    if (typeof level === "string") return level;
    if (typeof level === "number") {
        if (level >= 60) return "fatal";
        if (level >= 50) return "error";
        if (level >= 40) return "warn";
        if (level >= 30) return "info";
        if (level >= 20) return "debug";
        return "trace";
    }
    return "info";
}

function levelRank(label: string): number {
    const l = label.toLowerCase();
    if (l === "fatal") return 60;
    if (l === "error") return 50;
    if (l === "warn") return 40;
    if (l === "info") return 30;
    if (l === "debug") return 20;
    if (l === "trace") return 10;
    return 0;
}

export interface ReadSystemLogsOptions {
    fileName: string;
    limit: number;
    levelMin?: string;
    search?: string;
}

export async function readSystemLogTail(options: ReadSystemLogsOptions): Promise<ParsedLogEntry[]> {
    const { fileName, limit, levelMin, search } = options;
    const full = resolveLogFilePath(fileName);
    if (!existsSync(full)) {
        return [];
    }

    const st = await stat(full);
    if (st.size === 0) return [];

    const start = st.size > MAX_TAIL_BYTES ? st.size - MAX_TAIL_BYTES : 0;
    const len = st.size - start;
    const fd = await open(full, "r");
    try {
        const buf = Buffer.alloc(len);
        await fd.read(buf, 0, len, start);
        let text = buf.toString("utf8");
        if (start > 0) {
            const firstNl = text.indexOf("\n");
            if (firstNl !== -1) text = text.slice(firstNl + 1);
        }
        const lines = text.split("\n").filter((l) => l.trim().length > 0);
        const minRank = levelMin ? levelRank(levelMin) : 0;
        const searchLower = search?.trim().toLowerCase();

        const parsed: ParsedLogEntry[] = [];
        for (let i = lines.length - 1; i >= 0 && parsed.length < limit; i--) {
            const raw = lines[i]!;
            let obj: Record<string, unknown>;
            try {
                obj = JSON.parse(raw) as Record<string, unknown>;
            } catch {
                parsed.push({ raw, level: "info", msg: raw.slice(0, 500) });
                continue;
            }
            const label = pinoLevelToLabel(obj.level);
            if (minRank > 0 && levelRank(label) < minRank) continue;
            if (searchLower) {
                const hay = raw.toLowerCase();
                if (!hay.includes(searchLower)) continue;
            }
            parsed.push({ ...obj, raw });
        }
        return parsed.reverse();
    } finally {
        await fd.close();
    }
}

/** API HTTP 요청 한 줄 (`…/YYYY-MM-DD/http-api.ndjson`) — 메트릭·감사용 */
export function logHttpRequestSummary(
    request: FastifyRequest,
    reply: { statusCode: number },
    durationMs: number,
): void {
    ensureLogRoot();
    const d = todayDateStr();
    const uid = (request as FastifyRequest & { userId?: string }).userId;
    const line = JSON.stringify({
        level: 30,
        time: Date.now(),
        service: SYSTEM_LOG_SERVICE_API,
        event: "http_request",
        reqId: request.id,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        userId: uid,
        ip: request.ip,
        host: request.headers.host,
        userAgent: request.headers["user-agent"],
    });
    appendFileSync(pathInDay(d, "httpApi"), `${line}\n`);
}

/** 프로세스 레벨 이벤트 → `system.ndjson` */
export function appendSystemEvent(level: number, msg: string, extra?: Record<string, unknown>): void {
    ensureLogRoot();
    const d = todayDateStr();
    const line = JSON.stringify({
        level,
        time: Date.now(),
        service: SYSTEM_LOG_SERVICE_API,
        msg,
        ...extra,
    });
    appendFileSync(pathInDay(d, "system"), `${line}\n`);
}
