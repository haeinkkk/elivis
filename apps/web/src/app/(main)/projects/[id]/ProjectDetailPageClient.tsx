"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { MarkdownContent } from "@/components/MarkdownContent";
import { UserAvatar } from "@/components/UserAvatar";
import { ProjectFavoriteButton } from "@/components/ProjectFavoriteButton";
import { getProject, type Project, type ProjectUser, type ProjectViewerRole } from "@/lib/projects";

import {
    ProjectSettingsProjectTab,
    ProjectSettingsSecurityTab,
} from "./ProjectSettingsPanels";
import { ProjectTasksTab, type ApiProjectTasksItem } from "./ProjectTasksTab";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – dynamic segment folder name
import ProjectCalendarTab from "./ProjectCalendarTab";

/** 서버에서 API로 받은 데이터는 props로 전달(팀 상세와 동일). Server Action 직렬화 없음 */
export type ProjectDetailLoadMode = "server_ok" | "server_miss" | "client_only";

type ProjectTab = "overview" | "list" | "calendar" | "wiki" | "settings";

const TABS: { id: ProjectTab; label: string }[] = [
    { id: "overview", label: "대시보드" },
    { id: "list", label: "업무" },
    { id: "calendar", label: "캘린더" },
    { id: "wiki", label: "위키" },
    { id: "settings", label: "설정" },
];

/** 팀 상세(Settings)와 동일: 모바일 가로 스크롤 / lg 세로 사이드바 */
type ProjectSettingsSubTab = "project" | "security";

