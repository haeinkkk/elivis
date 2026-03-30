"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getTeams, type Team } from "@/lib/teams";

const PAGE_SIZE = 10;

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "…";
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTeams(getTeams());
    setLoaded(true);
  }, []);

  const totalPages = Math.max(1, Math.ceil(teams.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageList = teams.slice(start, start + PAGE_SIZE);

  return (
    <div className="w-full p-4 text-left sm:p-5 md:p-6 lg:p-8">
      <div className="w-full max-w-full">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-stone-800 sm:text-3xl">
              팀
            </h2>
            <p className="mt-2 text-stone-600">
              팀 목록을 확인하고 관리하세요.
            </p>
          </div>
          <Link
            href="/teams/new"
            className="inline-flex items-center gap-2 self-start rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            팀 생성
          </Link>
        </div>

        {!loaded ? (
          <div className="mt-8 flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-600" />
          </div>
        ) : teams.length === 0 ? (
          <div className="mt-12 flex flex-col items-center justify-center py-16 text-center sm:mt-16 sm:py-24">
            <span className="flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
              <svg
                className="h-14 w-14 text-stone-800 sm:h-16 sm:w-16"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
                />
              </svg>
            </span>
            <p className="mt-4 text-xl font-medium text-stone-800 sm:text-2xl">
              현재 팀이 없어요 <span className="inline-block">😢</span>
            </p>
            <Link
              href="/teams/new"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-stone-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
            >
              팀 생성하기
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-6 space-y-3 sm:mt-8">
              {pageList.map((team) => (
                <li key={team.id}>
                  <div className="group flex items-start gap-4 rounded-xl border border-stone-200 bg-white p-4 transition-all hover:border-stone-300 hover:shadow-md sm:p-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500 transition-colors group-hover:bg-stone-200 group-hover:text-stone-600 sm:h-11 sm:w-11">
                      <svg
                        className="h-5 w-5 sm:h-6 sm:w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-stone-800 transition-colors group-hover:text-stone-900">
                        {team.name || "이름 없음"}
                      </h3>
                      <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <p
                          className="text-sm text-stone-500 line-clamp-1"
                          title={team.description}
                        >
                          {team.description
                            ? truncate(team.description, 50)
                            : "설명 없음"}
                        </p>
                        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500 sm:gap-x-4">
                          <span>
                            팀 ID{" "}
                            <span className="font-medium text-stone-600">
                              {team.teamId || "—"}
                            </span>
                          </span>
                          <span className="text-stone-300 sm:inline">|</span>
                          <span>
                            인원{" "}
                            <span className="font-medium text-stone-600">
                              {(team.members?.length ?? 0)}명
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="shrink-0 text-stone-400">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8.25 4.5l7.5 7.5-7.5 7.5"
                        />
                      </svg>
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {teams.length > PAGE_SIZE && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
                <p className="text-sm text-stone-500">
                  전체 {teams.length}개 중 {start + 1}–
                  {Math.min(start + PAGE_SIZE, teams.length)}번
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => Math.max(1, p - 1))
                    }
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
