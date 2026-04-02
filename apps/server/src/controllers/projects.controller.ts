import { isSuperAdmin, Prisma } from "@repo/database";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { t } from "@repo/i18n";

import { MSG } from "../utils/messages";
import { withProjectDisplayMemberCounts } from "../utils/project-display-member-count";
import { ok } from "../utils/response";

export interface GetProjectsQuery {
    /** 쉼표 구분 또는 `teamIds` 반복. 연결된 팀이 하나라도 일치하면 포함 */
    teamIds?: string | string[];
    q?: string;
    take?: string;
    skip?: string;
}

function parseTeamIdsQuery(raw: string | string[] | undefined): string[] | undefined {
    if (raw == null) return undefined;
    const parts = Array.isArray(raw) ? raw : [raw];
    const ids = parts.flatMap((p) =>
        p
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
    );
    const unique = [...new Set(ids)];
    return unique.length > 0 ? unique : undefined;
}

export function createProjectsController(app: FastifyInstance) {
    async function getProjects(
        request: FastifyRequest<{ Querystring: GetProjectsQuery }>,
        reply: FastifyReply,
    ) {
        const lang = request.lang;

        const admin = await isSuperAdmin(request.userId);
        const teamIds = parseTeamIdsQuery(request.query.teamIds);
        const q = request.query.q?.trim() || undefined;

        const takeRaw = Number(request.query.take ?? 50);
        const skipRaw = Number(request.query.skip ?? 0);
        const take = Number.isFinite(takeRaw) ? Math.min(200, Math.max(1, takeRaw)) : 50;
        const skip = Number.isFinite(skipRaw) ? Math.max(0, skipRaw) : 0;

        const andParts: Prisma.ProjectWhereInput[] = [];

        if (teamIds?.length) {
            andParts.push({
                OR: [
                    { teamId: { in: teamIds } },
                    { projectTeams: { some: { teamId: { in: teamIds } } } },
                ],
            });
        }

        if (q) {
            andParts.push({
                OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { description: { contains: q, mode: "insensitive" } },
                ],
            });
        }

        if (!admin) {
            andParts.push({
                OR: [
                    // 직접 ProjectMember로 등록된 경우 (개인 프로젝트 포함, 초대된 경우)
                    { members: { some: { userId: request.userId } } },
                    // 공개 팀 프로젝트이고 현재 해당 팀의 팀원인 경우
                    {
                        AND: [
                            { isPublic: true },
                            {
                                OR: [
                                    { team: { members: { some: { userId: request.userId } } } },
                                    { projectTeams: { some: { team: { members: { some: { userId: request.userId } } } } } },
                                ],
                            },
                        ],
                    },
                ],
            });
        }

        const where: Prisma.ProjectWhereInput = andParts.length === 0 ? {} : { AND: andParts };

        const rows = await app.prisma.project.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take,
            skip,
            select: {
                id: true,
                name: true,
                description: true,
                teamId: true,
                team: {
                    select: {
                        id: true,
                        name: true,
                        members: { where: { userId: request.userId }, select: { userId: true } },
                    },
                },
                projectTeams: {
                    select: {
                        team: {
                            select: {
                                id: true,
                                name: true,
                                members: { where: { userId: request.userId }, select: { userId: true } },
                            },
                        },
                    },
                },
                isPublic: true,
                createdAt: true,
                members: { select: { userId: true } },
                _count: { select: { tasks: true } },
            },
        });

        // 현재 사용자가 ProjectMember로 직접 등록된 프로젝트 ID 집합
        const viewerMemberIds = new Set(
            rows.filter((r) => r.members.some((m) => m.userId === request.userId)).map((r) => r.id),
        );

        // 현재 사용자가 연결된 팀의 팀원인 프로젝트 ID 집합
        const viewerTeamMemberIds = new Set(
            rows
                .filter(
                    (r) =>
                        (r.team?.members?.length ?? 0) > 0 ||
                        r.projectTeams.some((pt) => (pt.team?.members?.length ?? 0) > 0),
                )
                .map((r) => r.id),
        );

        const baseItems = await withProjectDisplayMemberCounts(app.prisma, rows);
        const items = baseItems.map((item) => ({
            ...item,
            viewerIsMember: viewerMemberIds.has(item.id),
            viewerIsTeamMember: viewerTeamMemberIds.has(item.id),
        }));

        return reply.send(ok({ items, take, skip }, t(lang, MSG.PROJECT_FETCHED)));
    }

    return { getProjects };
}
