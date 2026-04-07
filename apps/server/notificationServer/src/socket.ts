import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "./types";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "./services/notification.service";
import { appendNotificationErrorLog } from "./system-log";

// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO 서버 생성
// ─────────────────────────────────────────────────────────────────────────────

export function createSocketServer(httpServer: HttpServer) {
  const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";

  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: corsOrigin.split(",").map((o) => o.trim()),
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // ── JWT 인증 미들웨어 ────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token =
      socket.handshake.auth.token ??
      socket.handshake.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      return next(new Error("Server configuration error"));
    }

    try {
      const payload = jwt.verify(token, secret) as {
        sub: string;
        type: string;
      };

      if (payload.type !== "access") {
        return next(new Error("Invalid token type"));
      }

      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  // ── 연결 처리 ────────────────────────────────────────────────────────────
  io.on("connection", async (socket) => {
    const userId = socket.data.userId;

    // 유저 전용 룸에 입장 (알림 전송 타겟)
    await socket.join(`user:${userId}`);

    console.log(`[Socket.IO] connected userId=${userId} socketId=${socket.id}`);

    // 연결 시 최근 알림 목록 전송
    try {
      const data = await getNotifications(userId, 1);
      socket.emit("notification:list", data);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      appendNotificationErrorLog({
        event: "socket_handler_error",
        error: e,
        extra: { handler: "connection_initial_list", userId },
      });
      console.error("[Socket.IO] Failed to send initial notification list", err);
    }

    // ── 단일 알림 읽음 처리 ─────────────────────────────────────────────
    socket.on("notification:read", async (notificationId) => {
      try {
        const updated = await markAsRead(notificationId, userId);
        if (updated) {
          socket.emit("notification:updated", {
            id: notificationId,
            isRead: true,
          });
        }
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        appendNotificationErrorLog({
          event: "socket_handler_error",
          error: e,
          extra: { handler: "notification:read", userId },
        });
        console.error("[Socket.IO] Failed to mark notification as read", err);
      }
    });

    // ── 전체 알림 읽음 처리 ─────────────────────────────────────────────
    socket.on("notification:read_all", async () => {
      try {
        await markAllAsRead(userId);
        socket.emit("notification:all_read");
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        appendNotificationErrorLog({
          event: "socket_handler_error",
          error: e,
          extra: { handler: "notification:read_all", userId },
        });
        console.error("[Socket.IO] Failed to mark all notifications as read", err);
      }
    });

    // ── 알림 목록 조회 ──────────────────────────────────────────────────
    socket.on("notification:get_list", async (page = 1) => {
      try {
        const data = await getNotifications(userId, page);
        socket.emit("notification:list", data);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        appendNotificationErrorLog({
          event: "socket_handler_error",
          error: e,
          extra: { handler: "notification:get_list", userId },
        });
        console.error("[Socket.IO] Failed to get notification list", err);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(
        `[Socket.IO] disconnected userId=${userId} reason=${reason}`,
      );
    });
  });

  return io;
}

export type NotificationSocketServer = ReturnType<typeof createSocketServer>;
