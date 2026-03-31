"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { useTranslations } from "next-intl";

import type { TeamDetail } from "@/lib/teams.server";
import {
    mergeIntroTemplate,
    parseIntroLayoutJson,
    type IntroLayoutConfig,
    type IntroTemplateId,
} from "@/lib/team-intro-layout";

import { TeamIntroBlocks } from "./TeamIntroGrid";
import { TeamIntroLayoutSettingsPanel } from "./TeamIntroLayoutSettingsPanel";
import { TeamIntroSortableEditGrid } from "./TeamIntroSortableEditGrid";

export type TeamIntroPageContentHandle = {
    isLayoutEditMode: () => boolean;
    enterLayoutEditMode: () => void;
    exitLayoutEditMode: () => void;
    toggleLayoutEditMode: () => void;
    openLayoutSettingsPanel: () => void;
};

export const TeamIntroPageContent = forwardRef<
    TeamIntroPageContentHandle,
    {
        team: TeamDetail;
        onEditIntroClick: () => void;
        onLayoutEditModeChange?: (next: boolean) => void;
    }
>(function TeamIntroPageContent({ team, onEditIntroClick, onLayoutEditModeChange }, ref) {
    const t = useTranslations("teams.detail");
    const isLeader = team.viewerRole === "LEADER";
    const blockViewerRole = team.viewerRole ?? "MEMBER";

    const [layoutEditMode, setLayoutEditMode] = useState(false);
    const [panelOpen, setPanelOpen] = useState(false);
    const [layoutDraft, setLayoutDraft] = useState<IntroLayoutConfig>(() =>
        parseIntroLayoutJson(team.introLayoutJson),
    );

    useEffect(() => {
        if (!layoutEditMode) {
            setLayoutDraft(parseIntroLayoutJson(team.introLayoutJson));
        }
    }, [team.id, team.introLayoutJson, layoutEditMode]);

    useEffect(() => {
        onLayoutEditModeChange?.(layoutEditMode);
    }, [layoutEditMode, onLayoutEditModeChange]);

    const exitLayoutEditMode = useCallback(() => {
        setLayoutEditMode(false);
        setPanelOpen(false);
        setLayoutDraft(parseIntroLayoutJson(team.introLayoutJson));
    }, [team.introLayoutJson]);

    const enterLayoutEditMode = useCallback(() => {
        setLayoutDraft(parseIntroLayoutJson(team.introLayoutJson));
        setLayoutEditMode(true);
    }, [team.introLayoutJson]);

    const toggleLayoutEditMode = useCallback(() => {
        if (layoutEditMode) exitLayoutEditMode();
        else enterLayoutEditMode();
    }, [enterLayoutEditMode, exitLayoutEditMode, layoutEditMode]);

    const applyTemplate = useCallback((id: IntroTemplateId) => {
        setLayoutDraft((prev) => mergeIntroTemplate(prev, id));
    }, []);

    const onAfterResetLayout = useCallback(() => {
        setLayoutDraft(parseIntroLayoutJson(null));
    }, []);

    useImperativeHandle(
        ref,
        () => ({
            isLayoutEditMode: () => layoutEditMode,
            enterLayoutEditMode,
            exitLayoutEditMode,
            toggleLayoutEditMode,
            openLayoutSettingsPanel: () => setPanelOpen(true),
        }),
        [enterLayoutEditMode, exitLayoutEditMode, layoutEditMode, toggleLayoutEditMode],
    );

    return (
        <div className="relative">

            {layoutEditMode && isLeader ? (
                <div className="rounded-2xl ring-2 ring-amber-400/35 ring-offset-2 ring-offset-[#f8f7f5] transition-shadow">
                    <TeamIntroSortableEditGrid
                        team={team}
                        viewerRole={blockViewerRole}
                        layout={layoutDraft}
                        onLayoutChange={setLayoutDraft}
                    />
                </div>
            ) : (
                <TeamIntroBlocks
                    team={team}
                    viewerRole={blockViewerRole}
                    layout={parseIntroLayoutJson(team.introLayoutJson)}
                />
            )}

            {layoutEditMode && isLeader ? (
                <p className="mt-3 text-xs text-stone-500">
                    {t("intro.layoutEdit.helper")}
                </p>
            ) : null}

            {isLeader ? (
                <TeamIntroLayoutSettingsPanel
                    open={panelOpen}
                    onClose={() => setPanelOpen(false)}
                    teamId={team.id}
                    layout={layoutDraft}
                    onApplyTemplate={applyTemplate}
                    onAfterResetLayout={onAfterResetLayout}
                />
            ) : null}
        </div>
    );
});
