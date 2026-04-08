import IORedis from "ioredis";
import {
  prisma,
  shouldDeliverProjectNotificationEmail,
} from "@repo/database";

import type { NotificationSocketServer } from "./socket";
import type { NotificationPayload } from "./types";
import { saveNotification } from "./services/notification.service";
import { getSmtpSettingsRow, sendMailFromSettings, smtpSettingsReady } from "./smtp-mail";

export const NOTIFICATION_CHANNEL = "notification:send";

function resolveProjectId(payload: NotificationPayload): string | undefined {
  if (payload.projectId?.trim()) return payload.projectId.trim();
  const fromData = payload.data?.projectId;
  return fromData?.trim() || undefined;
}

async function maybeSendNotificationEmail(payload: NotificationPayload): Promise<void> {
  if (payload.email !== true) return;

  const projectId = resolveProjectId(payload);
  if (!projectId) {
    console.warn("[Notification] Email requested but projectId is missing", payload.type);
    return;
  }

  const allow = await shouldDeliverProjectNotificationEmail(
    prisma,
    payload.userId,
    projectId,
  );
  if (!allow) return;

  const smtpRow = await getSmtpSettingsRow(prisma);
  if (!smtpSettingsReady(smtpRow)) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { email: true },
  });
  const to = user?.email?.trim();
  if (!to) return;

  const textBody = [payload.title, payload.message].filter(Boolean).join("\n\n").trim();

  try {
    await sendMailFromSettings(smtpRow, {
      to,
      subject: payload.title,
      text: textBody || payload.title,
    });
    console.log(`[Notification] Email sent to userId=${payload.userId} type=${payload.type}`);
  } catch (err) {
    console.error("[Notification] Email send failed", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Redis Subscriber 초기화
// ─────────────────────────────────────────────────────────────────────────────

export function createRedisSubscriber(io: NotificationSocketServer) {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";

  const subscriber = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  subscriber.on("connect", () => {
    console.log("[Redis] Subscriber connected");
  });

  subscriber.on("error", (err) => {
    console.error("[Redis] Subscriber error", err);
  });

  subscriber.subscribe(NOTIFICATION_CHANNEL, (err) => {
    if (err) {
      console.error(`[Redis] Failed to subscribe to ${NOTIFICATION_CHANNEL}`, err);
      return;
    }
    console.log(`[Redis] Subscribed to channel: ${NOTIFICATION_CHANNEL}`);
  });

  subscriber.on("message", async (channel, rawMessage) => {
    if (channel !== NOTIFICATION_CHANNEL) return;

    let payload: NotificationPayload;
    try {
      payload = JSON.parse(rawMessage) as NotificationPayload;
    } catch {
      console.error("[Redis] Invalid notification message format", rawMessage);
      return;
    }

    const wantPush = payload.push !== false;
    const wantEmail = payload.email === true;

    if (!wantPush && !wantEmail) {
      console.warn("[Notification] Skipped: both push and email off", payload.type);
      return;
    }

    try {
      if (wantPush) {
        const notification = await saveNotification(payload);
        io.to(`user:${payload.userId}`).emit("notification:new", notification);
        console.log(
          `[Notification] Push to userId=${payload.userId} type=${payload.type}`,
        );
      }

      if (wantEmail) {
        await maybeSendNotificationEmail(payload);
      }
    } catch (err) {
      console.error("[Notification] Failed to process notification", err);
    }
  });

  return subscriber;
}
