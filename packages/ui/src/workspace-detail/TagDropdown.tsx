"use client";

import type { CSSProperties } from "react";
import { useState, useTransition, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { COLOR_KEYS, TAG_COLORS, tagColorOf } from "../utils/tag-colors";
import type { ApiWorkspaceStatusSemantic } from "../types/workspace-api";

export type TagItem = {
    id: string;
    name: string;
    color: string;
    order: number;
    value?: number;
    notifyOnChange?: boolean;
    semantic?: ApiWorkspaceStatusSemantic;
};

export function TagDropdown({
    selectedId,
    items,
    nullable,
    workspaceId,
    disabled,
    placeholder,
    onCreate,
    onUpdate,
    onDelete,
    onChange,
    onItemsChange,
    onOpenCreate,
    onOpenEdit,
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
    /** 제공 시 인라인 추가 폼 대신 이 콜백 실행 (모달 등) */
    onOpenCreate?: () => void;
    /** 제공 시 인라인 편집 폼 대신 이 콜백 실행 (모달 등) */
    onOpenEdit?: (item: TagItem) => void;
}) {
    const t = useTranslations("workspace");
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editColor, setEditColor] = useState("gray");
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [newColor, setNewColor] = useState("gray");
    const placeholderText = placeholder ?? t("common.none");
    const [isPending, startTransition] = useTransition();
    const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
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

    function startEdit(s: TagItem) {
        if (onOpenEdit) { onOpenEdit(s); return; }
        setEditingId(s.id); setEditName(s.name); setEditColor(s.color);
    }

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
            className="rounded-xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface py-1.5 shadow-xl">
            <div className="max-h-72 overflow-y-auto">
                    {nullable && (
                        <button
                            type="button"
                            onClick={() => { onChange(null); setOpen(false); }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-400 dark:text-elivis-ink-secondary hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated"
                        >
                            <span className="h-2.5 w-2.5 rounded-full bg-stone-300 dark:bg-elivis-surface-elevated" /> {t("common.none")}
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
                                            className="w-full rounded border border-stone-300 dark:border-elivis-line px-2 py-0.5 text-xs outline-none focus:border-stone-500"
                                        />
                                        <div className="flex flex-wrap items-center gap-1 px-0.5">
                                            {COLOR_KEYS.map((ck) => (
                                                <button key={ck} type="button" title={t(`colors.${ck}`)} onClick={() => setEditColor(ck)}
                                                    className={`h-4 w-4 rounded-full ${TAG_COLORS[ck].dot} ring-offset-1 transition-transform hover:scale-110 ${editColor === ck ? "ring-2 ring-stone-500" : ""}`} />
                                            ))}
                                            <label title={t("common.customColor")} className={`relative h-4 w-4 cursor-pointer overflow-hidden rounded-full ring-offset-1 transition-transform hover:scale-110 ${!COLOR_KEYS.includes(editColor) ? "ring-2 ring-stone-500" : ""}`}>
                                                <div className="h-full w-full rounded-full" style={{ background: !COLOR_KEYS.includes(editColor) ? editColor : "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }} />
                                                <input type="color" value={COLOR_KEYS.includes(editColor) ? "#6366f1" : editColor} onChange={(e) => setEditColor(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                                            </label>
                                        </div>
                                        <div className="flex justify-end gap-1">
                                            <button type="button" onClick={() => setEditingId(null)} className="rounded px-1.5 py-0.5 text-[10px] text-stone-400 dark:text-elivis-ink-secondary hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated">{t("common.cancel")}</button>
                                            <button type="button" onClick={() => submitEdit(s)} disabled={isPending} className="rounded bg-stone-800 px-1.5 py-0.5 text-[10px] text-white hover:bg-stone-700">{t("common.save")}</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <button type="button" onClick={() => { onChange(s.id); setOpen(false); }}
                                            className="flex flex-1 items-center gap-2 rounded-md px-1.5 py-1 hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated">
                                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${icm.dot}`} style={icm.dotStyle} />
                                            <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${icm.badge} ${s.id === selectedId ? "ring-1 ring-stone-400" : ""}`} style={icm.badgeStyle}>
                                                {s.name}
                                            </span>
                                        </button>
                                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                            <button type="button" title={t("common.edit")} onClick={() => startEdit(s)}
                                                className="rounded p-0.5 text-stone-400 dark:text-elivis-ink-secondary hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated hover:text-stone-600">
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3.414 1a1 1 0 01-1.243-1.243l1-3.414A4 4 0 019 13z" />
                                                </svg>
                                            </button>
                                            {(nullable || items.length > 1) && (
                                                <button type="button" title={t("common.delete")} onClick={() => handleDelete(s)} disabled={isPending}
                                                    className="rounded p-0.5 text-stone-400 dark:text-elivis-ink-secondary hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500">
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
                    <div className="my-1 border-t border-stone-100 dark:border-elivis-line" />
                    {adding ? (
                        <div className="flex flex-col gap-1.5 px-3 py-1.5">
                            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") submitNew(); if (e.key === "Escape") { setAdding(false); setNewName(""); } }}
                                placeholder={t("common.nameInput")}
                                className="w-full rounded border border-stone-300 dark:border-elivis-line px-2 py-0.5 text-xs outline-none focus:border-stone-500"
                            />
                            <div className="flex flex-wrap items-center gap-1">
                                            {COLOR_KEYS.map((ck) => (
                                    <button key={ck} type="button" title={t(`colors.${ck}`)} onClick={() => setNewColor(ck)}
                                        className={`h-4 w-4 rounded-full ${TAG_COLORS[ck].dot} ring-offset-1 transition-transform hover:scale-110 ${newColor === ck ? "ring-2 ring-stone-500" : ""}`} />
                                ))}
                                <label title={t("common.customColor")} className={`relative h-4 w-4 cursor-pointer overflow-hidden rounded-full ring-offset-1 transition-transform hover:scale-110 ${!COLOR_KEYS.includes(newColor) ? "ring-2 ring-stone-500" : ""}`}>
                                    <div className="h-full w-full rounded-full" style={{ background: !COLOR_KEYS.includes(newColor) ? newColor : "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }} />
                                    <input type="color" value={COLOR_KEYS.includes(newColor) ? "#6366f1" : newColor} onChange={(e) => setNewColor(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                                </label>
                            </div>
                            <div className="flex justify-end gap-1">
                                <button type="button" onClick={() => { setAdding(false); setNewName(""); }} className="rounded px-2 py-0.5 text-[10px] text-stone-400 dark:text-elivis-ink-secondary hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated">{t("common.cancel")}</button>
                                <button type="button" onClick={submitNew} disabled={isPending || !newName.trim()} className="rounded bg-stone-800 px-2 py-0.5 text-[10px] text-white hover:bg-stone-700 disabled:opacity-40">{t("common.add")}</button>
                            </div>
                        </div>
                    ) : (
                        <button type="button" onClick={() => { if (onOpenCreate) { onOpenCreate(); setOpen(false); } else setAdding(true); }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-500 dark:text-elivis-ink-secondary hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {t("common.add")}
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
                ) : placeholderText}
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {menu}
        </div>
    );
}