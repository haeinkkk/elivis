"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";

import type {
    ApiProjectTasksItem,
    ApiWorkspacePriority,
    ApiWorkspaceStatus,
    ApiWorkspaceTask,
} from "../types/workspace-api";
import type { ProjectUser, ProjectViewerRole } from "../types/project-ui";
import type { WorkspaceTaskDetailActions } from "../types/workspace-task-detail-actions";
import type { CreateProjectTaskRequestFn } from "../types/project-task-request-action";
import { formatTaskTitleForList } from "../utils/task-title-display";
import { tagColorOf } from "../utils/tag-colors";
import TaskDetailPanel from "../workspace/TaskDetailPanel";

import { TaskRequestModal } from "./TaskRequestModal";

type SelectedTaskInfo = {
    task: ApiWorkspaceTask;
    workspaceId: string;
    workspaceOwnerId: string;
    statuses: ApiWorkspaceStatus[];
    priorities: ApiWorkspacePriority[];
};

type ViewMode = "all" | "by-member";
type SortBy = "default" | "status" | "priority" | "startDate" | "dueDate";

type WorkspaceMemberInfo = {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
};

type EnrichedTask = ApiWorkspaceTask & {
    _workspaceId: string;
    _workspaceOwner: WorkspaceMemberInfo;
    _statuses: ApiWorkspaceStatus[];
    _priorities: ApiWorkspacePriority[];
};

// ─────────────────────────────────────────────────────────────────────────────
// 날짜 포맷
// ─────────────────────────────────────────────────────────────────────────────

function fmtTaskDate(iso: string | null | undefined, locale: string): string {
    if (!iso) return "—";
    const tag = locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "en-US";
    return new Date(iso).toLocaleDateString(tag, { month: "numeric", day: "numeric" });
}

// ─────────────────────────────────────────────────────────────────────────────
// 담당자 칩
// ─────────────────────────────────────────────────────────────────────────────

