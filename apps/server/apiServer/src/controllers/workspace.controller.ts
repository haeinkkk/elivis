import { generatePublicId } from "@repo/database";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { t } from "@repo/i18n";

import { MSG } from "../utils/messages";
import { badRequest, conflict, forbidden, notFound, ok, created } from "../utils/response";
import { publishNotification } from "../utils/notify";
import { recordHistory } from "../services/history.service";

// ─────────────────────────────────────────────────────────────────────────────
// 요청 바디 / 파라미터 타입
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkspaceParams {
    workspaceId: string;
}

export interface WorkspaceTaskParams extends WorkspaceParams {
    taskId: string;
}

export interface WorkspaceStatusParams extends WorkspaceParams {
    statusId: string;
}

export interface CreateWorkspaceTaskBody {
    title: string;
    statusId?: string;
    priorityId?: string;
    assigneeId?: string;
    startDate?: string;
    dueDate?: string;
    order?: number;
    parentId?: string;
}

export interface UpdateWorkspaceTaskBody {
    title?: string;
    description?: string | null;
    statusId?: string;
    priorityId?: string | null;
    assigneeId?: string | null;
    startDate?: string | null;
    dueDate?: string | null;
    order?: number;
}

export interface WorkspaceTaskCommentParams extends WorkspaceTaskParams {
    commentId: string;
}

export interface CreateWorkspaceTaskCommentBody {
    content: string;
}

export interface WorkspaceTaskAttachmentParams extends WorkspaceTaskParams {
    attachmentId: string;
}

export interface WorkspaceTaskNoteParams extends WorkspaceTaskParams {
    noteId: string;
}

export interface CreateWorkspaceTaskNoteBody {
    content: string;
}

export interface CreateWorkspaceStatusBody {
    name: string;
    color?: string;
    order?: number;
    notifyOnChange?: boolean;
}

export interface UpdateWorkspaceStatusBody {
    name?: string;
    color?: string;
    order?: number;
    notifyOnChange?: boolean;
}

export interface WorkspacePriorityParams extends WorkspaceParams {
    priorityId: string;
}

export interface CreateWorkspacePriorityBody {
    name: string;
    color?: string;
    order?: number;
    value?: number;
}

export interface UpdateWorkspacePriorityBody {
    name?: string;
    color?: string;
    order?: number;
    value?: number;
}

export interface ReorderTasksBody {
    items: Array<{ id: string; order: number; statusId?: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

/** 워크스페이스 소유자인지 확인 후 row 반환. 없으면 null */
async function findOwnWorkspace(
    app: FastifyInstance,
    workspaceId: string,
    userId: string,
) {
    return app.prisma.workspace.findFirst({
        where: { id: workspaceId, userId },
    });
}

/**
 * 워크스페이스 소유자이거나 같은 프로젝트 멤버면 접근 허용.
 * 직접 ProjectMember 뿐만 아니라 팀을 통한 프로젝트 접근도 허용.
 * 조회(읽기) 전용 API에 사용.
 */
async function findAccessibleWorkspace(
    app: FastifyInstance,
    workspaceId: string,
    userId: string,
) {
    const ws = await app.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, userId: true, projectId: true },
    });
    if (!ws) return null;
    // 소유자면 바로 허용
    if (ws.userId === userId) return ws;
    // 직접 프로젝트 멤버 확인
    const directMember = await app.prisma.projectMember.findUnique({
        where: { userId_projectId: { userId, projectId: ws.projectId } },
        select: { role: true },
    });
    if (directMember) return ws;
    // 팀을 통한 프로젝트 접근 확인 (공개 프로젝트 + 팀 멤버)
    const teamAccess = await (app.prisma as any).project.findFirst({
        where: {
            id: ws.projectId,
            isPublic: true,
            OR: [
                { team: { members: { some: { userId } } } },
                { projectTeams: { some: { team: { members: { some: { userId } } } } } },
            ],
        },
        select: { id: true },
    });
    return teamAccess ? ws : null;
}

/** 접근 불가 시 404/403 응답 전송 */
async function rejectNoWorkspace(
    app: FastifyInstance,
    workspaceId: string,
    lang: string,
    reply: FastifyReply,
) {
    const exists = await app.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true },
    });
    return reply.code(exists ? 403 : 404).send(
        exists
            ? forbidden(t(lang, MSG.WORKSPACE_FORBIDDEN))
            : notFound(t(lang, MSG.WORKSPACE_NOT_FOUND)),
    );
}

/** 업무에 status + priority 인라인 조인 (별도 query) */
async function withStatus(
    app: FastifyInstance,
    task: { statusId: string; priorityId?: string | null; [key: string]: unknown },
) {
    const [status, priority] = await Promise.all([
        (app.prisma as any).workspaceStatus.findUnique({
            where: { id: task.statusId },
            select: { id: true, name: true, color: true, order: true },
        }),
        task.priorityId
            ? (app.prisma as any).workspacePriority.findUnique({
                where: { id: task.priorityId },
                select: { id: true, name: true, color: true, order: true, value: true },
              })
            : null,
    ]);
    return {
        ...task,
        status: status ?? { id: task.statusId, name: "—", color: "gray", order: 0 },
        priority: priority ?? null,
    };
}

