"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { COLOR_KEYS, TAG_COLORS, tagColorOf } from "../utils/tag-colors";
import type { WorkspaceDetailMyWorkMutations } from "../types/workspace-detail-mutations";

import type { TagItem } from "./TagDropdown";

type PriorityMutations = Pick<
    WorkspaceDetailMyWorkMutations,
    "createWorkspacePriority" | "updateWorkspacePriority"
>;

export function PriorityModal({
    workspaceId,
    editing,
    onSave,
    onClose,
    mutations,
}: {
    workspaceId: string;
    editing: TagItem | null;
    onSave: (item: TagItem) => void;
    onClose: () => void;
    mutations: PriorityMutations;
}) {
    const t = useTranslations("workspace");
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
                const res = await mutations.updateWorkspacePriority(workspaceId, editing.id, { name: trimmed, color, value: numVal });
                if (!res.ok) { setError(res.message); return; }
                onSave({ ...editing, name: trimmed, color, value: numVal });
            } else {
                const res = await mutations.createWorkspacePriority(workspaceId, { name: trimmed, color, value: numVal });
                if (!res.ok) { setError(res.message); return; }
                onSave(res.priority as unknown as TagItem);
            }
            onClose();
        });
    }

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
            <div className="w-full max-w-sm rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="mb-5 text-base font-semibold text-stone-800 dark:text-elivis-ink">
                    {editing ? t("priority.editTitle") : t("priority.addTitle")}
                </h3>

                {/* 이름 */}
                <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-elivis-ink-secondary">{t("priority.nameLabel")}</label>
                    <input
                        autoFocus
                        value={name}
                        onChange={(e) => { setName(e.target.value); setError(""); }}
                        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
                        placeholder={t("priority.namePlaceholder")}
                        className="w-full rounded-xl border border-stone-200 dark:border-elivis-line px-3 py-2.5 text-sm outline-none transition-colors focus:border-stone-400"
                    />
                </div>

                {/* 가중치 */}
                <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-elivis-ink-secondary">
                        {t("priority.weightLabel")} <span className="text-stone-400 dark:text-elivis-ink-secondary font-normal">{t("priority.weightNote")}</span>
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
                            className="w-16 rounded-lg border border-stone-200 dark:border-elivis-line px-2 py-1.5 text-center text-sm outline-none focus:border-stone-400"
                        />
                    </div>
                </div>

                {/* 색상 */}
                <div className="mb-5">
                    <label className="mb-2 block text-xs font-medium text-stone-600 dark:text-elivis-ink-secondary">{t("priority.colorLabel")}</label>
                    <div className="flex flex-wrap items-center gap-2">
                        {COLOR_KEYS.map((ck) => (
                            <button
                                key={ck}
                                type="button"
                                title={t(`colors.${ck}`)}
                                onClick={() => setColor(ck)}
                                className={`h-7 w-7 rounded-full ${TAG_COLORS[ck].dot} ring-offset-2 transition-transform hover:scale-110 ${color === ck ? "ring-2 ring-stone-600" : ""}`}
                            />
                        ))}
                        <label
                            title={t("common.customColor")}
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
                            <span className="text-xs text-stone-400 dark:text-elivis-ink-secondary">{t("priority.preview")}</span>
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${pc.badge}`} style={pc.badgeStyle}>
                                <span className={`h-2 w-2 rounded-full ${pc.dot}`} style={pc.dotStyle} />
                                {name || t("priority.noName")}
                                {parseInt(value) > 0 && <span className="ml-0.5 opacity-60">·{value}</span>}
                            </span>
                        </div>
                    );
                })()}

                {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-stone-500 dark:text-elivis-ink-secondary hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated">{t("common.cancel")}</button>
                    <button type="button" onClick={submit} disabled={isPending || !name.trim()}
                        className="rounded-xl bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-40">
                        {editing ? t("common.save") : t("common.add")}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}