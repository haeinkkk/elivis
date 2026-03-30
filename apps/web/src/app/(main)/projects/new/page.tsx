"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addProject } from "@/lib/projects";

type User = {
  id: string;
  name: string;
  userId: string; // 아이디 형식 표기용 (예: @hong, hong@company.com)
};

type Team = {
  id: string;
  name: string;
  teamId: string; // 팀 식별자 표기용
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

const DEMO_TEAMS: Team[] = [
  { id: "t1", name: "프론트엔드팀", teamId: "frontend" },
  { id: "t2", name: "백엔드팀", teamId: "backend" },
  { id: "t3", name: "디자인팀", teamId: "design" },
  { id: "t4", name: "기획팀", teamId: "planning" },
  { id: "t5", name: "QA팀", teamId: "qa" },
  { id: "t6", name: "인프라팀", teamId: "infra" },
];

// 로그인한 사용자(프로젝트 생성자) — 데모용
const CURRENT_USER: User = { id: "1", name: "김철수", userId: "chulsoo@elivis.com" };

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [projectType, setProjectType] = useState<"personal" | "team">("personal");
  const [isPublic, setIsPublic] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [noEndDate, setNoEndDate] = useState(false);
  const [participants, setParticipants] = useState<User[]>([]);
  const [participantModalOpen, setParticipantModalOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [teamSearchQuery, setTeamSearchQuery] = useState("");

  const userQuery = userSearchQuery.trim().toLowerCase();
  const filteredUsers = !userQuery
    ? DEMO_USERS
    : DEMO_USERS.filter(
        (u) =>
          u.name.toLowerCase().includes(userQuery) ||
          u.userId.toLowerCase().includes(userQuery)
      );

  const teamQuery = teamSearchQuery.trim().toLowerCase();
  const filteredTeams = !teamQuery
    ? DEMO_TEAMS
    : DEMO_TEAMS.filter(
        (t) =>
          t.name.toLowerCase().includes(teamQuery) ||
          t.teamId.toLowerCase().includes(teamQuery)
      );

  const addParticipant = (user: User) => {
    if (participants.some((p) => p.id === user.id)) return;
    setParticipants((prev) => [...prev, user]);
    setParticipantModalOpen(false);
    setUserSearchQuery("");
  };

  const removeParticipant = (index: number) => {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const addTeam = (team: Team) => {
    if (teams.some((t) => t.id === team.id)) return;
    setTeams((prev) => [...prev, team]);
    setTeamModalOpen(false);
    setTeamSearchQuery("");
  };

  const removeTeam = (index: number) => {
    setTeams((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addProject({
      name,
      description,
      projectUrl,
      projectType,
      isPublic,
      startDate,
      endDate,
      noEndDate,
      participants,
      teams: projectType === "personal" ? [] : teams,
    });
    router.push("/projects");
  };

  return (
    <div className="w-full p-4 text-left sm:p-5 md:p-6 lg:p-8">
      <div className="w-full max-w-full">
        <Link
          href="/projects"
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
          프로젝트 목록
        </Link>
        <div className="mt-4">
          <h2 className="text-2xl font-semibold text-stone-800 sm:text-3xl">
            프로젝트 생성
          </h2>
          <p className="mt-2 text-stone-600">
            프로젝트 정보를 입력한 뒤 생성하세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-6 sm:mt-8">
          <div>
            <label className="block text-sm font-medium text-stone-700">
              프로젝트 생성자
            </label>
            <div
              className="mt-1.5 flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2.5"
              aria-readonly
            >
              <span className="flex h-9 w-9 shrink-0 rounded-full bg-stone-300" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-800 truncate">
                  {CURRENT_USER.name}
                </p>
                <p className="text-xs text-stone-500 truncate">
                  {CURRENT_USER.userId}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="project-name"
              className="block text-sm font-medium text-stone-700"
            >
              프로젝트 명
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: Elivis 웹 앱"
              className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
          </div>

          <div>
            <label
              htmlFor="project-desc"
              className="block text-sm font-medium text-stone-700"
            >
              프로젝트 설명
            </label>
            <textarea
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="프로젝트에 대한 간단한 설명을 입력하세요."
              rows={3}
              className="mt-1.5 w-full resize-y rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
          </div>

          <div>
            <label
              htmlFor="project-url"
              className="block text-sm font-medium text-stone-700"
            >
              프로젝트 주소
            </label>
            <input
              id="project-url"
              type="url"
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
              placeholder="예: https://gitlab.com/org/repo"
              className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
            <p className="mt-1 text-xs text-stone-400">
              GitLab 등 레포지토리 주소 형식으로 입력하세요.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-stone-700">프로젝트 기간</p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="start-date" className="text-sm text-stone-600">
                  시작:
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="end-date" className="text-sm text-stone-600">
                  종료:
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={noEndDate}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 disabled:bg-stone-50 disabled:text-stone-400"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={noEndDate}
                  onChange={(e) => {
                    setNoEndDate(e.target.checked);
                    if (e.target.checked) setEndDate("");
                  }}
                  className="h-4 w-4 rounded border-stone-300 text-stone-700 focus:ring-stone-400"
                />
                <span className="text-sm text-stone-600">
                  아직 안정해졌어요
                </span>
              </label>
            </div>
            {noEndDate && (
              <p className="text-xs text-stone-400">
                체크 시 프로젝트 종료 기간 없음
              </p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-stone-700">프로젝트 구분</p>
            <div className="mt-2 flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="projectType"
                  checked={projectType === "personal"}
                  onChange={() => {
                    setProjectType("personal");
                    setTeams([]);
                  }}
                  className="h-4 w-4 border-stone-300 text-stone-700 focus:ring-stone-400"
                />
                <span className="text-sm text-stone-700">개인</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="projectType"
                  checked={projectType === "team"}
                  onChange={() => setProjectType("team")}
                  className="h-4 w-4 border-stone-300 text-stone-700 focus:ring-stone-400"
                />
                <span className="text-sm text-stone-700">팀</span>
              </label>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-stone-700">프로젝트 공개 여부</p>
            <div className="mt-2 flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="isPublic"
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                  className="h-4 w-4 border-stone-300 text-stone-700 focus:ring-stone-400"
                />
                <span className="text-sm text-stone-700">공개</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="isPublic"
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                  className="h-4 w-4 border-stone-300 text-stone-700 focus:ring-stone-400"
                />
                <span className="text-sm text-stone-700">비공개</span>
              </label>
            </div>
          </div>

          

          {projectType === "team" && (
          <div>
            <p className="text-sm font-medium text-stone-700">
              팀 <span className="text-stone-400 font-normal"></span>
            </p>
            <p className="mt-0.5 text-xs text-stone-400">
              추가 버튼으로 팀을 선택하세요.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {teams.map((t, i) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50/80 py-1.5 pl-1.5 pr-2"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-medium text-stone-600">
                    팀
                  </span>
                  <span className="flex flex-col items-start">
                    <span className="text-sm font-medium text-stone-800 leading-tight">
                      {t.name}
                    </span>
                    <span className="text-xs text-stone-500 leading-tight">
                      {t.teamId}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeTeam(i)}
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
              onClick={() => setTeamModalOpen(true)}
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
          )}

          <div>
            <p className="text-sm font-medium text-stone-700">추가 참여자</p>
            <p className="mt-0.5 text-xs text-stone-400">
              추가 버튼으로 사용자를 선택하세요.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {participants.map((p, i) => (
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
                    onClick={() => removeParticipant(i)}
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
              onClick={() => setParticipantModalOpen(true)}
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

          {/* 추가 참여자 모달 */}
          {participantModalOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-stone-900/40"
                aria-hidden
                onClick={() => {
                  setParticipantModalOpen(false);
                  setUserSearchQuery("");
                }}
              />
              <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
                <div className="border-b border-stone-100 px-4 py-3">
                  <h3 className="text-base font-semibold text-stone-800">
                    추가 참여자
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
                      const isAdded = participants.some((p) => p.id === user.id);
                      return (
                        <li key={user.id}>
                          <button
                            type="button"
                            onClick={() => !isAdded && addParticipant(user)}
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
                      setParticipantModalOpen(false);
                      setUserSearchQuery("");
                    }}
                    className="w-full rounded-lg border border-stone-200 bg-white py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 팀 추가 모달 */}
          {teamModalOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-stone-900/40"
                aria-hidden
                onClick={() => {
                  setTeamModalOpen(false);
                  setTeamSearchQuery("");
                }}
              />
              <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
                <div className="border-b border-stone-100 px-4 py-3">
                  <h3 className="text-base font-semibold text-stone-800">
                    팀 추가
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
                      value={teamSearchQuery}
                      onChange={(e) => setTeamSearchQuery(e.target.value)}
                      placeholder="팀 이름 또는 ID로 검색"
                      className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none"
                      autoFocus
                    />
                  </div>
                </div>
                <ul className="max-h-64 overflow-y-auto py-2">
                  {filteredTeams.length === 0 ? (
                    <li className="px-4 py-6 text-center text-sm text-stone-500">
                      검색 결과가 없습니다.
                    </li>
                  ) : (
                    filteredTeams.map((team) => {
                      const isAdded = teams.some((t) => t.id === team.id);
                      return (
                        <li key={team.id}>
                          <button
                            type="button"
                            onClick={() => !isAdded && addTeam(team)}
                            disabled={isAdded}
                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              isAdded
                                ? "cursor-default opacity-50"
                                : "hover:bg-stone-50"
                            }`}
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-medium text-stone-600">
                              팀
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-stone-800">
                                {team.name}
                              </p>
                              <p className="text-xs text-stone-500">
                                {team.teamId}
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
                      setTeamModalOpen(false);
                      setTeamSearchQuery("");
                    }}
                    className="w-full rounded-lg border border-stone-200 bg-white py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
            <Link
              href="/projects"
              className="inline-flex justify-center rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              취소
            </Link>
            <button
              type="submit"
              className="inline-flex justify-center rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
            >
              프로젝트 생성
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
