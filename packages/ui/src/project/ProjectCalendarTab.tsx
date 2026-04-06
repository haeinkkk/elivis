"use client";

import React, { useState, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type {
    ApiProjectTasksItem,
    ApiWorkspacePriority,
    ApiWorkspaceStatus,
    ApiWorkspaceTask,
} from "../types/workspace-api";
import type { WorkspaceTaskDetailActions } from "../types/workspace-task-detail-actions";
import { formatTaskTitleForList } from "../utils/task-title-display";
import TaskDetailPanel from "../workspace/TaskDetailPanel";

// ─────────────────────────────────────────────────────────────────────────────
// 색상 유틸
// ─────────────────────────────────────────────────────────────────────────────

// 멤버별 고유 색상 (캘린더 이벤트 바)
const MEMBER_COLORS = [
    "bg-blue-500",
    "bg-violet-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-fuchsia-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-orange-500",
];

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

type WorkspaceOwner = {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
};

type EnrichedTask = ApiWorkspaceTask & {
    _workspaceId: string;
    _owner: WorkspaceOwner;
    _statuses: ApiWorkspaceStatus[];
    _priorities: ApiWorkspacePriority[];
    _ownerColor: string;
};

interface CalendarEvent {
    task: EnrichedTask;
    start: Date;
    end: Date;
}

interface PositionedEvent {
    event: CalendarEvent;
    colStart: number;
    colSpan: number;
    fromLeft: boolean;
    toRight: boolean;
    lane: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 날짜 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

function startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

function getCalendarWeeks(year: number, month: number): Date[][] {
    const firstDay = new Date(year, month, 1);
    const start = new Date(firstDay);
    start.setDate(start.getDate() - start.getDay());

    const weeks: Date[][] = [];
    const cur = new Date(start);
    for (let w = 0; w < 6; w++) {
        const week: Date[] = [];
        for (let d = 0; d < 7; d++) {
            week.push(new Date(cur));
            cur.setDate(cur.getDate() + 1);
        }
        weeks.push(week);
    }
    return weeks;
}

function getEventRange(task: EnrichedTask): CalendarEvent | null {
    const s = task.startDate ? startOfDay(new Date(task.startDate)) : null;
    const e = task.dueDate   ? startOfDay(new Date(task.dueDate))   : null;
    if (!s && !e) return null;
    return { task, start: s ?? e!, end: e ?? s! };
}

function layoutWeekEvents(weekDays: Date[], events: CalendarEvent[]): PositionedEvent[][] {
    const weekStart = weekDays[0];
    const weekEnd   = weekDays[6];

    const visible = events.filter(e => e.start <= weekEnd && e.end >= weekStart);

    visible.sort((a, b) => {
        const sd = a.start.getTime() - b.start.getTime();
        if (sd !== 0) return sd;
        return (b.end.getTime() - b.start.getTime()) - (a.end.getTime() - a.start.getTime());
    });

    type LaneSlot = { colEnd: number };
    const lanes: LaneSlot[][] = [];
    const positioned: PositionedEvent[] = [];

    for (const ev of visible) {
        const colStart = Math.max(0, Math.round((ev.start.getTime() - weekStart.getTime()) / 86400000));
        const colEnd   = Math.min(6, Math.round((ev.end.getTime()   - weekStart.getTime()) / 86400000));
        const colSpan  = colEnd - colStart + 1;

        let lane = 0;
        while (true) {
            if (!lanes[lane] || lanes[lane].length === 0) break;
            const last = lanes[lane][lanes[lane].length - 1];
            if (last.colEnd < colStart) break;
            lane++;
        }
        if (!lanes[lane]) lanes[lane] = [];
        lanes[lane].push({ colEnd });

        positioned.push({
            event: ev, colStart, colSpan,
            fromLeft: ev.start < weekStart,
            toRight:  ev.end   > weekEnd,
            lane,
        });
    }

    const maxLane = positioned.reduce((m, p) => Math.max(m, p.lane), -1);
    const rows: PositionedEvent[][] = Array.from({ length: maxLane + 1 }, () => []);
    for (const p of positioned) rows[p.lane].push(p);
    return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// 이벤트 바 (멤버 색상 + 이름 표시)
// ─────────────────────────────────────────────────────────────────────────────

function EventBar({
    positioned,
    onClick,
}: {
    positioned: PositionedEvent;
    onClick: () => void;
}) {
    const { event, colStart, colSpan, fromLeft, toRight } = positioned;
    const ownerColor = event.task._ownerColor;
    const ownerInitial = (event.task._owner.name ?? event.task._owner.email)[0].toUpperCase();

    return (
        <div
            style={{ gridColumn: `${colStart + 1} / span ${colSpan}` }}
            className="min-w-0 px-0.5"
        >
            <button
                type="button"
                onClick={onClick}
                title={`${event.task.title} · ${event.task._owner.name ?? event.task._owner.email}`}
                className={`flex w-full items-center gap-1 truncate px-1.5 py-0.5 text-[11px] font-medium leading-tight text-white transition-opacity hover:opacity-80
                    ${fromLeft ? "rounded-l-none pl-1" : "rounded-l-full"}
                    ${toRight  ? "rounded-r-none pr-1" : "rounded-r-full"}
                    ${ownerColor}
                `}
            >
                {!fromLeft && (
                    <span
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/20 text-[9px] font-bold"
                        aria-hidden
                    >
                        {ownerInitial}
                    </span>
                )}
                <span className="truncate">{formatTaskTitleForList(event.task.title)}</span>
                {toRight && (
                    <svg className="ml-0.5 h-2.5 w-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                )}
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 멤버 필터 칩
// ─────────────────────────────────────────────────────────────────────────────

function MemberFilterChips({
    members,
    memberColors,
    selectedId,
    onSelect,
}: {
    members: WorkspaceOwner[];
    memberColors: Record<string, string>;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
}) {
    const tCal = useTranslations("projects.detail.calendar");
    return (
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-stone-100 bg-stone-50/60 sm:px-5">
            <button
                type="button"
                onClick={() => onSelect(null)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectedId === null
                        ? "bg-stone-800 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
            >
                {tCal("filterAll")}
            </button>
            {members.map(m => {
                const initial = (m.name ?? m.email)[0].toUpperCase();
                const color = memberColors[m.id] ?? "bg-stone-400";
                const isSelected = selectedId === m.id;
                return (
                    <button
                        key={m.id}
                        type="button"
                        onClick={() => onSelect(isSelected ? null : m.id)}
                        className={`flex items-center gap-1.5 rounded-full py-1 pl-1.5 pr-2.5 text-xs font-medium transition-colors ${
                            isSelected
                                ? "bg-stone-800 text-white"
                                : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-50"
                        }`}
                    >
                        <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white ${color}`}>
                            {initial}
                        </span>
                        {m.name ?? m.email}
                    </button>
                );
            })}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProjectCalendarTab
// ─────────────────────────────────────────────────────────────────────────────

function calendarLocaleTag(locale: string): string {
    if (locale === "ko") return "ko-KR";
    if (locale === "ja") return "ja-JP";
    return "en-US";
}

export default function ProjectCalendarTab({
    projectTasksData,
    taskPanelActions,
}: {
    projectTasksData: ApiProjectTasksItem[];
    taskPanelActions: WorkspaceTaskDetailActions;
}) {
    const locale = useLocale();
    const tCal = useTranslations("projects.detail.calendar");
    const localeTag = calendarLocaleTag(locale);

    const dowLabels = useMemo(
        () =>
            Array.from({ length: 7 }, (_, i) =>
                new Date(2024, 0, 7 + i).toLocaleDateString(localeTag, { weekday: "short" }),
            ),
        [localeTag],
    );

    // 멤버별 색상 매핑 (고정)
    const memberColors = useMemo<Record<string, string>>(() => {
        const map: Record<string, string> = {};
        projectTasksData.forEach((item, idx) => {
            map[item.workspace.user.id] = MEMBER_COLORS[idx % MEMBER_COLORS.length];
        });
        return map;
    }, [projectTasksData]);

    // 워크스페이스 소유자 목록 (중복 제거)
    const members = useMemo<WorkspaceOwner[]>(() => {
        const seen = new Set<string>();
        return projectTasksData
            .map(item => item.workspace.user)
            .filter(u => { if (seen.has(u.id)) return false; seen.add(u.id); return true; });
    }, [projectTasksData]);

    // 전체 업무 평탄화 + 소유자 정보 주입
    const allTasks = useMemo<EnrichedTask[]>(() => {
        return projectTasksData.flatMap(item =>
            item.tasks.map(task => ({
                ...task,
                _workspaceId: item.workspace.id,
                _owner: item.workspace.user,
                _statuses: item.statuses,
                _priorities: item.priorities,
                _ownerColor: memberColors[item.workspace.user.id] ?? "bg-stone-500",
            }))
        );
    }, [projectTasksData, memberColors]);

    // 멤버 필터
    const [filterMemberId, setFilterMemberId] = useState<string | null>(null);

    const filteredTasks = useMemo<EnrichedTask[]>(() => {
        if (!filterMemberId) return allTasks;
        return allTasks.filter(t => t._owner.id === filterMemberId);
    }, [allTasks, filterMemberId]);

    // 선택된 업무 (TaskDetailPanel용)
    const [selectedTask, setSelectedTask] = useState<EnrichedTask | null>(null);

    function handleTaskUpdated(updated: ApiWorkspaceTask) {
        setSelectedTask(prev => prev ? { ...prev, ...updated } : null);
    }

    // 캘린더 네비게이션
    const today = useMemo(() => startOfDay(new Date()), []);
    const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

    const year  = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const monthYearLabel = useMemo(
        () => new Intl.DateTimeFormat(localeTag, { year: "numeric", month: "long" }).format(viewDate),
        [viewDate, localeTag],
    );
    const weeks = getCalendarWeeks(year, month);
    const events = filteredTasks.map(getEventRange).filter(Boolean) as CalendarEvent[];

    // 업무 없는 날 통계
    const tasksWithDate = filteredTasks.filter(t => t.startDate || t.dueDate).length;
    const tasksWithoutDate = filteredTasks.length - tasksWithDate;

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* ── 헤더 ──────────────────────────────────────────────── */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setViewDate(new Date(year, month - 1, 1))}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <span className="min-w-[100px] text-center text-sm font-semibold text-stone-800">
                        {monthYearLabel}
                    </span>
                    <button
                        type="button"
                        onClick={() => setViewDate(new Date(year, month + 1, 1))}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {tasksWithoutDate > 0 && (
                        <span className="hidden text-xs text-stone-400 sm:inline">
                            {tCal("noDateHidden", { count: tasksWithoutDate })}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))}
                        className="rounded-lg border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50"
                    >
                        {tCal("today")}
                    </button>
                </div>
            </div>

            {/* ── 멤버 필터 ──────────────────────────────────────────── */}
            {members.length > 1 && (
                <MemberFilterChips
                    members={members}
                    memberColors={memberColors}
                    selectedId={filterMemberId}
                    onSelect={setFilterMemberId}
                />
            )}

            {/* ── 요일 헤더 ─────────────────────────────────────────── */}
            <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50/60">
                {dowLabels.map((d, i) => (
                    <div
                        key={i}
                        className={`py-2 text-center text-xs font-medium ${
                            i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-stone-500"
                        }`}
                    >
                        {d}
                    </div>
                ))}
            </div>

            {/* ── 달력 그리드 ────────────────────────────────────────── */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="flex flex-col divide-y divide-stone-200">
                    {weeks.map((weekDays, wi) => {
                        const eventRows = layoutWeekEvents(weekDays, events);
                        const eventAreaHeight = eventRows.length > 0 ? eventRows.length * 24 + 4 : 0;

                        return (
                            <div
                                key={wi}
                                className="relative"
                                style={{ minHeight: "calc(100vw / 7 * 0.55)" }}
                            >
                                {/* 셀 배경 + 날짜 번호 */}
                                <div className="absolute inset-0 grid grid-cols-7 divide-x divide-stone-100">
                                    {weekDays.map((day, di) => {
                                        const isCurrentMonth = day.getMonth() === month;
                                        const isToday = isSameDay(day, today);
                                        return (
                                            <div
                                                key={di}
                                                className={`relative p-2 ${
                                                    !isCurrentMonth ? "bg-stone-50/40" : "bg-white"
                                                }`}
                                            >
                                                <span
                                                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                                                        isToday
                                                            ? "bg-stone-800 text-white"
                                                            : isCurrentMonth
                                                                ? di === 0 ? "text-red-400" : di === 6 ? "text-blue-400" : "text-stone-700"
                                                                : "text-stone-300"
                                                    }`}
                                                >
                                                    {day.getDate()}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 이벤트 레인 */}
                                <div
                                    className="pointer-events-none relative"
                                    style={{ paddingTop: "36px", minHeight: `${36 + eventAreaHeight}px` }}
                                >
                                    {eventRows.map((lane, li) => (
                                        <div
                                            key={li}
                                            className="pointer-events-auto grid grid-cols-7 px-0.5 py-0.5"
                                            style={{ minHeight: "22px" }}
                                        >
                                            {(() => {
                                                const elems: React.ReactNode[] = [];
                                                let col = 0;
                                                for (const pe of lane) {
                                                    if (pe.colStart > col) {
                                                        elems.push(
                                                            <div
                                                                key={`gap-${col}`}
                                                                style={{ gridColumn: `${col + 1} / span ${pe.colStart - col}` }}
                                                            />
                                                        );
                                                    }
                                                    elems.push(
                                                        <EventBar
                                                            key={pe.event.task.id}
                                                            positioned={pe}
                                                            onClick={() => setSelectedTask(pe.event.task)}
                                                        />
                                                    );
                                                    col = pe.colStart + pe.colSpan;
                                                }
                                                if (col < 7) {
                                                    elems.push(
                                                        <div
                                                            key="gap-end"
                                                            style={{ gridColumn: `${col + 1} / span ${7 - col}` }}
                                                        />
                                                    );
                                                }
                                                return elems;
                                            })()}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── 업무 상세 패널 ──────────────────────────────────────── */}
            {selectedTask && (
                <TaskDetailPanel
                    actions={taskPanelActions}
                    task={selectedTask}
                    statuses={selectedTask._statuses}
                    priorities={selectedTask._priorities}
                    workspaceId={selectedTask._workspaceId}
                    onUpdate={handleTaskUpdated}
                    onClose={() => setSelectedTask(null)}
                />
            )}
        </div>
    );
}
