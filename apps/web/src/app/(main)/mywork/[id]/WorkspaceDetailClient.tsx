"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import CalendarTab from "./CalendarTab";
import TaskDetailPanel from "./TaskDetailPanel";
import { useRouter } from "next/navigation";
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    DragOverlay,
    useDraggable,
    useDroppable,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type {
    ApiWorkspaceDetail,
    ApiWorkspacePriority,
    ApiWorkspaceStatus,
    ApiWorkspaceTask,
} from "@/lib/map-api-workspace";
import {
    createWorkspaceTaskAction,
    updateWorkspaceTaskAction,
    deleteWorkspaceTaskAction,
    createWorkspaceStatusAction,
    updateWorkspaceStatusAction,
    deleteWorkspaceStatusAction,
    createWorkspacePriorityAction,
    updateWorkspacePriorityAction,
    deleteWorkspacePriorityAction,
    reorderWorkspaceTasksAction,
} from "@/app/actions/workspaces";

// ─────────────────────────────────────────────────────────────────────────────
// 탭 정의
// ─────────────────────────────────────────────────────────────────────────────

type WorkspaceTab = "mywork" | "summary" | "requests" | "calendar";
const TABS: { id: WorkspaceTab; label: string }[] = [
    { id: "mywork",   label: "내 작업공간" },
    { id: "summary",  label: "업무 요약" },
    { id: "requests", label: "요청업무" },
    { id: "calendar", label: "캘린더" },
];

// ─────────────────────────────────────────────────────────────────────────────
// 색상 팔레트
// ─────────────────────────────────────────────────────────────────────────────

export const TAG_COLORS: Record<string, { badge: string; dot: string; label: string }> = {
    gray:   { badge: "bg-stone-100 text-stone-600",   dot: "bg-stone-400",   label: "회색" },
    red:    { badge: "bg-red-100 text-red-700",        dot: "bg-red-500",     label: "빨강" },
    orange: { badge: "bg-orange-100 text-orange-700",  dot: "bg-orange-500",  label: "주황" },
    yellow: { badge: "bg-yellow-100 text-yellow-700",  dot: "bg-yellow-500",  label: "노랑" },
    green:  { badge: "bg-green-100 text-green-700",    dot: "bg-green-500",   label: "초록" },
    blue:   { badge: "bg-blue-100 text-blue-700",      dot: "bg-blue-500",    label: "파랑" },
    purple: { badge: "bg-purple-100 text-purple-700",  dot: "bg-purple-500",  label: "보라" },
    pink:   { badge: "bg-pink-100 text-pink-700",      dot: "bg-pink-500",    label: "분홍" },
};
const COLOR_KEYS = Object.keys(TAG_COLORS);

type TagColorResult = { badge: string; dot: string; label: string; badgeStyle?: React.CSSProperties; dotStyle?: React.CSSProperties };

function tagColorOf(color: string): TagColorResult {
    if (color in TAG_COLORS) return TAG_COLORS[color];
    if (/^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$/.test(color)) {
        return {
            badge: "",
            dot: "",
            label: "커스텀",
            badgeStyle: { backgroundColor: color + "1a", color },
            dotStyle: { backgroundColor: color },
        };
    }
    return TAG_COLORS.gray;
}

// ─────────────────────────────────────────────────────────────────────────────
// 재사용 태그 드롭다운 (상태 / 우선순위 공용)
// ─────────────────────────────────────────────────────────────────────────────

type TagItem = { id: string; name: string; color: string; order: number; value?: number };

