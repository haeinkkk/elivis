import type { FastifyInstance } from "fastify";

import { authenticateUser } from "../middleware/auth";
import {
    createWorkspaceController,
    type WorkspaceParams,
    type WorkspaceTaskParams,
    type WorkspaceStatusParams,
    type WorkspacePriorityParams,
    type CreateWorkspaceTaskBody,
    type UpdateWorkspaceTaskBody,
    type CreateWorkspaceStatusBody,
    type UpdateWorkspaceStatusBody,
    type CreateWorkspacePriorityBody,
    type UpdateWorkspacePriorityBody,
    type ReorderTasksBody,
    type WorkspaceTaskCommentParams,
    type CreateWorkspaceTaskCommentBody,
    type WorkspaceTaskAttachmentParams,
    type WorkspaceTaskNoteParams,
    type CreateWorkspaceTaskNoteBody,
    type UpdateWorkspaceBody,
} from "../controllers/workspace.controller";

export async function workspaceRoutes(app: FastifyInstance) {
    const {
        listWorkspaces,
        getWorkspace,
        updateWorkspace,
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
    } = createWorkspaceController(app);

    app.get("/workspaces", { preHandler: [authenticateUser] }, listWorkspaces);
    app.get<{ Params: WorkspaceParams }>("/workspaces/:workspaceId", { preHandler: [authenticateUser] }, getWorkspace);
    app.patch<{ Params: WorkspaceParams; Body: UpdateWorkspaceBody }>(
        "/workspaces/:workspaceId",
        { preHandler: [authenticateUser] },
        updateWorkspace,
    );

    // 상태 CRUD
    app.get<{ Params: WorkspaceParams }>("/workspaces/:workspaceId/statuses", { preHandler: [authenticateUser] }, listWorkspaceStatuses);
    app.post<{ Params: WorkspaceParams; Body: CreateWorkspaceStatusBody }>("/workspaces/:workspaceId/statuses", { preHandler: [authenticateUser] }, createWorkspaceStatus);
    app.patch<{ Params: WorkspaceStatusParams; Body: UpdateWorkspaceStatusBody }>("/workspaces/:workspaceId/statuses/:statusId", { preHandler: [authenticateUser] }, updateWorkspaceStatus);
    app.delete<{ Params: WorkspaceStatusParams }>("/workspaces/:workspaceId/statuses/:statusId", { preHandler: [authenticateUser] }, deleteWorkspaceStatus);

    // 우선순위 CRUD
    app.get<{ Params: WorkspaceParams }>("/workspaces/:workspaceId/priorities", { preHandler: [authenticateUser] }, listWorkspacePriorities);
    app.post<{ Params: WorkspaceParams; Body: CreateWorkspacePriorityBody }>("/workspaces/:workspaceId/priorities", { preHandler: [authenticateUser] }, createWorkspacePriority);
    app.patch<{ Params: WorkspacePriorityParams; Body: UpdateWorkspacePriorityBody }>("/workspaces/:workspaceId/priorities/:priorityId", { preHandler: [authenticateUser] }, updateWorkspacePriority);
    app.delete<{ Params: WorkspacePriorityParams }>("/workspaces/:workspaceId/priorities/:priorityId", { preHandler: [authenticateUser] }, deleteWorkspacePriority);

    // 업무 순서 일괄 변경 — :taskId 보다 먼저 등록해야 정적 경로가 우선됨
    app.post<{ Params: WorkspaceParams; Body: ReorderTasksBody }>("/workspaces/:workspaceId/tasks/reorder", { preHandler: [authenticateUser] }, reorderWorkspaceTasks);

    // 업무 CRUD
    app.get<{ Params: WorkspaceParams }>("/workspaces/:workspaceId/tasks", { preHandler: [authenticateUser] }, listWorkspaceTasks);
    app.post<{ Params: WorkspaceParams; Body: CreateWorkspaceTaskBody }>("/workspaces/:workspaceId/tasks", { preHandler: [authenticateUser] }, createWorkspaceTask);
    app.patch<{ Params: WorkspaceTaskParams; Body: UpdateWorkspaceTaskBody }>("/workspaces/:workspaceId/tasks/:taskId", { preHandler: [authenticateUser] }, updateWorkspaceTask);
    app.delete<{ Params: WorkspaceTaskParams }>("/workspaces/:workspaceId/tasks/:taskId", { preHandler: [authenticateUser] }, deleteWorkspaceTask);

    // 댓글 CRUD
    app.get<{ Params: WorkspaceTaskParams }>("/workspaces/:workspaceId/tasks/:taskId/comments", { preHandler: [authenticateUser] }, listTaskComments);
    app.post<{ Params: WorkspaceTaskParams; Body: CreateWorkspaceTaskCommentBody }>("/workspaces/:workspaceId/tasks/:taskId/comments", { preHandler: [authenticateUser] }, createTaskComment);
    app.delete<{ Params: WorkspaceTaskCommentParams }>("/workspaces/:workspaceId/tasks/:taskId/comments/:commentId", { preHandler: [authenticateUser] }, deleteTaskComment);

    // 첨부파일
    app.get<{ Params: WorkspaceTaskParams }>("/workspaces/:workspaceId/tasks/:taskId/attachments", { preHandler: [authenticateUser] }, listTaskAttachments);
    app.post<{ Params: WorkspaceTaskParams }>("/workspaces/:workspaceId/tasks/:taskId/attachments", { preHandler: [authenticateUser] }, uploadTaskAttachment);
    app.delete<{ Params: WorkspaceTaskAttachmentParams }>("/workspaces/:workspaceId/tasks/:taskId/attachments/:attachmentId", { preHandler: [authenticateUser] }, deleteTaskAttachment);

    // 노트 CRUD
    app.get<{ Params: WorkspaceTaskParams }>("/workspaces/:workspaceId/tasks/:taskId/notes", { preHandler: [authenticateUser] }, listTaskNotes);
    app.post<{ Params: WorkspaceTaskParams; Body: CreateWorkspaceTaskNoteBody }>("/workspaces/:workspaceId/tasks/:taskId/notes", { preHandler: [authenticateUser] }, createTaskNote);
    app.delete<{ Params: WorkspaceTaskNoteParams }>("/workspaces/:workspaceId/tasks/:taskId/notes/:noteId", { preHandler: [authenticateUser] }, deleteTaskNote);
}
