"use client";

import { useLocale, useTranslations } from "next-intl";

const KNOWN_TYPES = [
  "TASK_ASSIGNED",
  "TASK_COMMENT",
  "TASK_DUE_SOON",
  "TASK_STATUS_CHANGED",
  "PROJECT_MEMBER_ADDED",
  "TEAM_MEMBER_ADDED",
  "TEAM_JOIN_REQUEST",
  "MENTION",
  "TASK_REQUEST_RECEIVED",
  "TASK_REQUEST_ACCEPTED",
  "TASK_REQUEST_REJECTED",
  "SYSTEM",
] as const;

function localeToBcp47(locale: string): string {
  if (locale === "ko") return "ko-KR";
  if (locale === "ja") return "ja-JP";
  return "en-US";
}

export function useNotificationCopy() {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const localeTag = localeToBcp47(locale);

  function typeLabel(type: string): string {
    if ((KNOWN_TYPES as readonly string[]).includes(type)) {
      return t(`types.${type}` as "types.TASK_ASSIGNED");
    }
    return t("types.fallback");
  }

  function timeAgo(dateStr: string): string {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const secs = Math.floor(diff / 1000);
      if (secs < 60) return t("relative.justNow");
      const mins = Math.floor(secs / 60);
      if (mins < 60) return t("relative.minutesAgo", { count: mins });
      const hours = Math.floor(mins / 60);
      if (hours < 24) return t("relative.hoursAgo", { count: hours });
      const days = Math.floor(hours / 24);
      if (days < 7) return t("relative.daysAgo", { count: days });
      return new Date(dateStr).toLocaleDateString(localeTag);
    } catch {
      return "";
    }
  }

  function formatDateTime(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleString(localeTag, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  return { t, typeLabel, timeAgo, formatDateTime };
}
