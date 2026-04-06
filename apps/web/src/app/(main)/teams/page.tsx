import { fetchTeamsList } from "@/lib/server/teams.server";
import { fetchTeamFavoritesAction } from "@/app/actions/teams";
import { TeamsPageClient } from "./TeamsPageClient";

export default async function TeamsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const { q } = await searchParams;
    const searchQuery = (q ?? "").trim();

    const [myRes, pubRes, favRes] = await Promise.all([
        fetchTeamsList({ kind: "my", take: 100, skip: 0, q: searchQuery || undefined }),
        fetchTeamsList({ kind: "public", take: 20, skip: 0, q: searchQuery || undefined }),
        fetchTeamFavoritesAction(),
    ]);

    if (!myRes || !pubRes) {
        return (
            <div className="w-full p-6 text-stone-600">
                팀 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </div>
        );
    }

    const favoriteTeamIds = new Set(
        favRes.ok ? favRes.favorites.map((f) => f.team.id) : [],
    );

    return (
        <TeamsPageClient
            myTeams={myRes.myTeams}
            publicTeams={pubRes.publicTeams}
            searchQuery={searchQuery}
            favoriteTeamIds={favoriteTeamIds}
        />
    );
}
