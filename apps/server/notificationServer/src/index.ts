import "dotenv/config";

import http from "http";
import { prisma } from "@repo/database";
import {
  appendNotificationErrorLog,
  appendNotificationHttpRequestLog,
  appendNotificationLog,
} from "./system-log";
import { createSocketServer } from "./socket";
import { createRedisSubscriber } from "./redis";

// ─────────────────────────────────────────────────────────────────────────────

const port = Number(process.env.NOTIFICATION_PORT) || 4001;
const host = process.env.NOTIFICATION_HOST ?? "0.0.0.0";

const DIVIDER = "─".repeat(58);

process.on("uncaughtException", (err) => {
  appendNotificationErrorLog({ event: "uncaughtException", level: 60, error: err });
  appendNotificationLog(60, err.message, {
    event: "uncaughtException",
    name: err.name,
    stack: err.stack,
  });
  console.error(err);
});

process.on("unhandledRejection", (reason) => {
  const e = reason instanceof Error ? reason : new Error(String(reason));
  appendNotificationErrorLog({ event: "unhandledRejection", level: 50, error: e });
  const msg = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  appendNotificationLog(50, msg, { event: "unhandledRejection", stack });
});

async function main() {
  // ── DB 연결 확인 ──────────────────────────────────────────────────────────
  await prisma.$connect();
  appendNotificationLog(30, "Database connection established", { event: "db_connect" });
  console.log("[DB] Database connection established");

  // ── HTTP 서버 + Socket.IO 초기화 ─────────────────────────────────────────
  const httpServer = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "notification-server" }));
  });

  /** 모든 HTTP 요청(헬스·Socket.IO 엔진 등)에 대해 날짜별 `http-notification.ndjson`에 기록 */
  httpServer.prependListener("request", (req, res) => {
    const start = Date.now();
    const rawUrl = req.url ?? "";
    const pathOnly = rawUrl.split("?")[0] ?? "";
    res.on("finish", () => {
      appendNotificationHttpRequestLog({
        method: req.method ?? "GET",
        path: pathOnly || "/",
        url: rawUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
        userAgent:
          typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
      });
    });
  });

  const io = createSocketServer(httpServer);

  // ── Redis Subscriber 시작 ────────────────────────────────────────────────
  const subscriber = createRedisSubscriber(io);

  // ── 서버 기동 ─────────────────────────────────────────────────────────────
  httpServer.listen(port, host, () => {
    appendNotificationLog(30, "Notification server listening", {
      event: "listen",
      host,
      port,
      redisChannel: "notification:send",
    });
    console.log(`
${DIVIDER}
  Notification Server running at http://${host}:${port}
  Socket.IO endpoint : ws://${host}:${port}
  Redis channel      : notification:send
${DIVIDER}
`);
  });

  // ── 종료 시그널 처리 ────────────────────────────────────────────────────
  const shutdown = async () => {
    appendNotificationLog(30, "Shutdown initiated", { event: "shutdown" });
    console.log("\n[Shutdown] Closing notification server...");
    subscriber.quit();
    io.close();
    await prisma.$disconnect();
    httpServer.close(() => {
      console.log("[Shutdown] Server closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT",  () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((err) => {
  const e = err instanceof Error ? err : new Error(String(err));
  appendNotificationErrorLog({ event: "bootstrap_fatal", level: 60, error: e });
  console.error(err);
  process.exit(1);
});
