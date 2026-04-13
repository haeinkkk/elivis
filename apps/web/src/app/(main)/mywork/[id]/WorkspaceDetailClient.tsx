"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
    ElivisDetailTabBar,
    MyWorkTab,
    RequestsTab,
    SummaryTab,
    WorkspaceCalendarTab as CalendarTab,
    WorkspaceTaskDetailPanel as TaskDetailPanel,
    type WorkspaceTab,
} from "@repo/ui";

import {
    acceptTaskRequestAction,
    listTaskRequestsAction,
    rejectTaskRequestAction,
} from "@/app/actions/taskRequests";
import {
    createWorkspacePriorityAction,
    createWorkspaceStatusAction,
    createWorkspaceTaskAction,
    deleteWorkspacePriorityAction,
    deleteWorkspaceStatusAction,
    deleteWorkspaceTaskAction,
    reorderWorkspaceTasksAction,
    updateWorkspacePriorityAction,
    updateWorkspaceStatusAction,
    updateWorkspaceTaskAction,
} from "@/app/actions/workspaces";
import type {
    ApiWorkspaceDetail,
    ApiWorkspacePriority,
    ApiWorkspaceStatus,
    ApiWorkspaceTask,
} from "@/lib/mappers/workspace";
import { workspaceTaskPanelActions } from "@/lib/ui/workspace-task-panel-actions";

interface WorkspaceDetailClientProps {
    workspace: ApiWorkspaceDetail;
    initialTasks: ApiWorkspaceTask[];
    initialStatuses: ApiWorkspaceStatus[];
    initialPriorities: ApiWorkspacePriority[];
    initialTab?: WorkspaceTab;
}

