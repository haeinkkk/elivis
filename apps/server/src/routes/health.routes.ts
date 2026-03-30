import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (request, reply) => {
    try {
      const started = Date.now();
      await app.prisma.$queryRaw`SELECT 1`;
      return reply.send({
        status: "ok",
        database: "connected",
        latencyMs: Date.now() - started,
      });
    } catch (err) {
      request.log.error({ err }, "Health check: database unreachable");
      return reply.code(503).send({
        status: "error",
        database: "disconnected",
        message: err instanceof Error ? err.message : "unknown error",
      });
    }
  });
}
