import type { Project, ProjectViewerRole } from "@/lib/projects";

import type { ApiTeamMemberRow } from "./map-api-team";

/** GET /api/projects 목록 한 행 */
export type ApiProjectListItem = {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    /** 첫 연결 팀(하위 호환) */
    team: { id: string; name: string } | null;
    /** 복수 팀 연결 시 전체 */
    projectTeams?: { team: { id: string; name: string } }[];
    /** `members`: ProjectMember + 연결 팀 팀원(userId 중복 제거) 합산 — 목록 표시용 */
    _count: { members: number; tasks: number };
    /** 현재 사용자가 ProjectMember로 직접 등록된 경우 true (생성자 포함) */
    viewerIsMember?: boolean;
    /** 현재 사용자가 연결된 팀의 팀원인 경우 true */
    viewerIsTeamMember?: boolean;
};

/** GET /api/projects 응답 `data` */
export type ApiProjectListData = {
    items: ApiProjectListItem[];
    take: number;
    skip: number;
};

/** POST 생성·DELETE 등 id만 돌려주는 응답 `data` */
export type ApiIdPayload = { id: string };

/** GET/PATCH /api/projects/:id 응답 data */
export type ApiProjectDetail = {
    id: string;
    name: string;
    description: string | null;
    teamId: string | null;
    startDate: string | null;
    endDate: string | null;
    noEndDate: boolean;
    isPublic: boolean;
    createdAt: string;
    team: { id: string; name: string } | null;
    projectTeams?: {
        team: { id: string; name: string };
    }[];
    /** DB `ProjectMember`만 */
    members: {
        userId: string;
        role: ProjectViewerRole;
        user: { id: string; email: string; name: string | null; avatarUrl: string | null };
    }[];
    /** 연결 팀 소속 — `ApiTeamDetail.members` 행과 동일 형태 (팀 API와 맞춤) */
    linkedTeamMembers?: ApiTeamMemberRow[];
    viewerRole?: ProjectViewerRole | null;
};

/** 프로젝트 멤버 + 연결 팀 멤버(중복 userId 제외, 팀만 해당 시 MEMBER) → 표시용 목록 */
function mergeMembersForDisplay(
    members: ApiProjectDetail["members"],
    linkedTeamMembers: ApiTeamMemberRow[] | undefined,
): ApiProjectDetail["members"] {
    if (!linkedTeamMembers?.length) return members;
    const seen = new Set(members.map((m) => m.userId));
    const fromTeams = linkedTeamMembers
        .filter((tm) => !seen.has(tm.user.id))
        .map((tm) => ({
            userId: tm.user.id,
            role: "MEMBER" as ProjectViewerRole,
            user: tm.user,
        }));
    return [...members, ...fromTeams];
}

export function toYmdFromIso(iso: string | null | undefined): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export function mapApiProjectToClient(data: ApiProjectDetail): Project {
    const linkedFromJoin =
        data.projectTeams?.map((pt) => ({
            id: pt.team.id,
            name: pt.team.name,
            teamId: pt.team.id,
        })) ?? [];
    const teams =
        linkedFromJoin.length > 0
            ? linkedFromJoin
            : data.team
              ? [{ id: data.team.id, name: data.team.name, teamId: data.team.id }]
              : [];
    const isTeamProject = teams.length > 0 || Boolean(data.teamId);

    const vr = data.viewerRole;
    const viewerRole: ProjectViewerRole | undefined =
        vr === "LEADER" || vr === "DEPUTY_LEADER" || vr === "MEMBER" ? vr : undefined;

    const ROLE_ORDER: Record<ProjectViewerRole, number> = {
        LEADER: 0,
        DEPUTY_LEADER: 1,
        MEMBER: 2,
    };

    const displayMembers = mergeMembersForDisplay(data.members, data.linkedTeamMembers);

    const participants = displayMembers
        .map((m) => ({
            id: m.user.id,
            name: m.user.name?.trim() || m.user.email.split("@")[0] || m.user.email,
            userId: m.user.email,
            role: m.role,
            avatarUrl: m.user.avatarUrl,
        }))
        .sort((a, b) => {
            const ra = ROLE_ORDER[a.role];
            const rb = ROLE_ORDER[b.role];
            if (ra !== rb) return ra - rb;
            return a.name.localeCompare(b.name, "ko");
        });

    return {
        id: data.id,
        name: data.name,
        description: data.description ?? "",
        projectUrl: "",
        startDate: toYmdFromIso(data.startDate),
        endDate: toYmdFromIso(data.endDate),
        noEndDate: data.noEndDate,
        projectType: isTeamProject ? "team" : "personal",
        isPublic: data.isPublic,
        participants,
        teams,
        createdAt: new Date(data.createdAt).getTime(),
        viewerRole,
    };
}
