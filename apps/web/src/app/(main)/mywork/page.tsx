import {
    fetchWorkspaceList,
    fetchWorkspaceTasks,
    fetchWorkspaceStatuses,
    fetchWorkspacePriorities,
} from "@/lib/workspaces.server";

import { MyWorkOverviewClient } from "./MyWorkOverviewClient";

export const dynamic = "force-dynamic";

export default async function MyWorkPage() {
    const workspaces = await fetchWorkspaceList();

    if (!workspaces || workspaces.length === 0) {
        return <MyWorkOverviewClient workspaceDataList={[]} />;
    }

    const workspaceDataList = await Promise.all(
        workspaces.map(async (ws) => {
            const [tasks, statuses, priorities] = await Promise.all([
                fetchWorkspaceTasks(ws.id),
                fetchWorkspaceStatuses(ws.id),
                fetchWorkspacePriorities(ws.id),
            ]);
            return {
                workspace: ws,
                tasks: tasks ?? [],
                statuses: statuses ?? [],
                priorities: priorities ?? [],
            };
        }),
    );

    return <MyWorkOverviewClient workspaceDataList={workspaceDataList} />;
}
