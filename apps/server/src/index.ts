import "dotenv/config";

import cors from "@fastify/cors";
import Fastify from "fastify";

import { prismaPlugin } from "./plugins/prisma";
import { redisPlugin } from "./plugins/redis";
import { adminRoutes } from "./routes/admin.routes";
import { authRoutes } from "./routes/auth.routes";
import { healthRoutes } from "./routes/health.routes";
import { projectRoutes } from "./routes/project.routes";
import { initSetupToken } from "./services/setup.service";

const port = Number(process.env.API_PORT) || 4000;
const host = process.env.API_HOST ?? "0.0.0.0";
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";

const DIVIDER = "─".repeat(58);

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: corsOrigin.split(",").map((o) => o.trim()),
    credentials: true,
  });

  // ── 플러그인 (순서 중요: 라우트보다 먼저 등록) ────────────────────────────
  await app.register(prismaPlugin);
  await app.register(redisPlugin);

  // ── 라우트 (/api prefix + /health 별도) ──────────────────────────────────
  await app.register(healthRoutes);
  await app.register(authRoutes,    { prefix: "/api" });
  await app.register(projectRoutes, { prefix: "/api" });
  await app.register(adminRoutes,   { prefix: "/api" });

  // ── 최초 설치 토큰 출력 (DB에 유저가 0명일 때만) ──────────────────────────
  app.addHook("onReady", async () => {
    const userCount = await app.prisma.user.count();
    if (userCount === 0) {
      const token = initSetupToken();
      console.log(`
${DIVIDER}
⚠️  INITIAL SETUP MODE
   DB에 등록된 유저가 없습니다. 최초 회원가입 시 아래 토큰을
   'setupToken' 필드에 입력해야 SUPER_ADMIN으로 등록됩니다.

   SETUP TOKEN : ${token}

   ※ 이 토큰은 서버 재시작 시 초기화되며,
      첫 번째 SUPER_ADMIN이 생성되면 자동으로 비활성화됩니다.
${DIVIDER}
`);
    }
  });

  // ── 종료 시그널 처리 ──────────────────────────────────────────────────────
  const shutdown = async () => { await app.close(); };
  process.on("SIGINT",  () => { void shutdown().then(() => process.exit(0)); });
  process.on("SIGTERM", () => { void shutdown().then(() => process.exit(0)); });

  await app.listen({ port, host });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
