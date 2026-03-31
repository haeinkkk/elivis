"use client";

import { MarkdownContent } from "@/components/MarkdownContent";
import type { TeamDetail } from "@/lib/teams.server";
import type { IntroBlockType } from "@/lib/team-intro-layout";
import { useTranslations } from "next-intl";

function displayUserName(u: { name: string | null; email: string }): string {
    return u.name?.trim() || u.email.split("@")[0] || u.email;
}

function formatDateKo(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

/** 소개 탭과 동일한 블록 UI (레이아웃 래퍼 없이 내용만) */
export function IntroBlockContent({
    team,
    blockType,
}: {
    team: TeamDetail;
    blockType: IntroBlockType;
}) {
    const t = useTranslations("teams.detail");
    if (blockType === "banner") {
        // 배너는 팀 상세 최상단에 고정 노출 (소개 레이아웃에서는 중복 제거)
        return null;
    }

    if (blockType === "intro") {
        return (
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                <div className="p-6 sm:p-8">
                    <h2 className="text-sm font-semibold text-stone-600">{t("intro.messageTitle")}</h2>
                    <div className="mt-3 text-sm">
                        {team.introMessage?.trim() ? (
                            <MarkdownContent markdown={team.introMessage} />
                        ) : (
                            <p className="text-stone-400">{t("intro.messageEmpty")}</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (blockType === "metaCreated") {
        return (
            <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
                <p className="text-xs font-medium text-stone-400">{t("meta.createdAt")}</p>
                <p className="mt-2 text-lg font-semibold text-stone-900">
                    {formatDateKo(team.createdAt)}
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
            <p className="text-xs font-medium text-stone-400">{t("meta.createdBy")}</p>
            <p className="mt-2 text-lg font-semibold text-stone-900">
                {displayUserName(team.createdBy)}
            </p>
            <p className="mt-1 truncate text-sm text-stone-500">{team.createdBy.email}</p>
        </div>
    );
}
