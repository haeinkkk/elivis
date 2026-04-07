import "dotenv/config";

import http from "http";
import { prisma } from "@repo/database";
import { appendNotificationLog } from "./system-log";
import { createSocketServer } from "./socket";
import { createRedisSubscriber } from "./redis";

// ─────────────────────────────────────────────────────────────────────────────

const port = Number(process.env.NOTIFICATION_PORT) || 4001;
const host = process.env.NOTIFICATION_HOST ?? "0.0.0.0";

const DIVIDER = "─".repeat(58);

process.on("uncaughtException", (err) => {
  appendNotificationLog(60, err.message, {
    event: "uncaughtException",
    name: err.name,
    stack: err.stack,
  });
  console.error(err);
});

process.on("unhandledRejection", (reason) => {
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
  console.error(err);
  process.exit(1);
});
