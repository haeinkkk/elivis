import { fetchProjectsList } from "@/lib/projects.server";
import { getMyProfile } from "@/lib/users";

import { ProjectsPageClient } from "./ProjectsPageClient";

export default async function ProjectsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const { q } = await searchParams;
    const searchQuery = (q ?? "").trim();

    const [user, res] = await Promise.all([
        getMyProfile(),
        fetchProjectsList({ take: 200, skip: 0, q: searchQuery || undefined }),
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
    // 팀원 자격으로 접근 가능한 프로젝트
    const otherProjects = res.items.filter((p) => !p.viewerIsMember && p.viewerIsTeamMember);
    // 관리자 권한으로만 볼 수 있는 다른 사용자 프로젝트
    const adminOnlyProjects = isAdmin
        ? res.items.filter((p) => !p.viewerIsMember && !p.viewerIsTeamMember)
        : [];

    return (
        <ProjectsPageClient
            myProjects={myProjects}
            otherProjects={otherProjects}
            adminOnlyProjects={adminOnlyProjects}
            isAdmin={isAdmin}
            searchQuery={searchQuery}
        />
    );
}
