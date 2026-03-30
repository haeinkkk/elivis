"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addTeam } from "@/lib/teams";
import type { TeamMember } from "@/lib/teams";

type User = {
  id: string;
  name: string;
  userId: string;
};

const DEMO_USERS: User[] = [
  { id: "1", name: "김철수", userId: "chulsoo@elivis.com" },
  { id: "2", name: "이영희", userId: "younghee@elivis.com" },
  { id: "3", name: "박민수", userId: "minsu@elivis.com" },
  { id: "4", name: "정수진", userId: "sujin@elivis.com" },
  { id: "5", name: "최동욱", userId: "dongwook@elivis.com" },
  { id: "6", name: "한지우", userId: "jiwoo@elivis.com" },
  { id: "7", name: "강서연", userId: "seoyeon@elivis.com" },
  { id: "8", name: "윤도현", userId: "dohyun@elivis.com" },
  { id: "9", name: "임하늘", userId: "haneul@elivis.com" },
  { id: "10", name: "송지훈", userId: "jihun@elivis.com" },
];

export default function NewTeamPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const q = userSearchQuery.trim().toLowerCase();
  const filteredUsers = !q
    ? DEMO_USERS
    : DEMO_USERS.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.userId.toLowerCase().includes(q)
      );

  const addMember = (user: User) => {
    if (members.some((m) => m.id === user.id)) return;
    setMembers((prev) => [...prev, { id: user.id, name: user.name, userId: user.userId }]);
    setMemberModalOpen(false);
    setUserSearchQuery("");
  };

  const removeMember = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTeam({
      name,
      teamId: teamId.trim() || name.trim().replace(/\s+/g, "-").toLowerCase(),
      description,
      members,
    });
    router.push("/teams");
  };

  return (
    <div className="w-full p-4 text-left sm:p-5 md:p-6 lg:p-8">
      <div className="w-full max-w-full">
        <Link
          href="/teams"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-700"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          팀 목록
        </Link>
        <div className="mt-4">
          <h2 className="text-2xl font-semibold text-stone-800 sm:text-3xl">
            팀 생성
          </h2>
          <p className="mt-2 text-stone-600">
            팀 정보를 입력한 뒤 생성하세요.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 max-w-2xl space-y-6 sm:mt-8"
        >
          <div>
            <label
              htmlFor="team-name"
              className="block text-sm font-medium text-stone-700"
            >
              팀 이름
            </label>
            <input
              id="team-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 프론트엔드팀"
              className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
          </div>

          <div>
            <label
              htmlFor="team-id"
              className="block text-sm font-medium text-stone-700"
            >
              팀 ID
            </label>
            <input
              id="team-id"
              type="text"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              placeholder="예: frontend (비워두면 팀 이름 기반 자동 생성)"
              className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
            <p className="mt-1 text-xs text-stone-400">
              팀 식별자. 영문, 숫자, 하이픈 권장.
            </p>
          </div>

          <div>
            <label
              htmlFor="team-desc"
              className="block text-sm font-medium text-stone-700"
            >
              팀 설명
            </label>
            <textarea
              id="team-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="팀에 대한 간단한 설명을 입력하세요."
              rows={3}
              className="mt-1.5 w-full resize-y rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-stone-700">인원 추가</p>
            <p className="mt-0.5 text-xs text-stone-400">
              추가 버튼으로 팀원을 선택하세요.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {members.map((p, i) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50/80 py-1.5 pl-1.5 pr-2"
                >
                  <span className="flex h-7 w-7 shrink-0 rounded-full bg-stone-300" />
                  <span className="flex flex-col items-start">
                    <span className="text-sm font-medium text-stone-800 leading-tight">
                      {p.name}
                    </span>
                    <span className="text-xs text-stone-500 leading-tight">
                      {p.userId}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMember(i)}
                    className="shrink-0 rounded-full p-0.5 text-stone-400 hover:bg-stone-200 hover:text-stone-600"
                    aria-label="제거"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMemberModalOpen(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              추가
            </button>
          </div>

          {/* 인원 추가 모달 */}
          {memberModalOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-stone-900/40"
                aria-hidden
                onClick={() => {
                  setMemberModalOpen(false);
                  setUserSearchQuery("");
                }}
              />
              <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
                <div className="border-b border-stone-100 px-4 py-3">
                  <h3 className="text-base font-semibold text-stone-800">
                    인원 추가
                  </h3>
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-2">
                    <svg
                      className="h-4 w-4 shrink-0 text-stone-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                      />
                    </svg>
                    <input
                      type="search"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="이름 또는 아이디로 검색"
                      className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none"
                      autoFocus
                    />
                  </div>
                </div>
                <ul className="max-h-64 overflow-y-auto py-2">
                  {filteredUsers.length === 0 ? (
                    <li className="px-4 py-6 text-center text-sm text-stone-500">
                      검색 결과가 없습니다.
                    </li>
                  ) : (
                    filteredUsers.map((user) => {
                      const isAdded = members.some((m) => m.id === user.id);
                      return (
                        <li key={user.id}>
                          <button
                            type="button"
                            onClick={() => !isAdded && addMember(user)}
                            disabled={isAdded}
                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              isAdded
                                ? "cursor-default opacity-50"
                                : "hover:bg-stone-50"
                            }`}
                          >
                            <span className="h-9 w-9 shrink-0 rounded-full bg-stone-300" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-stone-800">
                                {user.name}
                              </p>
                              <p className="text-xs text-stone-500">
                                {user.userId}
                              </p>
                            </div>
                            {isAdded && (
                              <span className="text-xs text-stone-400">
                                추가됨
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
                <div className="border-t border-stone-100 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMemberModalOpen(false);
                      setUserSearchQuery("");
                    }}
                    className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
            >
              팀 생성
            </button>
            <Link
              href="/teams"
              className="rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
