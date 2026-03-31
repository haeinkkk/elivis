"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { apiUrl, getApiBaseUrl } from "@/lib/api";
import { AT_COOKIE } from "@/lib/auth.server";
import type { TeamListItem } from "@/lib/teams.server";

interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
}

async function buildHeaders() {
    const jar = await cookies();
    return {
        Authorization: `Bearer ${jar.get(AT_COOKIE)?.value ?? ""}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Language": jar.get("elivis_lang")?.value ?? "ko",
    };
}

export type SearchableUser = { id: string; email: string; name: string | null };

export async function createTeamAction(input: {
    name: string;
    shortDescription?: string;
    introMessage?: string;
    /** 일반 사용자 팀 목록에서 숨김 */
    hiddenFromUsers?: boolean;
    memberUserIds?: string[];
}): Promise<{ ok: true; teamId: string } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) {
        return { ok: false, message: "로그인이 필요합니다." };
    }

    try {
        const res = await fetch(apiUrl("/api/teams"), {
            method: "POST",
            headers: await buildHeaders(),
            body: JSON.stringify({
                name: input.name.trim(),
                shortDescription: input.shortDescription?.trim() || undefined,
                introMessage: input.introMessage?.trim() || undefined,
                hiddenFromUsers: Boolean(input.hiddenFromUsers),
                memberUserIds: input.memberUserIds?.length ? input.memberUserIds : undefined,
            }),
            cache: "no-store",
        });

        const body = (await res.json()) as ApiResponse<{ id: string }>;

        if (!res.ok) {
            return { ok: false, message: body.message ?? "팀 생성에 실패했습니다." };
        }

        revalidatePath("/teams");
        return { ok: true, teamId: body.data.id };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

export async function addTeamMemberAction(
    teamId: string,
    userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) {
        return { ok: false, message: "로그인이 필요합니다." };
    }

    try {
        const res = await fetch(apiUrl(`/api/teams/${encodeURIComponent(teamId)}/members`), {
            method: "POST",
            headers: await buildHeaders(),
            body: JSON.stringify({ userId: userId.trim() }),
            cache: "no-store",
        });

        const body = (await res.json()) as ApiResponse<unknown>;

        if (!res.ok) {
            return { ok: false, message: body.message ?? "팀원 추가에 실패했습니다." };
        }

        revalidatePath("/teams");
        revalidatePath(`/teams/${teamId}`);
        return { ok: true };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

export async function searchUsersForTeamAction(
    q: string,
): Promise<{ ok: true; users: SearchableUser[] } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) {
        return { ok: false, message: "로그인이 필요합니다." };
    }

    try {
        const params = new URLSearchParams();
        params.set("q", q.trim());

        const res = await fetch(apiUrl(`/api/users/search?${params.toString()}`), {
            headers: await buildHeaders(),
            cache: "no-store",
        });

        const body = (await res.json()) as ApiResponse<SearchableUser[]>;

        if (!res.ok) {
            return { ok: false, message: body.message ?? "검색에 실패했습니다." };
        }

        return { ok: true, users: body.data };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
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
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) {
        return { ok: false, message: "로그인이 필요합니다." };
    }

    const body: Record<string, string | null | boolean> = {};
    if (fields.teamName !== undefined) body.name = fields.teamName;
    if ("shortDescription" in fields) body.shortDescription = fields.shortDescription ?? null;
    if ("introMessage" in fields) body.introMessage = fields.introMessage ?? null;
    if ("introLayoutJson" in fields) body.introLayoutJson = fields.introLayoutJson ?? null;
    if ("hiddenFromUsers" in fields) body.hiddenFromUsers = fields.hiddenFromUsers ?? false;
    if (Object.keys(body).length === 0) {
        return { ok: false, message: "수정할 항목이 없습니다." };
    }

    try {
        const res = await fetch(apiUrl(`/api/teams/${encodeURIComponent(teamId)}`), {
            method: "PUT",
            headers: await buildHeaders(),
            body: JSON.stringify(body),
            cache: "no-store",
        });

        const parsed = (await res.json()) as ApiResponse<{
            name: string;
            shortDescription: string | null;
            introMessage: string | null;
            introLayoutJson: string | null;
            hiddenFromUsers: boolean;
        }>;

        if (!res.ok) {
            return { ok: false, message: parsed.message ?? "저장에 실패했습니다." };
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
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

export async function deleteTeamAction(
    teamId: string,
    confirmName: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) {
        return { ok: false, message: "로그인이 필요합니다." };
    }

    try {
        const res = await fetch(apiUrl(`/api/teams/${encodeURIComponent(teamId)}`), {
            method: "DELETE",
            headers: await buildHeaders(),
            body: JSON.stringify({ confirmName: confirmName.trim() }),
            cache: "no-store",
        });

        const parsed = (await res.json()) as ApiResponse<{ id: string }>;

        if (!res.ok) {
            return { ok: false, message: parsed.message ?? "팀 삭제에 실패했습니다." };
        }

        revalidatePath("/teams");
        revalidatePath(`/teams/${teamId}`);
        return { ok: true };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
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
    const jar = await cookies();
    const accessToken = jar.get(AT_COOKIE)?.value ?? "";
    const lang = jar.get("elivis_lang")?.value ?? "ko";

    if (!accessToken) {
        return { ok: false, message: "로그인이 필요합니다." };
    }

    try {
        const res = await fetch(apiUrl(`/api/teams/${encodeURIComponent(teamId)}/banner`), {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Accept-Language": lang,
            },
            body: formData,
        });

        const body = (await res.json()) as {
            code: number;
            message: string;
            data: { bannerUrl: string | null };
        };

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
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

export async function deleteTeamBannerAction(teamId: string): Promise<TeamBannerActionResult> {
    const jar = await cookies();
    const accessToken = jar.get(AT_COOKIE)?.value ?? "";
    const lang = jar.get("elivis_lang")?.value ?? "ko";

    if (!accessToken) {
        return { ok: false, message: "로그인이 필요합니다." };
    }

    try {
        const res = await fetch(apiUrl(`/api/teams/${encodeURIComponent(teamId)}/banner`), {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Accept-Language": lang,
            },
        });

        const body = (await res.json()) as { code: number; message: string };

        if (!res.ok) {
            return { ok: false, message: body.message };
        }

        revalidatePath("/teams");
        revalidatePath(`/teams/${teamId}`);
        return { ok: true, bannerUrl: null };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

export async function updateMyTeamPinsAction(teamIds: string[]): Promise<
    | { ok: true }
    | { ok: false; message: string }
> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) {
        return { ok: false, message: "로그인이 필요합니다." };
    }

    try {
        const res = await fetch(apiUrl("/api/teams/pins"), {
            method: "PUT",
            headers: await buildHeaders(),
            body: JSON.stringify({ teamIds }),
            cache: "no-store",
        });
        const body = (await res.json()) as ApiResponse<unknown>;
        if (!res.ok) {
            return { ok: false, message: body.message ?? "저장에 실패했습니다." };
        }
        revalidatePath("/teams");
        return { ok: true };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

export async function fetchMorePublicTeamsAction(input: {
    q?: string;
    take: number;
    skip: number;
}): Promise<{ ok: true; publicTeams: TeamListItem[] } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) {
        return { ok: false, message: "로그인이 필요합니다." };
    }

    try {
        const params = new URLSearchParams();
        params.set("kind", "public");
        params.set("take", String(input.take));
        params.set("skip", String(input.skip));
        const trimmed = input.q?.trim();
        if (trimmed) params.set("q", trimmed);

        const res = await fetch(apiUrl(`/api/teams?${params.toString()}`), {
            headers: await buildHeaders(),
            cache: "no-store",
        });

        const body = (await res.json()) as ApiResponse<Record<string, unknown>>;
        if (!res.ok) {
            return { ok: false, message: body.message ?? "불러오기에 실패했습니다." };
        }
        const d = body.data;
        const publicTeams =
            d && typeof d === "object" && Array.isArray((d as any).publicTeams)
                ? ((d as any).publicTeams as TeamListItem[])
                : [];
        return { ok: true, publicTeams };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}
