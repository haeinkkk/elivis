"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
    NotificationTypeIcon,
    useNotificationContext,
    useNotificationCopy,
    type NotificationItem,
} from "@repo/ui";

import {
    fetchNotificationsAction,
    markNotificationReadAction,
    markAllNotificationsReadAction,
    type ApiNotification,
} from "@/app/actions/notifications";

function fromApiNotification(n: ApiNotification): NotificationItem {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    data: n.data,
    isRead: n.isRead,
    createdAt: n.createdAt,
  };
}

const PAGE_SIZE = 20;

export default function NotificationPage() {
  const tNav = useTranslations("nav");
  const tNotif = useTranslations("notifications");
  const tc = useTranslations("common");
  const { timeAgo } = useNotificationCopy();

  const {
    notifications: liveNotifications,
    unreadCount: liveUnreadCount,
    markAsRead: socketMarkAsRead,
    markAllAsRead: socketMarkAllAsRead,
  } = useNotificationContext();

  const [serverNotifications, setServerNotifications] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadPage = (p: number) => {
    startTransition(async () => {
      const res = await fetchNotificationsAction(p);
      if (res.ok) {
        setServerNotifications(res.data.notifications.map(fromApiNotification));
        setTotal(res.data.total);
        setPage(p);
        setInitialLoaded(true);
      }
    });
  };

  useEffect(() => {
    startTransition(async () => {
      const res = await fetchNotificationsAction(1);
      if (res.ok) {
        setServerNotifications(res.data.notifications.map(fromApiNotification));
        setTotal(res.data.total);
        setPage(1);
        setInitialLoaded(true);
      }
    });
  }, [startTransition]);

  const displayList: NotificationItem[] =
    page === 1 && liveNotifications.length > 0 ? liveNotifications : serverNotifications;

  const unreadCount =
    page === 1 ? liveUnreadCount : serverNotifications.filter((n) => !n.isRead).length;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function handleMarkRead(id: string) {
    socketMarkAsRead(id);
    await markNotificationReadAction(id);
  }

  async function handleMarkAllRead() {
    socketMarkAllAsRead();
    await markAllNotificationsReadAction();
  }

  const loading = !initialLoaded && isPending;

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-stone-800 sm:text-3xl">{tNav("notifications")}</h1>
            <p className="mt-1 text-sm text-stone-500">
              {unreadCount > 0 ? (
                <span className="font-medium text-amber-600">
                  {tNotif("page.unreadCount", { count: unreadCount })}
                </span>
              ) : (
                tNotif("page.allRead")
              )}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              disabled={isPending}
              className="shrink-0 self-start rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-50"
            >
              {tNotif("markAllRead")}
            </button>
          )}
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center rounded-2xl border border-stone-100 bg-white py-20">
              <svg className="h-6 w-6 animate-spin text-stone-300" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span className="sr-only">{tc("loading")}</span>
            </div>
          ) : displayList.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-white/50 py-20 text-center">
              <svg className="h-12 w-12 text-stone-200" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                />
              </svg>
              <p className="mt-4 text-stone-400">{tNotif("emptyPage")}</p>
            </div>
          ) : (
            <>
              {page === 1 && liveNotifications.length > 0 && (
                <p className="mb-2 flex items-center gap-1 text-xs text-stone-400">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
                  {tNotif("page.liveConnected")}
                </p>
              )}

              <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                {displayList.map((n) => (
                  <li
                    key={n.id}
                    className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                      !n.isRead ? "bg-amber-50/60" : "hover:bg-stone-50/50"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        !n.isRead ? "bg-amber-100 text-amber-600" : "bg-stone-100 text-stone-400"
                      }`}
                    >
                      <NotificationTypeIcon type={n.type} size="md" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm leading-snug ${
                          !n.isRead ? "font-semibold text-stone-800" : "font-medium text-stone-600"
                        }`}
                      >
                        {n.title}
                      </p>
                      {n.message && <p className="mt-0.5 text-xs text-stone-500">{n.message}</p>}
                      <p className="mt-1 text-xs text-stone-400">{timeAgo(n.createdAt)}</p>
                    </div>

                    {!n.isRead && (
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <button
                          type="button"
                          onClick={() => void handleMarkRead(n.id)}
                          className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-500 hover:bg-stone-50"
                        >
                          {tNotif("page.markRead")}
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
                  <p className="text-sm text-stone-500">
                    {tNotif("page.range", {
                      total,
                      from: (page - 1) * PAGE_SIZE + 1,
                      to: Math.min(page * PAGE_SIZE, total),
                    })}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => loadPage(page - 1)}
                      disabled={page <= 1 || isPending}
                      className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-40"
                    >
                      {tNotif("page.prev")}
                    </button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => loadPage(p)}
                        disabled={isPending}
                        className={`min-w-[2.25rem] rounded-lg px-3 py-2 text-sm font-medium ${
                          page === p
                            ? "bg-stone-800 text-white"
                            : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => loadPage(page + 1)}
                      disabled={page >= totalPages || isPending}
                      className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-40"
                    >
                      {tNotif("page.next")}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