function AssigneeChip({ assignee }: { assignee: ApiWorkspaceTask["assignee"] }) {
    if (!assignee) return <span className="text-xs text-stone-400">—</span>;
    const name = assignee.name?.trim() || assignee.email.split("@")[0];
    return (
        <div className="flex items-center gap-1.5">
            {assignee.avatarUrl ? (
                <img
                    src={assignee.avatarUrl}
                    alt={name}
                    className="h-5 w-5 rounded-full object-cover ring-1 ring-white"
                />
            ) : (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-200 text-[10px] font-semibold text-stone-600">
                    {name[0]?.toUpperCase()}
                </span>
            )}
            <span className="max-w-[80px] truncate text-xs text-stone-600">{name}</span>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 필터/정렬 드롭다운
// ─────────────────────────────────────────────────────────────────────────────

function FilterDropdown<T extends string>({
    value,
    options,
    onChange,
    label,
}: {
    value: T;
    options: { value: T; label: string }[];
    onChange: (v: T) => void;
    label: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const current = options.find((o) => o.value === value);
    const isActive = value !== options[0]?.value;

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    isActive
                        ? "border-stone-800 bg-stone-800 text-white"
                        : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                }`}
            >
                {isActive ? current?.label : label}
                <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && (
                <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-xl border border-stone-200 bg-white py-1 shadow-xl">
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { onChange(opt.value); setOpen(false); }}
                            className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-stone-50 ${
                                value === opt.value ? "font-semibold text-stone-900" : "text-stone-600"
                            }`}
                        >
                            {opt.label}
                            {value === opt.value && (
                                <svg className="h-3 w-3 text-stone-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 업무 행 (읽기 전용)
// ─────────────────────────────────────────────────────────────────────────────

function TaskRow({
    task,
    subTasks,
    allTasks,
    depth = 0,
    currentUserId,
    onOpenPanel,
    onRequestTask,
    expandKey = 0,
    defaultExpanded = true,
    locale,
    visibleTaskIds,
}: {
    task: EnrichedTask;
    subTasks: EnrichedTask[];
    allTasks: EnrichedTask[];
    depth?: number;
    currentUserId: string;
    onOpenPanel: (t: EnrichedTask) => void;
    onRequestTask: (t: EnrichedTask) => void;
    /** 부모가 바꿀 때마다 defaultExpanded 값으로 리셋 */
    expandKey?: number;
    defaultExpanded?: boolean;
    locale: string;
    /** 상태/우선순위 필터 시 매칭 업무 + 조상만 표시 */
    visibleTaskIds?: Set<string> | null;
}) {
    const tList = useTranslations("projects.detail.tasksList");
    const [expanded, setExpanded] = useState(defaultExpanded);
    const prevKeyRef = useRef(expandKey);

    useEffect(() => {
        if (expandKey !== prevKeyRef.current) {
            prevKeyRef.current = expandKey;
            setExpanded(defaultExpanded);
        }
    }, [expandKey, defaultExpanded]);
    const indentPx = depth * 20;
    const hasChildren = subTasks.length > 0;
    const isTop = depth === 0;

    const sc = tagColorOf(task.status.color);
    const pc = task.priority ? tagColorOf(task.priority.color) : null;

    return (
        <>
            <tr
                className={`group border-b transition-colors ${
                    isTop
                        ? "border-stone-200 bg-white hover:bg-stone-50/60"
                        : "border-stone-100 bg-stone-50/20 hover:bg-stone-50/40"
                }`}
            >
                {/* 제목 */}
                <td className="py-2 pr-3" style={{ paddingLeft: `${12 + indentPx}px` }}>
                    <div className="flex items-center gap-1.5">
                        {hasChildren ? (
                            <button
                                type="button"
                                onClick={() => setExpanded((v) => !v)}
                                className="flex h-4 w-4 shrink-0 items-center justify-center text-stone-400 hover:text-stone-600"
                            >
                                <svg
                                    className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        ) : (
                            <span className="h-4 w-4 shrink-0" />
                        )}
                        <button
                            type="button"
                            onClick={() => onOpenPanel(task)}
                            title={task.title}
                            className={`flex-1 truncate text-left hover:underline ${
                                isTop ? "text-sm font-semibold text-stone-900" : "text-sm text-stone-600"
                            }`}
                        >
                            {formatTaskTitleForList(task.title)}
                        </button>
                    </div>
                </td>

                {/* 상태 */}
                <td className="py-2 pr-2">
                    <button
                        type="button"
                        onClick={() => onOpenPanel(task)}
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${sc.badge}`}
                        style={sc.badgeStyle}
                    >
                        {task.status.name}
                    </button>
                </td>

                {/* 우선순위 */}
                <td className="py-2 pr-2">
                    {pc && task.priority ? (
                        <button
                            type="button"
                            onClick={() => onOpenPanel(task)}
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${pc.badge}`}
                            style={pc.badgeStyle}
                        >
                            {task.priority.name}
                        </button>
                    ) : (
                        <span className="text-xs text-stone-300">—</span>
                    )}
                </td>

                {/* 담당자 + 요청 버튼 */}
                <td className="hidden py-2 pr-3 sm:table-cell">
                    <div className="flex items-center gap-2">
                        <AssigneeChip assignee={task.assignee} />
                        {depth === 0 && task._workspaceOwner.id !== currentUserId && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onRequestTask(task); }}
                                className="whitespace-nowrap rounded-md border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-medium text-stone-500 transition-colors hover:border-stone-700 hover:bg-stone-700 hover:text-white"
                                title={tList("requestTaskTitle")}
                            >
                                {tList("request")}
                            </button>
                        )}
                    </div>
                </td>

                {/* 시작일 */}
                <td className="hidden py-2 pr-2 text-xs text-stone-500 md:table-cell">
                    {fmtTaskDate(task.startDate, locale)}
                </td>

                {/* 종료일 */}
                <td className="hidden py-2 pr-3 text-xs md:table-cell">
                    {task.dueDate ? (
                        (() => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const due = new Date(task.dueDate);
                            due.setHours(0, 0, 0, 0);
                            const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
                            const color =
                                diff < 0
                                    ? "text-red-500 font-semibold"
                                    : diff === 0
                                    ? "text-orange-500 font-semibold"
                                    : diff <= 3
                                    ? "text-yellow-600"
                                    : "text-stone-500";
                            return <span className={color}>{fmtTaskDate(task.dueDate, locale)}</span>;
                        })()
                    ) : (
                        <span className="text-stone-300">—</span>
                    )}
                </td>

            </tr>

            {expanded &&
                subTasks.map((sub) => (
                    <TaskRow
                        key={sub.id}
                        task={sub}
                        subTasks={allTasks.filter(
                            (t) =>
                                t.parentId === sub.id &&
                                (!visibleTaskIds || visibleTaskIds.has(t.id)),
                        )}
                        allTasks={allTasks}
                        depth={depth + 1}
                        currentUserId={currentUserId}
                        onOpenPanel={onOpenPanel}
                        onRequestTask={onRequestTask}
                        expandKey={expandKey}
                        defaultExpanded={defaultExpanded}
                        locale={locale}
                        visibleTaskIds={visibleTaskIds}
                    />
                ))}
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 테이블 헤더
// ─────────────────────────────────────────────────────────────────────────────

