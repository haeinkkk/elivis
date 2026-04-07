/** GET/PATCH /api/admin/users… 응답 `data` */

export type ApiAdminUserRow = {
    id: string;
    email: string;
    name: string | null;
    systemRole: "SUPER_ADMIN" | "USER";
    accessBlocked: boolean;
    accessBlockReason?: string | null;
    accessBlockedAt?: string | null;
    createdAt: string;
    /** 목록 표시용 — 서버에서만 채워 hydration과 맞춤 */
    createdAtLabel?: string;
    _count: { memberships: number };
    memberships?: { project: { name: string } }[];
    teamMemberships?: { role: "LEADER" | "MEMBER"; team: { id: string; name: string } }[];
};

export type ApiAdminUserMembership = {
    role: "LEADER" | "DEPUTY_LEADER" | "MEMBER";
    joinedAt: string;
    project: { id: string; name: string; description: string | null };
    /** 없으면 직접 프로젝트 멤버로 간주 */
    participationSource?: "member" | "team_public";
};

export type ApiAdminUserTeamMembership = {
    role: "LEADER" | "MEMBER";
    joinedAt: string;
    team: { id: string; name: string; shortDescription: string | null };
};

export type ApiAdminUserDetail = Omit<ApiAdminUserRow, "memberships" | "teamMemberships"> & {
    memberships: ApiAdminUserMembership[];
    teamMemberships: ApiAdminUserTeamMembership[];
};
