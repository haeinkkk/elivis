import type { FastifyInstance } from "fastify";
import { t } from "@repo/i18n";

import { MSG } from "../utils/messages";
import { ok, serviceUnavailable } from "../utils/response";

export async function healthRoutes(app: FastifyInstance) {
    app.get("/health", async (request, reply) => {
        try {
            const started = Date.now();
            await app.prisma.$queryRaw`SELECT 1`;
            return reply.send(
                ok(
                    { database: "connected", latencyMs: Date.now() - started },
                    t(request.lang, MSG.HEALTH_OK),
                ),
            );
        } catch (err) {
            request.log.error({ err }, "Health check: database unreachable");
            return reply
                .code(503)
                .send(
                    serviceUnavailable(
                        err instanceof Error ? err.message : t(request.lang, MSG.HEALTH_DB_ERROR),
                    ),
                );
        }
    });
}
