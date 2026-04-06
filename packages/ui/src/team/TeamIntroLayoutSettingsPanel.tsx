"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

import type { UpdateTeamFieldsFn } from "../types/team-fields-actions";
import {
    INTRO_TEMPLATES,
    INTRO_TEMPLATE_ORDER,
    findMatchingTemplateId,
    stringifyIntroLayout,
    type IntroLayoutConfig,
    type IntroTemplateId,
} from "../utils/team-intro-layout";

import { TeamIntroTemplateThumb } from "./TeamIntroTemplateThumbs";

function PencilGlyph({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
            />
        </svg>
    );
}

type PanelTab = "templates" | "widgets";

/**
 * 소개 탭 레이아웃: 템플릿·저장·초기화 (우측 슬라이드 패널)
 * `main`의 stacking context(z-0) 아래에 깔리지 않도록 body로 포털합니다.
 */
export function TeamIntroLayoutSettingsPanel({
    open,
    onClose,
    teamId,
    layout,
    onApplyTemplate,
    onAfterResetLayout,
    updateTeamFields,
    onAfterMutation,
}: {
    open: boolean;
    onClose: () => void;
    teamId: string;
    layout: IntroLayoutConfig;
    onApplyTemplate: (id: IntroTemplateId) => void;
    onAfterResetLayout: () => void;
    updateTeamFields: UpdateTeamFieldsFn;
    onAfterMutation?: () => void;
}) {
    const t = useTranslations("teams.detail.intro.layoutSettingsPanel");
    const tErr = useTranslations("teams.detail.errors");
    const [mounted, setMounted] = useState(false);
    const [panelTab, setPanelTab] = useState<PanelTab>("templates");
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const activeTemplateId = useMemo(() => findMatchingTemplateId(layout), [layout]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (open) setPanelTab("templates");
    }, [open]);

    function save() {
        setError(null);
        startTransition(async () => {
            const r = await updateTeamFields(teamId, {
                introLayoutJson: stringifyIntroLayout(layout),
            });
            if (!r.ok) {
                setError(r.message ?? tErr("saveFailed"));
            } else {
                onAfterMutation?.();
            }
        });
    }

    function resetDefault() {
        setError(null);
        startTransition(async () => {
            const r = await updateTeamFields(teamId, { introLayoutJson: null });
            if (!r.ok) {
                setError(r.message ?? tErr("resetFailed"));
            } else {
                onAfterResetLayout();
                onAfterMutation?.();
            }
        });
    }

    if (!mounted) return null;

    const node = (
        <>
            <div
                className={`fixed inset-0 z-[60] bg-stone-900/40 transition-opacity duration-300 ${
                    open ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                aria-hidden={!open}
                onClick={() => onClose()}
            />
            <aside
                className={`fixed inset-y-0 right-0 z-[61] flex w-full max-w-sm flex-col border-l border-stone-200 bg-white shadow-xl transition-transform duration-300 ease-out ${
                    open ? "translate-x-0" : "translate-x-full"
                }`}
                aria-hidden={!open}
                aria-modal={open}
                role="dialog"
            >
                <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-stone-100 px-3 py-2.5 sm:px-4">
                    <h2
                        id="team-intro-layout-panel-title"
                        className="min-w-0 truncate text-sm font-semibold text-stone-800 sm:text-base"
                    >
                        {t("title")}
                    </h2>
                    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                        <div
                            className="flex items-center gap-0.5 rounded-lg bg-stone-100/90 p-0.5"
                            role="tablist"
                            aria-label={t("tablistAria")}
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={panelTab === "templates"}
                                onClick={() => setPanelTab("templates")}
                                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition sm:px-3 sm:text-sm ${
                                    panelTab === "templates"
                                        ? "bg-white text-stone-900 shadow-sm"
                                        : "text-stone-500 hover:text-stone-800"
                                }`}
                            >
                                {t("tabTemplates")}
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={panelTab === "widgets"}
                                onClick={() => setPanelTab("widgets")}
                                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition sm:px-3 sm:text-sm ${
                                    panelTab === "widgets"
                                        ? "bg-white text-stone-900 shadow-sm"
                                        : "text-stone-500 hover:text-stone-800"
                                }`}
                            >
                                {t("tabWidgets")}
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => onClose()}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
                            aria-label={t("closeAria")}
                        >
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                    {panelTab === "templates" ? (
                        <>
                            <p className="text-xs text-stone-500">{t("templateHint")}</p>

                            <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
                                {INTRO_TEMPLATE_ORDER.map((tid) => {
                                    const tmpl = INTRO_TEMPLATES[tid];
                                    const selected = activeTemplateId === tid;
                                    return (
                                        <button
                                            key={tid}
                                            type="button"
                                            onClick={() => onApplyTemplate(tid)}
                                            className={`flex flex-col rounded-xl border bg-white p-2.5 text-left transition sm:p-3 ${
                                                selected
                                                    ? "border-stone-800 ring-2 ring-stone-800/15"
                                                    : "border-stone-200 hover:border-stone-300 hover:bg-stone-50/80"
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-1">
                                                <span className="text-xs font-medium text-stone-800 sm:text-sm">
                                                    {tmpl.title}
                                                </span>
                                                {tmpl.showEditIcon ? (
                                                    <PencilGlyph className="h-3.5 w-3.5 shrink-0 text-stone-300 sm:h-4 sm:w-4" />
                                                ) : (
                                                    <span className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                                                )}
                                            </div>
                                            <div className="mt-2 rounded-lg bg-stone-50/90 px-1 py-1">
                                                <TeamIntroTemplateThumb id={tid} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

                            <div className="mt-6 flex flex-col gap-2 border-t border-stone-100 pt-4">
                                <button
                                    type="button"
                                    onClick={save}
                                    disabled={pending}
                                    className="w-full rounded-lg bg-stone-800 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-60"
                                >
                                    {pending ? t("saving") : t("saveLayout")}
                                </button>
                                <button
                                    type="button"
                                    disabled={pending}
                                    onClick={resetDefault}
                                    className="w-full rounded-lg border border-stone-200 bg-white py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                                >
                                    {t("resetDefault")}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex min-h-[12rem] flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/60 px-4 py-8 text-center">
                            <p className="text-sm font-medium text-stone-700">{t("widgetTitle")}</p>
                            <p className="mt-2 text-xs text-stone-500">{t("widgetSoon")}</p>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );

    return createPortal(node, document.body);
}
