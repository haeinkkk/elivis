"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

import { updateWorkspaceSidebarLabelAction } from "@/app/actions/workspaces";
import type { ApiWorkspaceListItem } from "@/lib/map-api-workspace";

interface WorkspaceSidebarLabelModalProps {
    workspace: ApiWorkspaceListItem | null;
    onClose: () => void;
    onSaved: () => void;
}

export function WorkspaceSidebarLabelModal({
    workspace,
    onClose,
    onSaved,
}: WorkspaceSidebarLabelModalProps) {
    const t = useTranslations("sidebar");
    const [label, setLabel] = useState("");
    const [error, setError] = useState("");
    const [mounted, setMounted] = useState(false);
    const [pending, startTransition] = useTransition();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!workspace) return;
        setLabel(workspace.sidebarLabel?.trim() ?? "");
        setError("");
        const tId = setTimeout(() => inputRef.current?.focus(), 50);
        return () => clearTimeout(tId);
    }, [workspace]);

    useEffect(() => {
        if (!workspace) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [workspace, onClose]);

    if (!mounted || !workspace) return null;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!workspace) return;
        setError("");
        const workspaceId = workspace.id;
        const trimmed = label.trim();
        const payload = trimmed.length === 0 ? null : trimmed;
        startTransition(async () => {
            const res = await updateWorkspaceSidebarLabelAction(workspaceId, payload);
            if (!res.ok) {
                setError(res.message);
                return;
            }
            onSaved();
            onClose();
        });
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/40 backdrop-blur-[2px] p-4"
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="w-full max-w-md rounded-2xl border border-stone-200 bg-white shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="workspace-sidebar-label-title"
                onPointerDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
                    <h2
                        id="workspace-sidebar-label-title"
                        className="text-sm font-semibold text-stone-800"
                    >
                        {t("workspaceDisplayNameTitle")}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                        aria-label={t("workspaceRenameCancel")}
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4">
                    <p className="text-xs text-stone-500">
                        {t("workspaceDisplayNameHint")}
                        <span className="mt-1 block font-medium text-stone-700">
                            {workspace.project.name}
                        </span>
                    </p>

                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="workspace-sidebar-label-input"
                            className="text-xs font-medium text-stone-600"
                        >
                            {t("workspaceDisplayNameLabel")}
                        </label>
                        <input
                            id="workspace-sidebar-label-input"
                            ref={inputRef}
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder={t("workspaceDisplayNamePlaceholder")}
                            maxLength={128}
                            className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 outline-none ring-stone-300 placeholder:text-stone-400 focus:border-orange-300 focus:ring-2"
                            autoComplete="off"
                        />
                    </div>

                    {error ? <p className="text-xs text-red-600">{error}</p> : null}

                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100"
                        >
                            {t("workspaceRenameCancel")}
                        </button>
                        <button
                            type="submit"
                            disabled={pending}
                            className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-60"
                        >
                            {pending ? t("workspaceRenameSaving") : t("workspaceRenameSave")}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body,
    );
}
