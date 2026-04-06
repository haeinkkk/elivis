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
        return (
            <ProjectDetailPageClient
                key={id}
                initialProject={null}
                loadMode="client_only"
                isFavorite={false}
                projectTasksData={[]}
            />
        );
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
                key={id}
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
