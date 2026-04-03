import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AT_COOKIE } from "@/lib/auth.server";
import { fetchProjectById } from "@/lib/projects.server";
import { fetchProjectAllTasks } from "@/lib/workspaces.server";
import { checkProjectFavoriteAction } from "@/app/actions/projects";

import { ProjectDetailPageClient } from "./ProjectDetailPageClient";

export const dynamic = "force-dynamic";

/** JWT payload에서 userId(sub) 추출 — 서명 검증 없이 디코딩만 */
function extractUserIdFromToken(token: string): string {
    try {
        const parts = token.trim().split(".");
        if (parts.length < 2) return "";
        const payload = parts[1];
        if (!payload) return "";
        // base64url → base64 변환 후 디코딩 (패딩 명시적 처리)
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
        const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf-8"));
        const id = decoded.sub ?? decoded.userId ?? decoded.id ?? "";
        return String(id);
    } catch {
        return "";
    }
}

export default async function ProjectDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const jar = await cookies();
    const token = jar.get(AT_COOKIE)?.value;

    if (!token) {
        return <ProjectDetailPageClient initialProject={null} loadMode="client_only" isFavorite={false} projectTasksData={[]} />;
    }

    const currentUserId = extractUserIdFromToken(token);

    const [result, isFavorite, projectTasksData] = await Promise.all([
        fetchProjectById(id),
        checkProjectFavoriteAction(id),
        fetchProjectAllTasks(id),
    ]);

    if (result.ok) {
        return (
            <ProjectDetailPageClient
                initialProject={result.project}
                loadMode="server_ok"
                isFavorite={isFavorite}
                projectTasksData={projectTasksData ?? []}
                currentUserId={currentUserId}
            />
        );
    }

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

    return <ProjectDetailPageClient initialProject={null} loadMode="server_miss" isFavorite={false} projectTasksData={[]} />;
}
