import {
    fetchWorkspaceById,
    fetchWorkspaceTasks,
    fetchWorkspaceStatuses,
    fetchWorkspacePriorities,
} from "@/lib/server/workspaces.server";
import WorkspaceDetailClient from "./WorkspaceDetailClient";

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ tab?: string }>;
}

export default async function WorkspaceDetailPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const { tab } = await searchParams;
    const VALID_TABS = ["mywork", "summary", "requests", "calendar"] as const;
    type WorkspaceTab = (typeof VALID_TABS)[number];
    const initialTab: WorkspaceTab = VALID_TABS.includes(tab as WorkspaceTab)
        ? (tab as WorkspaceTab)
        : "mywork";

    const result = await fetchWorkspaceById(id);

    if (!result.ok) {
        if (result.reason === "unauthorized") {
            return (
                <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
                    <p className="text-lg font-semibold text-stone-700">로그인이 필요합니다.</p>
                </div>
            );
        }
        if (result.reason === "forbidden") {
            return (
                <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
                    <p className="text-lg font-semibold text-stone-700">이 워크스페이스를 볼 권한이 없습니다.</p>
                </div>
            );
        }
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
                <p className="text-lg font-semibold text-stone-700">워크스페이스를 찾을 수 없습니다.</p>
            </div>
        );
    }

    const [tasks, statuses, priorities] = await Promise.all([
        fetchWorkspaceTasks(id),
        fetchWorkspaceStatuses(id),
        fetchWorkspacePriorities(id),
    ]);

    return (
        <WorkspaceDetailClient
            workspace={result.workspace}
            initialTasks={tasks ?? []}
            initialStatuses={statuses ?? []}
            initialPriorities={priorities ?? []}
            initialTab={initialTab}
        />
    );
}
