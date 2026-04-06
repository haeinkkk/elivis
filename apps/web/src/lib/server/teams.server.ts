import "server-only";

import { cookies } from "next/headers";

import type { ApiEnvelope } from "../http/api-envelope";
import type { ApiTeamDetail, ApiTeamListItem, ApiTeamsListData } from "../mappers/team";
import { apiUrl } from "../http/api-base-url";
import { AT_COOKIE } from "./auth.server";
import { apiFetchHeaders } from "../http/api-auth-headers.server";

export type TeamListItem = ApiTeamListItem;

export type TeamsListKind = "my" | "public";

/**
 * 팀 목록: 내가 속한 팀 + 공개 팀(숨김 아님·내가 아직 멤버 아님)
 * (검색어 q: 이름·짧은 설명·소개 본문 contains)
 */
export async function fetchTeamsList(input?: {
    q?: string;
    kind?: TeamsListKind;
    take?: number;
    skip?: number;
}): Promise<{
    myTeams: ApiTeamListItem[];
    publicTeams: ApiTeamListItem[];
    myTotal: number;
    publicTotal: number;
} | null> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return null;

    try {
        const params = new URLSearchParams();
        params.set("take", String(input?.take ?? 100));
        params.set("skip", String(input?.skip ?? 0));
        if (input?.kind) params.set("kind", input.kind);
        const trimmed = input?.q?.trim();
        if (trimmed) params.set("q", trimmed);

        const res = await fetch(apiUrl(`/api/teams?${params.toString()}`), {
            headers: await apiFetchHeaders(),
            cache: "no-store",
        });

        if (!res.ok) return null;

        const body = (await res.json()) as ApiEnvelope<ApiTeamsListData | Record<string, unknown>>;
        const d = body.data;
        if (!d || typeof d !== "object") return null;

        /** 신규 API: myTeams / publicTeams, 구버전 호환: items만 있으면 내 팀으로 간주 */
        const myTeams = Array.isArray((d as ApiTeamsListData).myTeams)
            ? (d as ApiTeamsListData).myTeams
            : Array.isArray((d as { items?: ApiTeamListItem[] }).items)
              ? ((d as { items: ApiTeamListItem[] }).items)
              : [];
        const publicTeams = Array.isArray((d as ApiTeamsListData).publicTeams)
            ? (d as ApiTeamsListData).publicTeams
            : [];
        const myTotal =
            typeof (d as ApiTeamsListData).myTotal === "number"
                ? (d as ApiTeamsListData).myTotal
                : myTeams.length;
        const publicTotal =
            typeof (d as ApiTeamsListData).publicTotal === "number"
                ? (d as ApiTeamsListData).publicTotal
                : publicTeams.length;

        return { myTeams, publicTeams, myTotal, publicTotal };
    } catch {
        return null;
    }
}

export async function fetchTeams(q?: string) {
    return fetchTeamsList({ q });
}

export type {
    ApiTeamDetail as TeamDetail,
    ApiTeamMemberRow as TeamMemberRow,
    ApiTeamProjectRow as TeamProjectRow,
} from "../mappers/team";

export type FetchTeamByIdResult =
    | { ok: true; team: ApiTeamDetail }
    | { ok: false; reason: "unauthorized" | "not_found" | "error" };

/**
 * 팀 상세 — 멤버면 전체, 비멤버면 공개 팀(`hiddenFromUsers === false`)만 요약.
 * - 401·토큰 없음 → unauthorized (로그인 필요)
 * - 404 → not_found
 * - 그 외 실패 → error
 */
export async function fetchTeamById(teamId: string): Promise<FetchTeamByIdResult> {
    const jar = await cookies();
    const token = jar.get(AT_COOKIE)?.value?.trim();
    if (!token) {
        return { ok: false, reason: "unauthorized" };
    }

    const trimmedId = teamId?.trim();
    if (!trimmedId || trimmedId === "placeholder") {
        return { ok: false, reason: "not_found" };
    }

    try {
        const res = await fetch(apiUrl(`/api/teams/${encodeURIComponent(trimmedId)}`), {
            headers: await apiFetchHeaders(),
            cache: "no-store",
        });

        if (res.status === 401) {
            return { ok: false, reason: "unauthorized" };
        }
        if (res.status === 404) {
            return { ok: false, reason: "not_found" };
        }

        let body: ApiEnvelope<ApiTeamDetail> | null = null;
        try {
            body = (await res.json()) as ApiEnvelope<ApiTeamDetail>;
        } catch {
            return { ok: false, reason: "error" };
        }

        if (!res.ok) {
            return { ok: false, reason: "error" };
        }

        if (body.data == null) {
            return { ok: false, reason: "error" };
        }

        return { ok: true, team: body.data };
    } catch {
        return { ok: false, reason: "error" };
    }
}