async function withStatusMany(
    app: FastifyInstance,
    tasks: Array<{ statusId: string; priorityId?: string | null; [key: string]: unknown }>,
) {
    if (tasks.length === 0) return tasks;

    const statusIds = [...new Set(tasks.map((t) => t.statusId))];
    const priorityIds = [...new Set(tasks.map((t) => t.priorityId).filter(Boolean))] as string[];

    const [statuses, priorities] = await Promise.all([
        (app.prisma as any).workspaceStatus.findMany({
            where: { id: { in: statusIds } },
            select: { id: true, name: true, color: true, order: true },
        }),
        priorityIds.length > 0
            ? (app.prisma as any).workspacePriority.findMany({
                where: { id: { in: priorityIds } },
                select: { id: true, name: true, color: true, order: true, value: true },
              })
            : [],
    ]);

    const statusMap = new Map(statuses.map((s: { id: string }) => [s.id, s]));
    const priorityMap = new Map(priorities.map((p: { id: string }) => [p.id, p]));

    return tasks.map((task) => ({
        ...task,
        status: statusMap.get(task.statusId) ?? { id: task.statusId, name: "—", color: "gray", order: 0 },
        priority: task.priorityId ? (priorityMap.get(task.priorityId as string) ?? null) : null,
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 컨트롤러
// ─────────────────────────────────────────────────────────────────────────────

export function createWorkspaceController(app: FastifyInstance) {
    /** GET /api/workspaces — 내 워크스페이스 목록
     *
     * 팀에서 제외된 사용자의 워크스페이스는 데이터를 보존하되 목록에서 숨깁니다.
     * 표시 조건:
     *   1) 프로젝트에 팀 연결이 전혀 없는 경우 (개인 프로젝트)
     *   2) 프로젝트의 기본 팀(teamId)에 아직 소속된 경우
     *   3) 프로젝트의 추가 팀(projectTeams) 중 하나에 아직 소속된 경우
     */
    async function listWorkspaces(
        request: FastifyRequest,
        reply: FastifyReply,
    ) {
        const lang = request.lang;
        const userId = request.userId;

        const workspaces = await app.prisma.workspace.findMany({
            where: {
                userId,
                OR: [
                    // 어떤 팀에도 연결되지 않은 프로젝트 → 항상 표시
                    {
                        project: {
                            teamId: null,
                            projectTeams: { none: {} },
                        },
                    },
                    // 기본 팀(teamId)에 여전히 소속
                    {
                        project: {
                            team: {
                                members: { some: { userId } },
                            },
                        },
                    },
                    // 다중 팀 연결(projectTeams) 중 하나에 소속
                    {
                        project: {
                            projectTeams: {
                                some: {
                                    team: {
                                        members: { some: { userId } },
                                    },
                                },
                            },
                        },
                    },
                ],
            },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                createdAt: true,
                updatedAt: true,
                project: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        startDate: true,
                        endDate: true,
                        noEndDate: true,
                        isPublic: true,
                        team: { select: { id: true, name: true } },
                        projectTeams: {
                            select: { team: { select: { id: true, name: true } } },
                        },
                        _count: { select: { tasks: true } },
                    },
                },
                _count: { select: { tasks: true } },
            },
        });

        return reply.send(ok(workspaces, t(lang, MSG.WORKSPACE_LIST_FETCHED)));
    }

    /** GET /api/workspaces/:workspaceId — 워크스페이스 상세 (뷰 포함) */
    async function getWorkspace(
        request: FastifyRequest<{ Params: WorkspaceParams }>,
        reply: FastifyReply,
    ) {
        const { workspaceId } = request.params;
        const lang = request.lang;

        const workspace = await app.prisma.workspace.findFirst({
            where: { id: workspaceId },
            select: {
                id: true,
                userId: true,
                createdAt: true,
                updatedAt: true,
                project: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        startDate: true,
                        endDate: true,
                        noEndDate: true,
                        isPublic: true,
                        team: { select: { id: true, name: true } },
                        projectTeams: {
                            select: { team: { select: { id: true, name: true } } },
                        },
                    },
                },
                views: {
                    select: {
                        id: true,
                        type: true,
                        name: true,
                        configJson: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                    orderBy: { type: "asc" },
                },
                _count: { select: { tasks: true } },
            },
        });

        if (!workspace) {
            return reply.code(404).send(notFound(t(lang, MSG.WORKSPACE_NOT_FOUND)));
        }
        if (workspace.userId !== request.userId) {
            return reply.code(403).send(forbidden(t(lang, MSG.WORKSPACE_FORBIDDEN)));
        }

        return reply.send(ok(workspace, t(lang, MSG.WORKSPACE_FETCHED)));
    }

    // ─── 상태 (WorkspaceStatus) CRUD ─────────────────────────────────────────

    /** GET /api/workspaces/:workspaceId/statuses */
    async function listWorkspaceStatuses(
        request: FastifyRequest<{ Params: WorkspaceParams }>,
        reply: FastifyReply,
    ) {
        const { workspaceId } = request.params;
        const lang = request.lang;

        const ws = await findOwnWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);

        const statuses = await (app.prisma as any).workspaceStatus.findMany({
            where: { workspaceId },
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        });

        return reply.send(ok(statuses, t(lang, MSG.WORKSPACE_STATUS_LIST_FETCHED)));
    }

    /** POST /api/workspaces/:workspaceId/statuses */
    async function createWorkspaceStatus(
        request: FastifyRequest<{ Params: WorkspaceParams; Body: CreateWorkspaceStatusBody }>,
        reply: FastifyReply,
    ) {
        const { workspaceId } = request.params;
        const lang = request.lang;
        const { name, color = "gray", order, notifyOnChange = false } = request.body ?? {};

        const trimmedName = name?.trim();
        if (!trimmedName) {
            return reply.code(400).send(badRequest(t(lang, MSG.WORKSPACE_STATUS_NAME_REQUIRED)));
        }

        const ws = await findOwnWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);

        const existing = await (app.prisma as any).workspaceStatus.findFirst({
            where: { workspaceId, name: trimmedName },
        });
        if (existing) {
            return reply.code(409).send(conflict(t(lang, MSG.WORKSPACE_STATUS_ALREADY_EXISTS)));
        }

        let resolvedOrder = order;
        if (resolvedOrder === undefined) {
            const last = await (app.prisma as any).workspaceStatus.findFirst({
                where: { workspaceId },
                orderBy: { order: "desc" },
                select: { order: true },
            });
            resolvedOrder = (last?.order ?? -1) + 1;
        }

        const status = await (app.prisma as any).workspaceStatus.create({
            data: {
                id: generatePublicId(),
                workspaceId,
                name: trimmedName,
                color,
                order: resolvedOrder,
                notifyOnChange,
            },
        });

        recordHistory(app, {
            projectId: ws.projectId,
            userId: request.userId,
            action: "CREATED",
            resourceType: "WORKSPACE_STATUS",
            resourceId: status.id,
            resourceName: trimmedName,
            after: { name: trimmedName, color, notifyOnChange },
        });

        return reply.code(201).send(created(status, t(lang, MSG.WORKSPACE_STATUS_CREATED)));
    }

    /** PATCH /api/workspaces/:workspaceId/statuses/:statusId */
    async function updateWorkspaceStatus(
        request: FastifyRequest<{
            Params: WorkspaceStatusParams;
            Body: UpdateWorkspaceStatusBody;
        }>,
        reply: FastifyReply,
    ) {
        const { workspaceId, statusId } = request.params;
        const lang = request.lang;
        const body = request.body ?? {};

        const ws = await findOwnWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);

        const existing = await (app.prisma as any).workspaceStatus.findFirst({
            where: { id: statusId, workspaceId },
        });
        if (!existing) {
            return reply.code(404).send(notFound(t(lang, MSG.WORKSPACE_STATUS_NOT_FOUND)));
        }

        const data: Record<string, unknown> = {};
        if (body.name !== undefined) {
            const trimmed = String(body.name).trim();
            if (!trimmed) {
                return reply.code(400).send(badRequest(t(lang, MSG.WORKSPACE_STATUS_NAME_REQUIRED)));
            }
            // 중복 이름 체크 (자기 자신 제외)
            const dup = await (app.prisma as any).workspaceStatus.findFirst({
                where: { workspaceId, name: trimmed, id: { not: statusId } },
            });
            if (dup) {
                return reply.code(409).send(conflict(t(lang, MSG.WORKSPACE_STATUS_ALREADY_EXISTS)));
            }
            data.name = trimmed;
        }
        if (body.color !== undefined) data.color = body.color;
        if (body.order !== undefined) data.order = body.order;
        if (body.notifyOnChange !== undefined) data.notifyOnChange = body.notifyOnChange;

        const updated = await (app.prisma as any).workspaceStatus.update({
            where: { id: statusId },
            data,
        });

        recordHistory(app, {
            projectId: ws.projectId,
            userId: request.userId,
            action: "UPDATED",
            resourceType: "WORKSPACE_STATUS",
            resourceId: statusId,
            resourceName: updated.name,
            before: {
                name: existing.name,
                color: existing.color,
                notifyOnChange: existing.notifyOnChange,
            },
            after: {
                name: updated.name,
                color: updated.color,
                notifyOnChange: updated.notifyOnChange,
            },
        });

        return reply.send(ok(updated, t(lang, MSG.WORKSPACE_STATUS_UPDATED)));
    }

    /** DELETE /api/workspaces/:workspaceId/statuses/:statusId */
    async function deleteWorkspaceStatus(
        request: FastifyRequest<{ Params: WorkspaceStatusParams }>,
        reply: FastifyReply,
    ) {
        const { workspaceId, statusId } = request.params;
        const lang = request.lang;

        const ws = await findOwnWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);

        const existing = await (app.prisma as any).workspaceStatus.findFirst({
            where: { id: statusId, workspaceId },
        });
        if (!existing) {
            return reply.code(404).send(notFound(t(lang, MSG.WORKSPACE_STATUS_NOT_FOUND)));
        }

        // 다른 상태가 있어야 삭제 가능
        const others = await (app.prisma as any).workspaceStatus.findMany({
            where: { workspaceId, id: { not: statusId } },
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            select: { id: true },
        });
        if (others.length === 0) {
            return reply.code(400).send(badRequest(t(lang, MSG.WORKSPACE_STATUS_MIN_REQUIRED)));
        }

        // 이 상태의 업무들을 첫 번째 다른 상태로 재배정
        await app.prisma.$transaction([
            (app.prisma as any).workspaceTask.updateMany({
                where: { workspaceId, statusId },
                data: { statusId: others[0].id },
            }),
            (app.prisma as any).workspaceStatus.delete({
                where: { id: statusId },
            }),
        ]);

        recordHistory(app, {
            projectId: ws.projectId,
            userId: request.userId,
            action: "DELETED",
            resourceType: "WORKSPACE_STATUS",
            resourceId: statusId,
            resourceName: existing.name,
            before: { name: existing.name, color: existing.color },
        });

        return reply.send(ok({ id: statusId }, t(lang, MSG.WORKSPACE_STATUS_DELETED)));
    }

    // ─── 우선순위 (WorkspacePriority) CRUD ──────────────────────────────────────

    /** GET /api/workspaces/:workspaceId/priorities */
    async function listWorkspacePriorities(
        request: FastifyRequest<{ Params: WorkspaceParams }>,
        reply: FastifyReply,
    ) {
        const { workspaceId } = request.params;
        const lang = request.lang;
        const ws = await findOwnWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);
        const priorities = await (app.prisma as any).workspacePriority.findMany({
            where: { workspaceId },
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        });
        return reply.send(ok(priorities, t(lang, MSG.WORKSPACE_PRIORITY_LIST_FETCHED)));
    }

    /** POST /api/workspaces/:workspaceId/priorities */
    async function createWorkspacePriority(
        request: FastifyRequest<{ Params: WorkspaceParams; Body: CreateWorkspacePriorityBody }>,
        reply: FastifyReply,
    ) {
        const { workspaceId } = request.params;
        const lang = request.lang;
        const { name, color = "gray", order, value = 0 } = request.body ?? {};
        const trimmedName = name?.trim();
        if (!trimmedName) {
            return reply.code(400).send(badRequest(t(lang, MSG.WORKSPACE_PRIORITY_NAME_REQUIRED)));
        }
        const ws = await findOwnWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);
        const existing = await (app.prisma as any).workspacePriority.findFirst({
            where: { workspaceId, name: trimmedName },
        });
        if (existing) {
            return reply.code(409).send(conflict(t(lang, MSG.WORKSPACE_PRIORITY_ALREADY_EXISTS)));
        }
        let resolvedOrder = order;
        if (resolvedOrder === undefined) {
            const last = await (app.prisma as any).workspacePriority.findFirst({
                where: { workspaceId },
                orderBy: { order: "desc" },
                select: { order: true },
            });
            resolvedOrder = (last?.order ?? -1) + 1;
        }
        const priority = await (app.prisma as any).workspacePriority.create({
            data: { id: generatePublicId(), workspaceId, name: trimmedName, color, order: resolvedOrder, value },
        });
        return reply.code(201).send(created(priority, t(lang, MSG.WORKSPACE_PRIORITY_CREATED)));
    }

    /** PATCH /api/workspaces/:workspaceId/priorities/:priorityId */
    async function updateWorkspacePriority(
        request: FastifyRequest<{ Params: WorkspacePriorityParams; Body: UpdateWorkspacePriorityBody }>,
        reply: FastifyReply,
    ) {
        const { workspaceId, priorityId } = request.params;
        const lang = request.lang;
        const body = request.body ?? {};
        const ws = await findOwnWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);
        const existing = await (app.prisma as any).workspacePriority.findFirst({
            where: { id: priorityId, workspaceId },
        });
        if (!existing) {
            return reply.code(404).send(notFound(t(lang, MSG.WORKSPACE_PRIORITY_NOT_FOUND)));
        }
        const data: Record<string, unknown> = {};
        if (body.name !== undefined) {
            const trimmed = String(body.name).trim();
            if (!trimmed) return reply.code(400).send(badRequest(t(lang, MSG.WORKSPACE_PRIORITY_NAME_REQUIRED)));
            const dup = await (app.prisma as any).workspacePriority.findFirst({
                where: { workspaceId, name: trimmed, id: { not: priorityId } },
            });
            if (dup) return reply.code(409).send(conflict(t(lang, MSG.WORKSPACE_PRIORITY_ALREADY_EXISTS)));
            data.name = trimmed;
        }
        if (body.color !== undefined) data.color = body.color;
        if (body.order !== undefined) data.order = body.order;
        if (body.value !== undefined) data.value = body.value;
        const updated = await (app.prisma as any).workspacePriority.update({ where: { id: priorityId }, data });
        return reply.send(ok(updated, t(lang, MSG.WORKSPACE_PRIORITY_UPDATED)));
    }

    /** DELETE /api/workspaces/:workspaceId/priorities/:priorityId */
    async function deleteWorkspacePriority(
        request: FastifyRequest<{ Params: WorkspacePriorityParams }>,
        reply: FastifyReply,
    ) {
        const { workspaceId, priorityId } = request.params;
        const lang = request.lang;
        const ws = await findOwnWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);
        const existing = await (app.prisma as any).workspacePriority.findFirst({
            where: { id: priorityId, workspaceId },
        });
        if (!existing) {
            return reply.code(404).send(notFound(t(lang, MSG.WORKSPACE_PRIORITY_NOT_FOUND)));
        }
        // 이 우선순위의 업무들은 priorityId = null 으로
        await app.prisma.$transaction([
            (app.prisma as any).workspaceTask.updateMany({
                where: { workspaceId, priorityId },
                data: { priorityId: null },
            }),
            (app.prisma as any).workspacePriority.delete({ where: { id: priorityId } }),
        ]);
        return reply.send(ok({ id: priorityId }, t(lang, MSG.WORKSPACE_PRIORITY_DELETED)));
    }

    // ─── 업무 순서 일괄 변경 ─────────────────────────────────────────────────────

    /** POST /api/workspaces/:workspaceId/tasks/reorder */
    async function reorderWorkspaceTasks(
        request: FastifyRequest<{ Params: WorkspaceParams; Body: ReorderTasksBody }>,
        reply: FastifyReply,
    ) {
        const { workspaceId } = request.params;
        const lang = request.lang;
        const { items } = request.body ?? {};
        if (!Array.isArray(items) || items.length === 0) {
            return reply.code(400).send(badRequest("items 배열이 필요합니다."));
        }
        const ws = await findOwnWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);

        await app.prisma.$transaction(
            items.map((item) => {
                const data: Record<string, unknown> = { order: item.order };
                if (item.statusId !== undefined) data.statusId = item.statusId;
                return (app.prisma as any).workspaceTask.update({
                    where: { id: item.id },
                    data,
                });
            }),
        );
        return reply.send(ok({ updated: items.length }, t(lang, MSG.WORKSPACE_TASK_REORDERED)));
    }

    // ─── 업무 (WorkspaceTask) CRUD ────────────────────────────────────────────

    /** GET /api/workspaces/:workspaceId/tasks — 업무 목록 */
    async function listWorkspaceTasks(
        request: FastifyRequest<{ Params: WorkspaceParams }>,
        reply: FastifyReply,
    ) {
        const { workspaceId } = request.params;
        const lang = request.lang;

        const ws = await findOwnWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);

        const tasks = await (app.prisma as any).workspaceTask.findMany({
            where: { workspaceId },
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            select: {
                id: true,
                title: true,
                description: true,
                statusId: true,
                priorityId: true,
                order: true,
                startDate: true,
                dueDate: true,
                parentId: true,
                createdAt: true,
                updatedAt: true,
                assignee: {
                    select: { id: true, name: true, email: true, avatarUrl: true },
                },
            },
        });

        const tasksWithStatus = await withStatusMany(app, tasks);
        return reply.send(ok(tasksWithStatus, t(lang, MSG.WORKSPACE_TASKS_FETCHED)));
    }

    /** POST /api/workspaces/:workspaceId/tasks — 업무 생성 */
    async function createWorkspaceTask(
        request: FastifyRequest<{ Params: WorkspaceParams; Body: CreateWorkspaceTaskBody }>,
        reply: FastifyReply,
    ) {
        const { workspaceId } = request.params;
        const lang = request.lang;
        const { title, statusId, priorityId, assigneeId, startDate, dueDate, order, parentId } = request.body ?? {};

        const trimmedTitle = title?.trim();
        if (!trimmedTitle) {
            return reply.code(400).send(badRequest(t(lang, MSG.WORKSPACE_TASK_TITLE_REQUIRED)));
        }

        const ws = await findOwnWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);

        // statusId 미지정 시 첫 번째 상태 사용
        let resolvedStatusId = statusId;
        if (!resolvedStatusId) {
            const firstStatus = await (app.prisma as any).workspaceStatus.findFirst({
                where: { workspaceId },
                orderBy: [{ order: "asc" }, { createdAt: "asc" }],
                select: { id: true },
            });
            resolvedStatusId = firstStatus?.id;
        }
        if (!resolvedStatusId) {
            return reply.code(400).send(badRequest("워크스페이스에 상태가 없습니다."));
        }

        let startDateParsed: Date | undefined;
        if (startDate) {
            const d = new Date(startDate);
            if (!Number.isNaN(d.getTime())) startDateParsed = d;
        }
        let dueDateParsed: Date | undefined;
        if (dueDate) {
            const d = new Date(dueDate);
            if (!Number.isNaN(d.getTime())) dueDateParsed = d;
        }

        let resolvedOrder = order;
        if (resolvedOrder === undefined) {
            const last = await (app.prisma as any).workspaceTask.findFirst({
                where: { workspaceId, statusId: resolvedStatusId },
                orderBy: { order: "desc" },
                select: { order: true },
            });
            resolvedOrder = (last?.order ?? -1) + 1;
        }

        const task = await (app.prisma as any).workspaceTask.create({
            data: {
                id: generatePublicId(),
                workspaceId,
                title: trimmedTitle,
                statusId: resolvedStatusId,
                priorityId: priorityId ?? null,
                order: resolvedOrder,
                assigneeId: assigneeId ?? request.userId,
                startDate: startDateParsed,
                dueDate: dueDateParsed,
                parentId: parentId ?? null,
            },
            select: {
                id: true,
                title: true,
                statusId: true,
                priorityId: true,
                order: true,
                startDate: true,
                dueDate: true,
                parentId: true,
                createdAt: true,
                updatedAt: true,
                assignee: {
                    select: { id: true, name: true, email: true, avatarUrl: true },
                },
            },
        });

        recordHistory(app, {
            projectId: ws.projectId,
            userId: request.userId,
            action: "CREATED",
            resourceType: "TASK",
            resourceId: task.id,
            resourceName: task.title,
            after: { title: task.title, statusId: task.statusId },
        });

        const taskWithStatus = await withStatus(app, task);
        return reply.code(201).send(created(taskWithStatus, t(lang, MSG.WORKSPACE_TASK_CREATED)));
    }

    /** PATCH /api/workspaces/:workspaceId/tasks/:taskId — 업무 수정 */
    async function updateWorkspaceTask(
        request: FastifyRequest<{
            Params: WorkspaceTaskParams;
            Body: UpdateWorkspaceTaskBody;
        }>,
        reply: FastifyReply,
    ) {
        const { workspaceId, taskId } = request.params;
        const lang = request.lang;
        const body = request.body ?? {};

        const ws = await findOwnWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);

        const existing = await (app.prisma as any).workspaceTask.findFirst({
            where: { id: taskId, workspaceId },
        });
        if (!existing) {
            return reply.code(404).send(notFound(t(lang, MSG.WORKSPACE_TASK_NOT_FOUND)));
        }

        const data: Record<string, unknown> = {};
        if (body.title !== undefined) {
            const t2 = String(body.title).trim();
            if (!t2) {
                return reply.code(400).send(badRequest(t(lang, MSG.WORKSPACE_TASK_TITLE_REQUIRED)));
            }
            data.title = t2;
        }
        if (Object.prototype.hasOwnProperty.call(body, "description")) {
            data.description = body.description ?? null;
        }
        if (body.statusId !== undefined) data.statusId = body.statusId;
        if (Object.prototype.hasOwnProperty.call(body, "priorityId")) {
            data.priorityId = body.priorityId ?? null;
        }
        if (body.order !== undefined) data.order = body.order;
        if (Object.prototype.hasOwnProperty.call(body, "assigneeId")) {
            data.assigneeId = body.assigneeId ?? null;
        }
        if (Object.prototype.hasOwnProperty.call(body, "startDate")) {
            if (body.startDate == null) {
                data.startDate = null;
            } else {
                const d = new Date(body.startDate);
                if (!Number.isNaN(d.getTime())) data.startDate = d;
            }
        }
        if (Object.prototype.hasOwnProperty.call(body, "dueDate")) {
            if (body.dueDate == null) {
                data.dueDate = null;
            } else {
                const d = new Date(body.dueDate);
                if (!Number.isNaN(d.getTime())) data.dueDate = d;
            }
        }

        const updated = await (app.prisma as any).workspaceTask.update({
            where: { id: taskId },
            data,
            select: {
                id: true,
                title: true,
                description: true,
                statusId: true,
                priorityId: true,
                order: true,
                startDate: true,
                dueDate: true,
                parentId: true,
                createdAt: true,
                updatedAt: true,
                assignee: {
                    select: { id: true, name: true, email: true, avatarUrl: true },
                },
            },
        });

        // ── 히스토리 기록 ────────────────────────────────────────────────────
        if (body.title !== undefined && body.title !== existing.title) {
            recordHistory(app, {
                projectId: ws.projectId, userId: request.userId,
                action: "UPDATED", resourceType: "TASK",
                resourceId: taskId, resourceName: updated.title,
                before: { title: existing.title }, after: { title: updated.title },
            });
        }
        if (body.statusId !== undefined && body.statusId !== existing.statusId) {
            recordHistory(app, {
                projectId: ws.projectId, userId: request.userId,
                action: "UPDATED", resourceType: "TASK_STATUS",
                resourceId: taskId, resourceName: updated.title,
                before: { statusId: existing.statusId }, after: { statusId: updated.statusId },
            });
        }
        if (body.priorityId !== undefined && body.priorityId !== existing.priorityId) {
            recordHistory(app, {
                projectId: ws.projectId, userId: request.userId,
                action: "UPDATED", resourceType: "TASK_PRIORITY",
                resourceId: taskId, resourceName: updated.title,
                before: { priorityId: existing.priorityId ?? null },
                after: { priorityId: updated.priorityId ?? null },
            });
        }
        if (Object.prototype.hasOwnProperty.call(body, "assigneeId") && body.assigneeId !== existing.assigneeId) {
            recordHistory(app, {
                projectId: ws.projectId, userId: request.userId,
                action: "UPDATED", resourceType: "TASK_ASSIGNEE",
                resourceId: taskId, resourceName: updated.title,
                before: { assigneeId: existing.assigneeId ?? null },
                after: { assigneeId: updated.assigneeId ?? null },
            });
        }
        if (
            (Object.prototype.hasOwnProperty.call(body, "startDate") || Object.prototype.hasOwnProperty.call(body, "dueDate")) &&
            (body.startDate !== existing.startDate?.toISOString() || body.dueDate !== existing.dueDate?.toISOString())
        ) {
            recordHistory(app, {
                projectId: ws.projectId, userId: request.userId,
                action: "UPDATED", resourceType: "TASK_DATE",
                resourceId: taskId, resourceName: updated.title,
                before: { startDate: existing.startDate ?? null, dueDate: existing.dueDate ?? null },
                after: { startDate: updated.startDate ?? null, dueDate: updated.dueDate ?? null },
            });
        }
        if (Object.prototype.hasOwnProperty.call(body, "description") && body.description !== existing.description) {
            recordHistory(app, {
                projectId: ws.projectId, userId: request.userId,
                action: "UPDATED", resourceType: "TASK_DESCRIPTION",
                resourceId: taskId, resourceName: updated.title,
                before: { description: existing.description ?? null },
                after: { description: updated.description ?? null },
            });
        }

        // ── 담당자 변경 알림 ─────────────────────────────────────────────────
        if (body.assigneeId && body.assigneeId !== request.userId) {
            const assigner = await app.prisma.user.findUnique({
                where: { id: request.userId },
                select: { name: true, email: true },
            });
            const assignerName = assigner?.name ?? assigner?.email ?? "누군가";

            void publishNotification(app.redis, {
                userId: body.assigneeId,
                type: "TASK_ASSIGNED",
                title: "새 업무가 할당되었습니다",
                message: `${assignerName}님이 '${updated.title}' 업무를 할당했습니다.`,
                data: { taskId: updated.id, workspaceId },
            }).catch((err) =>
                app.log.error({ err }, "Failed to publish task assignment notification"),
            );
        }

        // ── 상태 변경 시 notifyOnChange 팀원 알림 ───────────────────────────
        if (body.statusId && body.statusId !== existing.statusId) {
            const newStatus = await (app.prisma as any).workspaceStatus.findUnique({
                where: { id: body.statusId },
                select: { id: true, name: true, notifyOnChange: true },
            });

            if (newStatus?.notifyOnChange) {
                // 같은 프로젝트의 모든 워크스페이스 멤버 조회
                const projectMembers = await app.prisma.workspace.findMany({
                    where: { projectId: ws.projectId, userId: { not: request.userId } },
                    select: { userId: true },
                });

                const changer = await app.prisma.user.findUnique({
                    where: { id: request.userId },
                    select: { name: true, email: true },
                });
                const changerName = changer?.name ?? changer?.email ?? "누군가";

                for (const member of projectMembers) {
                    void publishNotification(app.redis, {
                        userId: member.userId,
                        type: "TASK_STATUS_CHANGED",
                        title: `업무 상태가 '${newStatus.name}'(으)로 변경되었습니다`,
                        message: `${changerName}님이 '${updated.title}' 상태를 '${newStatus.name}'(으)로 변경했습니다.`,
                        data: { taskId: updated.id, workspaceId, statusId: newStatus.id },
                    }).catch((err) =>
                        app.log.error({ err }, "Failed to publish status change notification"),
                    );
                }
            }
        }

        const taskWithStatus = await withStatus(app, updated);
        return reply.send(ok(taskWithStatus, t(lang, MSG.WORKSPACE_TASK_UPDATED)));
    }

    /** DELETE /api/workspaces/:workspaceId/tasks/:taskId — 업무 삭제 */
    async function deleteWorkspaceTask(
        request: FastifyRequest<{ Params: WorkspaceTaskParams }>,
        reply: FastifyReply,
    ) {
        const { workspaceId, taskId } = request.params;
        const lang = request.lang;

        const ws = await findOwnWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);

        const existing = await (app.prisma as any).workspaceTask.findFirst({
            where: { id: taskId, workspaceId },
        });
        if (!existing) {
            return reply.code(404).send(notFound(t(lang, MSG.WORKSPACE_TASK_NOT_FOUND)));
        }

        await (app.prisma as any).workspaceTask.delete({ where: { id: taskId } });

        recordHistory(app, {
            projectId: ws.projectId,
            userId: request.userId,
            action: "DELETED",
            resourceType: "TASK",
            resourceId: taskId,
            resourceName: existing.title,
            before: { title: existing.title, statusId: existing.statusId },
        });

        return reply.send(ok({ id: taskId }, t(lang, MSG.WORKSPACE_TASK_DELETED)));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 댓글 API
    // ─────────────────────────────────────────────────────────────────────────

    /** GET /api/workspaces/:workspaceId/tasks/:taskId/comments */
    async function listTaskComments(
        request: FastifyRequest<{ Params: WorkspaceTaskParams }>,
        reply: FastifyReply,
    ) {
        const { workspaceId, taskId } = request.params;
        const lang = request.lang;

        const ws = await findAccessibleWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);

        const comments = await (app.prisma as any).workspaceTaskComment.findMany({
            where: { taskId },
            orderBy: { createdAt: "asc" },
            select: {
                id: true, content: true, createdAt: true, updatedAt: true,
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
        });
        return reply.send(ok(comments, "댓글 목록입니다."));
    }

    /** POST /api/workspaces/:workspaceId/tasks/:taskId/comments */
    async function createTaskComment(
        request: FastifyRequest<{ Params: WorkspaceTaskParams; Body: CreateWorkspaceTaskCommentBody }>,
        reply: FastifyReply,
    ) {
        const { workspaceId, taskId } = request.params;
        const lang = request.lang;
        const content = String(request.body?.content ?? "").trim();

        if (!content) {
            return reply.code(400).send(badRequest("댓글 내용을 입력해 주세요."));
        }

        const ws = await findAccessibleWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);

        const comment = await (app.prisma as any).workspaceTaskComment.create({
            data: { id: generatePublicId(), taskId, userId: request.userId, content },
            select: {
                id: true, content: true, createdAt: true, updatedAt: true,
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                task: { select: { title: true } },
            },
        });

        recordHistory(app, {
            projectId: ws.projectId,
            userId: request.userId,
            action: "CREATED",
            resourceType: "TASK_COMMENT",
            resourceId: comment.id,
            resourceName: comment.task?.title ?? taskId,
            after: { content },
        });

        const { task: _t, ...commentWithoutTask } = comment;
        return reply.code(201).send(created(commentWithoutTask, "댓글이 등록되었습니다."));
    }

    /** DELETE /api/workspaces/:workspaceId/tasks/:taskId/comments/:commentId */
    async function deleteTaskComment(
        request: FastifyRequest<{ Params: WorkspaceTaskCommentParams }>,
        reply: FastifyReply,
    ) {
        const { workspaceId, taskId, commentId } = request.params;
        const lang = request.lang;

        const ws = await findAccessibleWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);

        const comment = await (app.prisma as any).workspaceTaskComment.findFirst({
            where: { id: commentId, taskId },
        });
        if (!comment) {
            return reply.code(404).send(notFound("댓글을 찾을 수 없습니다."));
        }
        if (comment.userId !== request.userId) {
            return reply.code(403).send(forbidden("본인 댓글만 삭제할 수 있습니다."));
        }

        await (app.prisma as any).workspaceTaskComment.delete({ where: { id: commentId } });

        recordHistory(app, {
            projectId: ws.projectId,
            userId: request.userId,
            action: "DELETED",
            resourceType: "TASK_COMMENT",
            resourceId: commentId,
            resourceName: taskId,
            before: { content: comment.content },
        });

        return reply.send(ok({ id: commentId }, "댓글이 삭제되었습니다."));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 첨부파일 API
    // ─────────────────────────────────────────────────────────────────────────

    /** GET /api/workspaces/:workspaceId/tasks/:taskId/attachments */
    async function listTaskAttachments(
        request: FastifyRequest<{ Params: WorkspaceTaskParams }>,
        reply: FastifyReply,
    ) {
        const { workspaceId, taskId } = request.params;
        const lang = request.lang;

        const ws = await findAccessibleWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);

        const attachments = await (app.prisma as any).workspaceTaskAttachment.findMany({
            where: { taskId },
            orderBy: { createdAt: "asc" },
            select: {
                id: true, fileName: true, fileSize: true, mimeType: true, fileUrl: true, createdAt: true,
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
        });
        return reply.send(ok(attachments, "첨부파일 목록입니다."));
    }

    /** POST /api/workspaces/:workspaceId/tasks/:taskId/attachments (multipart) */
    async function uploadTaskAttachment(
        request: FastifyRequest<{ Params: WorkspaceTaskParams }>,
        reply: FastifyReply,
    ) {
        const { workspaceId, taskId } = request.params;
        const lang = request.lang;

        const ws = await findOwnWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);

        const file = await request.file();
        if (!file) {
            return reply.code(400).send(badRequest("파일을 선택해 주세요."));
        }

        const { storageService, UPLOADS_DIR: _ud } = await import("../index.js");
        const buf = await file.toBuffer();
        const ext = file.filename.split(".").pop() ?? "bin";
        const attachmentId = generatePublicId();
        const key = `task-attachments/${taskId}/${attachmentId}.${ext}`;
        const fileUrl = await storageService.upload(key, buf, file.mimetype);

        const attachment = await (app.prisma as any).workspaceTaskAttachment.create({
            data: {
                id: attachmentId,
                taskId,
                userId: request.userId,
                fileName: file.filename,
                fileSize: buf.byteLength,
                mimeType: file.mimetype,
                fileUrl,
            },
            select: {
                id: true, fileName: true, fileSize: true, mimeType: true, fileUrl: true, createdAt: true,
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
        });
        recordHistory(app, {
            projectId: ws.projectId,
            userId: request.userId,
            action: "CREATED",
            resourceType: "TASK_ATTACHMENT",
            resourceId: attachment.id,
            resourceName: file.filename,
            after: { fileName: file.filename, fileSize: buf.byteLength, mimeType: file.mimetype },
        });

        return reply.code(201).send(created(attachment, "파일이 업로드되었습니다."));
    }

    /** DELETE /api/workspaces/:workspaceId/tasks/:taskId/attachments/:attachmentId */
    async function deleteTaskAttachment(
        request: FastifyRequest<{ Params: WorkspaceTaskAttachmentParams }>,
        reply: FastifyReply,
    ) {
        const { workspaceId, taskId, attachmentId } = request.params;
        const lang = request.lang;

        const ws = await findOwnWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);

        const attachment = await (app.prisma as any).workspaceTaskAttachment.findFirst({
            where: { id: attachmentId, taskId },
        });
        if (!attachment) {
            return reply.code(404).send(notFound("첨부파일을 찾을 수 없습니다."));
        }
        if (attachment.userId !== request.userId) {
            return reply.code(403).send(forbidden("본인이 업로드한 파일만 삭제할 수 있습니다."));
        }

        const { storageService } = await import("../index.js");
        await storageService.remove(attachment.fileUrl);
        await (app.prisma as any).workspaceTaskAttachment.delete({ where: { id: attachmentId } });

        recordHistory(app, {
            projectId: ws.projectId,
            userId: request.userId,
            action: "DELETED",
            resourceType: "TASK_ATTACHMENT",
            resourceId: attachmentId,
            resourceName: attachment.fileName,
            before: { fileName: attachment.fileName, fileSize: attachment.fileSize },
        });

        return reply.send(ok({ id: attachmentId }, "파일이 삭제되었습니다."));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 노트 API
    // ─────────────────────────────────────────────────────────────────────────

    /** GET /api/workspaces/:workspaceId/tasks/:taskId/notes */
    async function listTaskNotes(
        request: FastifyRequest<{ Params: WorkspaceTaskParams }>,
        reply: FastifyReply,
    ) {
        const { workspaceId, taskId } = request.params;
        const lang = request.lang;

        const ws = await findAccessibleWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);

        const notes = await (app.prisma as any).workspaceTaskNote.findMany({
            where: { taskId },
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                content: true,
                createdAt: true,
                updatedAt: true,
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
        });
        return reply.send(ok(notes, "노트 목록입니다."));
    }

    /** POST /api/workspaces/:workspaceId/tasks/:taskId/notes */
    async function createTaskNote(
        request: FastifyRequest<{ Params: WorkspaceTaskParams; Body: CreateWorkspaceTaskNoteBody }>,
        reply: FastifyReply,
    ) {
        const { workspaceId, taskId } = request.params;
        const lang = request.lang;
        const content = String(request.body?.content ?? "").trim();

        if (!content) {
            return reply.code(400).send(badRequest("노트 내용을 입력해 주세요."));
        }

        const ws = await findOwnWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);

        const note = await (app.prisma as any).workspaceTaskNote.create({
            data: { id: generatePublicId(), taskId, userId: request.userId, content },
            select: {
                id: true,
                content: true,
                createdAt: true,
                updatedAt: true,
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
        });

        return reply.code(201).send(created(note, "노트가 등록되었습니다."));
    }

    /** DELETE /api/workspaces/:workspaceId/tasks/:taskId/notes/:noteId */
    async function deleteTaskNote(
        request: FastifyRequest<{ Params: WorkspaceTaskNoteParams }>,
        reply: FastifyReply,
    ) {
        const { workspaceId, taskId, noteId } = request.params;
        const lang = request.lang;

        const ws = await findOwnWorkspace(app, workspaceId, request.userId);
        if (!ws) return rejectNoWorkspace(app, workspaceId, lang, reply);

        const note = await (app.prisma as any).workspaceTaskNote.findFirst({
            where: { id: noteId, taskId },
        });
        if (!note) {
            return reply.code(404).send(notFound("노트를 찾을 수 없습니다."));
        }
        if (note.userId !== request.userId) {
            return reply.code(403).send(forbidden("본인 노트만 삭제할 수 있습니다."));
        }

        await (app.prisma as any).workspaceTaskNote.delete({ where: { id: noteId } });
        return reply.send(ok({ id: noteId }, "노트가 삭제되었습니다."));
    }

    return {
        listWorkspaces,
        getWorkspace,
        listWorkspaceStatuses,
        createWorkspaceStatus,
        updateWorkspaceStatus,
        deleteWorkspaceStatus,
        listWorkspacePriorities,
        createWorkspacePriority,
        updateWorkspacePriority,
        deleteWorkspacePriority,
        reorderWorkspaceTasks,
        listWorkspaceTasks,
        createWorkspaceTask,
        updateWorkspaceTask,
        deleteWorkspaceTask,
        listTaskComments,
        createTaskComment,
        deleteTaskComment,
        listTaskAttachments,
        uploadTaskAttachment,
        deleteTaskAttachment,
        listTaskNotes,
        createTaskNote,
        deleteTaskNote,
    };
}
