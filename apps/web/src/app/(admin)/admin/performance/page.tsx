import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import {
    fetchWorkspaceList,
    fetchWorkspaceTasks,
    fetchWorkspaceStatuses,
    fetchWorkspacePriorities,
} from "@/lib/server/workspaces.server";
import { getMyProfile } from "@/lib/server/user-profile.server";
import { MyWorkOverviewClient } from "@/app/(main)/mywork/MyWorkOverviewClient";

import { MyPerformanceOverviewClient } from "./MyPerformanceOverviewClient";

export const dynamic = "force-dynamic";

export default async function AdminPerformancePage() {
    const [user, workspaces, tPerf] = await Promise.all([
        getMyProfile(),
        fetchWorkspaceList(),
        getTranslations("myworkPerformance"),
    ]);

    if (!user) {
        redirect("/login");
    }

    const workspaceDataList =
        workspaces && workspaces.length > 0
            ? await Promise.all(
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
              )
            : [];

    return (
        <div className="flex min-h-full w-full flex-col">
            <MyPerformanceOverviewClient
                workspaceDataList={workspaceDataList}
                currentUserId={user.id}
            />

            <div className="border-b border-stone-200 bg-stone-50/50 px-4 py-3 sm:px-6">
                <h2 className="text-sm font-semibold text-stone-800">{tPerf("timelineSectionTitle")}</h2>
                <p className="mt-0.5 text-xs text-stone-500">{tPerf("timelineSectionDesc")}</p>
            </div>

            <MyWorkOverviewClient workspaceDataList={workspaceDataList} timelineOnly />
        </div>
    );
}
