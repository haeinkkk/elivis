import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { t } from "@repo/i18n";

import {
    listSystemLogFiles,
    readSystemLogTail,
    type ParsedLogEntry,
} from "../services/system-log.service";
import { MSG } from "../utils/messages";
import { badRequest, ok } from "../utils/response";

export interface SystemLogsQuery {
    file?: string;
    limit?: string;
    levelMin?: string;
    search?: string;
}

const MAX_RAW = 65536;

function truncateEntry(e: ParsedLogEntry): ParsedLogEntry {
    if (e.raw.length <= MAX_RAW) return e;
    return { ...e, raw: `${e.raw.slice(0, MAX_RAW)}…` };
}

export function createSystemLogsController(_app: FastifyInstance) {
    async function getSystemLogs(
        request: FastifyRequest<{ Querystring: SystemLogsQuery }>,
        reply: FastifyReply,
    ) {
        const q = request.query ?? {};
        const files = listSystemLogFiles();
        const file = q.file?.trim();

        if (!file) {
            return reply.send(ok({ files }, t(request.lang, MSG.ADMIN_SYSTEM_LOGS_FETCHED)));
        }

        const limit = Math.min(500, Math.max(1, Number.parseInt(String(q.limit ?? "100"), 10) || 100));
        const levelMin = q.levelMin?.trim() || undefined;
        const search = q.search?.trim() || undefined;

        try {
            const entries = await readSystemLogTail({
                fileName: file,
                limit,
                levelMin,
                search,
            });
            const safe = entries.map(truncateEntry);
            return reply.send(
                ok(
                    { files, file, limit, levelMin: levelMin ?? null, search: search ?? null, entries: safe },
                    t(request.lang, MSG.ADMIN_SYSTEM_LOGS_FETCHED),
                ),
            );
        } catch {
            return reply.code(400).send(badRequest(t(request.lang, MSG.ADMIN_SYSTEM_LOG_FILE_INVALID)));
        }
    }

    return { getSystemLogs };
}
