"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import type { ApiWorkspaceTask } from "../types/workspace-api";
import type { WorkspaceDetailMyWorkMutations } from "../types/workspace-detail-mutations";

export function InlineAddForm({
    workspaceId,
    defaultStatusId,
    parentId,
    onAdded,
    onCancel,
    placeholder,
    createWorkspaceTask,
}: {
    workspaceId: string;
    defaultStatusId?: string;
    parentId?: string;
    onAdded: (task: ApiWorkspaceTask) => void;
    onCancel: () => void;
    placeholder?: string;
    createWorkspaceTask: WorkspaceDetailMyWorkMutations["createWorkspaceTask"];
}) {
    const t = useTranslations("workspace");
    const [title, setTitle] = useState("");
    const [isPending, startTransition] = useTransition();
    const placeholderText = placeholder ?? t("inlineAdd.taskPlaceholder");

    function submit() {
        const trimmed = title.trim();
        if (!trimmed) return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = today.toISOString();
        startTransition(async () => {
            const res = await createWorkspaceTask(workspaceId, { title: trimmed, statusId: defaultStatusId, parentId, startDate });
            if (res.ok) { onAdded(res.task); setTitle(""); onCancel(); }
        });
    }

    return (
        <div className="flex items-center gap-2 rounded-md border border-stone-300 dark:border-elivis-line bg-white dark:bg-elivis-surface px-2 py-1.5">
            <input
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400 dark:text-elivis-ink dark:placeholder:text-elivis-ink-muted"
                placeholder={placeholderText} value={title} onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel(); }}
                disabled={isPending}
            />
            <button
                type="button"
                onClick={onCancel}
                className="shrink-0 text-xs text-stone-400 hover:text-stone-600 dark:text-elivis-ink-secondary dark:hover:text-elivis-ink"
                disabled={isPending}
            >
                {t("common.cancel")}
            </button>
            <button
                type="button"
                onClick={submit}
                disabled={isPending || !title.trim()}
                className="shrink-0 rounded bg-stone-800 px-2 py-0.5 text-xs text-white hover:bg-stone-700 disabled:opacity-40 dark:bg-elivis-accent dark:hover:bg-elivis-accent-hover"
            >
                {t("common.add")}
            </button>
        </div>
    );
}