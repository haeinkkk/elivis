import "dotenv/config";

import { randomUUID } from "crypto";
import { mkdirSync } from "fs";
import path from "path";

import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";

import { prismaPlugin } from "./plugins/prisma";
import { redisPlugin } from "./plugins/redis";
import { adminRoutes } from "./routes/admin.routes";
import { notificationRoutes } from "./routes/notification.routes";
import { authRoutes } from "./routes/auth.routes";
import { healthRoutes } from "./routes/health.routes";
import { projectRoutes } from "./routes/project.routes";
import { teamRoutes } from "./routes/team.routes";
import { userRoutes } from "./routes/user.routes";
import { workspaceRoutes } from "./routes/workspace.routes";
import { taskRequestRoutes } from "./routes/taskRequest.routes";
import { teamPostRoutes } from "./routes/teamPost.routes";
import { uploadRoutes } from "./routes/upload.routes";
import { createStorageService } from "./services/storage.service";
import { initSetupToken } from "./services/setup.service";
import { languageMiddleware } from "./middleware/language";
import { appendSystemEvent, createApiServerLogger, logHttpRequestSummary } from "./services/system-log.service";

// ── 설정 상수 ─────────────────────────────────────────────────────────────────

const port       = Number(process.env.API_PORT) || 4000;
const host       = process.env.API_HOST ?? "0.0.0.0";
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";

/** 업로드 최대 파일 크기 (bytes). UPLOAD_MAX_FILE_SIZE_MB (MB 단위)를 변환. */
export const UPLOAD_MAX_FILE_SIZE =
  (Number(process.env.UPLOAD_MAX_FILE_SIZE_MB) || 2) * 1024 * 1024;

/** 위키 영상 등 — 멀티파트 전역 상한(바이트). WIKI_UPLOAD_MAX_FILE_SIZE_MB 기본 50MB */
const WIKI_UPLOAD_MAX_BYTES =
  (Number(process.env.WIKI_UPLOAD_MAX_FILE_SIZE_MB) || 50) * 1024 * 1024;
export const MULTIPART_MAX_FILE_SIZE = Math.max(UPLOAD_MAX_FILE_SIZE, WIKI_UPLOAD_MAX_BYTES);

/** 로컬 스토리지 루트 디렉토리 (서버 cwd 기준) */
export const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

// 로컬 스토리지일 때만 디렉토리 생성
if ((process.env.UPLOAD_STORAGE ?? "local") === "local") {
  mkdirSync(path.join(UPLOADS_DIR, "avatars"), { recursive: true });
  mkdirSync(path.join(UPLOADS_DIR, "team-banners"), { recursive: true });
  mkdirSync(path.join(UPLOADS_DIR, "team-posts"), { recursive: true });
}

/** 파일 스토리지 서비스 싱글톤 (local / s3) */
export const storageService = createStorageService(UPLOADS_DIR);

// ─────────────────────────────────────────────────────────────────────────────

const DIVIDER = "─".repeat(58);

process.on("uncaughtException", (err) => {
  appendSystemEvent(60, err.message, {
    event: "uncaughtException",
    name: err.name,
    stack: err.stack,
  });
  console.error(err);
});

process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  appendSystemEvent(50, msg, { event: "unhandledRejection", stack });
});

async function main() {
  const app = Fastify({
    // Fastify 5: 기존 Pino 인스턴스는 loggerInstance (logger 는 옵션 객체만)
    loggerInstance: createApiServerLogger(),
    disableRequestLogging: true,
    genReqId: () => randomUUID(),
  });

  app.addHook("onResponse", (request, reply, done) => {
    logHttpRequestSummary(request, reply, reply.elapsedTime ?? 0);
    done();
  });

  app.addHook("onError", (request, _reply, error, done) => {
    request.log.error(
      {
        err: error,
        event: "request_error",
        reqId: request.id,
        path: request.url,
        method: request.method,
      },
      error.message,
    );
    done();
  });

  await app.register(cors, {
    origin: corsOrigin.split(",").map((o) => o.trim()),
    credentials: true,
  });

  // ── 파일 업로드 ────────────────────────────────────────────────────────────
  await app.register(multipart, {
    limits: { fileSize: MULTIPART_MAX_FILE_SIZE },
  });

  // ── 로컬 스토리지 정적 서빙 (/uploads/) ────────────────────────────────────
  if ((process.env.UPLOAD_STORAGE ?? "local") === "local") {
    await app.register(fastifyStatic, {
      root:   UPLOADS_DIR,
      prefix: "/uploads/",
    });
  }

  // ── 언어 감지 (모든 라우트보다 먼저 실행) ─────────────────────────────────
  app.addHook("onRequest", languageMiddleware);

  // ── 플러그인 (순서 중요: 라우트보다 먼저 등록) ────────────────────────────
  await app.register(prismaPlugin);
  await app.register(redisPlugin);

  // ── 라우트 (/api prefix + /health 별도) ──────────────────────────────────
  await app.register(healthRoutes);
  await app.register(authRoutes,    { prefix: "/api" });
  await app.register(userRoutes,    { prefix: "/api" });
  await app.register(projectRoutes, { prefix: "/api" });
  await app.register(teamRoutes,      { prefix: "/api" });
  await app.register(workspaceRoutes, { prefix: "/api" });
  await app.register(adminRoutes,         { prefix: "/api" });
  await app.register(notificationRoutes,  { prefix: "/api" });
  await app.register(taskRequestRoutes,   { prefix: "/api" });
  await app.register(teamPostRoutes,      { prefix: "/api" });
  await app.register(uploadRoutes,        { prefix: "/api" });

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
  const e = err instanceof Error ? err : new Error(String(err));
  appendSystemEvent(60, e.message, { event: "main_reject", stack: e.stack, name: e.name });
  console.error(err);
  process.exit(1);
});
