"use client";

import type { TeamDetail } from "@/lib/teams.server";
import {
    colSpanClass,
    parseIntroLayoutJson,
    type IntroLayoutBlock,
    type IntroLayoutConfig,
} from "@/lib/team-intro-layout";

import { IntroBlockContent } from "./TeamIntroBlockContent";

export function TeamIntroBlocks({
    team,
    viewerRole,
    layout,
}: {
    team: TeamDetail;
    viewerRole: "LEADER" | "MEMBER";
    layout: IntroLayoutConfig;
}) {
    return (
        <div className="grid grid-cols-12 items-start gap-4">
            {layout.blocks.map((b: IntroLayoutBlock) => (
                <div key={b.id} className={`min-w-0 ${colSpanClass(b.colSpan)}`}>
                    <IntroBlockContent
                        team={team}
                        viewerRole={viewerRole}
                        blockType={b.type}
                    />
                </div>
            ))}
        </div>
    );
}

export function TeamIntroGrid({
    team,
    viewerRole,
}: {
    team: TeamDetail;
    viewerRole: "LEADER" | "MEMBER";
}) {
    const layout = parseIntroLayoutJson(team.introLayoutJson);
    return (
        <TeamIntroBlocks
            team={team}
            viewerRole={viewerRole}
            layout={layout}
        />
    );
}