function TableHead() {
    const t = useTranslations("projects.detail.tasksList");
    return (
        <thead>
            <tr className="border-b border-stone-200 bg-stone-50/60">
                <th className="py-2 pl-3 pr-3 text-left text-xs font-medium text-stone-500">{t("colTask")}</th>
                <th className="py-2 pr-2 text-left text-xs font-medium text-stone-500">{t("colStatus")}</th>
                <th className="py-2 pr-2 text-left text-xs font-medium text-stone-500">{t("colPriority")}</th>
                <th className="hidden py-2 pr-3 text-left text-xs font-medium text-stone-500 sm:table-cell">{t("colAssignee")}</th>
                <th className="hidden py-2 pr-2 text-left text-xs font-medium text-stone-500 md:table-cell">{t("colStart")}</th>
                <th className="hidden py-2 pr-3 text-left text-xs font-medium text-stone-500 md:table-cell">{t("colDue")}</th>
            </tr>
        </thead>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 팀원 구분 헤더 행
// ─────────────────────────────────────────────────────────────────────────────

function MemberHeaderRow({
    name,
    avatarUrl,
    role,
    taskCount,
    isFirst,
    isCollapsed,
    onToggle,
}: {
    name: string;
    avatarUrl?: string | null;
    role?: ProjectViewerRole;
    taskCount: number;
    isFirst: boolean;
    isCollapsed: boolean;
    onToggle: () => void;
}) {
    const tDetail = useTranslations("projects.detail");
    return (
        <tbody>
            <tr className={isFirst ? "" : "border-t-4 border-stone-100"}>
                <td colSpan={6} className="px-3 py-0">
                    <button
                        type="button"
                        onClick={onToggle}
                        className="flex w-full items-center gap-2.5 py-3 text-left"
                    >
                        <svg
                            className={`h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform duration-150 ${isCollapsed ? "-rotate-90" : "rotate-0"}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>

                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={name}
                                className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-stone-200"
                            />
                        ) : (
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-600 text-xs font-semibold text-white">
                                {name[0]?.toUpperCase() ?? "?"}
                            </span>
                        )}

                        <span className="text-sm font-semibold text-stone-800">{name}</span>
                        {role && (
                            <span className="text-xs text-stone-400">
                                {role === "LEADER"
                                    ? tDetail("viewerRoles.LEADER")
                                    : role === "DEPUTY_LEADER"
                                      ? tDetail("viewerRoles.DEPUTY_LEADER")
                                      : tDetail("viewerRoles.MEMBER")}
                            </span>
                        )}
                        <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                            {taskCount}
                        </span>
                    </button>
                </td>
            </tr>
        </tbody>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 정렬 함수
// ─────────────────────────────────────────────────────────────────────────────

/** 상태·우선순위 필터: 매칭 업무 + 그 조상 id (1단이 하위 매칭 시에도 보이게) */
function computeVisibleTaskIdsForFilters(
    tasks: EnrichedTask[],
    filterStatusName: string,
    filterPriorityName: string,
): Set<string> | null {
    const hasStatusFilter = filterStatusName !== "all";
    const hasPriorityFilter = filterPriorityName !== "all";
    if (!hasStatusFilter && !hasPriorityFilter) return null;

    const byId = new Map(tasks.map((t) => [t.id, t] as const));
    const visible = new Set<string>();

    function matches(t: EnrichedTask): boolean {
        if (hasStatusFilter && t.status.name !== filterStatusName) return false;
        if (hasPriorityFilter && t.priority?.name !== filterPriorityName) return false;
        return true;
    }

    for (const t of tasks) {
        if (!matches(t)) continue;
        visible.add(t.id);
        let cur: EnrichedTask | undefined = t;
        while (cur?.parentId) {
            const p = byId.get(cur.parentId);
            if (!p) break;
            visible.add(p.id);
            cur = p;
        }
    }

    return visible;
}

function applySortAndFilter(
    tasks: EnrichedTask[],
    visibleTaskIds: Set<string> | null,
    sortBy: SortBy,
    sortLocale: string,
): EnrichedTask[] {
    let result = tasks.filter((t) => !t.parentId);
    if (visibleTaskIds) {
        result = result.filter((t) => visibleTaskIds.has(t.id));
    }

    if (sortBy !== "default") {
        result = [...result].sort((a, b) => {
            if (sortBy === "status") return a.status.name.localeCompare(b.status.name, sortLocale);
            if (sortBy === "priority") return (b.priority?.value ?? -1) - (a.priority?.value ?? -1);
            if (sortBy === "startDate") {
                if (!a.startDate && !b.startDate) return 0;
                if (!a.startDate) return 1;
                if (!b.startDate) return -1;
                return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
            }
            if (sortBy === "dueDate") {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            }
            return 0;
        });
    }

    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 팀원 필터 칩
// ─────────────────────────────────────────────────────────────────────────────

type MemberOption = {
    id: string;
    name: string;
    avatarUrl: string | null;
};

function MemberFilterBar({
    members,
    selectedId,
    onSelect,
}: {
    members: MemberOption[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
}) {
    const t = useTranslations("projects.detail.tasksList");
    if (members.length <= 1) return null;
    return (
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-stone-100 bg-stone-50/40 px-4 py-2 sm:px-5">
            <button
                type="button"
                onClick={() => onSelect(null)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectedId === null
                        ? "bg-stone-800 text-white"
                        : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
            >
                {t("chipAll")}
            </button>
            {members.map((m) => {
                const initial = m.name[0]?.toUpperCase() ?? "?";
                const isSelected = selectedId === m.id;
                return (
                    <button
                        key={m.id}
                        type="button"
                        onClick={() => onSelect(isSelected ? null : m.id)}
                        className={`flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1.5 pr-2.5 text-xs font-medium transition-colors ${
                            isSelected
                                ? "bg-stone-800 text-white"
                                : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-50"
                        }`}
                    >
                        {m.avatarUrl ? (
                            <img
                                src={m.avatarUrl}
                                alt={m.name}
                                className="h-4 w-4 rounded-full object-cover"
                            />
                        ) : (
                            <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                                isSelected ? "bg-white/20 text-white" : "bg-stone-200 text-stone-600"
                            }`}>
                                {initial}
                            </span>
                        )}
                        {m.name}
                    </button>
                );
            })}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

