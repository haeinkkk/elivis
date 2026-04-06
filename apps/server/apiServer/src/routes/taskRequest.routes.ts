import type { FastifyInstance } from "fastify";

import {
    createTaskRequestController,
    type CreateTaskRequestBody,
    type ProjectTaskRequestParams,
    type TaskRequestParams,
    type WorkspaceTaskRequestParams,
} from "../controllers/taskRequest.controller";
import { authenticateUser } from "../middleware/auth";

export async function taskRequestRoutes(app: FastifyInstance) {
    const { createTaskRequest, listTaskRequests, acceptTaskRequest, rejectTaskRequest } =
        createTaskRequestController(app);

    // 업무 요청 생성
    app.post<{ Params: ProjectTaskRequestParams; Body: CreateTaskRequestBody }>(
        "/projects/:projectId/task-requests",
        { preHandler: [authenticateUser] },
        createTaskRequest,
    );

    // 내가 받은 업무 요청 목록 (워크스페이스 기준)
    app.get<{ Params: WorkspaceTaskRequestParams }>(
        "/workspaces/:workspaceId/task-requests",
        { preHandler: [authenticateUser] },
        listTaskRequests,
    );

    // 수락
    app.post<{ Params: TaskRequestParams }>(
        "/task-requests/:requestId/accept",
        { preHandler: [authenticateUser] },
        acceptTaskRequest,
    );

    // 거절
    app.post<{ Params: TaskRequestParams }>(
        "/task-requests/:requestId/reject",
        { preHandler: [authenticateUser] },
        rejectTaskRequest,
    );
}
