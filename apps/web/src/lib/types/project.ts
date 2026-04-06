export type ProjectViewerRole = "LEADER" | "DEPUTY_LEADER" | "MEMBER";

export type ProjectUser = {
    id: string;
    name: string;
    /** 표시용(이메일) */
    userId: string;
    role?: ProjectViewerRole;
    avatarUrl?: string | null;
};

export type ProjectTeam = {
    id: string;
    name: string;
    teamId: string;
};

export type ProjectType = "personal" | "team";

export type Project = {
    id: string;
    name: string;
    description: string;
    projectUrl: string;
    startDate: string;
    endDate: string;
    noEndDate: boolean;
    projectType: ProjectType;
    isPublic: boolean;
    participants: ProjectUser[];
    teams: ProjectTeam[];
    createdAt: number;
    /** API 조회 시에만 */
    viewerRole?: ProjectViewerRole;
};
