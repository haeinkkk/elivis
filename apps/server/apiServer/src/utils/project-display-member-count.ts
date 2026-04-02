import type { PrismaClient } from "@repo/database";

/** 목록·팀 상세 등에서 `ProjectMember` + 연결 팀 팀원(userId 중복 제거) 합산 */
export type ProjectRowForMemberDisplay = {
    teamId: string | null;
    projectTeams: { team: { id: string } }[];
    members: { userId: string }[];
    _count: { tasks: number };
};

export async function withProjectDisplayMemberCounts<T extends ProjectRowForMemberDisplay>(
    prisma: PrismaClient,
    rows: T[],
): Promise<Array<Omit<T, "members" | "teamId"> & { _count: { members: number; tasks: number } }>> {
    const allTeamIds = new Set<string>();
    for (const r of rows) {
        if (r.teamId) allTeamIds.add(r.teamId);
        for (const pt of r.projectTeams) {
            allTeamIds.add(pt.team.id);
        }
    }

    const teamMemberRows =
        allTeamIds.size === 0
            ? []
            : await prisma.teamMember.findMany({
                  where: { teamId: { in: [...allTeamIds] } },
                  select: { userId: true, teamId: true },
              });

    return rows.map((r) => {
        const userIds = new Set(r.members.map((m) => m.userId));
        const linkedTeamIds = new Set<string>();
        if (r.teamId) linkedTeamIds.add(r.teamId);
        for (const pt of r.projectTeams) {
            linkedTeamIds.add(pt.team.id);
        }
        for (const tm of teamMemberRows) {
            if (linkedTeamIds.has(tm.teamId)) {
                userIds.add(tm.userId);
            }
        }
        const { members: _m, teamId: _tid, ...rest } = r;
        return {
            ...rest,
            _count: {
                members: userIds.size,
                tasks: r._count.tasks,
            },
        };
    });
}
