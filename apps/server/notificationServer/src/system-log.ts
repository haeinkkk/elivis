import { appendFileSync, mkdirSync } from "fs";
import path from "path";

import { getDefaultSystemLogDir } from "./config/system-log-dir";

const SERVICE = "notification-server";

export function getNotificationLogDir(): string {
    const raw = process.env.SYSTEM_LOG_DIR?.trim();
    if (raw) return path.resolve(raw);
    return getDefaultSystemLogDir();
}

function todayName(): string {
    const d = new Date().toISOString().slice(0, 10);
    return `notification-${d}.ndjson`;
}

/** API 서버와 동일 디렉터리에 NDJSON 한 줄 추가 */
export function appendNotificationLog(
    level: number,
    msg: string,
    extra?: Record<string, unknown>,
): void {
    const dir = getNotificationLogDir();
    mkdirSync(dir, { recursive: true });
    const line = JSON.stringify({
        level,
        time: Date.now(),
        service: SERVICE,
        msg,
        pid: process.pid,
        node: process.version,
        ...extra,
    });
    appendFileSync(path.join(dir, todayName()), `${line}\n`);
}
