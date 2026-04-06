/** 앱 `@/lib/types/project`의 `Project` / `ProjectUser`와 구조 호환 — 프로젝트 상세 UI 입력 */

export type ProjectDetailViewerRole = "LEADER" | "DEPUTY_LEADER" | "MEMBER";

export type ProjectDetailParticipant = {
    id: string;
    name: string;
    userId: string;
    role?: ProjectDetailViewerRole;
    avatarUrl?: string | null;
};

export type ProjectDetailTeam = {
    id: string;
    name: string;
    teamId: string;
};

export type ProjectDetailModel = {
    id: string;
    name: string;
    description: string;
    projectUrl: string;
    startDate: string;
    endDate: string;
    noEndDate: boolean;
    projectType: "personal" | "team";
    isPublic: boolean;
    participants: ProjectDetailParticipant[];
    teams: ProjectDetailTeam[];
    createdAt: number;
    viewerRole?: ProjectDetailViewerRole;
};
