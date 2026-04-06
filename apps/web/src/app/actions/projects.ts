"use server";

import { revalidatePath } from "next/cache";

import type { ApiIdPayload, ApiProjectDetail, ApiProjectFavoriteItem } from "@/lib/mappers/project";
import { mapApiProjectToClient } from "@/lib/mappers/project";
import type { Project } from "@/lib/types/project";
import {
    actionFail,
    actionNetworkError,
    envelopeMessage,
    fetchApiEnvelope,
    hasActionSession,
    requireActionSession,
} from "@/lib/http/server-action-http";

export async function getProjectDetailAction(projectId: string): Promise<Project | null> {
    if (!(await hasActionSession())) return null;

    try {
        const { res, body } = await fetchApiEnvelope<ApiProjectDetail>(
            `/api/projects/${encodeURIComponent(projectId)}`,
        );
        if (!res.ok) return null;

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
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiIdPayload>("/api/projects", {
            method: "POST",
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
        });
        if (!res.ok) {
            return actionFail(envelopeMessage(body, "프로젝트 생성에 실패했습니다."));
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
        return actionNetworkError();
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
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiProjectDetail>(
            `/api/projects/${encodeURIComponent(projectId)}`,
            {
                method: "PATCH",
                body: JSON.stringify(input),
            },
        );
        if (!res.ok) {
            return actionFail(envelopeMessage(body, "프로젝트 수정에 실패했습니다."));
        }

        const project = mapApiProjectToClient(body.data);
        revalidatePath("/projects");
        revalidatePath(`/projects/${projectId}`);
        for (const t of project.teams) {
            revalidatePath(`/teams/${t.teamId}`);
        }

        return { ok: true, project };
    } catch {
        return actionNetworkError();
    }
}

export async function addProjectMemberAction(
    projectId: string,
    userId: string,
    role: "MEMBER" | "DEPUTY_LEADER" = "MEMBER",
): Promise<{ ok: true; project: Project } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    const uid = userId.trim();
    if (!uid) {
        return actionFail("사용자를 선택해 주세요.");
    }

    try {
        const { res, body } = await fetchApiEnvelope<unknown>(
            `/api/projects/${encodeURIComponent(projectId)}/members`,
            {
                method: "POST",
                body: JSON.stringify({ userId: uid, role }),
            },
        );
        if (!res.ok) {
            return actionFail(envelopeMessage(body, "멤버 초대에 실패했습니다."));
        }

        const detail = await fetchApiEnvelope<ApiProjectDetail>(
            `/api/projects/${encodeURIComponent(projectId)}`,
        );
        if (!detail.res.ok) {
            return actionFail("초대는 완료됐지만 프로젝트 정보를 불러오지 못했습니다.");
        }

        const project = mapApiProjectToClient(detail.body.data);

        revalidatePath("/projects");
        revalidatePath(`/projects/${projectId}`);
        for (const t of project.teams) {
            revalidatePath(`/teams/${t.teamId}`);
        }

        return { ok: true, project };
    } catch {
        return actionNetworkError();
    }
}

export async function deleteProjectAction(
    projectId: string,
    confirmName: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiIdPayload>(
            `/api/projects/${encodeURIComponent(projectId)}`,
            {
                method: "DELETE",
                body: JSON.stringify({ confirmName: confirmName.trim() }),
            },
        );

        if (!res.ok) {
            return actionFail(envelopeMessage(body, "프로젝트 삭제에 실패했습니다."));
        }

        revalidatePath("/projects");
        revalidatePath(`/projects/${projectId}`);
        return { ok: true };
    } catch {
        return actionNetworkError();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 프로젝트 즐겨찾기
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchProjectFavoritesAction(): Promise<{
    ok: true;
    favorites: ApiProjectFavoriteItem[];
} | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiProjectFavoriteItem[]>("/api/projects/favorites");
        if (!res.ok)
            return actionFail(envelopeMessage(body, "즐겨찾기를 불러오지 못했습니다."));
        return { ok: true, favorites: body.data ?? [] };
    } catch {
        return actionNetworkError();
    }
}

export async function addProjectFavoriteAction(projectId: string): Promise<{
    ok: boolean;
    message?: string;
    favorite?: ApiProjectFavoriteItem;
}> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiProjectFavoriteItem>(
            `/api/projects/${encodeURIComponent(projectId)}/favorite`,
            {
                method: "POST",
                body: JSON.stringify({}),
            },
        );
        if (!res.ok) return { ok: false, message: body.message };
        revalidatePath("/projects");
        revalidatePath(`/projects/${projectId}`);
        return { ok: true, favorite: body.data };
    } catch {
        return actionNetworkError();
    }
}

export async function removeProjectFavoriteAction(projectId: string): Promise<{
    ok: boolean;
    message?: string;
}> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<null>(
            `/api/projects/${encodeURIComponent(projectId)}/favorite`,
            {
                method: "DELETE",
                body: JSON.stringify({}),
            },
        );
        if (!res.ok) return { ok: false, message: body.message };
        revalidatePath("/projects");
        revalidatePath(`/projects/${projectId}`);
        return { ok: true };
    } catch {
        return actionNetworkError();
    }
}

export async function checkProjectFavoriteAction(projectId: string): Promise<boolean> {
    if (!(await hasActionSession())) return false;

    try {
        const { res, body } = await fetchApiEnvelope<{ isFavorite: boolean }>(
            `/api/projects/${encodeURIComponent(projectId)}/favorite/status`,
        );
        if (!res.ok) return false;
        return body.data?.isFavorite ?? false;
    } catch {
        return false;
    }
}
