"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { MarkdownContent } from "@/components/MarkdownContent";
import { getProject, type Project, type ProjectUser } from "@/lib/projects";

type ProjectTab = "overview" | "list" | "board" | "calendar" | "wiki" | "settings";

const TABS: { id: ProjectTab; label: string }[] = [
    { id: "overview", label: "개요" },
    { id: "list", label: "업무" },
    { id: "board", label: "보드" },
    { id: "calendar", label: "캘린더" },
    { id: "wiki", label: "위키" },
    { id: "settings", label: "설정" },
];

/** 위키 탭 데모 — 추후 DB 필드로 교체 */
const DEMO_WIKI_MARKDOWN = `## 가이드라인 (데모)

- 회의록
- 마크다운 문서
- 프로젝트 노트

**굵게**, *기울임*, \`코드\`, [예시 링크](https://example.com)

| 항목 | 담당 |
| --- | --- |
| API | 백엔드 |
| UI | 프론트 |
`;

// 데모용 최근 업무 (추후 실제 업무 API 연동)
type TaskStatus = "대기" | "진행중" | "검토" | "완료";
type MockTask = {
    id: string;
    title: string;
    status: TaskStatus;
    assignee?: string;
    dueDate?: string;
};
const MOCK_RECENT_TASKS: MockTask[] = [
    {
        id: "1",
        title: "기획서 초안 작성",
        status: "완료",
        assignee: "김철수",
        dueDate: "2025-03-15",
    },
    {
        id: "2",
        title: "API 스펙 정의",
        status: "진행중",
        assignee: "이영희",
        dueDate: "2025-03-22",
    },
    {
        id: "3",
        title: "디자인 시안 검토",
        status: "검토",
        assignee: "박민수",
        dueDate: "2025-03-20",
    },
    {
        id: "4",
        title: "DB 스키마 설계",
        status: "진행중",
        assignee: "정수진",
        dueDate: "2025-03-25",
    },
    { id: "5", title: "개발 환경 셋업", status: "대기", assignee: "—", dueDate: "2025-03-28" },
];

/** 진행중인 업무 데모 (5개) */
const MOCK_IN_PROGRESS_TASKS: MockTask[] = [
    {
        id: "2",
        title: "API 스펙 정의",
        status: "진행중",
        assignee: "이영희",
        dueDate: "2025-03-22",
    },
    {
        id: "4",
        title: "DB 스키마 설계",
        status: "진행중",
        assignee: "정수진",
        dueDate: "2025-03-25",
    },
    {
        id: "6",
        title: "프론트엔드 컴포넌트 개발",
        status: "진행중",
        assignee: "김철수",
        dueDate: "2025-03-28",
    },
    {
        id: "7",
        title: "백엔드 API 구현",
        status: "진행중",
        assignee: "박민수",
        dueDate: "2025-03-30",
    },
    {
        id: "8",
        title: "테스트 케이스 작성",
        status: "진행중",
        assignee: "이영희",
        dueDate: "2025-04-02",
    },
];

// 차트용: 업무 상태별 개수 (데모 — 실제 데이터 연동 시 계산)
const STATUS_COLORS: Record<TaskStatus, string> = {
    대기: "#78716c",
    진행중: "#3b82f6",
    검토: "#d97706",
    완료: "#16a34a",
};
function getStatusCounts(
    tasks: MockTask[],
): { status: TaskStatus; count: number; color: string }[] {
    const counts: Record<TaskStatus, number> = { 대기: 0, 진행중: 0, 검토: 0, 완료: 0 };
    tasks.forEach((t) => counts[t.status]++);
    return (["대기", "진행중", "검토", "완료"] as TaskStatus[]).map((status) => ({
        status,
        count: counts[status],
        color: STATUS_COLORS[status],
    }));
}

