"use client";

import { useState } from "react";
import { NOTIFICATION_READ_KEY, NOTIFICATION_READ_EVENT } from "@/components/AppSidebar";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

function createDemoNotifications(count: number): NotificationItem[] {
  const titles = [
    "새 작업이 할당되었습니다",
    "댓글이 달렸습니다",
    "마감일이 3일 남았습니다",
    "프로젝트가 업데이트되었습니다",
    "멤버가 초대되었습니다",
    "문서가 수정되었습니다",
    "리뷰 요청이 왔습니다",
    "작업이 완료 처리되었습니다",
  ];
  const bodies = [
    "내작업에서 확인해 보세요.",
    "해당 작업에 댓글이 등록되었습니다.",
    "일정을 확인하고 진행해 주세요.",
    "변경 사항을 확인해 주세요.",
    "프로젝트에 참여해 보세요.",
    "최신 내용을 확인해 주세요.",
    "검토 후 피드백을 남겨 주세요.",
    "완료된 작업 목록에서 확인할 수 있습니다.",
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: `n-${i + 1}`,
    title: titles[i % titles.length],
    body: bodies[i % bodies.length],
    read: false,
    createdAt: new Date(Date.now() - i * 3600000).toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));
}

const DEMO_LIST = createDemoNotifications(50);
const PAGE_SIZE = 10;

export default function NotificationPage() {
  const [list, setList] = useState<NotificationItem[]>(DEMO_LIST);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageList = list.slice(start, start + PAGE_SIZE);

  const markAllRead = () => {
    setList((prev) => prev.map((n) => ({ ...n, read: true })));
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(NOTIFICATION_READ_KEY, "1");
      window.dispatchEvent(new Event(NOTIFICATION_READ_EVENT));
    }
  };

  const remove = (id: string) => {
    setList((prev) => prev.filter((n) => n.id !== id));
    const nextTotalPages = Math.max(1, Math.ceil((list.length - 1) / PAGE_SIZE));
    setCurrentPage((p) => Math.min(p, nextTotalPages));
  };

  return (
    <div className="w-full p-4 text-left sm:p-5 md:p-6 lg:p-8">
      <div className="w-full max-w-full">
        {/* 상단: 제목 + 모두 읽음 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-stone-800 sm:text-3xl">알림</h2>
            <p className="mt-2 text-stone-600">
              작업 알림과 업데이트가 여기에 표시됩니다.
            </p>
          </div>
          <div className="flex shrink-0 justify-end">
            <button
              type="button"
              onClick={markAllRead}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:border-stone-300 hover:bg-stone-50"
            >
              모두 읽음
            </button>
          </div>
        </div>

        {/* 리스트 / 빈 상태 */}
        <div className="mt-6 sm:mt-8">
          {list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-white/50 p-12 text-center sm:p-16">
              <p className="text-stone-500">알림이 없습니다.</p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white overflow-hidden">
                {pageList.map((item) => (
                  <li
                    key={item.id}
                    className={`flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4 ${!item.read ? "bg-amber-50/50" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium text-stone-800 ${!item.read ? "font-semibold" : ""}`}>
                        {item.title}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-stone-500">{item.body}</p>
                      <p className="mt-1 text-xs text-stone-400">{item.createdAt}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
                <p className="text-sm text-stone-500">
                  전체 {list.length}개 중 {list.length === 0 ? 0 : start + 1}
                  –{Math.min(start + PAGE_SIZE, list.length)}번
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:pointer-events-none disabled:opacity-50"
                    aria-label="이전 페이지"
                  >
                    이전
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[2.25rem] rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          safePage === page
                            ? "bg-stone-800 text-white"
                            : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                        }`}
                        aria-label={`${page}페이지`}
                        aria-current={safePage === page ? "page" : undefined}
                      >
                        {page}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={safePage >= totalPages}
                    className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:pointer-events-none disabled:opacity-50"
                    aria-label="다음 페이지"
                  >
                    다음
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