export default function WorkspaceDetailClient({
    workspace,
    initialTasks,
    initialStatuses,
    initialPriorities,
    initialTab,
}: WorkspaceDetailClientProps) {
    const t = useTranslations("workspace");
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab ?? "mywork");
    const [tasks, setTasks] = useState<ApiWorkspaceTask[]>(initialTasks);
    const [statuses, setStatuses] = useState<ApiWorkspaceStatus[]>(initialStatuses);
    const [priorities, setPriorities] = useState<ApiWorkspacePriority[]>(initialPriorities);
    const [calendarPanelTask, setCalendarPanelTask] = useState<ApiWorkspaceTask | null>(null);
    const [summaryPanelTask, setSummaryPanelTask] = useState<ApiWorkspaceTask | null>(null);

    const myWorkMutations = {
        createWorkspaceStatus: createWorkspaceStatusAction,
        updateWorkspaceStatus: updateWorkspaceStatusAction,
        deleteWorkspaceStatus: deleteWorkspaceStatusAction,
        createWorkspacePriority: createWorkspacePriorityAction,
        updateWorkspacePriority: updateWorkspacePriorityAction,
        deleteWorkspacePriority: deleteWorkspacePriorityAction,
        reorderWorkspaceTasks: reorderWorkspaceTasksAction,
        createWorkspaceTask: createWorkspaceTaskAction,
        updateWorkspaceTask: updateWorkspaceTaskAction,
        deleteWorkspaceTask: deleteWorkspaceTaskAction,
    };

    const taskRequests = {
        listTaskRequests: listTaskRequestsAction,
        acceptTaskRequest: acceptTaskRequestAction,
        rejectTaskRequest: rejectTaskRequestAction,
    };

    useEffect(() => {
        setTasks(initialTasks);
    }, [initialTasks]);

    const project = workspace.project;
    const allTeams = [project.team, ...project.projectTeams.map((pt) => pt.team)].filter(Boolean);
    const teamNames = [...new Set(allTeams.map((tm) => tm!.name))];

    const TABS: { id: WorkspaceTab; label: string }[] = [
        { id: "mywork", label: t("tabs.mywork") },
        { id: "summary", label: t("tabs.summary") },
        { id: "requests", label: t("tabs.requests") },
        { id: "calendar", label: t("tabs.calendar") },
    ];

    return (
        <div className="flex min-h-full w-full flex-col">
            <div className="border-b border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-4 py-3 sm:px-5 md:px-6">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 dark:text-elivis-ink-secondary transition-colors hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated hover:text-stone-700"
                        aria-label={t("header.backAria")}
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-lg font-semibold text-stone-800 dark:text-elivis-ink sm:text-xl">
                            {project.name}
                        </h1>
                        <p className="truncate text-xs text-stone-500 dark:text-elivis-ink-secondary sm:text-sm">
                            {teamNames.length > 0
                                ? teamNames.join(" · ")
                                : t("header.personalWorkspace")}
                        </p>
                    </div>
                    <div className="shrink-0 rounded-full bg-stone-100 dark:bg-elivis-surface-elevated px-3 py-1 text-xs font-medium text-stone-600 dark:text-elivis-ink-secondary">
                        {t("header.taskCount", {
                            count: tasks.filter((tk) => !tk.parentId).length,
                        })}
                    </div>
                </div>
            </div>

            <ElivisDetailTabBar
                ariaLabel={t("aria.subNav")}
                items={TABS}
                activeId={activeTab}
                onSelect={(id) => setActiveTab(id as WorkspaceTab)}
            />

            <div className="flex min-h-0 flex-1 flex-col">
                {activeTab === "mywork" && (
                    <MyWorkTab
                        tasks={tasks}
                        statuses={statuses}
                        priorities={priorities}
                        workspaceId={workspace.id}
                        myWorkMutations={myWorkMutations}
                        taskPanelActions={workspaceTaskPanelActions}
                        onUpdate={(tk) =>
                            setTasks((prev) => prev.map((x) => (x.id === tk.id ? tk : x)))
                        }
                        onDelete={(id) => setTasks((prev) => prev.filter((tk) => tk.id !== id))}
                        onAdded={(tk) => setTasks((prev) => [...prev, tk])}
                        onStatusesChange={setStatuses}
                        onPrioritiesChange={setPriorities}
                        onTasksChange={setTasks}
                    />
                )}
                {activeTab === "summary" && (
                    <>
                        <SummaryTab
                            tasks={tasks}
                            statuses={statuses}
                            priorities={priorities}
                            workspaceId={workspace.id}
                            updateWorkspaceTask={myWorkMutations.updateWorkspaceTask}
                            onTaskUpdate={(tk) =>
                                setTasks((prev) => prev.map((x) => (x.id === tk.id ? tk : x)))
                            }
                            onSelectTask={setSummaryPanelTask}
                        />
                        {summaryPanelTask && (
                            <TaskDetailPanel
                                actions={workspaceTaskPanelActions}
                                task={summaryPanelTask}
                                statuses={statuses}
                                priorities={priorities}
                                workspaceId={workspace.id}
                                onUpdate={(tk) => {
                                    setTasks((prev) => prev.map((x) => (x.id === tk.id ? tk : x)));
                                    setSummaryPanelTask(tk);
                                }}
                                onClose={() => setSummaryPanelTask(null)}
                            />
                        )}
                    </>
                )}
                {activeTab === "requests" && (
                    <RequestsTab
                        workspaceId={workspace.id}
                        taskRequests={taskRequests}
                        onAccepted={() => setActiveTab("mywork")}
                    />
                )}
                {activeTab === "calendar" && (
                    <>
                        <CalendarTab
                            tasks={tasks}
                            statuses={statuses}
                            workspaceId={workspace.id}
                            createWorkspaceTask={createWorkspaceTaskAction}
                            onAdded={(tk) => setTasks((prev) => [...prev, tk])}
                            onSelectTask={(tk) => setCalendarPanelTask(tk)}
                        />
                        {calendarPanelTask && (
                            <TaskDetailPanel
                                actions={workspaceTaskPanelActions}
                                task={calendarPanelTask}
                                statuses={statuses}
                                priorities={priorities}
                                workspaceId={workspace.id}
                                onUpdate={(tk) => {
                                    setTasks((prev) => prev.map((x) => (x.id === tk.id ? tk : x)));
                                    setCalendarPanelTask(tk);
                                }}
                                onClose={() => setCalendarPanelTask(null)}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
