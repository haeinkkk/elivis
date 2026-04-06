import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

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
    const t = await getTranslations("projects.detail");

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
                    <p className="text-stone-600">{t("pageForbidden")}</p>
                </div>
            );
        }
        if (result.reason === "not_found") {
            return (
                <div className="flex min-h-full items-center justify-center p-8">
                    <p className="text-stone-600">{t("pageNotFound")}</p>
                </div>
            );
        }
        return (
            <div className="flex min-h-full flex-col items-center justify-center gap-2 p-8 text-center">
                <p className="text-stone-600">{t("pageLoadError")}</p>
                <p className="text-xs text-stone-400">{t("pageLoadErrorHint")}</p>
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
