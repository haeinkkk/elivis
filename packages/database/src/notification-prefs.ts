import type { PrismaClient } from "@prisma/client";

/**
 * 프로젝트 관련 알림을 해당 채널(인앱·실시간 / 이메일)로 보낼지 여부.
 * - ProjectMember 의 해당 채널 플래그가 false 면 차단
 * - 프로젝트에 연결된 팀 중 사용자 소속 팀이 있으면, 그중 최소 하나는 해당 채널이 켜져 있어야 함
 */
async function shouldDeliverProjectNotificationForChannel(
    prisma: PrismaClient,
    userId: string,
    projectId: string,
    channel: "push" | "email",
): Promise<boolean> {
    const pm = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId, projectId } },
        select: { notifyPushEnabled: true, notifyEmailEnabled: true },
    });
    if (pm) {
        const ok = channel === "push" ? pm.notifyPushEnabled : pm.notifyEmailEnabled;
        if (!ok) return false;
    }

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
            teamId: true,
            projectTeams: { select: { teamId: true } },
        },
    });
    if (!project) return false;

    const linkedTeamIds = new Set<string>();
    if (project.teamId) linkedTeamIds.add(project.teamId);
    for (const pt of project.projectTeams) linkedTeamIds.add(pt.teamId);

    if (linkedTeamIds.size === 0) return true;

    const memberships = await prisma.teamMember.findMany({
        where: { userId, teamId: { in: [...linkedTeamIds] } },
        select: { notifyPushEnabled: true, notifyEmailEnabled: true },
    });
    if (memberships.length === 0) return true;

    return memberships.some((m) =>
        channel === "push" ? m.notifyPushEnabled : m.notifyEmailEnabled,
    );
}

export async function shouldDeliverProjectNotificationPush(
    prisma: PrismaClient,
    userId: string,
    projectId: string,
): Promise<boolean> {
    return shouldDeliverProjectNotificationForChannel(prisma, userId, projectId, "push");
}

export async function shouldDeliverProjectNotificationEmail(
    prisma: PrismaClient,
    userId: string,
    projectId: string,
): Promise<boolean> {
    return shouldDeliverProjectNotificationForChannel(prisma, userId, projectId, "email");
}
