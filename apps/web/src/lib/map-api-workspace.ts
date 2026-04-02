/** 워크스페이스별 커스텀 우선순위 */
export type ApiWorkspacePriority = {
    id: string;
    workspaceId: string;
    name: string;
    color: string;
    order: number;
    /** 우선순위 가중치 (높을수록 먼저 처리. 0 = 미설정) */
    value: number;
    createdAt: string;
    updatedAt: string;
};

/** 워크스페이스별 커스텀 상태 */
export type ApiWorkspaceStatus = {
    id: string;
    workspaceId: string;
    name: string;
    /** 색상 키: gray | red | orange | yellow | green | blue | purple | pink */
    color: string;
    order: number;
    /** true면 이 상태로 변경 시 프로젝트 팀원 전체에게 알림 발송 */
    notifyOnChange: boolean;
    createdAt: string;
    updatedAt: string;
};

/** GET /api/workspaces 목록 한 행 */
export type ApiWorkspaceListItem = {
    id: string;
    createdAt: string;
    updatedAt: string;
    project: {
        id: string;
        name: string;
        description: string | null;
        startDate: string | null;
        endDate: string | null;
        noEndDate: boolean;
        isPublic: boolean;
        team: { id: string; name: string } | null;
        projectTeams: { team: { id: string; name: string } }[];
        _count: { tasks: number };
    };
    _count: { tasks: number };
};

/** GET /api/workspaces/:workspaceId 상세 */
export type ApiWorkspaceDetail = {
    id: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
    project: {
        id: string;
        name: string;
        description: string | null;
        startDate: string | null;
        endDate: string | null;
        noEndDate: boolean;
        isPublic: boolean;
        team: { id: string; name: string } | null;
        projectTeams: { team: { id: string; name: string } }[];
    };
    views: ApiWorkspaceView[];
    _count: { tasks: number };
};

export type ApiWorkspaceView = {
    id: string;
    type: "LIST" | "BOARD";
    name: string;
    configJson: string | null;
    createdAt: string;
    updatedAt: string;
};

/** GET /api/workspaces/:workspaceId/tasks */
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

export type ApiTaskUser = {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
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
