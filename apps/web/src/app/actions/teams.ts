"use server";

import { revalidatePath } from "next/cache";

import type { ApiEnvelope } from "@/lib/http/api-envelope";
import { getApiBaseUrl } from "@/lib/http/api-base-url";
import type { ApiIdPayload } from "@/lib/mappers/project";
import type {
    ApiTeamBannerData,
    ApiTeamDetail,
    ApiTeamFavoriteItem,
    ApiTeamFieldsUpdated,
    ApiTeamListItem,
    ApiTeamsListData,
} from "@/lib/mappers/team";
import type { ApiUserSearchRow } from "@/lib/mappers/user";
import type { TeamListItem } from "@/lib/server/teams.server";
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

export type SearchableUser = ApiUserSearchRow;

export async function createTeamAction(input: {
    name: string;
    shortDescription?: string;
    introMessage?: string;
    /** 일반 사용자 팀 목록에서 숨김 */
    hiddenFromUsers?: boolean;
    memberUserIds?: string[];
}): Promise<{ ok: true; teamId: string } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiIdPayload>("/api/teams", {
            method: "POST",
            body: JSON.stringify({
                name: input.name.trim(),
                shortDescription: input.shortDescription?.trim() || undefined,
                introMessage: input.introMessage?.trim() || undefined,
                hiddenFromUsers: Boolean(input.hiddenFromUsers),
                memberUserIds: input.memberUserIds?.length ? input.memberUserIds : undefined,
            }),
        });

        if (!res.ok) {
            return actionFail(envelopeMessage(body, "팀 생성에 실패했습니다."));
        }

        revalidatePath("/teams");
        return { ok: true, teamId: body.data.id };
    } catch {
        return actionNetworkError();
    }
}

export async function addTeamMemberAction(
    teamId: string,
    userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<unknown>(
            `/api/teams/${encodeURIComponent(teamId)}/members`,
            {
                method: "POST",
                body: JSON.stringify({ userId: userId.trim() }),
            },
        );

        if (!res.ok) {
            return actionFail(envelopeMessage(body, "팀원 추가에 실패했습니다."));
        }

        revalidatePath("/teams");
        revalidatePath(`/teams/${teamId}`);
        return { ok: true };
    } catch {
        return actionNetworkError();
    }
}

export async function delegateTeamLeaderAction(
    teamId: string,
    userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<unknown>(
            `/api/teams/${encodeURIComponent(teamId)}/leader`,
            {
                method: "PUT",
                body: JSON.stringify({ userId: userId.trim() }),
            },
        );

        if (!res.ok) {
            return actionFail(envelopeMessage(body, "팀장 위임에 실패했습니다."));
        }

        revalidatePath("/teams");
        revalidatePath(`/teams/${teamId}`);
        return { ok: true };
    } catch {
        return actionNetworkError();
    }
}

export async function removeTeamMemberAction(
    teamId: string,
    userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const headers = await apiFetchHeadersWithoutContentType();
        const { res, body } = await fetchApiEnvelope<unknown>(
            `/api/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`,
            { method: "DELETE", headers },
        );

        if (!res.ok) {
            return actionFail(envelopeMessage(body, "팀원 제외에 실패했습니다."));
        }

        revalidatePath("/teams");
        revalidatePath(`/teams/${teamId}`);
        return { ok: true };
    } catch {
        return actionNetworkError();
    }
}

export async function searchUsersForTeamAction(
    q: string,
): Promise<{ ok: true; users: ApiUserSearchRow[] } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const params = new URLSearchParams();
        params.set("q", q.trim());

        const { res, body } = await fetchApiEnvelope<ApiUserSearchRow[]>(
            `/api/users/search?${params.toString()}`,
        );

        if (!res.ok) {
            return actionFail(envelopeMessage(body, "검색에 실패했습니다."));
        }

        return { ok: true, users: body.data };
    } catch {
        return actionNetworkError();
    }
}

/** API는 `name` 필드를 쓰지만, Server Actions 인자 직렬화에서 `name` 키가 누락되는 경우가 있어 `teamName`으로 받아 전송 시 매핑합니다. */
export type UpdateTeamFieldsPayload = {
    teamName?: string;
    shortDescription?: string | null;
    introMessage?: string | null;
    introLayoutJson?: string | null;
    hiddenFromUsers?: boolean;
};

export async function updateTeamFieldsAction(
    teamId: string,
    fields: UpdateTeamFieldsPayload,
): Promise<
    | {
          ok: true;
          name: string;
          shortDescription: string | null;
          introMessage: string | null;
          introLayoutJson: string | null;
          hiddenFromUsers: boolean;
      }
    | { ok: false; message: string }
