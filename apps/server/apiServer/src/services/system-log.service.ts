import { appendFileSync, createWriteStream, existsSync, mkdirSync, readdirSync, statSync } from "fs";
import { open, stat } from "fs/promises";
import path from "path";
import { Writable } from "stream";

import type { FastifyRequest } from "fastify";
import pino from "pino";

import { getDefaultSystemLogDir } from "../config/system-log-dir";

export const SYSTEM_LOG_SERVICE_API = "api-server";

const FILE_PREFIX = "system-";
const FILE_SUFFIX = ".ndjson";
const MAX_TAIL_BYTES = 4 * 1024 * 1024;

/** 환경변수 없으면 모노레포 루트 `.log` */
export function getSystemLogDir(): string {
    const raw = process.env.SYSTEM_LOG_DIR?.trim();
    if (raw) return path.resolve(raw);
    return getDefaultSystemLogDir();
}

export function ensureSystemLogDir(): void {
    mkdirSync(getSystemLogDir(), { recursive: true });
}

function todayFileName(): string {
    const d = new Date().toISOString().slice(0, 10);
    return `${FILE_PREFIX}${d}${FILE_SUFFIX}`;
}

/**
 * 날짜가 바뀌면 파일을 바꾸는 쓰기 스트림 (pino multistream용)
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
                ensureSystemLogDir();
                const p = path.join(getSystemLogDir(), `${FILE_PREFIX}${d}${FILE_SUFFIX}`);
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

/** Fastify / Pino용 로거 인스턴스 생성 (stdout + 일별 NDJSON) */
export function createApiServerLogger(): pino.Logger {
    ensureSystemLogDir();

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

const SAFE_FILE = /^system-\d{4}-\d{2}-\d{2}\.ndjson$/;
const SAFE_NOTIFICATION_FILE = /^notification-\d{4}-\d{2}-\d{2}\.ndjson$/;

export function isAllowedLogFileName(name: string): boolean {
    return SAFE_FILE.test(name) || SAFE_NOTIFICATION_FILE.test(name);
}

export function listSystemLogFiles(): LogFileInfo[] {
    const dir = getSystemLogDir();
    if (!existsSync(dir)) return [];
    const names = readdirSync(dir).filter((n) => SAFE_FILE.test(n) || SAFE_NOTIFICATION_FILE.test(n));
    const out: LogFileInfo[] = [];
    for (const name of names) {
        try {
            const s = statSync(path.join(dir, name));
            if (!s.isFile()) continue;
            out.push({
                name,
                size: s.size,
                mtime: s.mtime.toISOString(),
            });
        } catch {
            /* skip */
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

/**
 * 파일 끝에서 최대 `MAX_TAIL_BYTES` 바이트를 읽어 마지막 완전한 줄들만 파싱합니다.
 */
export async function readSystemLogTail(options: ReadSystemLogsOptions): Promise<ParsedLogEntry[]> {
    const { fileName, limit, levelMin, search } = options;
    if (!isAllowedLogFileName(fileName)) {
        throw new Error("invalid log file name");
    }
    const full = path.join(getSystemLogDir(), fileName);
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

/** 훅에서 HTTP 요약 한 줄 추가 (pino와 동일 디렉터리·포맷) */
export function logHttpRequestSummary(
    request: FastifyRequest,
    reply: { statusCode: number },
    durationMs: number,
): void {
    ensureSystemLogDir();
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
    appendFileSync(path.join(getSystemLogDir(), todayFileName()), `${line}\n`);
}

/** 프로세스 레벨 이벤트(미처리 예외 등)를 동일 NDJSON에 기록 */
export function appendSystemEvent(level: number, msg: string, extra?: Record<string, unknown>): void {
    ensureSystemLogDir();
    const line = JSON.stringify({
        level,
        time: Date.now(),
        service: SYSTEM_LOG_SERVICE_API,
        msg,
        ...extra,
    });
    appendFileSync(path.join(getSystemLogDir(), todayFileName()), `${line}\n`);
}
