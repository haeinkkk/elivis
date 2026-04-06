import { redirect } from "next/navigation";

import { checkProjectFavoriteAction } from "@/app/actions/projects";
import { fetchProjectById } from "@/lib/server/projects.server";
import { fetchProjectAllTasks } from "@/lib/server/workspaces.server";
import { getMyProfile } from "@/lib/server/user-profile.server";

import { ProjectDetailPageClient } from "./ProjectDetailPageClient";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const [result, isFavorite, projectTasksData, user] = await Promise.all([
        fetchProjectById(id),
        checkProjectFavoriteAction(id),
        fetchProjectAllTasks(id),
        getMyProfile(),
    ]);

    if (!result.ok) {
        if (result.reason === "unauthorized") {
            redirect("/login");
        }
        if (result.reason === "forbidden") {
            return (
                <div className="flex min-h-full items-center justify-center p-8">
                    <p className="text-stone-600">이 프로젝트를 볼 권한이 없습니다.</p>
                </div>
            );
        }
        if (result.reason === "not_found") {
            return (
                <div className="flex min-h-full items-center justify-center p-8">
                    <p className="text-stone-600">프로젝트를 찾을 수 없습니다.</p>
                </div>
            );
        }
        return (
            <div className="flex min-h-full flex-col items-center justify-center gap-2 p-8 text-center">
                <p className="text-stone-600">프로젝트 정보를 불러오지 못했습니다.</p>
                <p className="text-xs text-stone-400">API 서버 연결을 확인한 뒤 새로고침해 주세요.</p>
            </div>
        );
    }

    const currentUserId = user?.id ?? "";

    return (
        <ProjectDetailPageClient
            key={id}
            initialProject={result.project}
            isFavorite={isFavorite}
            projectTasksData={projectTasksData ?? []}
            currentUserId={currentUserId}
        />
    );
}
