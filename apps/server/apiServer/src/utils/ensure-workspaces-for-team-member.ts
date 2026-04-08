import type { Prisma } from "@prisma/client";
import { generatePublicId, generateWorkspaceId, type PrismaClient } from "@repo/database";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * 팀원으로 추가된 사용자에게, 해당 팀이 연결된 모든 프로젝트에 대해
 * 워크스페이스가 없으면 생성하고 기본 상태·우선순위를 시드한다.
 * (프로젝트 멤버 추가 시와 동일한 기본값)
 */
export async function ensureWorkspacesForNewTeamMember(
    db: Db,
    teamId: string,
    userId: string,
): Promise<void> {
    const projects = await db.project.findMany({
        where: {
            OR: [{ teamId }, { projectTeams: { some: { teamId } } }],
        },
        select: { id: true },
    });

    for (const { id: projectId } of projects) {
        const existingWs = await db.workspace.findFirst({
            where: { userId, projectId },
            select: { id: true },
        });
        if (existingWs) continue;

        const wsId = generateWorkspaceId();
        await db.workspace.create({
            data: { id: wsId, projectId, userId },
        });

        await (db as any).workspaceStatus.createMany({
            data: [
                {
                    id: generatePublicId(),
                    workspaceId: wsId,
                    name: "할 일",
                    color: "gray",
                    order: 0,
                    semantic: "WAITING",
                },
                {
                    id: generatePublicId(),
                    workspaceId: wsId,
                    name: "진행 중",
                    color: "blue",
                    order: 1,
                    semantic: "IN_PROGRESS",
                },
                {
                    id: generatePublicId(),
                    workspaceId: wsId,
                    name: "완료",
                    color: "green",
                    order: 2,
                    semantic: "DONE",
                },
            ],
            skipDuplicates: true,
        });

        await (db as any).workspacePriority.createMany({
            data: [
                {
                    id: generatePublicId(),
                    workspaceId: wsId,
                    name: "긴급",
                    color: "red",
                    order: 0,
                },
                {
                    id: generatePublicId(),
                    workspaceId: wsId,
                    name: "높음",
                    color: "orange",
                    order: 1,
                },
                {
                    id: generatePublicId(),
                    workspaceId: wsId,
                    name: "보통",
                    color: "blue",
                    order: 2,
                },
                {
                    id: generatePublicId(),
                    workspaceId: wsId,
                    name: "낮음",
                    color: "gray",
                    order: 3,
                },
            ],
            skipDuplicates: true,
        });
    }
}