> {
    const denied = await requireActionSession();
    if (denied) return denied;

    const body: Record<string, string | null | boolean> = {};
    if (fields.teamName !== undefined) body.name = fields.teamName;
    if ("shortDescription" in fields) body.shortDescription = fields.shortDescription ?? null;
    if ("introMessage" in fields) body.introMessage = fields.introMessage ?? null;
    if ("introLayoutJson" in fields) body.introLayoutJson = fields.introLayoutJson ?? null;
    if ("hiddenFromUsers" in fields) body.hiddenFromUsers = fields.hiddenFromUsers ?? false;
    if (Object.keys(body).length === 0) {
        return actionFail("수정할 항목이 없습니다.");
    }

    try {
        const { res, body: parsed } = await fetchApiEnvelope<ApiTeamFieldsUpdated>(
            `/api/teams/${encodeURIComponent(teamId)}`,
            {
                method: "PUT",
                body: JSON.stringify(body),
            },
        );

        if (!res.ok) {
            return actionFail(envelopeMessage(parsed, "저장에 실패했습니다."));
        }

        revalidatePath("/teams");
        revalidatePath(`/teams/${teamId}`);
        return {
            ok: true,
            name: parsed.data.name,
            shortDescription: parsed.data.shortDescription,
            introMessage: parsed.data.introMessage,
            introLayoutJson: parsed.data.introLayoutJson,
            hiddenFromUsers: parsed.data.hiddenFromUsers,
        };
    } catch {
        return actionNetworkError();
    }
}

export async function deleteTeamAction(
    teamId: string,
    confirmName: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body: parsed } = await fetchApiEnvelope<ApiIdPayload>(
            `/api/teams/${encodeURIComponent(teamId)}`,
            {
                method: "DELETE",
                body: JSON.stringify({ confirmName: confirmName.trim() }),
            },
        );

        if (!res.ok) {
            return actionFail(envelopeMessage(parsed, "팀 삭제에 실패했습니다."));
        }

        revalidatePath("/teams");
        revalidatePath(`/teams/${teamId}`);
        return { ok: true };
    } catch {
        return actionNetworkError();
    }
}

export interface TeamBannerActionResult {
    ok: boolean;
    message?: string;
    bannerUrl?: string | null;
}

export async function uploadTeamBannerAction(
    teamId: string,
    formData: FormData,
): Promise<TeamBannerActionResult> {
    const denied = await requireActionSession();
    if (denied) return { ok: false, message: denied.message };

    try {
        const headers = await apiFetchHeadersWithoutContentType();
        const res = await apiFetchAuthenticated(
            `/api/teams/${encodeURIComponent(teamId)}/banner`,
            {
                method: "POST",
                headers,
                body: formData,
            },
        );
        const body = await readApiEnvelope<ApiTeamBannerData>(res);

        if (!res.ok) {
            return { ok: false, message: body.message };
        }

        const raw = body.data.bannerUrl;
        const bannerUrl = raw
            ? raw.startsWith("http")
                ? raw
                : `${getApiBaseUrl()}${raw}`
            : null;

        revalidatePath("/teams");
        revalidatePath(`/teams/${teamId}`);
        return { ok: true, bannerUrl };
    } catch {
        return actionNetworkError();
    }
}

export async function deleteTeamBannerAction(teamId: string): Promise<TeamBannerActionResult> {
    const denied = await requireActionSession();
    if (denied) return { ok: false, message: denied.message };

    try {
        const headers = await apiFetchHeadersWithoutContentType();
        const res = await apiFetchAuthenticated(
            `/api/teams/${encodeURIComponent(teamId)}/banner`,
            {
                method: "DELETE",
                headers,
            },
        );
        const body = (await res.json()) as Pick<ApiEnvelope<unknown>, "code" | "message">;

        if (!res.ok) {
            return { ok: false, message: body.message };
        }

        revalidatePath("/teams");
        revalidatePath(`/teams/${teamId}`);
        return { ok: true, bannerUrl: null };
    } catch {
        return actionNetworkError();
    }
}

export async function updateMyTeamPinsAction(teamIds: string[]): Promise<
    { ok: true } | { ok: false; message: string }
> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<unknown>("/api/teams/pins", {
            method: "PUT",
            body: JSON.stringify({ teamIds }),
        });
        if (!res.ok) {
            return actionFail(envelopeMessage(body, "저장에 실패했습니다."));
        }
        revalidatePath("/teams");
        return { ok: true };
    } catch {
        return actionNetworkError();
    }
}

/** 프로젝트 생성 시 팀 선택 모달용 — 내가 팀장인 팀만 (`kind=my&leaderOnly=1`) */
export type ProjectTeamOption = {
    id: string;
    name: string;
    shortDescription: string | null;
    memberCount: number;
};

function mapTeamListItemToProjectOption(t: ApiTeamListItem): ProjectTeamOption {
    return {
        id: t.id,
        name: t.name,
        shortDescription: t.shortDescription,
        memberCount: t._count.members,
    };
}

/**
 * `GET /api/teams?kind=my&leaderOnly=1` — 프로젝트 생성용: 내가 팀장인 팀만.
 */
