import { notFound, redirect } from "next/navigation";

import { fetchTeamById } from "@/lib/teams.server";

import { TeamDetailLoadError } from "./TeamDetailLoadError";
import { TeamDetailPageClient } from "./TeamDetailPageClient";

/** 매 요청마다 팀 상세 조회 (캐시로 인한 잘못된 not-found 방지) */
export const dynamic = "force-dynamic";

export default async function TeamDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const result = await fetchTeamById(id);

    if (!result.ok) {
        if (result.reason === "unauthorized") {
            redirect("/login");
        }
        if (result.reason === "not_found") {
            notFound();
        }
        return <TeamDetailLoadError />;
    }

    return <TeamDetailPageClient team={result.team} />;
}
