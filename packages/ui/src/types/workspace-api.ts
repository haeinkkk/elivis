/** 워크스페이스 업무 UI용 DTO (앱 `lib/mappers/workspace`와 동일 구조) */

export type ApiWorkspacePriority = {
    id: string;
    workspaceId: string;
    name: string;
    color: string;
    order: number;
    value: number;
    createdAt: string;
    updatedAt: string;
};

export type ApiWorkspaceStatus = {
    id: string;
    workspaceId: string;
    name: string;
    color: string;
    order: number;
    notifyOnChange: boolean;
    createdAt: string;
    updatedAt: string;
};

export type ApiTaskUser = {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
};

export type ApiWorkspaceTask = {
    id: string;
    title: string;
    description: string | null;
    statusId: string;
    status: { id: string; name: string; color: string; order: number };
    priorityId: string | null;
    priority: { id: string; name: string; color: string; order: number; value: number } | null;
    order: number;
    startDate: string | null;
    dueDate: string | null;
    parentId: string | null;
    createdAt: string;
    updatedAt: string;
    assignee: {
        id: string;
        name: string | null;
        email: string;
        avatarUrl: string | null;
    } | null;
};

export type ApiWorkspaceTaskComment = {
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    user: ApiTaskUser;
};

export type ApiWorkspaceTaskNote = {
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    user: ApiTaskUser;
};

export type ApiWorkspaceTaskAttachment = {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    fileUrl: string;
    createdAt: string;
    user: ApiTaskUser;
};

// ─────────────────────────────────────────────────────────────────────────────
// 업무 요청 (워크스페이스 수신함)
// ─────────────────────────────────────────────────────────────────────────────

export type ApiTaskRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";

/** GET /api/workspaces/:workspaceId/task-requests */
export type ApiTaskRequest = {
    id: string;
    projectId: string;
    fromUserId: string;
    toUserId: string;
    title: string;
    content: string | null;
    isUrgent: boolean;
    status: ApiTaskRequestStatus;
    createdAt: string;
    updatedAt: string;
    fromUser: {
        id: string;
        name: string | null;
        email: string;
        avatarUrl: string | null;
    };
    project: {
        id: string;
        name: string;
    };
};

/** GET /api/projects/:projectId/tasks — 워크스페이스(소유자) + 업무 + 상태 + 우선순위 한 묶음 */
export type ApiProjectTasksItem = {
    workspace: {
        id: string;
        user: {
            id: string;
            name: string | null;
            email: string;
            avatarUrl: string | null;
        };
    };
    tasks: ApiWorkspaceTask[];
    statuses: ApiWorkspaceStatus[];
    priorities: ApiWorkspacePriority[];
};
