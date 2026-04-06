"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";
import type { ApiEnvelope } from "@/lib/api-envelope";
import { AT_COOKIE } from "@/lib/auth.server";
import { apiFetchHeaders } from "@/lib/fetch-api-headers.server";
import type { ApiIdPayload, ApiProjectDetail, ApiProjectFavoriteItem } from "@/lib/map-api-project";
import { mapApiProjectToClient } from "@/lib/map-api-project";
import type { Project } from "@/lib/projects";

export async function getProjectDetailAction(projectId: string): Promise<Project | null> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return null;

    try {
        const res = await fetch(apiUrl(`/api/projects/${encodeURIComponent(projectId)}`), {
            headers: await apiFetchHeaders(),
            cache: "no-store",
        });
        if (!res.ok) return null;

        const body = (await res.json()) as ApiEnvelope<ApiProjectDetail>;
        return mapApiProjectToClient(body.data);
    } catch {
        return null;
    }
}

export async function createProjectAction(input: {
    name: string;
    description?: string;
    teamIds?: string[];
    startDate?: string;
    endDate?: string;
    noEndDate?: boolean;
    isPublic?: boolean;
    participantUserIds?: string[];
}): Promise<{ ok: true; projectId: string } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) {
        return { ok: false, message: "로그인이 필요합니다." };
    }

    try {
        const res = await fetch(apiUrl("/api/projects"), {
            method: "POST",
            headers: await apiFetchHeaders(),
            body: JSON.stringify({
                name: input.name.trim(),
                description: input.description?.trim() || undefined,
                ...(input.teamIds?.length ? { teamIds: input.teamIds } : {}),
                startDate: input.startDate?.trim() || undefined,
                endDate: input.endDate?.trim() || undefined,
                noEndDate: Boolean(input.noEndDate),
                isPublic: input.isPublic !== false,
                participantUserIds:
                    input.participantUserIds?.length ? input.participantUserIds : undefined,
            }),
            cache: "no-store",
        });

        const body = (await res.json()) as ApiEnvelope<ApiIdPayload>;
        if (!res.ok) {
            return { ok: false, message: body.message ?? "프로젝트 생성에 실패했습니다." };
        }

        const projectId = body.data.id;
        revalidatePath("/projects");
        revalidatePath(`/projects/${projectId}`);
        const teamPaths = input.teamIds?.length ? input.teamIds : [];
        for (const tid of teamPaths) {
            revalidatePath(`/teams/${tid}`);
        }

        return { ok: true, projectId };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

export async function updateProjectAction(
    projectId: string,
    input: {
        name?: string;
        description?: string | null;
        isPublic?: boolean;
        startDate?: string;
        endDate?: string;
        noEndDate?: boolean;
    },
): Promise<{ ok: true; project: Project } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) {
        return { ok: false, message: "로그인이 필요합니다." };
    }

    try {
        const res = await fetch(apiUrl(`/api/projects/${encodeURIComponent(projectId)}`), {
            method: "PATCH",
            headers: await apiFetchHeaders(),
            body: JSON.stringify(input),
            cache: "no-store",
        });

        const body = (await res.json()) as ApiEnvelope<ApiProjectDetail>;
        if (!res.ok) {
            return { ok: false, message: body.message ?? "프로젝트 수정에 실패했습니다." };
        }

        const project = mapApiProjectToClient(body.data);
        revalidatePath("/projects");
        revalidatePath(`/projects/${projectId}`);
        for (const t of project.teams) {
            revalidatePath(`/teams/${t.teamId}`);
        }

        return { ok: true, project };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

export async function addProjectMemberAction(
    projectId: string,
    userId: string,
    role: "MEMBER" | "DEPUTY_LEADER" = "MEMBER",
): Promise<{ ok: true; project: Project } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) {
        return { ok: false, message: "로그인이 필요합니다." };
    }

    const uid = userId.trim();
    if (!uid) {
        return { ok: false, message: "사용자를 선택해 주세요." };
    }

    try {
        const res = await fetch(apiUrl(`/api/projects/${encodeURIComponent(projectId)}/members`), {
            method: "POST",
            headers: await apiFetchHeaders(),
            body: JSON.stringify({ userId: uid, role }),
            cache: "no-store",
        });

        const body = (await res.json()) as ApiEnvelope<unknown>;
        if (!res.ok) {
            return { ok: false, message: body.message ?? "멤버 초대에 실패했습니다." };
        }

        const detailRes = await fetch(apiUrl(`/api/projects/${encodeURIComponent(projectId)}`), {
            headers: await apiFetchHeaders(),
            cache: "no-store",
        });
        if (!detailRes.ok) {
            return { ok: false, message: "초대는 완료됐지만 프로젝트 정보를 불러오지 못했습니다." };
        }

        const detailBody = (await detailRes.json()) as ApiEnvelope<ApiProjectDetail>;
        const project = mapApiProjectToClient(detailBody.data);

        revalidatePath("/projects");
        revalidatePath(`/projects/${projectId}`);
        for (const t of project.teams) {
            revalidatePath(`/teams/${t.teamId}`);
        }

        return { ok: true, project };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

export async function deleteProjectAction(
    projectId: string,
    confirmName: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) {
        return { ok: false, message: "로그인이 필요합니다." };
    }

    try {
        const res = await fetch(apiUrl(`/api/projects/${encodeURIComponent(projectId)}`), {
            method: "DELETE",
            headers: await apiFetchHeaders(),
            body: JSON.stringify({ confirmName: confirmName.trim() }),
            cache: "no-store",
        });

        const parsed = (await res.json()) as ApiEnvelope<ApiIdPayload>;

        if (!res.ok) {
            return { ok: false, message: parsed.message ?? "프로젝트 삭제에 실패했습니다." };
        }

        revalidatePath("/projects");
        revalidatePath(`/projects/${projectId}`);
        return { ok: true };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 프로젝트 즐겨찾기
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchProjectFavoritesAction(): Promise<{
    ok: true;
    favorites: ApiProjectFavoriteItem[];
} | { ok: false; message: string }> {
    try {
        const res = await fetch(apiUrl("/api/projects/favorites"), {
            headers: await apiFetchHeaders(),
            cache: "no-store",
        });
        const body = (await res.json()) as ApiEnvelope<ApiProjectFavoriteItem[]>;
        if (!res.ok) return { ok: false, message: body.message ?? "즐겨찾기를 불러오지 못했습니다." };
        return { ok: true, favorites: body.data ?? [] };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

export async function addProjectFavoriteAction(projectId: string): Promise<{
    ok: boolean;
    message?: string;
    favorite?: ApiProjectFavoriteItem;
}> {
    try {
        const res = await fetch(
            apiUrl(`/api/projects/${encodeURIComponent(projectId)}/favorite`),
            {
                method: "POST",
                headers: await apiFetchHeaders(),
                body: JSON.stringify({}),
            },
        );
        const body = (await res.json()) as ApiEnvelope<ApiProjectFavoriteItem>;
        if (!res.ok) return { ok: false, message: body.message };
        revalidatePath("/projects");
        revalidatePath(`/projects/${projectId}`);
        return { ok: true, favorite: body.data };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

export async function removeProjectFavoriteAction(projectId: string): Promise<{
    ok: boolean;
    message?: string;
}> {
    try {
        const res = await fetch(
            apiUrl(`/api/projects/${encodeURIComponent(projectId)}/favorite`),
            {
                method: "DELETE",
                headers: await apiFetchHeaders(),
                body: JSON.stringify({}),
            },
        );
        const body = (await res.json()) as ApiEnvelope<null>;
        if (!res.ok) return { ok: false, message: body.message };
        revalidatePath("/projects");
        revalidatePath(`/projects/${projectId}`);
        return { ok: true };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

export async function checkProjectFavoriteAction(projectId: string): Promise<boolean> {
    try {
        const res = await fetch(
            apiUrl(`/api/projects/${encodeURIComponent(projectId)}/favorite/status`),
            { headers: await apiFetchHeaders(), cache: "no-store" },
        );
        const body = (await res.json()) as ApiEnvelope<{ isFavorite: boolean }>;
        return body.data?.isFavorite ?? false;
    } catch {
        return false;
    }
}