const PROJECT_SETTINGS_SUB_TABS: { id: ProjectSettingsSubTab; label: string; icon: string }[] = [
    {
        id: "project",
        label: "프로젝트",
        icon: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z",
    },
    {
        id: "security",
        label: "보안",
        icon: "M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z",
    },
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

/** API color 키 → CSS 색상 */
const STATUS_COLOR_MAP: Record<string, string> = {
    gray:   "#78716c",
    red:    "#ef4444",
    orange: "#f97316",
    yellow: "#eab308",
    green:  "#22c55e",
    blue:   "#3b82f6",
    purple: "#a855f7",
    pink:   "#ec4899",
};

function statusCssColor(color: string): string {
    return STATUS_COLOR_MAP[color] ?? "#78716c";
}

/** 완료 상태 판별 (color=green 또는 이름에 "완료"/"done"/"complete" 포함) */
function isCompletedStatus(s: { color: string; name: string }): boolean {
    return (
        s.color === "green" ||
        s.name.includes("완료") ||
        s.name.toLowerCase().includes("done") ||
        s.name.toLowerCase().includes("complete")
    );
}

/** 진행중 상태 판별 */
function isInProgressStatus(s: { color: string; name: string }): boolean {
    return (
        s.color === "blue" ||
        s.name.includes("진행") ||
        s.name.toLowerCase().includes("progress")
    );
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

function projectRoleLabelKo(role: ProjectViewerRole | undefined): string {
    switch (role) {
        case "LEADER":
            return "프로젝트 리더";
        case "DEPUTY_LEADER":
            return "부리더";
        default:
            return "멤버";
    }
}

// 멤버 아바타 스택 (겹쳐서 표시 + N명)
const AVATAR_STACK_MAX = 4;

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
            aria-label={`멤버 ${participants.length}명`}
        >
            {participants.slice(0, displayCount).map((user) => (
                <UserAvatar
                    key={user.id}
                    userId={user.id}
                    label={user.name}
                    avatarUrl={user.avatarUrl}
                    sizeClass={sizeClass}
                />
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

export function ProjectDetailPageClient({
    initialProject,
    loadMode,
    isFavorite = false,
    projectTasksData = [],
    currentUserId = "",
}: {
    initialProject: Project | null;
    loadMode: ProjectDetailLoadMode;
    isFavorite?: boolean;
    projectTasksData?: ApiProjectTasksItem[];
    currentUserId?: string;
}) {
    const params = useParams();
    const router = useRouter();
    const id = typeof params.id === "string" ? params.id : "";
    const [activeTab, setActiveTab] = useState<ProjectTab>("overview");
    const [settingsSubTab, setSettingsSubTab] = useState<ProjectSettingsSubTab>("project");
    const [project, setProject] = useState<Project | null>(initialProject);
    const [loadState, setLoadState] = useState<"loading" | "done">(() =>
        loadMode === "server_ok" ? "done" : "loading",
    );
    const [membersModalOpen, setMembersModalOpen] = useState(false);

    useEffect(() => {
        setProject(initialProject);
        if (loadMode === "server_ok" && initialProject) {
            setLoadState("done");
        }
    }, [initialProject, loadMode]);

    useEffect(() => {
        if (loadMode === "server_ok") return;
        if (!id) return;
        setLoadState("loading");
        const local = getProject(id);
        setProject(local);
        setLoadState("done");
    }, [id, loadMode]);

    if (!id) {
        return (
            <div className="flex min-h-full items-center justify-center p-8">
                <p className="text-stone-500">프로젝트 ID가 없습니다.</p>
            </div>
        );
    }

    if (loadState === "done" && !project) {
        return (
            <div className="flex min-h-full items-center justify-center p-8">
                <p className="text-stone-500">프로젝트를 찾을 수 없습니다.</p>
            </div>
        );
    }


    return (
        <div className="flex min-h-full w-full flex-col">
            {/* 상단: 뒤로가기 + 프로젝트명 + 멤버 아바타 스택 */}
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
                        <div className="flex min-w-0 items-center gap-2">
                            <h1 className="truncate text-lg font-semibold text-stone-800 sm:text-xl">
                                {project?.name ?? "로딩 중…"}
                            </h1>
                            {project && (
                                <ProjectFavoriteButton
                                    projectId={project.id}
                                    initialIsFavorite={isFavorite}
                                    size="sm"
                                />
                            )}
                        </div>
                        <p className="truncate text-xs text-stone-500 sm:text-sm">
                            {project?.description || "프로젝트 상세"}
                        </p>
                    </div>
                    {project && (
                        <>
                            <button
                                type="button"
                                onClick={() => setMembersModalOpen(true)}
                                className="relative shrink-0 flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 pl-3 text-left transition-colors hover:bg-stone-100"
                                aria-haspopup="dialog"
                                aria-expanded={membersModalOpen}
                            >
                                <span className="whitespace-nowrap text-sm font-medium text-stone-600">
                                    멤버 총 {project.participants.length}명
                                </span>
                                {project.participants.length > 0 && (
                                    <AvatarStack participants={project.participants} size="md" />
                                )}
                            </button>

                            {membersModalOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40 bg-stone-900/40"
                                        aria-hidden
                                        onClick={() => setMembersModalOpen(false)}
                                    />
                                    <div
                                        className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(80vh,520px)] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-stone-200 bg-white shadow-xl"
                                        role="dialog"
                                        aria-modal
                                        aria-labelledby="project-members-modal-title"
                                    >
                                        <div className="border-b border-stone-100 px-5 py-4">
                                            <h2
                                                id="project-members-modal-title"
                                                className="text-base font-semibold text-stone-800"
                                            >
                                                멤버
                                            </h2>
                                            <p className="mt-0.5 text-sm text-stone-500">
                                                총 {project.participants.length}명
                                            </p>
                                        </div>
                                        <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                                            {project.participants.map((user) => (
                                                <li
                                                    key={user.id}
                                                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-stone-700"
                                                >
                                                    <UserAvatar
                                                        userId={user.id}
                                                        label={user.name}
                                                        avatarUrl={user.avatarUrl}
                                                        sizeClass="h-10 w-10 text-sm"
                                                        ringClass="ring-0"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <span className="font-medium text-stone-800">
                                                            {user.name}
                                                        </span>
                                                        <p className="truncate text-xs text-stone-500">
                                                            {user.userId}
                                                        </p>
                                                    </div>
                                                    <span className="shrink-0 text-xs text-stone-500">
                                                        {projectRoleLabelKo(user.role)}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="border-t border-stone-100 px-5 py-3">
                                            <button
                                                type="button"
                                                onClick={() => setMembersModalOpen(false)}
                                                className="w-full rounded-lg border border-stone-200 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                                            >
                                                닫기
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* 서브메뉴: 대시보드, 업무, 요청, 캘린더, 위키, 설정 */}
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
            <div className={`min-h-0 flex-1 ${activeTab === "list" || activeTab === "calendar" ? "" : "p-4 sm:p-5 md:p-6"}`}>
                {activeTab === "overview" && (
                    <OverviewTab
                        project={project}
                        projectTasksData={projectTasksData}
                        onSeeMoreTasks={() => setActiveTab("list")}
                    />
                )}

                {activeTab === "list" && (
                    <ProjectTasksTab
                        participants={project?.participants ?? []}
                        projectTasksData={projectTasksData}
                        currentUserId={currentUserId}
                        projectId={id}
                    />
                )}

                {activeTab === "calendar" && (
                    <ProjectCalendarTab projectTasksData={projectTasksData} />
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
                    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
                        <nav
                            className="flex shrink-0 gap-1 overflow-x-auto pb-1 lg:w-44 lg:flex-col lg:overflow-x-visible lg:pb-0"
                            aria-label="프로젝트 설정 하위 탭"
                        >
                            {PROJECT_SETTINGS_SUB_TABS.map(({ id, label, icon }) => {
                                const isActive = settingsSubTab === id;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setSettingsSubTab(id)}
                                        className={[
                                            "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                            "whitespace-nowrap lg:w-full",
                                            isActive
                                                ? "bg-stone-200 text-stone-900"
                                                : "text-stone-500 hover:bg-stone-50 hover:text-stone-700",
                                        ].join(" ")}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={1.5}
                                            stroke="currentColor"
                                            className="h-4 w-4 shrink-0"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d={icon}
                                            />
                                        </svg>
                                        {label}
                                    </button>
                                );
                            })}
                        </nav>

                        <div className="min-w-0 flex-1 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm sm:p-7">
                            {!project ? (
                                <p className="text-sm text-stone-500">불러오는 중…</p>
                            ) : settingsSubTab === "project" ? (
                                <ProjectSettingsProjectTab
                                    project={project}
                                    onUpdated={setProject}
                                />
                            ) : (
                                <ProjectSettingsSecurityTab project={project} />
                            )}
                        </div>
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
    projectTasksData,
    onSeeMoreTasks,
}: {
    project: Project | null;
    projectTasksData: ApiProjectTasksItem[];
    onSeeMoreTasks?: () => void;
}) {
    if (!project) {
        return (
            <div className="flex min-h-[200px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-600" />
            </div>
        );
    }

    // ── 실데이터 집계 ──────────────────────────────────────────────
    const allTasks = projectTasksData.flatMap((item) => item.tasks);

    // 워크스페이스별 상태/우선순위를 id 기준 중복 제거
    const statusById = new Map(
        projectTasksData.flatMap((item) => item.statuses).map((s) => [s.id, s]),
    );
    const uniqueStatuses = [...statusById.values()].sort((a, b) => a.order - b.order);

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => {
        const s = statusById.get(t.statusId);
        return s ? isCompletedStatus(s) : false;
    });
    const inProgressTasks = allTasks.filter((t) => {
        const s = statusById.get(t.statusId);
        return s ? isInProgressStatus(s) : false;
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueTasks = allTasks.filter((t) => {
        const s = statusById.get(t.statusId);
        const done = s ? isCompletedStatus(s) : false;
        if (done || !t.dueDate) return false;
        return new Date(t.dueDate) < today;
    });

    // 상태별 업무 수 (막대 그래프용)
    const statusCounts = uniqueStatuses.map((s) => ({
        id: s.id,
        name: s.name,
        color: statusCssColor(s.color),
        count: allTasks.filter((t) => t.statusId === s.id).length,
    }));
    const maxCount = Math.max(1, ...statusCounts.map((s) => s.count));

    // 완료율
    const completionPercent = totalTasks ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

    // 최근 업무 (updatedAt 내림차순)
    const recentTasks = [...allTasks]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 8);

    // ── 일정 계산 ──────────────────────────────────────────────────
    const remainingDays = getRemainingDays(project.endDate, project.noEndDate);
    const progressPercent = getProgressPercent(project);
    const daysSinceStart = getDaysSinceStart(project);

    const dDayLabel =
        remainingDays === null
            ? daysSinceStart !== null
                ? `D+${daysSinceStart}`
                : "—"
            : remainingDays > 0
              ? `D-${remainingDays}`
              : remainingDays === 0
                ? "D-Day"
                : `D+${Math.abs(remainingDays)}`;

    const dDayColor =
        remainingDays === null
            ? "bg-stone-100 text-stone-600"
            : remainingDays > 14
              ? "bg-blue-50 text-blue-700"
              : remainingDays > 0
                ? "bg-amber-50 text-amber-700"
                : "bg-red-50 text-red-600";

    const dDayTextColor =
        remainingDays === null
            ? "text-stone-800"
            : remainingDays > 14
              ? "text-blue-600"
              : remainingDays > 0
                ? "text-amber-600"
                : "text-red-600";

    return (
        <div className="space-y-5">
            {/* ── 1. 일정 히어로 카드 ───────────────────────────────── */}
            <section
                className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
                style={{ animation: "overview-fade-in 0.4s ease-out" }}
            >
                {/* 상단 헤더 바 */}
                <div className="flex items-center justify-between border-b border-stone-100 px-6 py-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                        프로젝트 기간
                    </span>
                    <span className={`rounded-full px-3 py-0.5 text-xs font-bold tracking-wide ${dDayColor}`}>
                        {dDayLabel}
                    </span>
                </div>

                <div className="px-6 py-5 sm:px-8 sm:py-6">
                    {/* 날짜 행 */}
                    <div className="flex items-end justify-between gap-4">
                        {/* 시작일 */}
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                                시작일
                            </p>
                            <p className="mt-1 text-lg font-bold text-stone-800 sm:text-xl">
                                {formatDateKo(project.startDate)}
                            </p>
                        </div>

                        {/* 가운데: 강조 D-Day 수치 */}
                        <div className="flex flex-col items-center gap-1">
                            {remainingDays === null ? (
                                daysSinceStart !== null ? (
                                    <>
                                        <span className={`text-5xl font-black tabular-nums sm:text-6xl ${dDayTextColor}`}>
                                            {daysSinceStart}
                                        </span>
                                        <span className="text-sm font-semibold text-stone-500">
                                            일 진행 중
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-xl font-semibold text-stone-400">
                                        종료일 없음
                                    </span>
                                )
                            ) : remainingDays > 0 ? (
                                <>
                                    <span className={`text-5xl font-black tabular-nums sm:text-6xl ${dDayTextColor}`}>
                                        {remainingDays}
                                    </span>
                                    <span className="text-sm font-semibold text-stone-500">
                                        일 남았어요
                                    </span>
                                </>
                            ) : remainingDays === 0 ? (
                                <>
                                    <span className="text-3xl font-black text-red-600 sm:text-4xl">
                                        오늘 마감
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className={`text-4xl font-black tabular-nums sm:text-5xl ${dDayTextColor}`}>
                                        {Math.abs(remainingDays)}
                                    </span>
                                    <span className="text-sm font-semibold text-red-500">
                                        일 초과됐어요
                                    </span>
                                </>
                            )}
                        </div>

                        {/* 종료일 */}
                        <div className="min-w-0 text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                                종료일
                            </p>
                            <p className="mt-1 text-lg font-bold text-stone-800 sm:text-xl">
                                {project.noEndDate ? "∞ 무기한" : formatDateKo(project.endDate)}
                            </p>
                        </div>
                    </div>

                    {/* 타임라인 바 */}
                    {!project.noEndDate && progressPercent !== null && (
                        <div className="mt-5">
                            <div className="relative h-2.5 overflow-hidden rounded-full bg-stone-100">
                                <div
                                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{
                                        width: `${progressPercent}%`,
                                        background:
                                            remainingDays !== null && remainingDays < 0
                                                ? "linear-gradient(90deg, #f87171, #ef4444)"
                                                : remainingDays !== null && remainingDays <= 14
                                                  ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
                                                  : "linear-gradient(90deg, #60a5fa, #3b82f6)",
                                    }}
                                />
                                {/* 오늘 마커 */}
                                <div
                                    className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-stone-600 shadow"
                                    style={{ left: `${Math.min(progressPercent, 99)}%` }}
                                />
                            </div>
                            <div className="mt-1.5 flex justify-between text-[10px] font-medium text-stone-400">
                                <span>시작</span>
                                <span className="font-semibold text-stone-600">
                                    {progressPercent}% 경과
                                </span>
                                <span>종료</span>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ── 2. 통계 카드 4개 ─────────────────────────────────── */}
            <section
                className="grid grid-cols-2 gap-4 lg:grid-cols-4"
                style={{ animation: "overview-fade-in 0.4s ease-out 0.05s both" }}
            >
                {[
                    {
                        label: "전체 업무",
                        value: totalTasks,
                        unit: "개",
                        color: "text-stone-800",
                        bg: "bg-stone-50",
                        icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2",
                    },
                    {
                        label: "완료",
                        value: completedTasks.length,
                        unit: "개",
                        color: "text-green-600",
                        bg: "bg-green-50",
                        icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
                    },
                    {
                        label: "진행중",
                        value: inProgressTasks.length,
                        unit: "개",
                        color: "text-blue-600",
                        bg: "bg-blue-50",
                        icon: "M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z",
                    },
                    {
                        label: "기한 초과",
                        value: overdueTasks.length,
                        unit: "개",
                        color: overdueTasks.length > 0 ? "text-red-600" : "text-stone-400",
                        bg: overdueTasks.length > 0 ? "bg-red-50" : "bg-stone-50",
                        icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
                    },
                ].map(({ label, value, unit, color, bg, icon }) => (
                    <div
                        key={label}
                        className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5"
                    >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                            <svg className={`h-5 w-5 ${color}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-medium text-stone-400">{label}</p>
                            <p className={`mt-0.5 text-2xl font-bold tabular-nums ${color}`}>
                                {value}
                                <span className="ml-0.5 text-sm font-medium">{unit}</span>
                            </p>
                        </div>
                    </div>
                ))}
            </section>

            {/* ── 3. 차트 영역 (완료율 + 상태분포 + 진행중 업무) ────── */}
            <section className="grid gap-5 lg:grid-cols-3">
                {/* 완료율 도넛 */}
                <div
                    className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"
                    style={{ animation: "overview-fade-in 0.4s ease-out 0.1s both" }}
                >
                    <h3 className="text-sm font-semibold text-stone-700">업무 완료율</h3>
                    <p className="mt-0.5 text-xs text-stone-400">
                        {totalTasks > 0
                            ? `전체 ${totalTasks}개 중 ${completedTasks.length}개 완료`
                            : "등록된 업무가 없어요"}
                    </p>
                    <div className="mt-5 flex items-center gap-6">
                        <div className="relative shrink-0">
                            <DonutChart
                                percent={completionPercent}
                                size={110}
                                strokeWidth={12}
                                color="#22c55e"
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold tabular-nums text-stone-800">
                                {completionPercent}%
                            </span>
                        </div>
                        <div className="min-w-0 flex-1 space-y-2.5">
                            {[
                                { label: "완료", count: completedTasks.length, color: "#22c55e" },
                                { label: "진행중", count: inProgressTasks.length, color: "#3b82f6" },
                                {
                                    label: "기타",
                                    count: totalTasks - completedTasks.length - inProgressTasks.length,
                                    color: "#d1d5db",
                                },
                            ].map(({ label, count, color }) => (
                                <div key={label} className="flex items-center gap-2">
                                    <span
                                        className="h-2 w-2 shrink-0 rounded-full"
                                        style={{ backgroundColor: color }}
                                    />
                                    <span className="min-w-0 flex-1 truncate text-xs text-stone-500">
                                        {label}
                                    </span>
                                    <span className="shrink-0 text-xs font-semibold tabular-nums text-stone-700">
                                        {count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 업무 상태별 막대 그래프 */}
                <div
                    className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"
                    style={{ animation: "overview-fade-in 0.4s ease-out 0.15s both" }}
                >
                    <h3 className="text-sm font-semibold text-stone-700">업무 상태 분포</h3>
                    <p className="mt-0.5 text-xs text-stone-400">상태별 업무 개수</p>
                    {statusCounts.length === 0 ? (
                        <p className="mt-6 text-center text-sm text-stone-400">상태 정보 없음</p>
                    ) : (
                        <div className="mt-5 space-y-3">
                            {statusCounts.map(({ id, name, count, color }) => (
                                <div key={id} className="flex items-center gap-2.5">
                                    <span className="w-14 shrink-0 truncate text-xs font-medium text-stone-600">
                                        {name}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="h-6 overflow-hidden rounded-md bg-stone-100">
                                            <div
                                                className="h-full rounded-md transition-all duration-700 ease-out"
                                                style={{
                                                    width: `${(count / maxCount) * 100}%`,
                                                    backgroundColor: color,
                                                    opacity: count === 0 ? 0.25 : 1,
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-stone-600">
                                        {count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 진행중인 업무 */}
                <div
                    className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"
                    style={{ animation: "overview-fade-in 0.4s ease-out 0.2s both" }}
                >
                    <h3 className="text-sm font-semibold text-stone-700">진행중인 업무</h3>
                    <p className="mt-0.5 text-xs text-stone-400">
                        {inProgressTasks.length > 0
                            ? `총 ${inProgressTasks.length}개 진행 중`
                            : "진행 중인 업무가 없어요"}
                    </p>
                    {inProgressTasks.length === 0 ? (
                        <div className="mt-6 flex flex-col items-center justify-center gap-2 py-6 text-stone-300">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            <span className="text-xs">모두 완료됐어요!</span>
                        </div>
                    ) : (
                        <ul className="mt-3 space-y-1.5">
                            {inProgressTasks.slice(0, 6).map((task) => (
                                <li
                                    key={task.id}
                                    className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-stone-50"
                                >
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                                    <span className="min-w-0 flex-1 truncate text-sm text-stone-700">
                                        {task.title}
                                    </span>
                                    {task.assignee?.name && (
                                        <span className="shrink-0 text-xs text-stone-400">
                                            {task.assignee.name}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    {inProgressTasks.length > 6 && onSeeMoreTasks && (
                        <button
                            type="button"
                            onClick={onSeeMoreTasks}
                            className="mt-3 w-full rounded-lg border border-stone-200 bg-white py-1.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-700"
                        >
                            +{inProgressTasks.length - 6}개 더보기
                        </button>
                    )}
                </div>
            </section>

            {/* ── 4. 최근 업무 리스트 ──────────────────────────────── */}
            <section
                className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"
                style={{ animation: "overview-fade-in 0.4s ease-out 0.3s both" }}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-stone-700">최근 업무</h3>
                        <p className="mt-0.5 text-xs text-stone-400">최근 수정된 업무 순이에요</p>
                    </div>
                    {onSeeMoreTasks && (
                        <button
                            type="button"
                            onClick={onSeeMoreTasks}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
                        >
                            전체보기
                        </button>
                    )}
                </div>

                {recentTasks.length === 0 ? (
                    <div className="mt-6 py-8 text-center text-sm text-stone-400">
                        등록된 업무가 없어요
                    </div>
                ) : (
                    <ul className="mt-4 divide-y divide-stone-50">
                        {recentTasks.map((task, i) => {
                            const taskStatus = statusById.get(task.statusId);
                            return (
                                <li
                                    key={task.id}
                                    className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                                    style={{
                                        animation: `overview-fade-in 0.35s ease-out ${0.3 + i * 0.04}s both`,
                                    }}
                                >
                                    {/* 상태 도트 */}
                                    <span
                                        className="h-2 w-2 shrink-0 rounded-full"
                                        style={{
                                            backgroundColor: taskStatus
                                                ? statusCssColor(taskStatus.color)
                                                : "#d1d5db",
                                        }}
                                    />
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">
                                        {task.title}
                                    </span>
                                    {/* 상태 뱃지 */}
                                    {taskStatus && (
                                        <span
                                            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                                            style={{ backgroundColor: statusCssColor(taskStatus.color) }}
                                        >
                                            {taskStatus.name}
                                        </span>
                                    )}
                                    {/* 담당자 */}
                                    {task.assignee?.name && (
                                        <span className="hidden shrink-0 text-xs text-stone-400 sm:inline">
                                            {task.assignee.name}
                                        </span>
                                    )}
                                    {/* 마감일 */}
                                    {task.dueDate && (
                                        <span className="hidden shrink-0 text-xs text-stone-400 md:inline">
                                            {new Date(task.dueDate).toLocaleDateString("ko-KR", {
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
}
