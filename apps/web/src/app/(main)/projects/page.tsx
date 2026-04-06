import { fetchProjectsList } from "@/lib/server/projects.server";
import { getMyProfile } from "@/lib/server/user-profile.server";
import { fetchProjectFavoritesAction } from "@/app/actions/projects";

import { ProjectsPageClient } from "./ProjectsPageClient";

export default async function ProjectsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const { q } = await searchParams;
    const searchQuery = (q ?? "").trim();

    const [user, res, favRes] = await Promise.all([
        getMyProfile(),
        fetchProjectsList({ take: 200, skip: 0, q: searchQuery || undefined }),
        fetchProjectFavoritesAction(),
    ]);

    if (!res) {
        return (
            <div className="w-full p-6 text-stone-600">
                프로젝트 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </div>
        );
    }

    const isAdmin = user?.systemRole === "SUPER_ADMIN";

    const myProjects = res.items.filter((p) => p.viewerIsMember);
    const otherProjects = res.items.filter((p) => !p.viewerIsMember && p.viewerIsTeamMember);
    const adminOnlyProjects = isAdmin
        ? res.items.filter((p) => !p.viewerIsMember && !p.viewerIsTeamMember)
        : [];

    const favoriteProjectIds = new Set(
        favRes.ok ? favRes.favorites.map((f) => f.project.id) : [],
    );

    return (
        <ProjectsPageClient
            myProjects={myProjects}
            otherProjects={otherProjects}
            adminOnlyProjects={adminOnlyProjects}
            isAdmin={isAdmin}
            searchQuery={searchQuery}
            favoriteProjectIds={favoriteProjectIds}
        />
    );
}
