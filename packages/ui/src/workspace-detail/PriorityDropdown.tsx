"use client";

import type { CSSProperties } from "react";
import { useState, useTransition, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

import type { WorkspaceDetailMyWorkMutations } from "../types/workspace-detail-mutations";

import type { TagItem } from "./TagDropdown";
import { PriorityModal } from "./PriorityModal";
import { tagColorOf } from "../utils/tag-colors";

type PriorityDropdownMutations = Pick<
    WorkspaceDetailMyWorkMutations,
    "createWorkspacePriority" | "updateWorkspacePriority" | "deleteWorkspacePriority"
>;

export function PriorityDropdown({
    selectedId,
    items,
    workspaceId,
    disabled,
    onChange,
    onItemsChange,
    mutations,
}: {
    selectedId: string | null;
    items: TagItem[];
    workspaceId: string;
    disabled?: boolean;
    onChange: (id: string | null) => void;
    onItemsChange: (items: TagItem[]) => void;
    mutations: PriorityDropdownMutations;
}) {
    const t = useTranslations("workspace");
    const [open, setOpen] = useState(false);
    const [modal, setModal] = useState<{ editing: TagItem | null } | null>(null);
    const [mounted, setMounted] = useState(false);
    const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
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
            const res = await mutations.deleteWorkspacePriority(workspaceId, item.id);
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
        <div ref={menuRef} style={menuStyle} className="rounded-xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface py-1.5 shadow-xl">
            <div className="max-h-64 overflow-y-auto">
                <button type="button" onClick={() => { onChange(null); setOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-400 dark:text-elivis-ink-secondary hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated">
                    <span className="h-2.5 w-2.5 rounded-full bg-stone-300 dark:bg-elivis-surface-elevated" /> 없음
                </button>
                {sorted.map((item) => {
                    const icm = tagColorOf(item.color);
                    return (
                        <div key={item.id} className="group flex items-center gap-1 px-2 py-0.5">
                            <button type="button" onClick={() => { onChange(item.id); setOpen(false); }}
                                className="flex flex-1 items-center gap-2 rounded-md px-1.5 py-1 hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated">
                                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${icm.dot}`} style={icm.dotStyle} />
                                <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${icm.badge} ${item.id === selectedId ? "ring-1 ring-stone-400" : ""}`} style={icm.badgeStyle}>
                                    {item.name}
                                </span>
                                {(item.value ?? 0) > 0 && (
                                    <span className="ml-auto text-[10px] text-stone-400 dark:text-elivis-ink-secondary">{item.value}</span>
                                )}
                            </button>
                            <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
                                <button type="button" title={t("common.edit")} onClick={() => { setModal({ editing: item }); setOpen(false); }}
                                    className="rounded p-0.5 text-stone-400 dark:text-elivis-ink-secondary hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated hover:text-stone-600">
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3.414 1a1 1 0 01-1.243-1.243l1-3.414A4 4 0 019 13z" />
                                    </svg>
                                </button>
                                <button type="button" title={t("common.delete")} disabled={isPending} onClick={() => handleDelete(item)}
                                    className="rounded p-0.5 text-stone-400 dark:text-elivis-ink-secondary hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500">
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="border-t border-stone-100 dark:border-elivis-line mt-1" />
            <button type="button" onClick={() => { setModal({ editing: null }); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-500 dark:text-elivis-ink-secondary hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t("priority.addButton")}
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
                    mutations={mutations}
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