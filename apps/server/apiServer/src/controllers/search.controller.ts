import { isSuperAdmin } from "@repo/database";
import type { Prisma } from "@repo/database";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { t } from "@repo/i18n";

import { MSG } from "../utils/messages";
import { ok } from "../utils/response";

const DEFAULT_SEARCH_TAKE = 8;
const MAX_SEARCH_TAKE = 60;

function parseSearchTake(raw: string | undefined): number {
    const n = Number.parseInt(String(raw ?? ""), 10);
    if (!Number.isFinite(n)) return DEFAULT_SEARCH_TAKE;
    return Math.min(MAX_SEARCH_TAKE, Math.max(1, n));
}

export function createSearchController(app: FastifyInstance) {
    /**
     * GET /api/search/quick?q=&take=
     * 헤더 빠른 검색 · 전체 검색 페이지: 내 팀 · 접근 가능한 프로젝트 · 내 워크스페이스에서 나에게 해당하는 업무만
     */
    async function quickSearch(
        request: FastifyRequest<{ Querystring: { q?: string; take?: string } }>,
        reply: FastifyReply,
    ) {
        const lang = request.lang;
        const userId = request.userId;
        const q = request.query.q?.trim() ?? "";
        const take = parseSearchTake(request.query.take);

        if (q.length < 1) {
            return reply.send(
                ok(
                    { teams: [], projects: [], tasks: [] },
                    t(lang, MSG.SEARCH_QUICK_FETCHED),
                ),
            );
        }

        const admin = await isSuperAdmin(userId);

        const teamWhere: Prisma.TeamWhereInput = {
            members: { some: { userId } },
            OR: [
                { name: { contains: q, mode: "insensitive" } },
                { shortDescription: { contains: q, mode: "insensitive" } },
                { introMessage: { contains: q, mode: "insensitive" } },
            ],
        };

        const projectAccessOr: Prisma.ProjectWhereInput[] = [
            { members: { some: { userId } } },
            {
                AND: [
                    { isPublic: true },
                    {
                        OR: [
                            { team: { members: { some: { userId } } } },
                            {
                                projectTeams: {
                                    some: {
                                        team: { members: { some: { userId } } },
                                    },
                                },
                            },
                        ],
                    },
                ],
            },
        ];

        const projectWhere: Prisma.ProjectWhereInput = admin
            ? {
                  AND: [
                      {
                          OR: [
                              { name: { contains: q, mode: "insensitive" } },
                              { description: { contains: q, mode: "insensitive" } },
                          ],
                      },
                  ],
              }
            : {
                  AND: [
                      {
                          OR: [
                              { name: { contains: q, mode: "insensitive" } },
                              { description: { contains: q, mode: "insensitive" } },
                          ],
                      },
                      { OR: projectAccessOr },
                  ],
              };

        const taskWhere = {
            AND: [
                { workspace: { userId } },
                { OR: [{ assigneeId: userId }, { assigneeId: null }] },
                {
                    OR: [
                        { title: { contains: q, mode: "insensitive" as const } },
                        { description: { contains: q, mode: "insensitive" as const } },
                    ],
                },
            ],
        };

        const [teams, projects, taskRows] = await Promise.all([
            app.prisma.team.findMany({
                where: teamWhere,
                take,
                orderBy: { name: "asc" },
                select: { id: true, name: true },
            }),
            app.prisma.project.findMany({
                where: projectWhere,
                take,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    name: true,
                    team: { select: { name: true } },
                    projectTeams: { select: { team: { select: { name: true } } }, take: 3 },
                },
            }),
            (app.prisma as any).workspaceTask.findMany({
                where: taskWhere,
                take,
                orderBy: { updatedAt: "desc" },
                select: {
                    id: true,
                    title: true,
                    workspaceId: true,
                    workspace: {
                        select: {
                            sidebarLabel: true,
                            project: { select: { name: true } },
                        },
                    },
                },
            }),
        ]);

        const projectItems = projects.map((p) => {
            const teamName =
                p.team?.name ??
                p.projectTeams.find((pt) => pt.team?.name)?.team?.name ??
                null;
            return { id: p.id, name: p.name, teamName };
        });

        const tasks = taskRows.map(
            (row: {
                id: string;
                title: string;
                workspaceId: string;
                workspace: {
                    sidebarLabel: string | null;
                    project: { name: string };
                };
            }) => ({
                id: row.id,
                title: row.title,
                workspaceId: row.workspaceId,
                projectName: row.workspace.project.name,
                workspaceLabel: row.workspace.sidebarLabel?.trim() || null,
            }),
        );

        return reply.send(ok({ teams, projects: projectItems, tasks }, t(lang, MSG.SEARCH_QUICK_FETCHED)));
    }

    return { quickSearch };
}