export async function fetchMyTeamsForProjectAction(input?: {
    q?: string;
    take?: number;
    skip?: number;
}): Promise<{ ok: true; teams: ProjectTeamOption[] } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const params = new URLSearchParams();
        params.set("kind", "my");
        params.set("leaderOnly", "1");
        params.set("take", String(input?.take ?? 80));
        params.set("skip", String(input?.skip ?? 0));
        const trimmed = input?.q?.trim();
        if (trimmed) params.set("q", trimmed);

        const { res, body } = await fetchApiEnvelope<ApiTeamsListData | Record<string, unknown>>(
            `/api/teams?${params.toString()}`,
        );
        if (!res.ok) {
            return actionFail(envelopeMessage(body, "팀 목록을 불러오지 못했습니다."));
        }
        const d = body.data;
        const raw =
            d && typeof d === "object" && Array.isArray((d as ApiTeamsListData).myTeams)
                ? (d as ApiTeamsListData).myTeams
                : Array.isArray((d as { items?: ApiTeamListItem[] }).items)
                  ? (d as { items: ApiTeamListItem[] }).items
                  : [];
        return { ok: true, teams: raw.map(mapTeamListItemToProjectOption) };
    } catch {
        return actionNetworkError();
    }
}

/** URL `?teamIds=` 프리셋 시 카드에 이름 표시용 — `GET /api/teams/:id` */
export async function fetchTeamBriefForProjectAction(
    teamId: string,
): Promise<{ ok: true; team: ProjectTeamOption } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    const id = teamId?.trim();
    if (!id) {
        return actionFail("팀을 찾을 수 없습니다.");
    }

    try {
        const { res, body } = await fetchApiEnvelope<ApiTeamDetail>(
            `/api/teams/${encodeURIComponent(id)}`,
        );

        if (!res.ok) {
            return actionFail(envelopeMessage(body, "팀 정보를 불러오지 못했습니다."));
        }

        const d = body.data;
        const memberCount =
            typeof d._count?.members === "number"
                ? d._count.members
                : Array.isArray(d.members)
                  ? d.members.length
                  : 0;

        return {
            ok: true,
            team: {
                id: d.id,
                name: d.name,
                shortDescription: d.shortDescription,
                memberCount,
            },
        };
    } catch {
        return actionNetworkError();
    }
}

export async function fetchMorePublicTeamsAction(input: {
    q?: string;
    take: number;
    skip: number;
}): Promise<{ ok: true; publicTeams: TeamListItem[] } | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const params = new URLSearchParams();
        params.set("kind", "public");
        params.set("take", String(input.take));
        params.set("skip", String(input.skip));
        const trimmed = input.q?.trim();
        if (trimmed) params.set("q", trimmed);

        const { res, body } = await fetchApiEnvelope<ApiTeamsListData | Record<string, unknown>>(
            `/api/teams?${params.toString()}`,
        );
        if (!res.ok) {
            return actionFail(envelopeMessage(body, "불러오기에 실패했습니다."));
        }
        const d = body.data;
        const publicTeams =
            d && typeof d === "object" && Array.isArray((d as ApiTeamsListData).publicTeams)
                ? (d as ApiTeamsListData).publicTeams
                : [];
        return { ok: true, publicTeams };
    } catch {
        return actionNetworkError();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 팀 즐겨찾기
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchTeamFavoritesAction(): Promise<{
    ok: true;
    favorites: ApiTeamFavoriteItem[];
} | { ok: false; message: string }> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiTeamFavoriteItem[]>("/api/teams/favorites");
        if (!res.ok)
            return actionFail(envelopeMessage(body, "즐겨찾기를 불러오지 못했습니다."));
        return { ok: true, favorites: body.data ?? [] };
    } catch {
        return actionNetworkError();
    }
}

export async function addTeamFavoriteAction(teamId: string): Promise<{
    ok: boolean;
    message?: string;
    favorite?: ApiTeamFavoriteItem;
}> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<ApiTeamFavoriteItem>(
            `/api/teams/${encodeURIComponent(teamId)}/favorite`,
            {
                method: "POST",
                body: JSON.stringify({}),
            },
        );
        if (!res.ok) return { ok: false, message: body.message };
        revalidatePath("/teams");
        revalidatePath(`/teams/${teamId}`);
        return { ok: true, favorite: body.data };
    } catch {
        return actionNetworkError();
    }
}

export async function removeTeamFavoriteAction(teamId: string): Promise<{
    ok: boolean;
    message?: string;
}> {
    const denied = await requireActionSession();
    if (denied) return denied;

    try {
        const { res, body } = await fetchApiEnvelope<null>(
            `/api/teams/${encodeURIComponent(teamId)}/favorite`,
            {
                method: "DELETE",
                body: JSON.stringify({}),
            },
        );
        if (!res.ok) return { ok: false, message: body.message };
        revalidatePath("/teams");
        revalidatePath(`/teams/${teamId}`);
        return { ok: true };
    } catch {
        return actionNetworkError();
    }
}

export async function checkTeamFavoriteAction(teamId: string): Promise<boolean> {
    if (!(await hasActionSession())) return false;

    try {
        const { res, body } = await fetchApiEnvelope<{ isFavorite: boolean }>(
            `/api/teams/${encodeURIComponent(teamId)}/favorite/status`,
        );
        if (!res.ok) return false;
        return body.data?.isFavorite ?? false;
    } catch {
        return false;
    }
}
