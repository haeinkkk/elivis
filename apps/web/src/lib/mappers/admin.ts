/** GET/PATCH /api/admin/users… 응답 `data` */

export type ApiAdminUserRow = {
    id: string;
    email: string;
    name: string | null;
    systemRole: "SUPER_ADMIN" | "USER";
    createdAt: string;
    /** 목록 표시용 — 서버에서만 채워 hydration과 맞춤 */
    createdAtLabel?: string;
    _count: { memberships: number };
    memberships?: { project: { name: string } }[];
};

export type ApiAdminUserMembership = {
    role: "LEADER" | "DEPUTY_LEADER" | "MEMBER";
    joinedAt: string;
    project: { id: string; name: string; description: string | null };
};

export type ApiAdminUserDetail = Omit<ApiAdminUserRow, "memberships"> & {
    memberships: ApiAdminUserMembership[];
};
