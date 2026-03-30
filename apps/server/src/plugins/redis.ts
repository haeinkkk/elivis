import type { Redis } from "ioredis";
import IORedis from "ioredis";
import fp from "fastify-plugin";

// ─────────────────────────────────────────────────────────────────────────────
// Fastify 타입 확장
// ─────────────────────────────────────────────────────────────────────────────

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 플러그인
// ─────────────────────────────────────────────────────────────────────────────

export const redisPlugin = fp(
  async (fastify) => {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";

    const redis = new IORedis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    await redis.connect();
    fastify.log.info("Redis connection established");

    fastify.decorate("redis", redis);

    fastify.addHook("onClose", async () => {
      await redis.quit();
    });
  },
  { name: "redis" },
);
