import {
    fetchWorkspaceById,
    fetchWorkspaceTasks,
    fetchWorkspaceStatuses,
    fetchWorkspacePriorities,
} from "@/lib/workspaces.server";
import WorkspaceDetailClient from "./WorkspaceDetailClient";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function WorkspaceDetailPage({ params }: PageProps) {
    const { id } = await params;

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
        />
    );
}