function TagDropdown({
    selectedId,
    items,
    nullable,
    workspaceId,
    disabled,
    placeholder = "없음",
    onCreate,
    onUpdate,
    onDelete,
    onChange,
    onItemsChange,
}: {
    selectedId: string | null;
    items: TagItem[];
    nullable?: boolean;
    workspaceId: string;
    disabled?: boolean;
    placeholder?: string;
    onCreate: (workspaceId: string, input: { name: string; color: string }) => Promise<{ ok: true; item: TagItem } | { ok: false; message: string }>;
    onUpdate: (workspaceId: string, id: string, input: { name?: string; color?: string }) => Promise<{ ok: true; item: TagItem } | { ok: false; message: string }>;
    onDelete: (workspaceId: string, id: string) => Promise<{ ok: true } | { ok: false; message: string }>;
    onChange: (newId: string | null) => void;
    onItemsChange: (items: TagItem[]) => void;
}) {
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editColor, setEditColor] = useState("gray");
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [newColor, setNewColor] = useState("gray");
    const [isPending, startTransition] = useTransition();
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const current = selectedId ? items.find((i) => i.id === selectedId) : null;
    const cm = tagColorOf(current?.color ?? "gray");

    useEffect(() => {
        function handler(e: MouseEvent) {
            const t = e.target as Node;
            if (
                triggerRef.current && !triggerRef.current.contains(t) &&
                menuRef.current && !menuRef.current.contains(t)
            ) {
                setOpen(false); setAdding(false); setEditingId(null);
            }
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    function handleOpen() {
        if (!open && triggerRef.current) {
            const r = triggerRef.current.getBoundingClientRect();
            const estimatedHeight = 280;
            const spaceBelow = window.innerHeight - r.bottom;
            const top = spaceBelow < estimatedHeight && r.top > estimatedHeight
                ? r.top - estimatedHeight - 4
                : r.bottom + 4;
            setMenuStyle({ position: "fixed", top, left: r.left, width: "208px", zIndex: 9999 });
        }
        setOpen((v) => !v);
    }

    function startEdit(s: TagItem) { setEditingId(s.id); setEditName(s.name); setEditColor(s.color); }

    function submitEdit(s: TagItem) {
        if (!editName.trim() || (editName.trim() === s.name && editColor === s.color)) { setEditingId(null); return; }
        startTransition(async () => {
            const res = await onUpdate(workspaceId, s.id, { name: editName.trim(), color: editColor });
            if (res.ok) onItemsChange(items.map((it) => (it.id === s.id ? res.item : it)));
            setEditingId(null);
        });
    }

    function handleDelete(s: TagItem) {
        startTransition(async () => {
            const res = await onDelete(workspaceId, s.id);
            if (res.ok) {
                const next = items.filter((it) => it.id !== s.id);
                onItemsChange(next);
                if (selectedId === s.id) onChange(next[0]?.id ?? null);
            }
        });
    }

    function submitNew() {
        if (!newName.trim()) return;
        startTransition(async () => {
            const res = await onCreate(workspaceId, { name: newName.trim(), color: newColor });
            if (res.ok) { onItemsChange([...items, res.item]); setNewName(""); setNewColor("gray"); setAdding(false); }
        });
    }

    const menu = open && mounted ? createPortal(
        <div ref={menuRef} style={menuStyle}
            className="rounded-xl border border-stone-200 bg-white py-1.5 shadow-xl">
            <div className="max-h-72 overflow-y-auto">
                    {nullable && (
                        <button
                            type="button"
                            onClick={() => { onChange(null); setOpen(false); }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-400 hover:bg-stone-50"
                        >
                            <span className="h-2.5 w-2.5 rounded-full bg-stone-300" /> 없음
                        </button>
                    )}
                    {items.map((s) => {
                        const icm = tagColorOf(s.color);
                        return (
                            <div key={s.id} className="group flex items-center gap-1.5 px-2 py-0.5">
                                {editingId === s.id ? (
                                    <div className="flex w-full flex-col gap-1 py-1">
                                        <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === "Enter") submitEdit(s); if (e.key === "Escape") setEditingId(null); }}
                                            className="w-full rounded border border-stone-300 px-2 py-0.5 text-xs outline-none focus:border-stone-500"
                                        />
                                        <div className="flex flex-wrap items-center gap-1 px-0.5">
                                            {COLOR_KEYS.map((ck) => (
                                                <button key={ck} type="button" title={TAG_COLORS[ck].label} onClick={() => setEditColor(ck)}
                                                    className={`h-4 w-4 rounded-full ${TAG_COLORS[ck].dot} ring-offset-1 transition-transform hover:scale-110 ${editColor === ck ? "ring-2 ring-stone-500" : ""}`} />
                                            ))}
                                            <label title="커스텀 색상" className={`relative h-4 w-4 cursor-pointer overflow-hidden rounded-full ring-offset-1 transition-transform hover:scale-110 ${!COLOR_KEYS.includes(editColor) ? "ring-2 ring-stone-500" : ""}`}>
                                                <div className="h-full w-full rounded-full" style={{ background: !COLOR_KEYS.includes(editColor) ? editColor : "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }} />
                                                <input type="color" value={COLOR_KEYS.includes(editColor) ? "#6366f1" : editColor} onChange={(e) => setEditColor(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                                            </label>
                                        </div>
                                        <div className="flex justify-end gap-1">
                                            <button type="button" onClick={() => setEditingId(null)} className="rounded px-1.5 py-0.5 text-[10px] text-stone-400 hover:bg-stone-100">취소</button>
                                            <button type="button" onClick={() => submitEdit(s)} disabled={isPending} className="rounded bg-stone-800 px-1.5 py-0.5 text-[10px] text-white hover:bg-stone-700">저장</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <button type="button" onClick={() => { onChange(s.id); setOpen(false); }}
                                            className="flex flex-1 items-center gap-2 rounded-md px-1.5 py-1 hover:bg-stone-50">
                                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${icm.dot}`} style={icm.dotStyle} />
                                            <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${icm.badge} ${s.id === selectedId ? "ring-1 ring-stone-400" : ""}`} style={icm.badgeStyle}>
                                                {s.name}
                                            </span>
                                        </button>
                                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                            <button type="button" title="편집" onClick={() => startEdit(s)}
                                                className="rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600">
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3.414 1a1 1 0 01-1.243-1.243l1-3.414A4 4 0 019 13z" />
                                                </svg>
                                            </button>
                                            {(nullable || items.length > 1) && (
                                                <button type="button" title="삭제" onClick={() => handleDelete(s)} disabled={isPending}
                                                    className="rounded p-0.5 text-stone-400 hover:bg-red-50 hover:text-red-500">
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                    <div className="my-1 border-t border-stone-100" />
                    {adding ? (
                        <div className="flex flex-col gap-1.5 px-3 py-1.5">
                            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") submitNew(); if (e.key === "Escape") { setAdding(false); setNewName(""); } }}
                                placeholder="이름 입력"
                                className="w-full rounded border border-stone-300 px-2 py-0.5 text-xs outline-none focus:border-stone-500"
                            />
                            <div className="flex flex-wrap items-center gap-1">
                                {COLOR_KEYS.map((ck) => (
                                    <button key={ck} type="button" title={TAG_COLORS[ck].label} onClick={() => setNewColor(ck)}
                                        className={`h-4 w-4 rounded-full ${TAG_COLORS[ck].dot} ring-offset-1 transition-transform hover:scale-110 ${newColor === ck ? "ring-2 ring-stone-500" : ""}`} />
                                ))}
                                <label title="커스텀 색상" className={`relative h-4 w-4 cursor-pointer overflow-hidden rounded-full ring-offset-1 transition-transform hover:scale-110 ${!COLOR_KEYS.includes(newColor) ? "ring-2 ring-stone-500" : ""}`}>
                                    <div className="h-full w-full rounded-full" style={{ background: !COLOR_KEYS.includes(newColor) ? newColor : "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }} />
                                    <input type="color" value={COLOR_KEYS.includes(newColor) ? "#6366f1" : newColor} onChange={(e) => setNewColor(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                                </label>
                            </div>
                            <div className="flex justify-end gap-1">
                                <button type="button" onClick={() => { setAdding(false); setNewName(""); }} className="rounded px-2 py-0.5 text-[10px] text-stone-400 hover:bg-stone-100">취소</button>
                                <button type="button" onClick={submitNew} disabled={isPending || !newName.trim()} className="rounded bg-stone-800 px-2 py-0.5 text-[10px] text-white hover:bg-stone-700 disabled:opacity-40">추가</button>
                            </div>
                        </div>
                    ) : (
                        <button type="button" onClick={() => setAdding(true)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-500 hover:bg-stone-50">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            추가
                        </button>
                    )}
                </div>
        </div>,
        document.body
    ) : null;

    return (
        <div className="inline-block">
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={handleOpen}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-opacity ${
                    current ? cm.badge : "bg-stone-100 text-stone-400"
                } ${disabled ? "opacity-50" : "hover:opacity-80"}`}
                style={current ? cm.badgeStyle : undefined}
            >
                {current ? (
                    <><span className={`h-2 w-2 rounded-full ${cm.dot}`} style={cm.dotStyle} />{current.name}</>
                ) : placeholder}
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {menu}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 우선순위 모달 (추가 / 편집)
// ─────────────────────────────────────────────────────────────────────────────

function PriorityModal({
    workspaceId,
    editing,
    onSave,
    onClose,
}: {
    workspaceId: string;
    editing: TagItem | null;
    onSave: (item: TagItem) => void;
    onClose: () => void;
}) {
    const [name, setName] = useState(editing?.name ?? "");
    const [color, setColor] = useState(editing?.color ?? "gray");
    const [value, setValue] = useState(String(editing?.value ?? 50));
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");

    function submit() {
        const trimmed = name.trim();
        if (!trimmed) { setError("이름을 입력하세요."); return; }
        const numVal = Math.max(0, Math.min(100, parseInt(value) || 0));
        startTransition(async () => {
            if (editing) {
                const res = await updateWorkspacePriorityAction(workspaceId, editing.id, { name: trimmed, color, value: numVal });
                if (!res.ok) { setError(res.message); return; }
                onSave({ ...editing, name: trimmed, color, value: numVal });
            } else {
                const res = await createWorkspacePriorityAction(workspaceId, { name: trimmed, color, value: numVal });
                if (!res.ok) { setError(res.message); return; }
                onSave(res.priority as unknown as TagItem);
            }
            onClose();
        });
    }

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
            <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="mb-5 text-base font-semibold text-stone-800">
                    {editing ? "우선순위 편집" : "우선순위 추가"}
                </h3>

                {/* 이름 */}
                <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-medium text-stone-600">이름</label>
                    <input
                        autoFocus
                        value={name}
                        onChange={(e) => { setName(e.target.value); setError(""); }}
                        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
                        placeholder="우선순위 이름"
                        className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-stone-400"
                    />
                </div>

                {/* 가중치 */}
                <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-medium text-stone-600">
                        가중치 <span className="text-stone-400 font-normal">(0~100 · 높을수록 먼저 처리)</span>
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={parseInt(value) || 0}
                            onChange={(e) => setValue(e.target.value)}
                            className="flex-1 accent-stone-800"
                        />
                        <input
                            type="number"
                            min={0}
                            max={100}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="w-16 rounded-lg border border-stone-200 px-2 py-1.5 text-center text-sm outline-none focus:border-stone-400"
                        />
                    </div>
                </div>

                {/* 색상 */}
                <div className="mb-5">
                    <label className="mb-2 block text-xs font-medium text-stone-600">색상</label>
                    <div className="flex flex-wrap items-center gap-2">
                        {COLOR_KEYS.map((ck) => (
                            <button
                                key={ck}
                                type="button"
                                title={TAG_COLORS[ck].label}
                                onClick={() => setColor(ck)}
                                className={`h-7 w-7 rounded-full ${TAG_COLORS[ck].dot} ring-offset-2 transition-transform hover:scale-110 ${color === ck ? "ring-2 ring-stone-600" : ""}`}
                            />
                        ))}
                        <label
                            title="커스텀 색상"
                            className={`relative h-7 w-7 cursor-pointer overflow-hidden rounded-full ring-offset-2 transition-transform hover:scale-110 ${!COLOR_KEYS.includes(color) ? "ring-2 ring-stone-600" : ""}`}
                        >
                            <div
                                className="h-full w-full rounded-full"
                                style={{
                                    background: !COLOR_KEYS.includes(color)
                                        ? color
                                        : "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
                                }}
                            />
                            <input
                                type="color"
                                value={COLOR_KEYS.includes(color) ? "#6366f1" : color}
                                onChange={(e) => setColor(e.target.value)}
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            />
                        </label>
                    </div>
                </div>

                {/* 미리보기 */}
                {(() => {
                    const pc = tagColorOf(color);
                    return (
                        <div className="mb-5 flex items-center gap-2">
                            <span className="text-xs text-stone-400">미리보기</span>
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${pc.badge}`} style={pc.badgeStyle}>
                                <span className={`h-2 w-2 rounded-full ${pc.dot}`} style={pc.dotStyle} />
                                {name || "이름 없음"}
                                {parseInt(value) > 0 && <span className="ml-0.5 opacity-60">·{value}</span>}
                            </span>
                        </div>
                    );
                })()}

                {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-stone-500 hover:bg-stone-50">취소</button>
                    <button type="button" onClick={submit} disabled={isPending || !name.trim()}
                        className="rounded-xl bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-40">
                        {editing ? "저장" : "추가"}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 우선순위 드롭다운 (선택 인라인 + 편집/추가는 모달)
// ─────────────────────────────────────────────────────────────────────────────

function PriorityDropdown({
    selectedId,
    items,
    workspaceId,
    disabled,
    onChange,
    onItemsChange,
}: {
    selectedId: string | null;
    items: TagItem[];
    workspaceId: string;
    disabled?: boolean;
    onChange: (id: string | null) => void;
    onItemsChange: (items: TagItem[]) => void;
}) {
    const [open, setOpen] = useState(false);
    const [modal, setModal] = useState<{ editing: TagItem | null } | null>(null);
    const [mounted, setMounted] = useState(false);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
    const [isPending, startTransition] = useTransition();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        function handler(e: MouseEvent) {
            const t = e.target as Node;
            if (triggerRef.current && !triggerRef.current.contains(t) && menuRef.current && !menuRef.current.contains(t)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    function handleOpen() {
        if (!open && triggerRef.current) {
            const r = triggerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - r.bottom;
            const top = spaceBelow < 260 && r.top > 260 ? r.top - 260 - 4 : r.bottom + 4;
            setMenuStyle({ position: "fixed", top, left: r.left, width: "220px", zIndex: 9999 });
        }
        setOpen((v) => !v);
    }

    function handleDelete(item: TagItem) {
        startTransition(async () => {
            const res = await deleteWorkspacePriorityAction(workspaceId, item.id);
            if (res.ok) {
                const next = items.filter((i) => i.id !== item.id);
                onItemsChange(next);
                if (selectedId === item.id) onChange(null);
            }
        });
    }

    const current = selectedId ? items.find((i) => i.id === selectedId) : null;
    const cm = tagColorOf(current?.color ?? "gray");
    const sorted = [...items].sort((a, b) => (b.value ?? 0) - (a.value ?? 0) || a.order - b.order);

    const menu = open && mounted ? createPortal(
        <div ref={menuRef} style={menuStyle} className="rounded-xl border border-stone-200 bg-white py-1.5 shadow-xl">
            <div className="max-h-64 overflow-y-auto">
                <button type="button" onClick={() => { onChange(null); setOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-400 hover:bg-stone-50">
                    <span className="h-2.5 w-2.5 rounded-full bg-stone-300" /> 없음
                </button>
                {sorted.map((item) => {
                    const icm = tagColorOf(item.color);
                    return (
                        <div key={item.id} className="group flex items-center gap-1 px-2 py-0.5">
                            <button type="button" onClick={() => { onChange(item.id); setOpen(false); }}
                                className="flex flex-1 items-center gap-2 rounded-md px-1.5 py-1 hover:bg-stone-50">
                                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${icm.dot}`} style={icm.dotStyle} />
                                <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${icm.badge} ${item.id === selectedId ? "ring-1 ring-stone-400" : ""}`} style={icm.badgeStyle}>
                                    {item.name}
                                </span>
                                {(item.value ?? 0) > 0 && (
                                    <span className="ml-auto text-[10px] text-stone-400">{item.value}</span>
                                )}
                            </button>
                            <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
                                <button type="button" title="편집" onClick={() => { setModal({ editing: item }); setOpen(false); }}
                                    className="rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600">
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3.414 1a1 1 0 01-1.243-1.243l1-3.414A4 4 0 019 13z" />
                                    </svg>
                                </button>
                                <button type="button" title="삭제" disabled={isPending} onClick={() => handleDelete(item)}
                                    className="rounded p-0.5 text-stone-400 hover:bg-red-50 hover:text-red-500">
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="border-t border-stone-100 mt-1" />
            <button type="button" onClick={() => { setModal({ editing: null }); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-500 hover:bg-stone-50">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                우선순위 추가
            </button>
        </div>,
        document.body,
    ) : null;

    return (
        <div className="inline-block">
            <button ref={triggerRef} type="button" disabled={disabled} onClick={handleOpen}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-opacity ${current ? cm.badge : "bg-stone-100 text-stone-400"} ${disabled ? "opacity-50" : "hover:opacity-80"}`}
                style={current ? cm.badgeStyle : undefined}>
                {current
                    ? <><span className={`h-2 w-2 rounded-full ${cm.dot}`} style={cm.dotStyle} />{current.name}{(current.value ?? 0) > 0 && <span className="opacity-50">·{current.value}</span>}</>
                    : "없음"}
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {menu}
            {modal && (
                <PriorityModal
                    workspaceId={workspaceId}
                    editing={modal.editing}
                    onSave={(saved) => {
                        if (modal.editing) {
                            onItemsChange(items.map((i) => i.id === saved.id ? saved : i));
                        } else {
                            onItemsChange([...items, saved]);
                            onChange(saved.id);
                        }
                    }}
                    onClose={() => setModal(null)}
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 날짜 셀
// ─────────────────────────────────────────────────────────────────────────────

function DateCell({
    value,
    disabled,
    onCommit,
}: {
    value: string | null;
    disabled?: boolean;
    onCommit: (v: string | null) => void;
}) {
    const [editing, setEditing] = useState(false);

    if (editing) {
        return (
            <input
                type="date"
                autoFocus
                defaultValue={value ? value.slice(0, 10) : ""}
                className="rounded border border-stone-300 px-1.5 py-0.5 text-xs outline-none focus:border-stone-500"
                onChange={(e) => {
                    onCommit(e.target.value || null);
                    setEditing(false);
                }}
                onBlur={() => setEditing(false)}
                disabled={disabled}
            />
        );
    }

    const formatted = value
        ? (() => {
            const d = new Date(value);
            return `${d.getMonth() + 1}/${d.getDate()}`;
        })()
        : null;

    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => setEditing(true)}
            className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
                formatted
                    ? "font-medium text-stone-700 hover:bg-stone-100"
                    : "text-stone-300 hover:text-stone-500"
            }`}
        >
            {formatted ?? "—"}
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// AssigneeChip
// ─────────────────────────────────────────────────────────────────────────────

function AssigneeChip({ assignee }: { assignee: ApiWorkspaceTask["assignee"] }) {
    if (!assignee) return <span className="text-xs text-stone-400">—</span>;
    const name = assignee.name?.trim() || assignee.email.split("@")[0];
    return (
        <div className="flex items-center gap-1.5">
            {assignee.avatarUrl ? (
                <img src={assignee.avatarUrl} alt={name} className="h-5 w-5 rounded-full object-cover ring-1 ring-white" />
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
// 인라인 업무 추가 폼
// ─────────────────────────────────────────────────────────────────────────────

function InlineAddForm({
    workspaceId,
    defaultStatusId,
    parentId,
    onAdded,
    onCancel,
    placeholder = "업무 제목 입력 후 Enter",
}: {
    workspaceId: string;
    defaultStatusId?: string;
    parentId?: string;
    onAdded: (task: ApiWorkspaceTask) => void;
    onCancel: () => void;
    placeholder?: string;
}) {
    const [title, setTitle] = useState("");
    const [isPending, startTransition] = useTransition();

    function submit() {
        const trimmed = title.trim();
        if (!trimmed) return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = today.toISOString();
        startTransition(async () => {
            const res = await createWorkspaceTaskAction(workspaceId, { title: trimmed, statusId: defaultStatusId, parentId, startDate });
            if (res.ok) { onAdded(res.task); setTitle(""); onCancel(); }
        });
    }

    return (
        <div className="flex items-center gap-2 rounded-md border border-stone-300 bg-white px-2 py-1.5">
            <input autoFocus className="min-w-0 flex-1 text-sm outline-none placeholder:text-stone-400"
                placeholder={placeholder} value={title} onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel(); }}
                disabled={isPending}
            />
            <button type="button" onClick={onCancel} className="shrink-0 text-xs text-stone-400 hover:text-stone-600" disabled={isPending}>취소</button>
            <button type="button" onClick={submit} disabled={isPending || !title.trim()}
                className="shrink-0 rounded bg-stone-800 px-2 py-0.5 text-xs text-white hover:bg-stone-700 disabled:opacity-40">추가</button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 리스트 뷰 업무 행
// ─────────────────────────────────────────────────────────────────────────────

interface TaskRowProps {
    task: ApiWorkspaceTask;
    subTasks: ApiWorkspaceTask[];
    allTasks: ApiWorkspaceTask[];
    statuses: ApiWorkspaceStatus[];
    priorities: ApiWorkspacePriority[];
    workspaceId: string;
    depth: number;
    isDragging?: boolean;
    dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
    onUpdate: (t: ApiWorkspaceTask) => void;
    onDelete: (id: string) => void;
    onAdded: (t: ApiWorkspaceTask) => void;
    onStatusesChange: (s: ApiWorkspaceStatus[]) => void;
    onPrioritiesChange: (p: ApiWorkspacePriority[]) => void;
    onOpenPanel: (t: ApiWorkspaceTask) => void;
}

const TaskRow = ({
    task, subTasks, allTasks, statuses, priorities, workspaceId, depth,
    isDragging, dragHandleProps,
    onUpdate, onDelete, onAdded, onStatusesChange, onPrioritiesChange, onOpenPanel,
}: TaskRowProps) => {
    const [isPending, startTransition] = useTransition();
    const [addingSub, setAddingSub] = useState(false);
    const [expanded, setExpanded] = useState(true);

    const isTop = depth === 0;
    const indentPx = depth * 20;
    const hasChildren = subTasks.length > 0;

    function updateField(input: Parameters<typeof updateWorkspaceTaskAction>[2]) {
        startTransition(async () => {
            const res = await updateWorkspaceTaskAction(workspaceId, task.id, input);
            if (res.ok) onUpdate(res.task);
        });
    }

    // 상태 CRUD 어댑터
    const statusCreateAdapter = useCallback(async (wsId: string, input: { name: string; color: string }) => {
        const res = await createWorkspaceStatusAction(wsId, input);
        if (res.ok) return { ok: true as const, item: res.status as TagItem };
        return { ok: false as const, message: res.message };
    }, []);
    const statusUpdateAdapter = useCallback(async (wsId: string, id: string, input: { name?: string; color?: string }) => {
        const res = await updateWorkspaceStatusAction(wsId, id, input);
        if (res.ok) return { ok: true as const, item: res.status as TagItem };
        return { ok: false as const, message: res.message };
    }, []);
    const statusDeleteAdapter = useCallback(async (wsId: string, id: string) => {
        return deleteWorkspaceStatusAction(wsId, id);
    }, []);

    return (
        <>
            <tr
                className={`group border-b transition-opacity ${isPending ? "opacity-50" : ""} ${isDragging ? "opacity-30" : ""} ${
                    isTop
                        ? "border-stone-200 bg-white hover:bg-stone-50/60"
                        : "border-stone-100 bg-stone-50/20 hover:bg-stone-50/40"
                }`}
            >
                {/* 드래그 핸들 (최상위만) */}
                <td className="w-6 py-2 pl-2">
                    {isTop ? (
                        <button
                            type="button"
                            className="cursor-grab touch-none text-stone-300 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
                            {...dragHandleProps}
                            title="드래그하여 순서 변경"
                        >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8-16a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                            </svg>
                        </button>
                    ) : (
                        <span className="inline-block w-4" />
                    )}
                </td>

                {/* 제목 */}
                <td className="py-2 pr-3" style={{ paddingLeft: `${4 + indentPx}px` }}>
                    <div className="flex items-center gap-1.5">
                        {hasChildren ? (
                            <button type="button" onClick={() => setExpanded((v) => !v)}
                                className="flex h-4 w-4 shrink-0 items-center justify-center text-stone-400 hover:text-stone-600">
                                <svg className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        ) : <span className="h-4 w-4 shrink-0" />}
                        <button type="button" onClick={() => onOpenPanel(task)}
                            className={`flex-1 text-left hover:underline ${isTop ? "text-sm font-semibold text-stone-900" : "text-sm text-stone-600"}`}>
                            {task.title}
                        </button>
                    </div>
                </td>

                {/* 상태 */}
                <td className="py-2 pr-2 text-center">
                    <div className="flex justify-center">
                    <TagDropdown
                        selectedId={task.statusId}
                        items={statuses}
                        workspaceId={workspaceId}
                        disabled={isPending}
                        onChange={(id) => { if (id) updateField({ statusId: id }); }}
                        onItemsChange={(items) => onStatusesChange(items as unknown as ApiWorkspaceStatus[])}
                        onCreate={statusCreateAdapter}
                        onUpdate={statusUpdateAdapter}
                        onDelete={statusDeleteAdapter}
                    />
                    </div>
                </td>

                {/* 우선순위 */}
                <td className="py-2 pr-2 text-center">
                    <div className="flex justify-center">
                    <PriorityDropdown
                        selectedId={task.priorityId}
                        items={priorities as unknown as TagItem[]}
                        workspaceId={workspaceId}
                        disabled={isPending}
                        onChange={(id) => updateField({ priorityId: id })}
                        onItemsChange={(items) => onPrioritiesChange(items as unknown as ApiWorkspacePriority[])}
                    />
                    </div>
                </td>

                {/* 담당자 */}
                <td className="hidden py-2 pr-3 text-center sm:table-cell">
                    <div className="flex justify-center">
                        <AssigneeChip assignee={task.assignee} />
                    </div>
                </td>

                {/* 시작일 */}
                <td className="hidden py-2 pr-2 text-center md:table-cell">
                    <div className="flex justify-center">
                        <DateCell
                            value={task.startDate}
                            disabled={isPending}
                            onCommit={(v) => updateField({ startDate: v })}
                        />
                    </div>
                </td>

                {/* 종료일 */}
                <td className="hidden py-2 pr-2 text-center md:table-cell">
                    <div className="flex justify-center">
                        <DateCell
                            value={task.dueDate}
                            disabled={isPending}
                            onCommit={(v) => updateField({ dueDate: v })}
                        />
                    </div>
                </td>

                {/* 액션 */}
                <td className="py-2 pr-2">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        {depth < 2 && (
                            <button type="button" onClick={() => setAddingSub(true)}
                                className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600" title="하위 업무 추가">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        )}
                        <button type="button" onClick={() => startTransition(async () => {
                            const res = await deleteWorkspaceTaskAction(workspaceId, task.id);
                            if (res.ok) onDelete(task.id);
                        })} disabled={isPending}
                            className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-500" title="삭제">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>

            {addingSub && (
                <tr>
                    <td colSpan={8} style={{ paddingLeft: `${28 + (depth + 1) * 20}px` }} className="py-1.5 pr-3">
                        <InlineAddForm workspaceId={workspaceId} defaultStatusId={task.statusId} parentId={task.id}
                            onAdded={(t) => { onAdded(t); setExpanded(true); }} onCancel={() => setAddingSub(false)}
                            placeholder="하위 업무 제목 입력 후 Enter" />
                    </td>
                </tr>
            )}

            {expanded && subTasks.map((sub) => (
                <TaskRow key={sub.id} task={sub}
                    subTasks={allTasks.filter((t) => t.parentId === sub.id)}
                    allTasks={allTasks} statuses={statuses} priorities={priorities}
                    workspaceId={workspaceId} depth={depth + 1}
                    onUpdate={onUpdate} onDelete={onDelete} onAdded={onAdded}
                    onStatusesChange={onStatusesChange} onPrioritiesChange={onPrioritiesChange}
                    onOpenPanel={onOpenPanel}
                />
            ))}
        </>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// 리스트 뷰 — 드래그 가능 행 래퍼
// ─────────────────────────────────────────────────────────────────────────────

function SortableTaskRow(props: TaskRowProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id });
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
    };
    return (
        <tbody ref={setNodeRef} style={style}>
            <TaskRow {...props} isDragging={isDragging} dragHandleProps={{ ...attributes, ...listeners }} />
        </tbody>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 보드 카드 (드래그 가능)
// ─────────────────────────────────────────────────────────────────────────────

function DraggableTaskCard({
    task, statuses, priorities, workspaceId, onUpdate, onDelete, onStatusesChange, onPrioritiesChange,
}: {
    task: ApiWorkspaceTask;
    statuses: ApiWorkspaceStatus[];
    priorities: ApiWorkspacePriority[];
    workspaceId: string;
    onUpdate: (t: ApiWorkspaceTask) => void;
    onDelete: (id: string) => void;
    onStatusesChange: (s: ApiWorkspaceStatus[]) => void;
    onPrioritiesChange: (p: ApiWorkspacePriority[]) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, data: { task } });
    const [isPending, startTransition] = useTransition();

    const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), opacity: isDragging ? 0.3 : 1 };

    // 상태 어댑터
    const statusCreateAdapter = useCallback(async (wsId: string, input: { name: string; color: string }) => {
        const res = await createWorkspaceStatusAction(wsId, input);
        if (res.ok) return { ok: true as const, item: res.status as TagItem };
        return { ok: false as const, message: res.message };
    }, []);
    const statusUpdateAdapter = useCallback(async (wsId: string, id: string, input: { name?: string; color?: string }) => {
        const res = await updateWorkspaceStatusAction(wsId, id, input);
        if (res.ok) return { ok: true as const, item: res.status as TagItem };
        return { ok: false as const, message: res.message };
    }, []);

    return (
        <div ref={setNodeRef} style={style}
            className={`rounded-lg border border-stone-200 bg-white p-3 shadow-sm transition-opacity ${isPending ? "opacity-50" : ""}`}>
            {/* 드래그 핸들 + 삭제 */}
            <div className="mb-1.5 flex items-center justify-between gap-1">
                <button type="button" {...attributes} {...listeners}
                    className="cursor-grab touch-none text-stone-300 hover:text-stone-400 active:cursor-grabbing" title="드래그">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8-16a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                    </svg>
                </button>
                <button type="button" onClick={() => startTransition(async () => { const res = await deleteWorkspaceTaskAction(workspaceId, task.id); if (res.ok) onDelete(task.id); })}
                    disabled={isPending} className="shrink-0 rounded p-0.5 text-stone-300 hover:bg-red-50 hover:text-red-400">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <p className="mb-2 text-sm font-medium text-stone-800">{task.title}</p>
            <div className="flex flex-wrap items-center gap-1.5">
                <TagDropdown selectedId={task.statusId} items={statuses} workspaceId={workspaceId} disabled={isPending}
                    onChange={(id) => { if (id) { startTransition(async () => { const res = await updateWorkspaceTaskAction(workspaceId, task.id, { statusId: id }); if (res.ok) onUpdate(res.task); }); } }}
                    onItemsChange={(items) => onStatusesChange(items as unknown as ApiWorkspaceStatus[])}
                    onCreate={statusCreateAdapter} onUpdate={statusUpdateAdapter}
                    onDelete={async (wsId, id) => deleteWorkspaceStatusAction(wsId, id)} />
                <PriorityDropdown
                    selectedId={task.priorityId}
                    items={priorities as unknown as TagItem[]}
                    workspaceId={workspaceId}
                    disabled={isPending}
                    onChange={(id) => startTransition(async () => { const res = await updateWorkspaceTaskAction(workspaceId, task.id, { priorityId: id }); if (res.ok) onUpdate(res.task); })}
                    onItemsChange={(items) => onPrioritiesChange(items as unknown as ApiWorkspacePriority[])}
                />
            </div>
            {(task.startDate || task.dueDate) && (
                <div className="mt-1.5 flex items-center gap-1 text-xs text-stone-500">
                    {task.startDate && <span>{new Date(task.startDate).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}</span>}
                    {task.startDate && task.dueDate && <span>~</span>}
                    {task.dueDate && <span>{new Date(task.dueDate).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}</span>}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 보드 컬럼 (드롭 가능)
// ─────────────────────────────────────────────────────────────────────────────

function DroppableColumn({
    status, tasks, statuses, priorities, workspaceId, onUpdate, onDelete, onAdded, onStatusesChange, onPrioritiesChange,
}: {
    status: ApiWorkspaceStatus;
    tasks: ApiWorkspaceTask[];
    statuses: ApiWorkspaceStatus[];
    priorities: ApiWorkspacePriority[];
    workspaceId: string;
    onUpdate: (t: ApiWorkspaceTask) => void;
    onDelete: (id: string) => void;
    onAdded: (t: ApiWorkspaceTask) => void;
    onStatusesChange: (s: ApiWorkspaceStatus[]) => void;
    onPrioritiesChange: (p: ApiWorkspacePriority[]) => void;
}) {
    const { isOver, setNodeRef } = useDroppable({ id: status.id });
    const [adding, setAdding] = useState(false);
    const cm = tagColorOf(status.color);

    return (
        <div className={`flex min-w-[260px] flex-col rounded-xl border transition-colors ${isOver ? "border-blue-300 bg-blue-50/30" : "border-stone-200 bg-stone-50/50"}`}>
            <div className="flex items-center justify-between border-b border-stone-200 px-3 py-2.5">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cm.badge}`} style={cm.badgeStyle}>{status.name}</span>
                <span className="rounded-full bg-stone-200 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">{tasks.length}</span>
            </div>
            <div ref={setNodeRef} className="flex min-h-[60px] flex-1 flex-col gap-2 p-2">
                {tasks.map((task) => (
                    <DraggableTaskCard key={task.id} task={task} statuses={statuses} priorities={priorities}
                        workspaceId={workspaceId} onUpdate={onUpdate} onDelete={onDelete}
                        onStatusesChange={onStatusesChange} onPrioritiesChange={onPrioritiesChange} />
                ))}
                {adding ? (
                    <InlineAddForm workspaceId={workspaceId} defaultStatusId={status.id}
                        onAdded={(t) => { onAdded(t); setAdding(false); }} onCancel={() => setAdding(false)} />
                ) : (
                    <button type="button" onClick={() => setAdding(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-dashed border-stone-300 px-3 py-2 text-xs text-stone-400 hover:border-stone-400 hover:text-stone-600">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        업무 추가
                    </button>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 내 작업공간 탭
// ─────────────────────────────────────────────────────────────────────────────

type MyWorkView = "list" | "board";
type SortBy = "default" | "status" | "priority" | "startDate" | "dueDate";

const SORT_LABELS: Record<SortBy, string> = {
    default: "기본 순",
    status: "상태 순",
    priority: "우선순위 순",
    startDate: "시작일 순",
    dueDate: "종료일 순",
};

function FilterSortDropdown<T extends string>({
    value,
    options,
    onChange,
    label,
    activeCount,
}: {
    value: T;
    options: { value: T; label: string }[];
    onChange: (v: T) => void;
    label: string;
    activeCount?: number;
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
                <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-xl border border-stone-200 bg-white py-1 shadow-xl">
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

function MyWorkTab({
    tasks, statuses, priorities, workspaceId,
    onUpdate, onDelete, onAdded, onStatusesChange, onPrioritiesChange,
    onTasksChange,
}: {
    tasks: ApiWorkspaceTask[];
    statuses: ApiWorkspaceStatus[];
    priorities: ApiWorkspacePriority[];
    workspaceId: string;
    onUpdate: (t: ApiWorkspaceTask) => void;
    onDelete: (id: string) => void;
    onAdded: (t: ApiWorkspaceTask) => void;
    onStatusesChange: (s: ApiWorkspaceStatus[]) => void;
    onPrioritiesChange: (p: ApiWorkspacePriority[]) => void;
    onTasksChange: (t: ApiWorkspaceTask[]) => void;
}) {
    const [view, setView] = useState<MyWorkView>("list");
    const [addingTop, setAddingTop] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [panelTask, setPanelTask] = useState<ApiWorkspaceTask | null>(null);
    const [filterStatusId, setFilterStatusId] = useState<string>("all");
    const [filterPriorityId, setFilterPriorityId] = useState<string>("all");
    const [sortBy, setSortBy] = useState<SortBy>("default");

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    );

    const topTasks = tasks.filter((t) => !t.parentId);
    const sortedStatuses = [...statuses].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
    const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

    // ── 필터 적용 ──────────────────────────────────────────────────────────
    const filteredTopTasks = topTasks
        .filter((t) => filterStatusId === "all" || t.statusId === filterStatusId)
        .filter((t) => filterPriorityId === "all" || t.priorityId === filterPriorityId);

    // ── 정렬 적용 ──────────────────────────────────────────────────────────
    const displayTopTasks = sortBy === "default"
        ? filteredTopTasks
        : [...filteredTopTasks].sort((a, b) => {
            if (sortBy === "status") {
                return sortedStatuses.findIndex((s) => s.id === a.statusId) - sortedStatuses.findIndex((s) => s.id === b.statusId);
            }
            if (sortBy === "priority") {
                return (b.priority?.value ?? -1) - (a.priority?.value ?? -1);
            }
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

    const topTaskIds = displayTopTasks.map((t) => t.id);

    // 보드: 상태 필터 적용
    const displayStatuses = filterStatusId === "all"
        ? sortedStatuses
        : sortedStatuses.filter((s) => s.id === filterStatusId);

    // 필터/정렬 옵션
    const statusOptions = [
        { value: "all", label: "전체 상태" },
        ...sortedStatuses.map((s) => ({ value: s.id, label: s.name })),
    ];
    const priorityOptions = [
        { value: "all", label: "전체 우선순위" },
        ...([...priorities].sort((a, b) => (b.value ?? 0) - (a.value ?? 0))).map((p) => ({ value: p.id, label: p.name })),
    ];
    const sortOptions = (Object.keys(SORT_LABELS) as SortBy[]).map((k) => ({ value: k, label: SORT_LABELS[k] }));

    // ── 리스트 뷰 DnD ──────────────────────────────────────────────────────

    function handleListDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveId(null);
        if (!over || active.id === over.id) return;

        const oldIndex = topTasks.findIndex((t) => t.id === active.id);
        const newIndex = topTasks.findIndex((t) => t.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(topTasks, oldIndex, newIndex);
        const items = reordered.map((t, i) => ({ ...t, order: i }));

        // 낙관적 업데이트
        onTasksChange([
            ...items,
            ...tasks.filter((t) => t.parentId),
        ]);

        // 서버 저장
        reorderWorkspaceTasksAction(
            workspaceId,
            items.map((t) => ({ id: t.id, order: t.order })),
        );
    }

    // ── 보드 뷰 DnD (컬럼 간 이동) ────────────────────────────────────────

    function handleBoardDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveId(null);
        if (!over) return;

        const draggedTask = tasks.find((t) => t.id === active.id);
        if (!draggedTask) return;

        const targetStatusId = over.id as string;
        if (targetStatusId === draggedTask.statusId) return;

        // 타깃 컬럼에서 마지막 order 계산
        const colTasks = tasks.filter((t) => t.statusId === targetStatusId && !t.parentId);
        const newOrder = colTasks.length;

        const updatedTask: ApiWorkspaceTask = { ...draggedTask, statusId: targetStatusId, status: statuses.find((s) => s.id === targetStatusId)! ?? draggedTask.status, order: newOrder };
        onUpdate(updatedTask);

        reorderWorkspaceTasksAction(workspaceId, [
            { id: draggedTask.id, order: newOrder, statusId: targetStatusId },
        ]);
    }

    return (
        <div className="flex h-full flex-col">
            {/* 툴바 */}
            <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-white px-4 py-2 sm:px-5">
                {/* 뷰 토글 */}
                <div className="flex rounded-lg border border-stone-200 bg-stone-50 p-0.5">
                    {(["list", "board"] as const).map((v) => (
                        <button key={v} type="button" onClick={() => setView(v)}
                            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${view === v ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}>
                            {v === "list" ? "리스트" : "보드"}
                        </button>
                    ))}
                </div>

                {/* 구분선 */}
                <div className="h-4 w-px bg-stone-200" />

                {/* 필터 */}
                <FilterSortDropdown
                    value={filterStatusId}
                    options={statusOptions}
                    onChange={setFilterStatusId}
                    label="상태"
                />
                <FilterSortDropdown
                    value={filterPriorityId}
                    options={priorityOptions}
                    onChange={setFilterPriorityId}
                    label="우선순위"
                />

                {/* 구분선 */}
                <div className="h-4 w-px bg-stone-200" />

                {/* 정렬 */}
                <FilterSortDropdown
                    value={sortBy}
                    options={sortOptions}
                    onChange={setSortBy}
                    label="정렬"
                />

                {/* 필터/정렬 초기화 */}
                {(filterStatusId !== "all" || filterPriorityId !== "all" || sortBy !== "default") && (
                    <button
                        type="button"
                        onClick={() => { setFilterStatusId("all"); setFilterPriorityId("all"); setSortBy("default"); }}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                    >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        초기화
                    </button>
                )}

                {/* 우측: 업무 추가 */}
                <div className="ml-auto">
                    <button type="button" onClick={() => setAddingTop(true)}
                        className="flex items-center gap-1.5 rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        업무 추가
                    </button>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
                {/* ── 리스트 뷰 ── */}
                {view === "list" && (
                    <DndContext id="workspace-list-dnd" sensors={sensors} collisionDetection={closestCenter}
                        onDragStart={(e) => setActiveId(String(e.active.id))}
                        onDragEnd={handleListDragEnd}>
                        <SortableContext items={topTaskIds} strategy={verticalListSortingStrategy}>
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-stone-200 bg-stone-50/60">
                                        <th className="w-6 py-2 pl-2" />
                                        <th className="py-2 pr-3 pl-1 text-left text-xs font-medium text-stone-500">업무</th>
                                        <th className="py-2 pr-2 text-center text-xs font-medium text-stone-500">상태</th>
                                        <th className="py-2 pr-2 text-center text-xs font-medium text-stone-500">우선순위</th>
                                        <th className="hidden py-2 pr-3 text-center text-xs font-medium text-stone-500 sm:table-cell">담당자</th>
                                        <th className="hidden py-2 pr-2 text-center text-xs font-medium text-stone-500 md:table-cell">시작일</th>
                                        <th className="hidden py-2 pr-2 text-center text-xs font-medium text-stone-500 md:table-cell">종료일</th>
                                        <th className="w-16 py-2 pr-2" />
                                    </tr>
                                </thead>
                                {addingTop && (
                                    <tbody>
                                        <tr>
                                            <td colSpan={8} className="px-3 py-1.5">
                                                <InlineAddForm workspaceId={workspaceId} defaultStatusId={sortedStatuses[0]?.id}
                                                    onAdded={(t) => { onAdded(t); setAddingTop(false); }} onCancel={() => setAddingTop(false)} />
                                            </td>
                                        </tr>
                                    </tbody>
                                )}
                                {displayTopTasks.map((task) => (
                                    <SortableTaskRow key={task.id} task={task}
                                        subTasks={tasks.filter((t) => t.parentId === task.id)}
                                        allTasks={tasks} statuses={statuses} priorities={priorities}
                                        workspaceId={workspaceId} depth={0}
                                        onUpdate={onUpdate} onDelete={onDelete} onAdded={onAdded}
                                        onStatusesChange={onStatusesChange} onPrioritiesChange={onPrioritiesChange}
                                        onOpenPanel={(t) => setPanelTask(t)}
                                    />
                                ))}
                                {!addingTop && displayTopTasks.length === 0 && (
                                    <tbody>
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-sm text-stone-400">
                                                {topTasks.length === 0 ? "업무가 없습니다. 업무 추가를 눌러 시작하세요." : "필터 조건에 맞는 업무가 없습니다."}
                                            </td>
                                        </tr>
                                    </tbody>
                                )}
                            </table>
                        </SortableContext>
                        <DragOverlay>
                            {activeTask && (
                                <div className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold shadow-lg opacity-90">
                                    {activeTask.title}
                                </div>
                            )}
                        </DragOverlay>
                    </DndContext>
                )}

                {/* ── 보드 뷰 ── */}
                {view === "board" && (
                    <DndContext id="workspace-board-dnd" sensors={sensors} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={handleBoardDragEnd}>
                        <div className="flex gap-4 overflow-x-auto p-4">
                            {displayStatuses.map((status) => {
                                const colTasks = tasks
                                    .filter((t) => t.statusId === status.id && !t.parentId)
                                    .filter((t) => filterPriorityId === "all" || t.priorityId === filterPriorityId)
                                    .sort((a, b) => {
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
                                        return a.order - b.order;
                                    });
                                return (
                                    <DroppableColumn key={status.id} status={status} tasks={colTasks}
                                        statuses={statuses} priorities={priorities} workspaceId={workspaceId}
                                        onUpdate={onUpdate} onDelete={onDelete} onAdded={onAdded}
                                        onStatusesChange={onStatusesChange} onPrioritiesChange={onPrioritiesChange} />
                                );
                            })}
                        </div>
                        <DragOverlay>
                            {activeTask && (
                                <div className="w-[260px] rounded-lg border border-stone-300 bg-white p-3 shadow-xl opacity-95">
                                    <p className="text-sm font-medium text-stone-800">{activeTask.title}</p>
                                </div>
                            )}
                        </DragOverlay>
                    </DndContext>
                )}
            </div>

            {/* 업무 상세 슬라이드 패널 */}
            {panelTask && (
                <TaskDetailPanel
                    task={panelTask}
                    statuses={statuses}
                    priorities={priorities}
                    workspaceId={workspaceId}
                    onUpdate={(t) => { onUpdate(t); setPanelTask(t); }}
                    onClose={() => setPanelTask(null)}
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 업무 요약 — 타임라인 서브탭 (실제 데이터)
// ─────────────────────────────────────────────────────────────────────────────

function TimelineTab({
    tasks,
    statuses,
}: {
    tasks: ApiWorkspaceTask[];
    statuses: ApiWorkspaceStatus[];
}) {
    const todayRaw = new Date();
    todayRaw.setHours(0, 0, 0, 0);
    const today = todayRaw.getTime();

    const isCompleted = (t: ApiWorkspaceTask) =>
        statuses.find((s) => s.id === t.statusId)?.color === "green";

    const topTasks = tasks.filter((t) => !t.parentId && !isCompleted(t));

    function diffDays(t: ApiWorkspaceTask) {
        if (!t.dueDate) return null;
        const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
        return Math.round((d.getTime() - today) / 86400000);
    }

    function priorityScore(t: ApiWorkspaceTask) {
        return t.priority?.value ?? 0;
    }

    function sortByPriority(arr: ApiWorkspaceTask[]) {
        return [...arr].sort((a, b) => {
            const dd = (diffDays(a) ?? 9999) - (diffDays(b) ?? 9999);
            if (dd !== 0) return dd;
            return priorityScore(b) - priorityScore(a);
        });
    }

    const overdue   = sortByPriority(topTasks.filter((t) => { const d = diffDays(t); return d !== null && d < 0; }));
    const dueToday  = sortByPriority(topTasks.filter((t) => diffDays(t) === 0));
    const dueSoon   = sortByPriority(topTasks.filter((t) => { const d = diffDays(t); return d !== null && d >= 1 && d <= 3; }));
    const thisWeek  = sortByPriority(topTasks.filter((t) => { const d = diffDays(t); return d !== null && d >= 4 && d <= 7; }));
    const later     = sortByPriority(topTasks.filter((t) => { const d = diffDays(t); return d !== null && d > 7; }));
    const noDate    = [...topTasks.filter((t) => !t.dueDate)].sort((a, b) => priorityScore(b) - priorityScore(a));

    const groups = [
        { key: "overdue",  label: "기한 초과",   badge: "bg-red-100 text-red-700",       dot: "bg-red-500",    items: overdue },
        { key: "today",    label: "오늘 마감",    badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500", items: dueToday },
        { key: "soon",     label: "3일 이내",     badge: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500", items: dueSoon },
        { key: "week",     label: "이번 주",      badge: "bg-blue-100 text-blue-700",     dot: "bg-blue-400",   items: thisWeek },
        { key: "later",    label: "이후",         badge: "bg-stone-100 text-stone-600",   dot: "bg-stone-400",  items: later },
        { key: "nodate",   label: "날짜 미설정",  badge: "bg-stone-100 text-stone-500",   dot: "bg-stone-300",  items: noDate },
    ].filter((g) => g.items.length > 0);

    if (groups.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                    <p className="text-3xl">🎉</p>
                    <p className="mt-3 text-sm font-semibold text-stone-700">완료되지 않은 업무가 없습니다!</p>
                    <p className="mt-1 text-xs text-stone-400">모든 업무가 완료됐거나 아직 업무가 없습니다.</p>
                </div>
            </div>
        );
    }

    function dueDateLabel(t: ApiWorkspaceTask) {
        const d = diffDays(t);
        if (d === null) return "날짜 없음";
        if (d < 0) return `${Math.abs(d)}일 초과`;
        if (d === 0) return "오늘";
        return `D-${d}`;
    }

    function dueDateColor(t: ApiWorkspaceTask) {
        const d = diffDays(t);
        if (d === null) return "text-stone-400";
        if (d < 0) return "text-red-500 font-semibold";
        if (d === 0) return "text-orange-500 font-semibold";
        if (d <= 3) return "text-yellow-600";
        return "text-stone-500";
    }

    return (
        <div className="flex h-full min-h-0 overflow-y-auto">
            <div className="flex w-full flex-col">
                {groups.map((group, gi) => (
                    <div key={group.key} className="flex min-h-0">
                        {/* 라벨 */}
                        <div className="flex w-36 shrink-0 flex-col items-end pr-5 pt-5">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${group.badge}`}>
                                {group.label}
                            </span>
                            <span className="mt-1 text-[10px] text-stone-400">{group.items.length}개</span>
                        </div>
                        {/* 타임라인 선 */}
                        <div className="relative flex w-8 shrink-0 flex-col items-center">
                            <div className={`mt-[22px] h-3 w-3 shrink-0 rounded-full border-2 border-white ring-2 ring-offset-1 ${group.dot}`} />
                            {gi < groups.length - 1 && <div className="mt-1 w-0.5 flex-1 bg-stone-200" />}
                        </div>
                        {/* 업무 카드 */}
                        <div className="flex-1 space-y-2 pb-6 pl-4 pr-5 pt-4">
                            {group.items.map((task) => {
                                const statusColor = tagColorOf(task.status.color);
                                const priorityColor = task.priority ? tagColorOf(task.priority.color) : null;
                                return (
                                    <div key={task.id}
                                        className="flex items-center gap-3 rounded-xl border border-stone-100 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md">
                                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusColor.dot}`} style={statusColor.dotStyle} />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-stone-800">{task.title}</p>
                                            <div className="mt-0.5 flex items-center gap-2">
                                                <span className={`text-[11px] ${statusColor.badge} rounded-full px-1.5 py-px`} style={statusColor.badgeStyle}>{task.status.name}</span>
                                                {priorityColor && task.priority && (
                                                    <span className={`text-[11px] ${priorityColor.badge} rounded-full px-1.5 py-px`} style={priorityColor.badgeStyle}>
                                                        {task.priority.name}
                                                        {(task.priority.value ?? 0) > 0 && <span className="ml-0.5 opacity-60">·{task.priority.value}</span>}
                                                    </span>
                                                )}
                                                {task.assignee && (
                                                    <span className="flex items-center gap-1 text-[11px] text-stone-400">
                                                        {task.assignee.avatarUrl
                                                            ? <img src={task.assignee.avatarUrl} className="h-3.5 w-3.5 rounded-full" alt="" />
                                                            : <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-stone-200 text-[9px] font-semibold">{(task.assignee.name ?? task.assignee.email)[0].toUpperCase()}</span>
                                                        }
                                                        {task.assignee.name ?? task.assignee.email}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`shrink-0 text-xs ${dueDateColor(task)}`}>{dueDateLabel(task)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 업무 요약 — 대시보드 서브탭
// ─────────────────────────────────────────────────────────────────────────────

function DashboardPanel({
    tasks,
    statuses,
    priorities,
}: {
    tasks: ApiWorkspaceTask[];
    statuses: ApiWorkspaceStatus[];
    priorities: ApiWorkspacePriority[];
}) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const topTasks = tasks.filter((t) => !t.parentId);
    const total = topTasks.length;
    const completed = topTasks.filter((t) => (statuses.find((s) => s.id === t.statusId)?.color === "green")).length;
    const overdue = topTasks.filter((t) => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate); due.setHours(0, 0, 0, 0);
        return due < today && statuses.find((s) => s.id === t.statusId)?.color !== "green";
    }).length;
    const dueSoon = topTasks.filter((t) => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate); due.setHours(0, 0, 0, 0);
        const diff = (due.getTime() - today.getTime()) / 86400000;
        return diff >= 0 && diff <= 3 && statuses.find((s) => s.id === t.statusId)?.color !== "green";
    }).length;
    const noDate = topTasks.filter((t) => !t.startDate && !t.dueDate).length;
    const progressPct = total === 0 ? 0 : Math.round((completed / total) * 100);

    const byStatus = statuses
        .map((s) => ({ ...s, count: topTasks.filter((t) => t.statusId === s.id).length }))
        .filter((s) => s.count > 0).sort((a, b) => a.order - b.order);

    const noPriority = topTasks.filter((t) => !t.priorityId).length;
    const byPriority = priorities
        .map((p) => ({ ...p, count: topTasks.filter((t) => t.priorityId === p.id).length }))
        .filter((p) => p.count > 0).sort((a, b) => a.order - b.order);

    const upcomingTasks = topTasks
        .filter((t) => {
            if (!t.dueDate) return false;
            const due = new Date(t.dueDate); due.setHours(0, 0, 0, 0);
            const diff = (due.getTime() - today.getTime()) / 86400000;
            return diff >= -7 && diff <= 7 && statuses.find((s) => s.id === t.statusId)?.color !== "green";
        })
        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

    return (
        <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-stone-50/40 p-5">
            {/* ── 상단 지표 카드 ── */}
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    { label: "전체 업무", value: total, sub: `날짜 미설정 ${noDate}개`, color: "text-stone-900", bg: "bg-white border border-stone-100" },
                    { label: "완료", value: completed, sub: `${progressPct}% 달성`, color: "text-green-700", bg: "bg-green-50 border border-green-100" },
                    { label: "기한 초과", value: overdue, sub: "즉시 처리 필요", color: "text-red-600", bg: "bg-red-50 border border-red-100" },
                    { label: "3일 이내 마감", value: dueSoon, sub: "주의 필요", color: "text-orange-600", bg: "bg-orange-50 border border-orange-100" },
                ].map(({ label, value, sub, color, bg }) => (
                    <div key={label} className={`rounded-2xl ${bg} px-5 py-4`}>
                        <p className="text-xs font-medium text-stone-500">{label}</p>
                        <p className={`mt-1 text-4xl font-bold tracking-tight ${color}`}>{value}</p>
                        <p className="mt-1 text-[11px] text-stone-400">{sub}</p>
                    </div>
                ))}
            </div>

            {/* ── 진행률 ── */}
            <div className="mb-5 rounded-2xl border border-stone-100 bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-stone-700">전체 진행률</span>
                    <span className="text-2xl font-bold text-stone-900">{progressPct}%</span>
                </div>
                <div className="h-4 w-full overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full rounded-full bg-green-500 transition-all duration-700" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="mt-2 text-xs text-stone-400">{completed} / {total} 완료</p>
            </div>

            {/* ── 중단 2열 ── */}
            <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* 상태별 */}
                <div className="rounded-2xl border border-stone-100 bg-white p-5">
                    <h3 className="mb-4 text-sm font-semibold text-stone-700">상태별 현황</h3>
                    {byStatus.length === 0 ? <p className="text-xs text-stone-400">업무가 없습니다.</p> : (
                        <div className="space-y-3">
                            {byStatus.map((s) => {
                                const pct = total === 0 ? 0 : Math.round((s.count / total) * 100);
                                const color = tagColorOf(s.color);
                                return (
                                    <div key={s.id}>
                                        <div className="mb-1.5 flex items-center justify-between">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${color.badge}`} style={color.badgeStyle}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} style={color.dotStyle} />{s.name}
                                            </span>
                                            <span className="text-xs tabular-nums text-stone-500">{s.count}개 · {pct}%</span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                                            <div className={`h-full rounded-full ${color.dot} transition-all duration-500`} style={{ width: `${pct}%`, ...color.dotStyle }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 우선순위별 */}
                <div className="rounded-2xl border border-stone-100 bg-white p-5">
                    <h3 className="mb-4 text-sm font-semibold text-stone-700">우선순위별 현황</h3>
                    {byPriority.length === 0 && noPriority === total
                        ? <p className="text-xs text-stone-400">우선순위가 설정된 업무가 없습니다.</p>
                        : (
                            <div className="space-y-3">
                                {byPriority.map((p) => {
                                    const pct = total === 0 ? 0 : Math.round((p.count / total) * 100);
                                    const color = tagColorOf(p.color);
                                    return (
                                        <div key={p.id}>
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${color.badge}`} style={color.badgeStyle}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} style={color.dotStyle} />{p.name}
                                                </span>
                                                <span className="text-xs tabular-nums text-stone-500">{p.count}개 · {pct}%</span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                                                <div className={`h-full rounded-full ${color.dot} transition-all duration-500`} style={{ width: `${pct}%`, ...color.dotStyle }} />
                                            </div>
                                        </div>
                                    );
                                })}
                                {noPriority > 0 && (() => {
                                    const pct = total === 0 ? 0 : Math.round((noPriority / total) * 100);
                                    return (
                                        <div>
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-stone-300" />미설정
                                                </span>
                                                <span className="text-xs tabular-nums text-stone-500">{noPriority}개 · {pct}%</span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                                                <div className="h-full rounded-full bg-stone-300 transition-all duration-500" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                </div>

            </div>

            {/* ── 기한 임박 업무 전체 목록 ── */}
            <div className="rounded-2xl border border-stone-100 bg-white p-5">
                <h3 className="mb-4 text-sm font-semibold text-stone-700">기한 임박 업무 <span className="ml-1 text-xs font-normal text-stone-400">(±7일)</span></h3>
                {upcomingTasks.length === 0 ? (
                    <p className="text-xs text-stone-400">7일 이내 마감되는 업무가 없습니다.</p>
                ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {upcomingTasks.map((t) => {
                            const due = new Date(t.dueDate!); due.setHours(0, 0, 0, 0);
                            const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
                            const color = tagColorOf(t.status.color);
                            const label = diff < 0 ? `${Math.abs(diff)}일 초과` : diff === 0 ? "오늘" : `D-${diff}`;
                            const labelBg = diff < 0 ? "bg-red-100 text-red-600" : diff === 0 ? "bg-orange-100 text-orange-600" : "bg-stone-100 text-stone-500";
                            return (
                                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-stone-100 px-4 py-3">
                                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color.dot}`} style={color.dotStyle} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-semibold text-stone-800">{t.title}</p>
                                        <p className="mt-0.5 truncate text-[11px] text-stone-400">{t.status.name}</p>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${labelBg}`}>{label}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 업무 요약 탭 (서브탭 컨테이너)
// ─────────────────────────────────────────────────────────────────────────────

type SummarySubTab = "timeline" | "dashboard";

function SummaryTab({
    tasks,
    statuses,
    priorities,
}: {
    tasks: ApiWorkspaceTask[];
    statuses: ApiWorkspaceStatus[];
    priorities: ApiWorkspacePriority[];
}) {
    const [subTab, setSubTab] = useState<SummarySubTab>("timeline");

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {/* 서브탭 헤더 */}
            <div className="flex items-center gap-1 border-b border-stone-200 bg-white px-5 py-2">
                {(["timeline", "dashboard"] as const).map((id) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setSubTab(id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            subTab === id
                                ? "bg-stone-100 text-stone-900"
                                : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
                        }`}
                    >
                        {id === "timeline" ? "타임라인" : "업무 대시보드"}
                    </button>
                ))}
            </div>

            {/* 서브탭 콘텐츠 */}
            <div className="min-h-0 flex-1">
                {subTab === "timeline" && <TimelineTab tasks={tasks} statuses={statuses} />}
                {subTab === "dashboard" && (
                    <DashboardPanel tasks={tasks} statuses={statuses} priorities={priorities} />
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 플레이스홀더 탭
// ─────────────────────────────────────────────────────────────────────────────

function RequestsTab() {
    return (
        <div className="flex flex-1 items-center justify-center p-8">
            <div className="text-center">
                <p className="text-3xl" aria-hidden>📬</p>
                <p className="mt-3 text-base font-semibold text-stone-700">요청 기능 준비 중</p>
                <p className="mt-1 text-sm text-stone-400">다른 팀원에게 업무를 요청하거나 리뷰를 받을 수 있는 기능이 곧 추가됩니다.</p>
            </div>
        </div>
    );
}


// ─────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

interface WorkspaceDetailClientProps {
    workspace: ApiWorkspaceDetail;
    initialTasks: ApiWorkspaceTask[];
    initialStatuses: ApiWorkspaceStatus[];
    initialPriorities: ApiWorkspacePriority[];
}

export default function WorkspaceDetailClient({
    workspace, initialTasks, initialStatuses, initialPriorities,
}: WorkspaceDetailClientProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<WorkspaceTab>("mywork");
    const [tasks, setTasks] = useState<ApiWorkspaceTask[]>(initialTasks);
    const [statuses, setStatuses] = useState<ApiWorkspaceStatus[]>(initialStatuses);
    const [priorities, setPriorities] = useState<ApiWorkspacePriority[]>(initialPriorities);

    const project = workspace.project;
    const allTeams = [project.team, ...project.projectTeams.map((pt) => pt.team)].filter(Boolean);
    const teamNames = [...new Set(allTeams.map((t) => t!.name))];

    return (
        <div className="flex min-h-full w-full flex-col">
            <div className="border-b border-stone-200 bg-white px-4 py-3 sm:px-5 md:px-6">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => router.back()}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700" aria-label="뒤로 가기">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-lg font-semibold text-stone-800 sm:text-xl">{project.name}</h1>
                        <p className="truncate text-xs text-stone-500 sm:text-sm">
                            {teamNames.length > 0 ? teamNames.join(" · ") : "개인 워크스페이스"}
                        </p>
                    </div>
                    <div className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                        업무 {tasks.filter((t) => !t.parentId).length}개
                    </div>
                </div>
            </div>

            <div className="border-b border-stone-200 bg-white/95">
                <nav className="flex gap-0 overflow-x-auto px-4 sm:px-5 md:px-6">
                    {TABS.map((tab) => (
                        <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                            className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors sm:px-5 ${
                                activeTab === tab.id ? "border-stone-800 text-stone-800" : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700"
                            }`}>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
                {activeTab === "mywork" && (
                    <MyWorkTab
                        tasks={tasks} statuses={statuses} priorities={priorities}
                        workspaceId={workspace.id}
                        onUpdate={(t) => setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)))}
                        onDelete={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
                        onAdded={(t) => setTasks((prev) => [...prev, t])}
                        onStatusesChange={setStatuses}
                        onPrioritiesChange={setPriorities}
                        onTasksChange={setTasks}
                    />
                )}
                {activeTab === "summary" && (
                    <SummaryTab tasks={tasks} statuses={statuses} priorities={priorities} />
                )}
                {activeTab === "requests" && <RequestsTab />}
                {activeTab === "calendar" && (
                    <CalendarTab
                        tasks={tasks}
                        statuses={statuses}
                        workspaceId={workspace.id}
                        onUpdate={(t) => setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)))}
                        onAdded={(t) => setTasks((prev) => [...prev, t])}
                        onSelectTask={(t) => setPanelTask(t)}
                    />
                )}
            </div>
        </div>
    );
}
