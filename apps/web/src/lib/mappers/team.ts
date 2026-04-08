/** GET /api/teams 목록 한 행 */
export type ApiTeamListItem = {
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
};

/** GET /api/teams?kind=my|public 응답 `data` (신규 형태) */
export type ApiTeamsListData = {
    myTeams: ApiTeamListItem[];
    publicTeams: ApiTeamListItem[];
    myTotal: number;
    publicTotal: number;
};

/** PUT/PATCH /api/teams/:id 응답 `data` (필드 일부 갱신 시) */
export type ApiTeamFieldsUpdated = {
    name: string;
    shortDescription: string | null;
    introMessage: string | null;
    introLayoutJson: string | null;
    hiddenFromUsers: boolean;
};

/** POST /api/teams/:id/banner 응답 `data` */
export type ApiTeamBannerData = {
    bannerUrl: string | null;
};

/** GET /api/teams/favorites 한 행 */
export type ApiTeamFavoriteItem = {
    id: string;
    order: number;
    createdAt: string;
    team: {
        id: string;
        name: string;
        shortDescription: string | null;
        bannerThumbUrl: string | null;
        hiddenFromUsers: boolean;
        _count: { members: number };
    };
};

/** GET /api/teams/:id/join-requests 응답 `data.requests` 한 행 */
export type ApiTeamJoinRequestRow = {
    id: string;
    createdAt: string;
    applicant: { id: string; email: string; name: string | null; avatarUrl: string | null };
};

/** GET /api/teams/:id 응답 `data` — 팀 상세 API와 동일한 JSON 형태 */

export type ApiTeamMemberRow = {
    role: "LEADER" | "MEMBER";
    joinedAt: string;
    user: { id: string; email: string; name: string | null; avatarUrl: string | null };
};

export type ApiTeamProjectRow = {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    _count: { tasks: number; members: number };
};

export type ApiTeamDetail = {
    id: string;
    name: string;
    shortDescription: string | null;
    introMessage: string | null;
    bannerUrl: string | null;
    introLayoutJson: string | null;
    hiddenFromUsers: boolean;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    createdBy: { id: string; email: string; name: string | null; avatarUrl: string | null };
    members: ApiTeamMemberRow[];
    projects: ApiTeamProjectRow[];
    viewerRole: "LEADER" | "MEMBER" | null;
    joinRequestPending?: boolean;
    _count?: { members: number };
};
