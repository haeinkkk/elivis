"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { ApiWorkspaceStatus, ApiWorkspaceTask } from "@/lib/map-api-workspace";
import { createWorkspaceTaskAction } from "@/app/actions/workspaces";
import { TAG_COLORS } from "./WorkspaceDetailClient";

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

interface CalendarEvent {
    task: ApiWorkspaceTask;
    start: Date;
    end: Date;
}

interface PositionedEvent {
    event: CalendarEvent;
    colStart: number;  // 0–6 (일=0)
    colSpan: number;   // 1–7
    fromLeft: boolean; // 이전 주에서 이어짐
    toRight: boolean;  // 다음 주로 계속됨
    lane: number;      // 같은 날 내 세로 위치
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

/** 해당 달의 달력을 구성하는 6주 × 7일 */
function getCalendarWeeks(year: number, month: number): Date[][] {
    const firstDay = new Date(year, month, 1);
    const start = new Date(firstDay);
    start.setDate(start.getDate() - start.getDay()); // 해당 주 일요일부터

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

/** task 의 날짜 범위 반환 (날짜 없으면 null) */
function getEventRange(task: ApiWorkspaceTask): CalendarEvent | null {
    const s = task.startDate ? startOfDay(new Date(task.startDate)) : null;
    const e = task.dueDate   ? startOfDay(new Date(task.dueDate))   : null;
    if (!s && !e) return null;
    return {
        task,
        start: s ?? e!,
        end:   e ?? s!,
    };
}

/** 한 주(weekDays[0]~weekDays[6])에 이벤트를 배치 */
function layoutWeekEvents(weekDays: Date[], events: CalendarEvent[]): PositionedEvent[][] {
    const weekStart = weekDays[0];
    const weekEnd   = weekDays[6];

    const visible = events.filter(e => e.start <= weekEnd && e.end >= weekStart);

    // 시작일 → 기간 내림차순 정렬
    visible.sort((a, b) => {
        const sd = a.start.getTime() - b.start.getTime();
        if (sd !== 0) return sd;
        return (b.end.getTime() - b.start.getTime()) - (a.end.getTime() - a.start.getTime());
    });

    // 레인 배정 (greedy)
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
            event: ev,
            colStart,
            colSpan,
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
// 이벤트 바 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

function EventBar({
    positioned,
    onClick,
}: {
    positioned: PositionedEvent;
    onClick: () => void;
}) {
    const { event, colStart, colSpan, fromLeft, toRight } = positioned;
    const color = TAG_COLORS[event.task.status.color] ?? TAG_COLORS.gray;

    return (
        <div
            style={{ gridColumn: `${colStart + 1} / span ${colSpan}` }}
            className="min-w-0 px-0.5"
        >
            <button
                type="button"
                onClick={onClick}
                title={event.task.title}
                className={`flex w-full items-center truncate px-1.5 py-0.5 text-[11px] font-medium leading-tight text-white transition-opacity hover:opacity-80
                    ${fromLeft ? "rounded-l-none pl-1" : "rounded-l-full"}
                    ${toRight  ? "rounded-r-none pr-1" : "rounded-r-full"}
                    ${color.dot.replace("bg-", "bg-")}
                `}
            >
                {!fromLeft && (
                    <span
                        className="mr-1 h-1.5 w-1.5 shrink-0 rounded-full bg-white/60"
                        aria-hidden
                    />
                )}
                <span className="truncate">{event.task.title}</span>
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
// 날짜 셀 내 업무 추가 팝업
// ─────────────────────────────────────────────────────────────────────────────

function DayAddPopup({
    date,
    workspaceId,
    defaultStatusId,
    onAdded,
    onClose,
}: {
    date: Date;
    workspaceId: string;
    defaultStatusId?: string;
    onAdded: (t: ApiWorkspaceTask) => void;
    onClose: () => void;
}) {
    const t = useTranslations("workspace");
    const [title, setTitle] = useState("");
    const [isPending, startTransition] = useTransition();
    const label = t("calendar.addTaskTitle", { month: date.getMonth() + 1, day: date.getDate() });

    function submit() {
        const trimmed = title.trim();
        if (!trimmed) return;
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        startTransition(async () => {
            const res = await createWorkspaceTaskAction(workspaceId, {
                title: trimmed,
                statusId: defaultStatusId,
                startDate: dateStr,
                dueDate: dateStr,
            });
            if (res.ok) { onAdded(res.task); onClose(); }
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
            <div
                className="w-full max-w-xs rounded-xl border border-stone-200 bg-white p-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <p className="mb-2 text-xs font-semibold text-stone-500">{label}</p>
                <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
                    placeholder={t("calendar.taskPlaceholder")}
                    disabled={isPending}
                    className="mb-3 w-full rounded border border-stone-300 px-2 py-1.5 text-sm outline-none focus:border-stone-500"
                />
                <div className="flex justify-end gap-1.5">
                    <button type="button" onClick={onClose}
                        className="rounded px-3 py-1 text-xs text-stone-500 hover:bg-stone-100">{t("calendar.cancel")}</button>
                    <button type="button" onClick={submit} disabled={isPending || !title.trim()}
                        className="rounded bg-stone-800 px-3 py-1 text-xs text-white hover:bg-stone-700 disabled:opacity-40">{t("calendar.add")}</button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 CalendarTab 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

export default function CalendarTab({
    tasks,
    statuses,
    workspaceId,
    onAdded,
    onSelectTask,
}: {
    tasks: ApiWorkspaceTask[];
    statuses: ApiWorkspaceStatus[];
    workspaceId: string;
    onAdded: (t: ApiWorkspaceTask) => void;
    onSelectTask: (task: ApiWorkspaceTask) => void;
}) {
    const t = useTranslations("workspace");
    const today = startOfDay(new Date());
    const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
    const [addingDay, setAddingDay] = useState<Date | null>(null);

    const DOW_LABELS = [
        t("calendar.dow.sun"), t("calendar.dow.mon"), t("calendar.dow.tue"),
        t("calendar.dow.wed"), t("calendar.dow.thu"), t("calendar.dow.fri"), t("calendar.dow.sat"),
    ];
    const MONTH_LABELS = [
        t("calendar.months.jan"), t("calendar.months.feb"), t("calendar.months.mar"),
        t("calendar.months.apr"), t("calendar.months.may"), t("calendar.months.jun"),
        t("calendar.months.jul"), t("calendar.months.aug"), t("calendar.months.sep"),
        t("calendar.months.oct"), t("calendar.months.nov"), t("calendar.months.dec"),
    ];

    const year  = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const weeks = getCalendarWeeks(year, month);
    const events = tasks.map(getEventRange).filter(Boolean) as CalendarEvent[];

    function prevMonth() { setViewDate(new Date(year, month - 1, 1)); }
    function nextMonth() { setViewDate(new Date(year, month + 1, 1)); }
    function goToday()   { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)); }

    const defaultStatusId = [...statuses].sort((a, b) => a.order - b.order)[0]?.id;

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* ── 헤더 ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                    <button type="button" onClick={prevMonth}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <span className="min-w-[100px] text-center text-sm font-semibold text-stone-800">
                        {t("calendar.yearMonth", { year, month: MONTH_LABELS[month] })}
                    </span>
                    <button type="button" onClick={nextMonth}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <button type="button" onClick={goToday}
                    className="rounded-lg border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50">
                    {t("calendar.today")}
                </button>
            </div>

            {/* ── 요일 헤더 ─────────────────────────────────────────── */}
            <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50/60">
                {DOW_LABELS.map((d, i) => (
                    <div key={d}
                        className={`py-2 text-center text-xs font-medium ${
                            i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-stone-500"
                        }`}>
                        {d}
                    </div>
                ))}
            </div>

            {/* ── 달력 그리드 ────────────────────────────────────────── */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="flex flex-col divide-y divide-stone-200">
                    {weeks.map((weekDays, wi) => {
                        const eventRows = layoutWeekEvents(weekDays, events);
                        // 이벤트 레인 높이: 각 레인 22px + 상하 패딩
                        const eventAreaHeight = eventRows.length > 0 ? eventRows.length * 24 + 4 : 0;

                        return (
                            <div
                                key={wi}
                                className="relative"
                                style={{ minHeight: "calc(100vw / 7 * 0.55)" }}
                            >
                                {/* ── 셀 배경 + 날짜 번호 (absolute, 전체 높이 채움) ── */}
                                <div className="absolute inset-0 grid grid-cols-7 divide-x divide-stone-100">
                                    {weekDays.map((day, di) => {
                                        const isCurrentMonth = day.getMonth() === month;
                                        const isToday = isSameDay(day, today);
                                        return (
                                            <div
                                                key={di}
                                                className={`group relative cursor-pointer p-2 transition-colors hover:bg-stone-50/80 ${
                                                    !isCurrentMonth ? "bg-stone-50/40" : "bg-white"
                                                }`}
                                                onClick={() => setAddingDay(day)}
                                            >
                                                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                                                    isToday
                                                        ? "bg-stone-800 text-white"
                                                        : isCurrentMonth
                                                            ? di === 0 ? "text-red-400" : di === 6 ? "text-blue-400" : "text-stone-700"
                                                            : "text-stone-300"
                                                }`}>
                                                    {day.getDate()}
                                                </span>
                                                <button
                                                    type="button"
                                                    title={t("calendar.addTaskAria")}
                                                    onClick={(e) => { e.stopPropagation(); setAddingDay(day); }}
                                                    className="absolute top-1 right-1 hidden h-5 w-5 items-center justify-center rounded text-stone-400 hover:bg-stone-200 group-hover:flex"
                                                >
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* ── 이벤트 레인 (날짜 번호 32px 아래, 셀 안에 위치) ── */}
                                <div
                                    className="relative pointer-events-none"
                                    style={{ paddingTop: "36px", minHeight: `${36 + eventAreaHeight}px` }}
                                >
                                    {eventRows.map((lane, li) => (
                                        <div
                                            key={li}
                                            className="grid grid-cols-7 py-0.5 px-0.5 pointer-events-auto"
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
                                                            onClick={() => onSelectTask(pe.event.task)}
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

            {/* ── 팝업 ─────────────────────────────────────────────── */}
            {addingDay && (
                <DayAddPopup
                    date={addingDay}
                    workspaceId={workspaceId}
                    defaultStatusId={defaultStatusId}
                    onAdded={(t) => { onAdded(t); }}
                    onClose={() => setAddingDay(null)}
                />
            )}
        </div>
    );
}
