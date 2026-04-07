"use server";

import { revalidatePath } from "next/cache";

import type {
    ApiIdPayload,
    ApiProjectDetail,
    ApiProjectFavoriteItem,
} from "@/lib/mappers/project";
import type {
    ApiProjectWikiListPayload,
    ApiProjectWikiPageDetail,
    ProjectWikiDeleteResult,
    ProjectWikiListResult,
    ProjectWikiPageResult,
    ProjectWikiReorderResult,
} from "@repo/ui";
import { mapApiProjectToClient } from "@/lib/mappers/project";
import type { Project } from "@/lib/types/project";
import {
    actionFail,
    actionNetworkError,
    apiFetchAuthenticated,
    apiFetchHeadersWithoutContentType,
    envelopeMessage,
    fetchApiEnvelope,
    hasActionSession,
    readApiEnvelope,
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

export type ApiProjectActivityItem = {
    id: string;
    action: string;
    resourceType: string;
    resourceId: string | null;
    resourceName: string | null;
    before: string | null;
    after: string | null;
    createdAt: string;
    actor: {
        id: string;
        name: string | null;
        email: string;
        avatarUrl: string | null;
    };
};

export async function getProjectActivityLogAction(
    projectId: string,
): Promise<
    { ok: true; items: ApiProjectActivityItem[] } | { ok: false; message: string }
> {
    if (!(await hasActionSession())) {
        return { ok: false, message: "로그인이 필요합니다." };
    }

    try {
        const { res, body } = await fetchApiEnvelope<{ items: ApiProjectActivityItem[] }>(
            `/api/projects/${encodeURIComponent(projectId)}/activity`,
        );
        if (!res.ok) {
            return actionFail(envelopeMessage(body, "활동 로그를 불러오지 못했습니다."));
        }
        return { ok: true, items: body.data?.items ?? [] };
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

export async function listProjectWikiPagesAction(projectId: string): Promise<ProjectWikiListResult> {
    if (!(await hasActionSession())) {
        return { ok: false, message: "로그인이 필요합니다." };
    }

    try {
        const { res, body } = await fetchApiEnvelope<ApiProjectWikiListPayload>(
            `/api/projects/${encodeURIComponent(projectId)}/wiki/pages`,
        );
        if (!res.ok) {
            return { ok: false, message: envelopeMessage(body, "위키 목록을 불러오지 못했습니다.") };
        }
        return { ok: true, data: body.data };
    } catch {
        return actionNetworkError();
    }
}

export async function getProjectWikiPageAction(
    projectId: string,
    slug: string,
): Promise<ProjectWikiPageResult> {
    if (!(await hasActionSession())) {
        return { ok: false, message: "로그인이 필요합니다." };
    }

    try {
        const { res, body } = await fetchApiEnvelope<ApiProjectWikiPageDetail>(
            `/api/projects/${encodeURIComponent(projectId)}/wiki/pages/${encodeURIComponent(slug)}`,
        );
        if (!res.ok) {
            return { ok: false, message: envelopeMessage(body, "위키 문서를 불러오지 못했습니다.") };
        }
        return { ok: true, data: body.data };
    } catch {
        return actionNetworkError();
    }
}

export async function createProjectWikiPageAction(
    projectId: string,
    input: { slug: string; title: string; contentMd: string },
): Promise<ProjectWikiPageResult> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiProjectWikiPageDetail>(
            `/api/projects/${encodeURIComponent(projectId)}/wiki/pages`,
            {
                method: "POST",
                body: JSON.stringify({
                    slug: input.slug.trim().toLowerCase(),
                    title: input.title.trim(),
                    contentMd: input.contentMd,
                }),
            },
        );
        if (!res.ok) {
            return actionFail(envelopeMessage(body, "위키 문서를 만들지 못했습니다."));
        }
        revalidatePath(`/projects/${projectId}`);
        return { ok: true, data: body.data };
    } catch {
        return actionNetworkError();
    }
}

export async function updateProjectWikiPageAction(
    projectId: string,
    slug: string,
    input: { title: string; contentMd: string },
): Promise<ProjectWikiPageResult> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiProjectWikiPageDetail>(
            `/api/projects/${encodeURIComponent(projectId)}/wiki/pages/${encodeURIComponent(slug)}`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    title: input.title.trim(),
                    contentMd: input.contentMd,
                }),
            },
        );
        if (!res.ok) {
            return actionFail(envelopeMessage(body, "위키 문서를 저장하지 못했습니다."));
        }
        revalidatePath(`/projects/${projectId}`);
        return { ok: true, data: body.data };
    } catch {
        return actionNetworkError();
    }
}

export async function reorderProjectWikiPagesAction(
    projectId: string,
    slugs: string[],
): Promise<ProjectWikiReorderResult> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<{ slugs: string[] }>(
            `/api/projects/${encodeURIComponent(projectId)}/wiki/pages/reorder`,
            {
                method: "PATCH",
                body: JSON.stringify({ slugs }),
            },
        );
        if (!res.ok) {
            return actionFail(envelopeMessage(body, "문서 순서를 바꾸지 못했습니다."));
        }
        revalidatePath(`/projects/${projectId}`);
        return { ok: true };
    } catch {
        return actionNetworkError();
    }
}

export type ProjectWikiMediaUploadResult =
    | { ok: true; url: string; mimeType: string; fileName?: string; size?: number }
    | { ok: false; message: string };

export async function uploadProjectWikiMediaAction(
    projectId: string,
    file: File,
): Promise<ProjectWikiMediaUploadResult> {
    const denied = await requireActionSession();
    if (denied) return { ok: false, message: denied.message };

    const formData = new FormData();
    formData.append("file", file);

    try {
        const headers = await apiFetchHeadersWithoutContentType();
        const res = await apiFetchAuthenticated(
            `/api/projects/${encodeURIComponent(projectId)}/wiki/media`,
            { method: "POST", headers, body: formData },
        );
        const body = await readApiEnvelope<{
            url: string;
            mimeType: string;
            fileName: string;
            size: number;
        }>(res);
        if (!res.ok) {
            return { ok: false, message: envelopeMessage(body, "미디어 업로드에 실패했습니다.") };
        }
        const data = body.data;
        if (!data?.url) {
            return { ok: false, message: envelopeMessage(body, "미디어 업로드에 실패했습니다.") };
        }
        return {
            ok: true,
            url: data.url,
            mimeType: data.mimeType,
            fileName: data.fileName,
            size: data.size,
        };
    } catch {
        return actionNetworkError();
    }
}

export async function deleteProjectWikiPageAction(
    projectId: string,
    slug: string,
): Promise<ProjectWikiDeleteResult> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<{ slug: string }>(
            `/api/projects/${encodeURIComponent(projectId)}/wiki/pages/${encodeURIComponent(slug)}`,
            {
                method: "DELETE",
                body: JSON.stringify({}),
            },
        );
        if (!res.ok) {
            return actionFail(envelopeMessage(body, "위키 문서를 삭제하지 못했습니다."));
        }
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
