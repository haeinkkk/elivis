"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

type ProjectTab = "list" | "board" | "calendar" | "timeline" | "wiki" | "settings";

const TABS: { id: ProjectTab; label: string; description: string }[] = [
  { id: "list", label: "리스트", description: "엑셀처럼 한 줄씩 업무를 관리합니다. (총무, 회계, 단순 할 일 관리용)" },
  { id: "board", label: "보드", description: "포스트잇을 붙이는 칸반 스타일입니다. (디자인, 마케팅, 개발 프로세스용)" },
  { id: "calendar", label: "캘린더", description: "월별 일정을 확인합니다. (콘텐츠 발행, 이벤트 관리용)" },
  { id: "timeline", label: "타임라인", description: "업무 간의 선후 관계를 화살표로 연결하는 간트 차트입니다. (대규모 기획, 생산 공정용)" },
  { id: "wiki", label: "위키", description: "프로젝트 가이드라인이나 회의록을 마크다운으로 자유롭게 작성하는 문서 공간입니다." },
  { id: "settings", label: "설정", description: "프로젝트 멤버 초대, 커스텀 필드 설정, 자동화(Rule) 규칙 관리." },
];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const [activeTab, setActiveTab] = useState<ProjectTab>("list");

  return (
    <div className="flex min-h-full w-full flex-col">
      {/* 상단: 뒤로가기 + 프로젝트명 */}
      <div className="border-b border-stone-200 bg-white px-4 py-3 sm:px-5 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/mywork")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
            aria-label="내작업으로 돌아가기"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-semibold text-stone-800 sm:text-xl">
              프로젝트 {id || "이름"}
            </h1>
            <p className="text-xs text-stone-500 sm:text-sm">데모 · 데이터 시각화 전환</p>
          </div>
        </div>
      </div>

      {/* Project Tabs */}
      <div className="border-b border-stone-200 bg-white/95">
        <nav className="flex gap-0 overflow-x-auto px-4 sm:px-5 md:px-6" aria-label="프로젝트 뷰 전환">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`
                shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors
                sm:px-5
                ${activeTab === tab.id
                  ? "border-stone-800 text-stone-800"
                  : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭별 데모 콘텐츠 */}
      <div className="min-h-0 flex-1 p-4 sm:p-5 md:p-6">
        {activeTab === "list" && (
          <div className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="text-base font-semibold text-stone-800 sm:text-lg">📋 리스트</h2>
            <p className="mt-1 text-sm text-stone-500">{TABS.find((t) => t.id === "list")?.description}</p>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[400px] text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="pb-2 pr-4 font-medium text-stone-600">할 일</th>
                    <th className="pb-2 pr-4 font-medium text-stone-600">상태</th>
                    <th className="pb-2 font-medium text-stone-600">담당</th>
                  </tr>
                </thead>
                <tbody className="text-stone-600">
                  <tr className="border-b border-stone-100"><td className="py-2 pr-4">데모 행 1</td><td className="py-2 pr-4">대기</td><td className="py-2">—</td></tr>
                  <tr className="border-b border-stone-100"><td className="py-2 pr-4">데모 행 2</td><td className="py-2 pr-4">진행중</td><td className="py-2">—</td></tr>
                  <tr className="border-b border-stone-100"><td className="py-2 pr-4">데모 행 3</td><td className="py-2 pr-4">완료</td><td className="py-2">—</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-stone-400">(데모) 추후 실제 리스트 데이터 연동</p>
          </div>
        )}

        {activeTab === "board" && (
          <div className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="text-base font-semibold text-stone-800 sm:text-lg">🧱 보드</h2>
            <p className="mt-1 text-sm text-stone-500">{TABS.find((t) => t.id === "board")?.description}</p>
            <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
              {["할 일", "진행중", "검토", "완료"].map((col) => (
                <div key={col} className="min-w-[200px] rounded-lg border border-stone-200 bg-stone-50/50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-stone-500">{col}</p>
                  <div className="mt-2 rounded-lg border border-dashed border-stone-200 bg-white p-4 text-center text-sm text-stone-400">
                    카드 영역
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-stone-400">(데모) 추후 칸반 카드 연동</p>
          </div>
        )}

        {activeTab === "calendar" && (
          <div className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="text-base font-semibold text-stone-800 sm:text-lg">📅 캘린더</h2>
            <p className="mt-1 text-sm text-stone-500">{TABS.find((t) => t.id === "calendar")?.description}</p>
            <div className="mt-6 rounded-lg border border-stone-200 bg-stone-50/30 p-8 text-center">
              <p className="text-stone-500">월별 캘린더 뷰 (데모)</p>
              <p className="mt-2 text-sm text-stone-400">일정/마일스톤이 여기에 표시됩니다.</p>
            </div>
            <p className="mt-4 text-xs text-stone-400">(데모) 추후 캘린더 API 연동</p>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="text-base font-semibold text-stone-800 sm:text-lg">⏳ 타임라인</h2>
            <p className="mt-1 text-sm text-stone-500">{TABS.find((t) => t.id === "timeline")?.description}</p>
            <div className="mt-6 rounded-lg border border-stone-200 bg-stone-50/30 p-8 text-center">
              <p className="text-stone-500">간트 차트 / 타임라인 뷰 (데모)</p>
              <p className="mt-2 text-sm text-stone-400">업무 선후 관계와 기간이 화살표로 연결됩니다.</p>
            </div>
            <p className="mt-4 text-xs text-stone-400">(데모) 추후 타임라인 컴포넌트 연동</p>
          </div>
        )}

        {activeTab === "wiki" && (
          <div className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="text-base font-semibold text-stone-800 sm:text-lg">📓 위키</h2>
            <p className="mt-1 text-sm text-stone-500">{TABS.find((t) => t.id === "wiki")?.description}</p>
            <div className="mt-6 rounded-lg border border-stone-200 bg-stone-50/30 p-6 font-mono text-sm text-stone-600">
              <pre># 가이드라인 (데모)\n\n- 회의록\n- 마크다운 문서\n- 프로젝트 노트</pre>
            </div>
            <p className="mt-4 text-xs text-stone-400">(데모) 추후 마크다운 에디터 연동</p>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="text-base font-semibold text-stone-800 sm:text-lg">⚙️ 설정</h2>
            <p className="mt-1 text-sm text-stone-500">{TABS.find((t) => t.id === "settings")?.description}</p>
            <ul className="mt-6 space-y-3 text-sm text-stone-600">
              <li className="flex items-center gap-2 rounded-lg border border-stone-100 bg-stone-50/50 px-4 py-3">멤버 초대 (데모)</li>
              <li className="flex items-center gap-2 rounded-lg border border-stone-100 bg-stone-50/50 px-4 py-3">커스텀 필드 (데모)</li>
              <li className="flex items-center gap-2 rounded-lg border border-stone-100 bg-stone-50/50 px-4 py-3">자동화 규칙 (데모)</li>
            </ul>
            <p className="mt-4 text-xs text-stone-400">(데모) 추후 설정 폼 연동</p>
          </div>
        )}
      </div>
    </div>
  );
}
