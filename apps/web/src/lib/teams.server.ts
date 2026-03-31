import "server-only";

import { cookies } from "next/headers";

import { apiUrl } from "./api";
import { AT_COOKIE } from "./auth.server";

export interface TeamListItem {
    id: string;
    name: string;
    shortDescription: string | null;
    introMessage: string | null;
    bannerUrl: string | null;
    hiddenFromUsers?: boolean;
    createdById: string;
    createdBy?: { id: string; email: string; name: string | null; avatarUrl: string | null };
    createdAt: string;
    updatedAt: string;
    _count: { members: number };
}

interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
}

export type TeamsListKind = "my" | "public";

async function buildHeaders() {
    const jar = await cookies();
    return {
        Authorization: `Bearer ${jar.get(AT_COOKIE)?.value ?? ""}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Language": jar.get("elivis_lang")?.value ?? "ko",
    };
}

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
    myTeams: TeamListItem[];
    publicTeams: TeamListItem[];
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
            headers: await buildHeaders(),
            cache: "no-store",
        });

        if (!res.ok) return null;

        const body = (await res.json()) as ApiResponse<Record<string, unknown>>;
        const d = body.data;
        if (!d || typeof d !== "object") return null;

        /** 신규 API: myTeams / publicTeams, 구버전 호환: items만 있으면 내 팀으로 간주 */
        const myTeams = Array.isArray(d.myTeams)
            ? (d.myTeams as TeamListItem[])
            : Array.isArray(d.items)
              ? (d.items as TeamListItem[])
              : [];
        const publicTeams = Array.isArray(d.publicTeams) ? (d.publicTeams as TeamListItem[]) : [];
        const myTotal =
            typeof d.myTotal === "number" ? d.myTotal : myTeams.length;
        const publicTotal =
            typeof d.publicTotal === "number" ? d.publicTotal : publicTeams.length;

        return { myTeams, publicTeams, myTotal, publicTotal };
    } catch {
        return null;
    }
}

export async function fetchTeams(q?: string) {
    return fetchTeamsList({ q });
}

export interface TeamMemberRow {
    id: string;
    role: "LEADER" | "MEMBER";
    joinedAt: string;
    user: { id: string; email: string; name: string | null; avatarUrl: string | null };
}

export interface TeamProjectRow {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    _count: { tasks: number; members: number };
}

export interface TeamDetail {
    id: string;
    name: string;
    shortDescription: string | null;
    introMessage: string | null;
    bannerUrl: string | null;
    /** 소개 탭 블록 레이아웃 JSON, 없으면 클라이언트 기본값 */
    introLayoutJson: string | null;
    /** 일반 사용자 전체 목록에서 숨김(SUPER_ADMIN은 전체 조회 시 표시) */
    hiddenFromUsers: boolean;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    createdBy: { id: string; email: string; name: string | null; avatarUrl: string | null };
    members: TeamMemberRow[];
    projects: TeamProjectRow[];
    /** 현재 로그인 사용자의 팀 내 역할. null이면 공개 팀 페이지(비멤버) */
    viewerRole: "LEADER" | "MEMBER" | null;
    /** 비멤버 공개 조회 시 멤버 수 (멤버일 때는 생략 가능) */
    _count?: { members: number };
}

export type FetchTeamByIdResult =
    | { ok: true; team: TeamDetail }
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
            headers: await buildHeaders(),
            cache: "no-store",
        });

        if (res.status === 401) {
            return { ok: false, reason: "unauthorized" };
        }
        if (res.status === 404) {
            return { ok: false, reason: "not_found" };
        }

        let body: ApiResponse<TeamDetail> | null = null;
        try {
            body = (await res.json()) as ApiResponse<TeamDetail>;
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