function formatDateKo(dateStr: string): string {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "—";
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${y}년 ${m}월 ${day}일`;
}

function getRemainingDays(endDateStr: string, noEndDate: boolean): number | null {
    if (noEndDate || !endDateStr) return null;
    const end = new Date(endDateStr);
    if (Number.isNaN(end.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diff = Math.ceil((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    return diff;
}

function getProgressPercent(project: Project): number | null {
    if (!project.startDate) return null;
    if (project.noEndDate || !project.endDate) return 100; // 무한일 경우 진행 중(100%)
    const start = new Date(project.startDate).getTime();
    const end = new Date(project.endDate).getTime();
    const now = Date.now();
    if (end <= start) return 100;
    const p = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
    return Math.round(p);
}

/** 무한(종료일 없음)일 때 시작일로부터 경과 일수 */
function getDaysSinceStart(project: Project): number | null {
    if (!project.startDate) return null;
    const start = new Date(project.startDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil((today.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
}

// 참여 인원 아바타 스택 (겹쳐서 표시 + N명)
const AVATAR_STACK_MAX = 4;
const AVATAR_PLACEHOLDER_COLORS = [
    "#78716c",
    "#3b82f6",
    "#059669",
    "#d97706",
    "#7c3aed",
    "#dc2626",
];
function getAvatarColor(id: string): string {
    let n = 0;
    for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
    return AVATAR_PLACEHOLDER_COLORS[n % AVATAR_PLACEHOLDER_COLORS.length];
}
function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (name[0] ?? "?").toUpperCase();
}

function AvatarStack({
    participants,
    size = "md",
}: {
    participants: ProjectUser[];
    size?: "sm" | "md";
}) {
    const displayCount = Math.min(participants.length, AVATAR_STACK_MAX);
    const overflow = participants.length - displayCount;
    const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm";

    return (
        <div
            className="flex items-center -space-x-2"
            aria-label={`참여 인원 ${participants.length}명`}
        >
            {participants.slice(0, displayCount).map((user) => (
                <div
                    key={user.id}
                    className={`${sizeClass} shrink-0 rounded-full ring-2 ring-white bg-stone-200 flex items-center justify-center font-semibold text-white shadow-sm overflow-hidden`}
                    style={{ backgroundColor: getAvatarColor(user.id) }}
                    title={user.name}
                >
                    {getInitials(user.name)}
                </div>
            ))}
            {overflow > 0 && (
                <div
                    className={`${sizeClass} shrink-0 rounded-full ring-2 ring-white bg-stone-600 flex items-center justify-center font-medium text-white shadow-sm`}
                    title={`외 ${overflow}명`}
                >
                    +{overflow}
                </div>
            )}
        </div>
    );
}

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = typeof params.id === "string" ? params.id : "";
    const [activeTab, setActiveTab] = useState<ProjectTab>("overview");
    const [project, setProject] = useState<Project | null>(null);
    const [participantsOpen, setParticipantsOpen] = useState(false);

    useEffect(() => {
        if (!id) return;
        setProject(getProject(id));
    }, [id]);

    if (!id) {
        return (
            <div className="flex min-h-full items-center justify-center p-8">
                <p className="text-stone-500">프로젝트 ID가 없습니다.</p>
            </div>
        );
    }

    const remaining = project ? getRemainingDays(project.endDate, project.noEndDate) : null;
    const progressPercent = project ? getProgressPercent(project) : null;

    return (
        <div className="flex min-h-full w-full flex-col">
            {/* 상단: 뒤로가기 + 프로젝트명 + 참여 인원 아바타 스택 */}
            <div className="border-b border-stone-200 bg-white px-4 py-3 sm:px-5 md:px-6">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.push("/projects")}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
                        aria-label="프로젝트 목록으로 돌아가기"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-lg font-semibold text-stone-800 sm:text-xl">
                            {project?.name ?? "로딩 중…"}
                        </h1>
                        <p className="truncate text-xs text-stone-500 sm:text-sm">
                            {project?.description || "프로젝트 상세"}
                        </p>
                    </div>
                    {project && (
                        <div
                            className="relative shrink-0 pl-3"
                            onMouseEnter={() => setParticipantsOpen(true)}
                            onMouseLeave={() => setParticipantsOpen(false)}
                        >
                            <div className="flex cursor-default items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-stone-100">
                                <span className="whitespace-nowrap text-sm font-medium text-stone-600">
                                    참여 인원 총 {project.participants.length}명
                                </span>
                                {project.participants.length > 0 && (
                                    <AvatarStack participants={project.participants} size="md" />
                                )}
                            </div>
                            {project.participants.length > 0 && participantsOpen && (
                                <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[200px] overflow-hidden rounded-xl border border-stone-200 bg-white py-2 shadow-lg">
                                    <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
                                        참여 인원
                                    </p>
                                    <ul className="max-h-64 overflow-y-auto">
                                        {project.participants.map((user) => (
                                            <li
                                                key={user.id}
                                                className="flex items-center gap-3 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                                            >
                                                <div
                                                    className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                                                    style={{
                                                        backgroundColor: getAvatarColor(user.id),
                                                    }}
                                                >
                                                    {getInitials(user.name)}
                                                </div>
                                                <div className="min-w-0 flex-1 truncate">
                                                    <span className="font-medium text-stone-800">
                                                        {user.name}
                                                    </span>
                                                    {user.userId && (
                                                        <p className="truncate text-xs text-stone-500">
                                                            {user.userId}
                                                        </p>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 서브메뉴: 개요, 업무, 보드, 캘린더, 위키, 설정 */}
            <div className="border-b border-stone-200 bg-white/95">
                <nav
                    className="flex gap-0 overflow-x-auto px-4 sm:px-5 md:px-6"
                    aria-label="프로젝트 서브메뉴"
                >
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors
                sm:px-5
                ${
                    activeTab === tab.id
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

            {/* 탭별 콘텐츠 */}
            <div className="min-h-0 flex-1 p-4 sm:p-5 md:p-6">
                {activeTab === "overview" && (
                    <OverviewTab
                        project={project}
                        remainingDays={remaining}
                        progressPercent={progressPercent}
                        recentTasks={MOCK_RECENT_TASKS}
                        inProgressTasks={MOCK_IN_PROGRESS_TASKS}
                        onSeeMoreTasks={() => setActiveTab("list")}
                    />
                )}

                {activeTab === "list" && (
                    <div className="rounded-xl border border-stone-200 bg-white p-6">
                        <h2 className="text-base font-semibold text-stone-800 sm:text-lg">
                            📋 업무
                        </h2>
                        <p className="mt-1 text-sm text-stone-500">
                            엑셀처럼 한 줄씩 업무를 관리합니다.
                        </p>
                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full min-w-[400px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-stone-200">
                                        <th className="pb-2 pr-4 font-medium text-stone-600">
                                            할 일
                                        </th>
                                        <th className="pb-2 pr-4 font-medium text-stone-600">
                                            상태
                                        </th>
                                        <th className="pb-2 font-medium text-stone-600">담당</th>
                                    </tr>
                                </thead>
                                <tbody className="text-stone-600">
                                    <tr className="border-b border-stone-100">
                                        <td className="py-2 pr-4">데모 행 1</td>
                                        <td className="py-2 pr-4">대기</td>
                                        <td className="py-2">—</td>
                                    </tr>
                                    <tr className="border-b border-stone-100">
                                        <td className="py-2 pr-4">데모 행 2</td>
                                        <td className="py-2 pr-4">진행중</td>
                                        <td className="py-2">—</td>
                                    </tr>
                                    <tr className="border-b border-stone-100">
                                        <td className="py-2 pr-4">데모 행 3</td>
                                        <td className="py-2 pr-4">완료</td>
                                        <td className="py-2">—</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="mt-4 text-xs text-stone-400">
                            (데모) 추후 실제 업무 데이터 연동
                        </p>
                    </div>
                )}

                {activeTab === "board" && (
                    <div className="rounded-xl border border-stone-200 bg-white p-6">
                        <h2 className="text-base font-semibold text-stone-800 sm:text-lg">
                            🧱 보드
                        </h2>
                        <p className="mt-1 text-sm text-stone-500">
                            칸반 스타일로 업무를 관리합니다.
                        </p>
                        <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
                            {["할 일", "진행중", "검토", "완료"].map((col) => (
                                <div
                                    key={col}
                                    className="min-w-[200px] rounded-lg border border-stone-200 bg-stone-50/50 p-3"
                                >
                                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
                                        {col}
                                    </p>
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
                        <h2 className="text-base font-semibold text-stone-800 sm:text-lg">
                            📅 캘린더
                        </h2>
                        <p className="mt-1 text-sm text-stone-500">월별 일정을 확인합니다.</p>
                        <div className="mt-6 rounded-lg border border-stone-200 bg-stone-50/30 p-8 text-center">
                            <p className="text-stone-500">월별 캘린더 뷰 (데모)</p>
                            <p className="mt-2 text-sm text-stone-400">
                                일정/마일스톤이 여기에 표시됩니다.
                            </p>
                        </div>
                        <p className="mt-4 text-xs text-stone-400">(데모) 추후 캘린더 API 연동</p>
                    </div>
                )}

                {activeTab === "wiki" && (
                    <div className="rounded-xl border border-stone-200 bg-white p-6">
                        <h2 className="text-base font-semibold text-stone-800 sm:text-lg">
                            📓 위키
                        </h2>
                        <p className="mt-1 text-sm text-stone-500">
                            가이드라인·회의록을 마크다운으로 작성합니다. (렌더 데모)
                        </p>
                        <div className="mt-6 rounded-lg border border-stone-100 bg-stone-50/50 p-5 sm:p-6">
                            <MarkdownContent markdown={DEMO_WIKI_MARKDOWN} />
                        </div>
                        <p className="mt-4 text-xs text-stone-400">
                            (데모) 저장·에디터는 추후 API·필드 연동
                        </p>
                    </div>
                )}

                {activeTab === "settings" && (
                    <div className="rounded-xl border border-stone-200 bg-white p-6">
                        <h2 className="text-base font-semibold text-stone-800 sm:text-lg">
                            ⚙️ 설정
                        </h2>
                        <p className="mt-1 text-sm text-stone-500">
                            멤버, 커스텀 필드, 자동화 규칙을 관리합니다.
                        </p>
                        <ul className="mt-6 space-y-3 text-sm text-stone-600">
                            <li className="flex items-center gap-2 rounded-lg border border-stone-100 bg-stone-50/50 px-4 py-3">
                                멤버 초대 (데모)
                            </li>
                            <li className="flex items-center gap-2 rounded-lg border border-stone-100 bg-stone-50/50 px-4 py-3">
                                커스텀 필드 (데모)
                            </li>
                            <li className="flex items-center gap-2 rounded-lg border border-stone-100 bg-stone-50/50 px-4 py-3">
                                자동화 규칙 (데모)
                            </li>
                        </ul>
                        <p className="mt-4 text-xs text-stone-400">(데모) 추후 설정 폼 연동</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ——— SVG 도넛 차트 (완료율) ———
function DonutChart({
    percent,
    size = 120,
    strokeWidth = 12,
    color = "#22c55e",
}: {
    percent: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
}) {
    const r = (size - strokeWidth) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference - (percent / 100) * circumference;
    return (
        <svg width={size} height={size} className="rotate-[-90deg]">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f5f5f4" strokeWidth={strokeWidth} />
            <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-1000 ease-out"
            />
        </svg>
    );
}

// ——— 개요 탭 ———
function OverviewTab({
    project,
    remainingDays,
    progressPercent,
    recentTasks,
    inProgressTasks,
    onSeeMoreTasks,
}: {
    project: Project | null;
    remainingDays: number | null;
    progressPercent: number | null;
    recentTasks: MockTask[];
    inProgressTasks: MockTask[];
    onSeeMoreTasks?: () => void;
}) {
    if (!project) {
        return (
            <div className="flex min-h-[200px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-600" />
            </div>
        );
    }

    const statusCounts = getStatusCounts(recentTasks);
    const totalTasks = recentTasks.length;
    const completedCount = recentTasks.filter((t) => t.status === "완료").length;
    const completionPercent = totalTasks ? Math.round((completedCount / totalTasks) * 100) : 0;
    const maxCount = Math.max(1, ...statusCounts.map((s) => s.count));

    const daysSinceStart = getDaysSinceStart(project);

    return (
        <div className="space-y-6">
            {/* 상단: 일정 카드 — 왼쪽 날짜 | 가운데 남은 기간 | 오른쪽 진행 링 */}
            <section
                className="overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 transition-shadow hover:shadow-md"
                style={{ animation: "overview-fade-in 0.4s ease-out" }}
            >
                <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
                    {/* 왼쪽: 시작일, 종료일 */}
                    <div className="flex flex-col gap-5">
                        <div>
                            <p className="text-xs font-medium text-stone-400">시작일</p>
                            <p className="mt-1 text-xl font-bold text-stone-900 sm:text-2xl">
                                {formatDateKo(project.startDate)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-stone-400">종료일</p>
                            <p className="mt-1 text-xl font-bold text-stone-900 sm:text-2xl">
                                {project.noEndDate ? "무한.." : formatDateKo(project.endDate)}
                            </p>
                        </div>
                    </div>

                    {/* 가운데: N일 남았어요 / 지났어요 (강조) */}
                    <div className="flex flex-1 flex-col items-center justify-center sm:px-6">
                        <p className="flex items-baseline gap-2">
                            {remainingDays === null ? (
                                daysSinceStart !== null ? (
                                    <>
                                        <span className="text-4xl font-bold text-stone-900 sm:text-5xl">
                                            {daysSinceStart}일
                                        </span>
                                        <span className="text-xl font-bold text-stone-900 sm:text-2xl">
                                            지났어요!
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-xl font-medium text-stone-500">
                                        종료일 없음
                                    </span>
                                )
                            ) : remainingDays > 0 ? (
                                <>
                                    <span className="text-4xl font-bold text-stone-900 sm:text-5xl">
                                        {remainingDays}일
                                    </span>
                                    <span className="text-xl font-bold text-stone-900 sm:text-2xl">
                                        남았어요!!
                                    </span>
                                </>
                            ) : remainingDays === 0 ? (
                                <>
                                    <span className="text-4xl font-bold text-amber-600 sm:text-5xl">
                                        0일
                                    </span>
                                    <span className="text-xl font-bold text-stone-900 sm:text-2xl">
                                        오늘 마감이에요!
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="text-3xl font-bold text-amber-600 sm:text-4xl">
                                        마감일 지남
                                    </span>
                                </>
                            )}
                        </p>
                    </div>

                    {/* 오른쪽: 일정 진행률 도넛 */}
                    {progressPercent !== null && (
                        <div className="flex flex-col items-center">
                            <div className="relative">
                                <DonutChart
                                    percent={progressPercent}
                                    size={120}
                                    strokeWidth={12}
                                    color="#78716c"
                                />
                                <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-stone-900">
                                    {project.noEndDate ? "—" : `${progressPercent}%`}
                                </span>
                            </div>
                            <p className="mt-2 text-xs font-medium text-stone-400">일정 진행률</p>
                        </div>
                    )}
                </div>
            </section>

            {/* 그래프 3열: 완료율 + 업무 상태 분포 + 진행중인 업무 */}
            <section className="grid gap-6 lg:grid-cols-3">
                {/* 완료율 도넛 */}
                <div
                    className="rounded-2xl border border-stone-200 bg-white p-5 transition-all hover:shadow-md sm:p-6"
                    style={{ animation: "overview-fade-in 0.4s ease-out 0.05s both" }}
                >
                    <h3 className="text-sm font-semibold text-stone-600">업무 완료율</h3>
                    <p className="mt-0.5 text-xs text-stone-400">완료된 업무 비율이에요</p>
                    <div className="mt-6 flex flex-wrap items-center gap-8">
                        <div className="flex flex-col items-center">
                            <div className="relative">
                                <DonutChart
                                    percent={completionPercent}
                                    size={140}
                                    strokeWidth={14}
                                    color="#22c55e"
                                />
                                <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold tabular-nums text-stone-800">
                                    {completionPercent}%
                                </span>
                            </div>
                        </div>
                        <div className="flex-1 space-y-2 min-w-[140px]">
                            <p className="text-sm text-stone-600">
                                <span className="font-semibold text-green-600">
                                    {completedCount}개
                                </span>{" "}
                                완료 / 전체 {totalTasks}개
                            </p>
                            <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                                <div
                                    className="h-full rounded-full bg-green-500 transition-all duration-700 ease-out"
                                    style={{ width: `${completionPercent}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 업무 상태별 막대 그래프 */}
                <div
                    className="rounded-2xl border border-stone-200 bg-white p-5 transition-all hover:shadow-md sm:p-6"
                    style={{ animation: "overview-fade-in 0.4s ease-out 0.1s both" }}
                >
                    <h3 className="text-sm font-semibold text-stone-600">업무 상태 분포</h3>
                    <p className="mt-0.5 text-xs text-stone-400">상태별 업무 개수예요</p>
                    <div className="mt-6 space-y-4">
                        {statusCounts.map(({ status, count, color }) => (
                            <div key={status} className="flex items-center gap-3">
                                <span className="w-16 shrink-0 text-sm font-medium text-stone-600">
                                    {status}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="h-8 overflow-hidden rounded-lg bg-stone-100">
                                        <div
                                            className="h-full rounded-lg transition-all duration-700 ease-out"
                                            style={{
                                                width: `${maxCount ? (count / maxCount) * 100 : 0}%`,
                                                backgroundColor: color,
                                            }}
                                        />
                                    </div>
                                </div>
                                <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-stone-700">
                                    {count}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 진행중인 업무 */}
                <div
                    className="rounded-2xl border border-stone-200 bg-white p-5 transition-all hover:shadow-md sm:p-6"
                    style={{ animation: "overview-fade-in 0.4s ease-out 0.15s both" }}
                >
                    <h3 className="text-sm font-semibold text-stone-600">진행중인 업무</h3>
                    <p className="mt-0.5 text-xs text-stone-400">지금 진행 중인 업무예요</p>
                    <ul className="mt-4 space-y-2">
                        {inProgressTasks.slice(0, 5).map((task) => (
                            <li
                                key={task.id}
                                className="flex items-center justify-between gap-2 rounded-lg border border-stone-100 bg-stone-50/50 px-3 py-2.5 transition-colors hover:bg-stone-100/80"
                            >
                                <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">
                                    {task.title}
                                </span>
                                <span className="shrink-0 text-xs text-stone-500">
                                    {task.assignee}
                                </span>
                            </li>
                        ))}
                    </ul>
                    {onSeeMoreTasks && (
                        <button
                            type="button"
                            onClick={onSeeMoreTasks}
                            className="mt-3 w-full rounded-lg border border-stone-200 bg-white py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-800"
                        >
                            더보기
                        </button>
                    )}
                </div>
            </section>

            {/* 최근 업무 리스트 */}
            <section
                className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"
                style={{ animation: "overview-fade-in 0.4s ease-out 0.3s both" }}
            >
                <h3 className="text-sm font-semibold text-stone-600">최근 업무</h3>
                <p className="mt-0.5 text-xs text-stone-400">방금 손댄 업무 5건이에요</p>
                <ul className="mt-4 space-y-2">
                    {recentTasks.map((task, i) => (
                        <li
                            key={task.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-stone-100 bg-stone-50/70 px-4 py-3 transition-all hover:bg-stone-100/80 hover:border-stone-200"
                            style={{
                                animation: `overview-fade-in 0.35s ease-out ${0.35 + i * 0.05}s both`,
                            }}
                        >
                            <span className="min-w-0 flex-1 truncate font-medium text-stone-800">
                                {task.title}
                            </span>
                            <span
                                className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium text-white shadow-sm"
                                style={{ backgroundColor: STATUS_COLORS[task.status] }}
                            >
                                {task.status}
                            </span>
                            <span className="hidden shrink-0 text-sm text-stone-500 sm:inline">
                                {task.assignee}
                            </span>
                        </li>
                    ))}
                </ul>
                {onSeeMoreTasks && (
                    <button
                        type="button"
                        onClick={onSeeMoreTasks}
                        className="mt-4 w-full rounded-lg border border-stone-200 bg-white py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-800"
                    >
                        더보기
                    </button>
                )}
            </section>
        </div>
    );
}
