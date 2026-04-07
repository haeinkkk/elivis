import { notFound, redirect } from "next/navigation";

import { checkTeamFavoriteAction } from "@/app/actions/teams";
import { fetchTeamById } from "@/lib/server/teams.server";
import { getMyProfile } from "@/lib/server/user-profile.server";

import { TeamDetailLoadError } from "@repo/ui/team/TeamDetailLoadError";
import { TeamDetailPageClient } from "./TeamDetailPageClient";

/** 매 요청마다 팀 상세 조회 (캐시로 인한 잘못된 not-found 방지) */
export const dynamic = "force-dynamic";

export default async function TeamDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const [result, isFavorite, user] = await Promise.all([
        fetchTeamById(id),
        checkTeamFavoriteAction(id),
        getMyProfile(),
    ]);

    if (!result.ok) {
        if (result.reason === "unauthorized") {
            redirect("/login");
        }
        if (result.reason === "not_found") {
            notFound();
        }
        return <TeamDetailLoadError />;
    }

    const isSuperAdmin = user?.systemRole === "SUPER_ADMIN";

    return (
        <TeamDetailPageClient
            team={result.team}
            isFavorite={isFavorite}
            isSuperAdmin={isSuperAdmin}
            myUserId={user?.id ?? ""}
        />
    );
}
