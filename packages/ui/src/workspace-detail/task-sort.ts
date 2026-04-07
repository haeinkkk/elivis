import type { ApiWorkspaceTask } from "../types/workspace-api";

export function sortTasksByOrder(a: ApiWorkspaceTask, b: ApiWorkspaceTask) {
    if (a.order !== b.order) return a.order - b.order;
    return a.createdAt.localeCompare(b.createdAt);
}

/** 같은 parentId 를 가진 형제만, order 순 */
export function siblingTasksForParent(tasks: ApiWorkspaceTask[], parentId: string | null): ApiWorkspaceTask[] {
    return tasks
        .filter((t) => (t.parentId ?? null) === (parentId ?? null))
        .sort(sortTasksByOrder);
}

/** parent 체인을 따라 최상위(1단) 작업까지 올라감 — 리스트 DnD 충돌이 하위 행을 잡을 때 사용 */
export function rootWorkspaceTask(task: ApiWorkspaceTask, tasks: ApiWorkspaceTask[]): ApiWorkspaceTask {
    let cur = task;
    while (cur.parentId) {
        const p = tasks.find((t) => t.id === cur.parentId);
        if (!p) break;
        cur = p;
    }
    return cur;
}
