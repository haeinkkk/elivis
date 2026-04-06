import { generatePublicId } from "@repo/database";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { badRequest, created, forbidden, notFound, ok } from "../utils/response";
import { publishNotification } from "../utils/notify";
import { canAccessProject } from "@repo/database";

// ─────────────────────────────────────────────────────────────────────────────
// 파라미터 / 바디 타입
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateTaskRequestBody {
    toUserId: string;
    title: string;
    content?: string;
    isUrgent?: boolean;
}

export interface TaskRequestParams {
    requestId: string;
}

export interface ProjectTaskRequestParams {
    projectId: string;
}

export interface WorkspaceTaskRequestParams {
    workspaceId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 컨트롤러
// ─────────────────────────────────────────────────────────────────────────────

export function createTaskRequestController(app: FastifyInstance) {
    /**
     * POST /api/projects/:projectId/task-requests
     * 다른 팀원에게 업무 요청 전송
     */
    async function createTaskRequest(
        request: FastifyRequest<{ Params: ProjectTaskRequestParams; Body: CreateTaskRequestBody }>,
        reply: FastifyReply,
    ) {
        const { projectId } = request.params;
        const { toUserId, title, content, isUrgent } = request.body;
        const fromUserId = request.userId;

        if (!toUserId?.trim() || !title?.trim()) {
            return reply.code(400).send(badRequest("대상자와 제목은 필수입니다."));
        }

        if (fromUserId === toUserId) {
            return reply.code(400).send(badRequest("자신에게 업무를 요청할 수 없습니다."));
        }

        const project = await app.prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true, name: true },
        });
        if (!project) return reply.code(404).send(notFound("프로젝트를 찾을 수 없습니다."));

        const canAccess = await canAccessProject(fromUserId, projectId);
        if (!canAccess) return reply.code(403).send(forbidden("접근 권한이 없습니다."));

        // 대상자가 같은 프로젝트에 접근 가능한 멤버인지 확인 (직접 멤버 + 팀 연결 멤버 모두 포함)
        const canTargetAccess = await canAccessProject(toUserId, projectId);
        if (!canTargetAccess) {
            return reply.code(400).send(badRequest("대상자가 프로젝트 멤버가 아닙니다."));
        }

        const taskRequest = await (app.prisma as any).workspaceTaskRequest.create({
            data: {
                id: generatePublicId(),
                projectId,
                fromUserId,
                toUserId,
                title: title.trim(),
                content: content?.trim() || null,
                isUrgent: !!isUrgent,
            },
            include: {
                fromUser: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
        });

        // 대상자에게 알림 발송
        const [fromUser, toWorkspace] = await Promise.all([
            app.prisma.user.findUnique({
                where: { id: fromUserId },
                select: { name: true, email: true },
            }),
            app.prisma.workspace.findFirst({
                where: { projectId, userId: toUserId },
                select: { id: true },
            }),
        ]);
        const senderName = fromUser?.name ?? fromUser?.email ?? "누군가";
        const urgentPrefix = isUrgent ? "[긴급] " : "";

        void publishNotification(app.redis, {
            userId: toUserId,
            type: "TASK_REQUEST_RECEIVED",
            title: `[${project.name}] 새 업무 요청이 도착했습니다`,
            message: `${senderName}님이 '${urgentPrefix}${title.trim()}' 업무를 요청했습니다.\n* 이 업무는 워크스페이스의 요청업무에서 확인하실 수 있습니다.`,
            data: {
                requestId: taskRequest.id,
                projectId,
                ...(toWorkspace?.id ? { workspaceId: toWorkspace.id } : {}),
            },
        }).catch((err) => app.log.error({ err }, "Failed to publish task request notification"));

        return reply.code(201).send(created(taskRequest, "업무 요청이 전송되었습니다."));
    }

    /**
     * GET /api/workspaces/:workspaceId/task-requests
     * 내가 받은 대기 중인 업무 요청 목록
     */
    async function listTaskRequests(
        request: FastifyRequest<{ Params: WorkspaceTaskRequestParams }>,
        reply: FastifyReply,
    ) {
        const { workspaceId } = request.params;
        const userId = request.userId;

        const ws = await app.prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { userId: true, projectId: true },
        });
        if (!ws || ws.userId !== userId) {
            return reply.code(403).send(forbidden("접근 권한이 없습니다."));
        }

        const requests = await (app.prisma as any).workspaceTaskRequest.findMany({
            where: {
                projectId: ws.projectId,
                toUserId: userId,
                status: "PENDING",
            },
            orderBy: { createdAt: "desc" },
            include: {
                fromUser: { select: { id: true, name: true, email: true, avatarUrl: true } },
                project: { select: { id: true, name: true } },
            },
        });

        return reply.send(ok(requests, "업무 요청 목록을 가져왔습니다."));
    }

    /**
     * POST /api/task-requests/:requestId/accept
     * 업무 요청 수락 → 내 워크스페이스에 업무 생성
     */
    async function acceptTaskRequest(
        request: FastifyRequest<{ Params: TaskRequestParams }>,
        reply: FastifyReply,
    ) {
        const { requestId } = request.params;
        const userId = request.userId;

        const taskReq = await (app.prisma as any).workspaceTaskRequest.findUnique({
            where: { id: requestId },
            include: {
                fromUser: { select: { id: true, name: true, email: true } },
            },
        });

        if (!taskReq) return reply.code(404).send(notFound("요청을 찾을 수 없습니다."));
        if (taskReq.toUserId !== userId) return reply.code(403).send(forbidden("접근 권한이 없습니다."));
        if (taskReq.status !== "PENDING") {
            return reply.code(400).send(badRequest("이미 처리된 요청입니다."));
        }

        // 내 워크스페이스 찾기
        const workspace = await app.prisma.workspace.findFirst({
            where: { projectId: taskReq.projectId, userId },
            select: { id: true },
        });
        if (!workspace) return reply.code(404).send(notFound("워크스페이스를 찾을 수 없습니다."));

        // 첫 번째 상태 가져오기
        const firstStatus = await (app.prisma as any).workspaceStatus.findFirst({
            where: { workspaceId: workspace.id },
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            select: { id: true },
        });
        const statusId: string | null = firstStatus?.id ?? null;

        if (!statusId) {
            return reply
                .code(400)
                .send(badRequest("워크스페이스에 상태가 없습니다. 먼저 상태를 추가해주세요."));
        }

        // 업무 순서 계산
        const taskCount = await (app.prisma as any).workspaceTask.count({
            where: { workspaceId: workspace.id, parentId: null },
        });

        const [task] = await app.prisma.$transaction([
            (app.prisma as any).workspaceTask.create({
                data: {
                    id: generatePublicId(),
                    workspaceId: workspace.id,
                    title: taskReq.title,
                    description: taskReq.content,
                    statusId,
                    assigneeId: userId,
                    order: taskCount,
                },
            }),
            (app.prisma as any).workspaceTaskRequest.update({
                where: { id: requestId },
                data: { status: "ACCEPTED" },
            }),
        ]);

        // 요청자에게 수락 알림
        const accepter = await app.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true },
        });
        const accepterName = accepter?.name ?? accepter?.email ?? "상대방";

        void publishNotification(app.redis, {
            userId: taskReq.fromUserId,
            type: "TASK_REQUEST_ACCEPTED",
            title: "업무 요청이 수락되었습니다",
            message: `${accepterName}님이 '${taskReq.title}' 요청을 수락했습니다.`,
            data: { requestId, projectId: taskReq.projectId },
        }).catch((err) => app.log.error({ err }, "Failed to publish accept notification"));

        return reply.send(ok(task, "업무 요청이 수락되었습니다."));
    }

    /**
     * POST /api/task-requests/:requestId/reject
     * 업무 요청 거절
     */
    async function rejectTaskRequest(
        request: FastifyRequest<{ Params: TaskRequestParams }>,
        reply: FastifyReply,
    ) {
        const { requestId } = request.params;
        const userId = request.userId;

        const taskReq = await (app.prisma as any).workspaceTaskRequest.findUnique({
            where: { id: requestId },
        });
        if (!taskReq) return reply.code(404).send(notFound("요청을 찾을 수 없습니다."));
        if (taskReq.toUserId !== userId) return reply.code(403).send(forbidden("접근 권한이 없습니다."));
        if (taskReq.status !== "PENDING") {
            return reply.code(400).send(badRequest("이미 처리된 요청입니다."));
        }

        await (app.prisma as any).workspaceTaskRequest.update({
            where: { id: requestId },
            data: { status: "REJECTED" },
        });

        // 요청자에게 거절 알림
        const rejecter = await app.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true },
        });
        const rejecterName = rejecter?.name ?? rejecter?.email ?? "상대방";

        void publishNotification(app.redis, {
            userId: taskReq.fromUserId,
            type: "TASK_REQUEST_REJECTED",
            title: "업무 요청이 거절되었습니다",
            message: `${rejecterName}님이 '${taskReq.title}' 요청을 거절했습니다.`,
            data: { requestId, projectId: taskReq.projectId },
        }).catch((err) => app.log.error({ err }, "Failed to publish reject notification"));

        return reply.send(ok({ id: requestId }, "업무 요청이 거절되었습니다."));
    }

    return { createTaskRequest, listTaskRequests, acceptTaskRequest, rejectTaskRequest };
}