export function ProjectTasksTab({
    participants,
    projectTasksData,
    taskPanelActions,
    createTaskRequest,
    currentUserId = "",
    projectId = "",
}: {
    participants: ProjectUser[];
    projectTasksData: ApiProjectTasksItem[];
    taskPanelActions: WorkspaceTaskDetailActions;
    createTaskRequest: CreateProjectTaskRequestFn;
    currentUserId?: string;
    projectId?: string;
}) {
    const tDetail = useTranslations("projects.detail");
    const tList = useTranslations("projects.detail.tasksList");
    const locale = useLocale();
    const sortLocale = locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "en-US";
    const [viewMode, setViewMode] = useState<ViewMode>("all");
    const [selectedTask, setSelectedTask] = useState<SelectedTaskInfo | null>(null);
    const [requestModalTask, setRequestModalTask] = useState<EnrichedTask | null>(null);
    const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
    const [filterStatusName, setFilterStatusName] = useState("all");
    const [filterPriorityName, setFilterPriorityName] = useState("all");
    const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortBy>("default");

    // 모두 열기 / 닫기 제어
    const [expandKey, setExpandKey] = useState(0);
    const [globalDefaultExpanded, setGlobalDefaultExpanded] = useState(true);

    function handleExpandAll() {
        setGlobalDefaultExpanded(true);
        setExpandKey((k) => k + 1);
        setCollapsedMap({});
    }

    function handleCollapseAll() {
        setGlobalDefaultExpanded(false);
        setExpandKey((k) => k + 1);
        // 팀원별 뷰의 섹션도 모두 접기
        const newMap: Record<string, boolean> = {};
        projectTasksData.forEach(({ workspace }) => { newMap[workspace.id] = true; });
        setCollapsedMap(newMap);
    }

    function toggleCollapse(key: string) {
        setCollapsedMap((prev) => ({ ...prev, [key]: !prev[key] }));
    }

    // 모든 워크스페이스 업무에 소유자·상태·우선순위 컨텍스트 부착
    const allEnrichedTasks: EnrichedTask[] = projectTasksData.flatMap(
        ({ workspace, tasks, statuses, priorities }) =>
            tasks.map((t) => ({
                ...t,
                _workspaceId: workspace.id,
                _workspaceOwner: workspace.user,
                _statuses: statuses,
                _priorities: priorities,
            })),
    );

    // 팀원 옵션 (워크스페이스 소유자 기준)
    const memberOptions: MemberOption[] = (() => {
        const seen = new Set<string>();
        return projectTasksData
            .map(({ workspace }) => workspace.user)
            .filter((u) => {
                if (seen.has(u.id)) return false;
                seen.add(u.id);
                return true;
            })
            .map((u) => ({
                id: u.id,
                name: u.name?.trim() || u.email.split("@")[0],
                avatarUrl: u.avatarUrl,
            }));
    })();

    // 필터 옵션: 전체 작업에서 중복 제거
    const statusNames = new Set<string>();
    allEnrichedTasks.forEach((t) => statusNames.add(t.status.name));
    const statusOptions = [
        { value: "all", label: tList("filterAllStatuses") },
        ...[...statusNames]
            .sort((a, b) => a.localeCompare(b, sortLocale, { sensitivity: "base" }))
            .map((n) => ({ value: n, label: n })),
    ];

    const prioritySeen = new Map<string, number>();
    allEnrichedTasks.forEach((t) => {
        if (t.priority) prioritySeen.set(t.priority.name, t.priority.value ?? 0);
    });
    const priorityOptions = [
        { value: "all", label: tList("filterAllPriorities") },
        ...[...prioritySeen.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([name]) => ({ value: name, label: name })),
    ];

    const sortOptions: { value: SortBy; label: string }[] = [
        { value: "default", label: tList("sortDefault") },
        { value: "status", label: tList("sortStatus") },
        { value: "priority", label: tList("sortPriority") },
        { value: "startDate", label: tList("sortStartDate") },
        { value: "dueDate", label: tList("sortDueDate") },
    ];

    const filterVisibleTaskIds = computeVisibleTaskIdsForFilters(
        allEnrichedTasks,
        filterStatusName,
        filterPriorityName,
    );

    // 필터/정렬 적용된 전체 top-task 목록
    let displayedTopTasks = applySortAndFilter(
        allEnrichedTasks,
        filterVisibleTaskIds,
        sortBy,
        sortLocale,
    );
    if (filterMemberId) {
        displayedTopTasks = displayedTopTasks.filter((t) => t._workspaceOwner.id === filterMemberId);
    }

    // 팀원별 섹션: 워크스페이스 소유자(workspace.user) 기준으로 그룹핑
    const participantMap = new Map(participants.map((p) => [p.id, p]));
    const byMemberSections = projectTasksData
        .map(({ workspace, tasks: rawTasks, statuses, priorities }) => {
            const enriched: EnrichedTask[] = rawTasks.map((t) => ({
                ...t,
                _workspaceId: workspace.id,
                _workspaceOwner: workspace.user,
                _statuses: statuses,
                _priorities: priorities,
            }));
            const sectionVisible = computeVisibleTaskIdsForFilters(
                enriched,
                filterStatusName,
                filterPriorityName,
            );
            const filtered = applySortAndFilter(enriched, sectionVisible, sortBy, sortLocale);

            const participant = participantMap.get(workspace.user.id);
            const displayName =
                (participant?.name ?? workspace.user.name?.trim()) ||
                workspace.user.email.split("@")[0];

            return {
                key: workspace.id,
                userId: workspace.user.id,
                name: displayName,
                avatarUrl: workspace.user.avatarUrl,
                role: participant?.role,
                tasks: filtered,
                visibleTaskIds: sectionVisible,
                totalCount: rawTasks.filter((t) => !t.parentId).length,
            };
        })
        .filter((s) => {
            if (filterMemberId && s.userId !== filterMemberId) return false;
            return s.tasks.length > 0 || s.totalCount > 0;
        });

    function handleOpenPanel(task: EnrichedTask) {
        setSelectedTask({
            task,
            workspaceId: task._workspaceId,
            workspaceOwnerId: task._workspaceOwner.id,
            statuses: task._statuses,
            priorities: task._priorities,
        });
    }

    function handleUpdateTask(updated: ApiWorkspaceTask) {
        setSelectedTask((prev) => (prev ? { ...prev, task: updated } : null));
    }

    // 통계: 전체 데이터 기준 (필터 무관)
    const totalTopTaskCount = allEnrichedTasks.filter((t) => !t.parentId).length;

    const hasFilter =
        filterStatusName !== "all" || filterPriorityName !== "all" || sortBy !== "default" || filterMemberId !== null;

    return (
        <div className="flex h-full flex-col">
            {/* ── 툴바 ── */}
            <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-white px-4 py-2 sm:px-5">
                {/* 뷰 토글 */}
                <div className="flex rounded-lg border border-stone-200 bg-stone-50 p-0.5">
                    {(["all", "by-member"] as const).map((v) => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => setViewMode(v)}
                            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                                viewMode === v
                                    ? "bg-white text-stone-800 shadow-sm"
                                    : "text-stone-500 hover:text-stone-700"
                            }`}
                        >
                            {v === "all" ? tList("viewAll") : tList("viewByMember")}
                        </button>
                    ))}
                </div>

                <div className="h-4 w-px bg-stone-200" />

                {/* 필터 */}
                <FilterDropdown
                    value={filterStatusName}
                    options={statusOptions}
                    onChange={setFilterStatusName}
                    label={tList("filterStatus")}
                />
                <FilterDropdown
                    value={filterPriorityName}
                    options={priorityOptions}
                    onChange={setFilterPriorityName}
                    label={tList("filterPriority")}
                />

                <div className="h-4 w-px bg-stone-200" />

                {/* 정렬 */}
                <FilterDropdown
                    value={sortBy}
                    options={sortOptions}
                    onChange={setSortBy}
                    label={tList("sort")}
                />

                {hasFilter && (
                    <button
                        type="button"
                        onClick={() => {
                            setFilterStatusName("all");
                            setFilterPriorityName("all");
                            setFilterMemberId(null);
                            setSortBy("default");
                        }}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                    >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {tList("resetFilters")}
                    </button>
                )}

                <div className="ml-auto flex items-center gap-1">
                    <button
                        type="button"
                        onClick={handleExpandAll}
                        title={tList("expandAllTitle")}
                        className="flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        {tList("expandAll")}
                    </button>
                    <button
                        type="button"
                        onClick={handleCollapseAll}
                        title={tList("collapseAllTitle")}
                        className="flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        {tList("collapseAll")}
                    </button>
                </div>
            </div>

            {/* ── 팀원 필터 칩 ── */}
            <MemberFilterBar
                members={memberOptions}
                selectedId={filterMemberId}
                onSelect={setFilterMemberId}
            />

            {/* ── 본문 ── */}
            <div className="min-h-0 flex-1 overflow-auto">
                {totalTopTaskCount === 0 ? (
                    <div className="flex items-center justify-center py-20 text-center">
                        <div>
                            <p className="text-4xl">📋</p>
                            <p className="mt-3 text-sm font-semibold text-stone-700">
                                {tDetail("tasksEmptyTitle")}
                            </p>
                            <p className="mt-1 text-xs text-stone-400">
                                {tDetail("tasksEmptySubtitle")}
                            </p>
                        </div>
                    </div>
                ) : displayedTopTasks.length === 0 ? (
                    <div className="flex items-center justify-center py-20 text-center">
                        <div>
                            <p className="text-4xl">🔍</p>
                            <p className="mt-3 text-sm font-semibold text-stone-700">
                                {tDetail("tasksFilterEmpty")}
                            </p>
                        </div>
                    </div>
                ) : viewMode === "all" ? (
                    /* ── 전체 보기 ── */
                    <table className="w-full text-left text-sm">
                        <TableHead />
                        <tbody>
                            {displayedTopTasks.map((task) => (
                                <TaskRow
                                    key={task.id}
                                    task={task}
                                    subTasks={allEnrichedTasks.filter(
                                        (t) =>
                                            t.parentId === task.id &&
                                            (!filterVisibleTaskIds || filterVisibleTaskIds.has(t.id)),
                                    )}
                                    allTasks={allEnrichedTasks}
                                    currentUserId={currentUserId}
                                    onOpenPanel={handleOpenPanel}
                                    onRequestTask={setRequestModalTask}
                                    expandKey={expandKey}
                                    defaultExpanded={globalDefaultExpanded}
                                    locale={locale}
                                    visibleTaskIds={filterVisibleTaskIds}
                                />
                            ))}
                        </tbody>
                    </table>
                ) : (
                    /* ── 팀원별: 워크스페이스 소유자 기준 ── */
                    <table className="w-full text-left text-sm">
                        <TableHead />
                        {byMemberSections.map((section, idx) => {
                            const isCollapsed = !!collapsedMap[section.key];
                            return (
                                <React.Fragment key={section.key}>
                                    <MemberHeaderRow
                                        name={section.name}
                                        avatarUrl={section.avatarUrl}
                                        role={section.role}
                                        taskCount={section.totalCount}
                                        isFirst={idx === 0}
                                        isCollapsed={isCollapsed}
                                        onToggle={() => toggleCollapse(section.key)}
                                    />
                                    {!isCollapsed && (
                                        <tbody>
                                            {section.tasks.map((task) => (
                                                <TaskRow
                                                    key={task.id}
                                                    task={task}
                                                    subTasks={allEnrichedTasks.filter(
                                                        (t) =>
                                                            t.parentId === task.id &&
                                                            (!section.visibleTaskIds ||
                                                                section.visibleTaskIds.has(t.id)),
                                                    )}
                                                    allTasks={allEnrichedTasks}
                                                    currentUserId={currentUserId}
                                                    onOpenPanel={handleOpenPanel}
                                                    onRequestTask={setRequestModalTask}
                                                    expandKey={expandKey}
                                                    defaultExpanded={globalDefaultExpanded}
                                                    locale={locale}
                                                    visibleTaskIds={section.visibleTaskIds}
                                                />
                                            ))}
                                            {section.tasks.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="py-4 text-center text-xs text-stone-400">
                                                        {tDetail("tasksFilterEmpty")}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </table>
                )}
            </div>

            {/* ── 업무 상세 패널 ── */}
            {selectedTask && (
                <TaskDetailPanel
                    actions={taskPanelActions}
                    task={selectedTask.task}
                    statuses={selectedTask.statuses}
                    priorities={selectedTask.priorities}
                    workspaceId={selectedTask.workspaceId}
                    onUpdate={handleUpdateTask}
                    onClose={() => setSelectedTask(null)}
                    readOnly={!!currentUserId && selectedTask.workspaceOwnerId !== currentUserId}
                    currentUserId={currentUserId}
                />
            )}

            {/* ── 업무 요청 모달 ── */}
            {requestModalTask && (
                <TaskRequestModal
                    projectId={projectId}
                    currentUserId={currentUserId}
                    participants={participants.filter((p) => p.id !== currentUserId)}
                    prefillTitle={requestModalTask.title}
                    onClose={() => setRequestModalTask(null)}
                    createTaskRequest={createTaskRequest}
                />
            )}
        </div>
    );
}
