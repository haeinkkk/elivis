"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { MarkdownContent } from "../MarkdownContent";
import type { UpdateTeamFieldsFn } from "../types/team-fields-actions";
import { TeamIntroRichEditor } from "./TeamIntroRichEditor";

type EditorMode = "markdown" | "rich";

type TeamIntroEditModalProps = {
    open: boolean;
    onClose: () => void;
    teamId: string;
    initialIntroMessage: string | null;
    updateTeamFields: UpdateTeamFieldsFn;
    onSaveSuccess?: () => void;
};

export function TeamIntroEditModal({
    open,
    onClose,
    teamId,
    initialIntroMessage,
    updateTeamFields,
    onSaveSuccess,
}: TeamIntroEditModalProps) {
    const t = useTranslations("teams.detail.intro.editModal");
    const tErr = useTranslations("teams.detail.errors");
    const tCommon = useTranslations("teams.detail.common");
    const [draft, setDraft] = useState("");
    const [editorMode, setEditorMode] = useState<EditorMode>("markdown");
    const [richKey, setRichKey] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (open) {
            setDraft(initialIntroMessage ?? "");
            setEditorMode("markdown");
            setRichKey(0);
            setError(null);
        }
    }, [open, initialIntroMessage]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    function handleSave() {
        setError(null);
        const introMessage = draft.trim() === "" ? null : draft;
        startTransition(async () => {
            const r = await updateTeamFields(teamId, { introMessage });
            if (r.ok) {
                onSaveSuccess?.();
                onClose();
            } else {
                setError(r.message ?? tErr("saveFailed"));
            }
        });
    }

    function goRich() {
        setRichKey((k) => k + 1);
        setEditorMode("rich");
    }

    function goMarkdown() {
        setEditorMode("markdown");
    }

    return (
        <>
            <div
                className="fixed inset-0 z-[60] bg-stone-900/40"
                aria-hidden
                onClick={onClose}
            />
            <div
                className="fixed left-1/2 top-1/2 z-[61] flex max-h-[min(90vh,720px)] w-[calc(100%-1.5rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface shadow-xl sm:w-full"
                role="dialog"
                aria-modal
                aria-labelledby="team-intro-edit-title"
            >
                <div className="border-b border-stone-100 dark:border-elivis-line px-4 py-3 sm:px-5">
                    <h3 id="team-intro-edit-title" className="text-base font-semibold text-stone-800 dark:text-elivis-ink">
                        {t("title")}
                    </h3>
                    <p className="mt-1 text-xs text-stone-500 dark:text-elivis-ink-secondary">{t("desc")}</p>
                    <div
                        className="mt-3 inline-flex rounded-lg border border-stone-200 dark:border-elivis-line bg-stone-100/90 p-0.5"
                        role="group"
                        aria-label={t("editorModeAria")}
                    >
                        <button
                            type="button"
                            onClick={goMarkdown}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                editorMode === "markdown"
                                    ? "bg-white text-stone-900 shadow-sm"
                                    : "text-stone-600 hover:text-stone-900"
                            }`}
                        >
                            {t("editorLabelMarkdown")}
                        </button>
                        <button
                            type="button"
                            onClick={goRich}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                editorMode === "rich"
                                    ? "bg-white text-stone-900 shadow-sm"
                                    : "text-stone-600 hover:text-stone-900"
                            }`}
                        >
                            {t("modeRich")}
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                    <div className="grid h-[min(60vh,480px)] grid-cols-1 divide-y divide-stone-100 dark:divide-elivis-line md:grid-cols-2 md:divide-x md:divide-y-0">
                        <div className="flex min-h-0 flex-col p-3 sm:p-4">
                            <label
                                htmlFor="team-intro-markdown"
                                className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400 dark:text-elivis-ink-secondary"
                            >
                                {editorMode === "markdown" ? t("editorLabelMarkdown") : t("editorLabelRich")}
                            </label>
                            {editorMode === "markdown" ? (
                                <textarea
                                    id="team-intro-markdown"
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    disabled={isPending}
                                    spellCheck={false}
                                    className="min-h-0 flex-1 resize-none rounded-xl border border-stone-200 dark:border-elivis-line bg-stone-50/80 dark:bg-elivis-surface/80 px-3 py-2 font-mono text-sm text-stone-800 dark:text-elivis-ink placeholder:text-stone-400 dark:placeholder:text-elivis-ink-muted focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 disabled:opacity-60"
                                    placeholder={t("placeholder")}
                                />
                            ) : (
                                <div className="min-h-0 flex-1">
                                    <TeamIntroRichEditor
                                        key={richKey}
                                        initialMarkdown={draft}
                                        onChangeMarkdown={setDraft}
                                        disabled={isPending}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex min-h-0 flex-col overflow-hidden p-3 sm:p-4">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400 dark:text-elivis-ink-secondary">
                                {t("preview")}
                            </p>
                            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-stone-100 dark:border-elivis-line bg-white dark:bg-elivis-surface px-3 py-2 text-sm">
                                {draft.trim() ? (
                                    <MarkdownContent markdown={draft} />
                                ) : (
                                    <p className="text-sm text-stone-400 dark:text-elivis-ink-secondary">{t("previewEmpty")}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {error ? (
                    <p className="border-t border-stone-100 dark:border-elivis-line bg-amber-50 px-4 py-2 text-xs text-amber-900 sm:px-5">
                        {error}
                    </p>
                ) : null}

                <div className="flex justify-end gap-2 border-t border-stone-100 dark:border-elivis-line px-4 py-3 sm:px-5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isPending}
                        className="rounded-lg border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-4 py-2 text-sm font-medium text-stone-700 dark:text-elivis-ink transition-colors hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated disabled:opacity-50"
                    >
                        {tCommon("cancel")}
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isPending}
                        className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-50"
                    >
                        {isPending ? t("saving") : t("save")}
                    </button>
                </div>
            </div>
        </>
    );
}
