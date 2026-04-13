"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

import {
    addProjectFavoriteAction,
    createProjectWikiPageAction,
    deleteProjectWikiPageAction,
    getProjectActivityLogAction,
    getProjectWikiPageAction,
    listProjectWikiPagesAction,
    removeProjectFavoriteAction,
    reorderProjectWikiPagesAction,
    updateProjectWikiPageAction,
    uploadProjectWikiMediaAction,
    type ApiProjectActivityItem,
} from "@/app/actions/projects";
import { getApiBaseUrl } from "@/lib/http/api-base-url";
import { formatProjectActivityLine } from "@/lib/project-activity-format";
import { createTaskRequestAction } from "@/app/actions/taskRequests";
import type { Project } from "@/lib/types/project";
import { projectSettingsActions } from "@/lib/ui/project-settings-actions";
import { workspaceTaskPanelActions } from "@/lib/ui/workspace-task-panel-actions";
import {
    ElivisDetailSettingsNav,
    ElivisDetailTabBar,
    ProjectCalendarTab,
    ProjectFavoriteButton,
    ProjectOverviewTab,
    ProjectParticipantAvatarStack,
    ProjectPerformanceTab,
    ProjectSettingsActivityTab,
    ProjectSettingsProjectTab,
    ProjectSettingsSecurityTab,
    ProjectTasksTab,
    ProjectWikiTab,
    UserAvatar,
    type ApiProjectTasksItem,
} from "@repo/ui";

type ProjectTab = "overview" | "list" | "calendar" | "wiki" | "performance" | "settings";

type ProjectSettingsSubTab = "project" | "security" | "activity";

const PROJECT_SETTINGS_ICONS: Record<ProjectSettingsSubTab, string> = {
    project:
        "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z",
    security:
        "M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z",
    /** 팀 설정(Settings) 활동 로그 서브탭과 동일 아이콘 */
    activity:
        "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
};

function projectViewerRoleLabel(role: string | undefined, tp: (key: string) => string): string {
    if (role === "LEADER") return tp("viewerRoles.LEADER");
    if (role === "DEPUTY_LEADER") return tp("viewerRoles.DEPUTY_LEADER");
    return tp("viewerRoles.MEMBER");
}

export function ProjectDetailPageClient({
    initialProject,
    isFavorite = false,
    projectTasksData = [],
    currentUserId = "",
}: {
    initialProject: Project;
    isFavorite?: boolean;
    projectTasksData?: ApiProjectTasksItem[];
    currentUserId?: string;
}) {
    const tp = useTranslations("projects.detail");
    const params = useParams();
    const router = useRouter();
    const id = typeof params.id === "string" ? params.id : "";
    const [activeTab, setActiveTab] = useState<ProjectTab>("overview");
    const [settingsSubTab, setSettingsSubTab] = useState<ProjectSettingsSubTab>("project");
    const [project, setProject] = useState<Project>(initialProject);
    const [membersModalOpen, setMembersModalOpen] = useState(false);

    const allMainTabs = [
        { id: "overview" as const, label: tp("tabs.overview") },
        { id: "list" as const, label: tp("tabs.list") },
        { id: "calendar" as const, label: tp("tabs.calendar") },
        { id: "wiki" as const, label: tp("tabs.wiki") },
        { id: "performance" as const, label: tp("tabs.performance") },
        { id: "settings" as const, label: tp("tabs.settings") },
    ] satisfies { id: ProjectTab; label: string }[];

    const mainTabs =
        project.projectType === "team"
            ? allMainTabs
            : allMainTabs.filter((t) => t.id !== "wiki");

    const visibleTabs =
        project.projectType === "team" && project.viewerRole !== "LEADER"
            ? mainTabs.filter((t) => t.id !== "performance" && t.id !== "settings")
            : mainTabs;

    const settingsSubTabs = (["project", "security", "activity"] as const).map((sid) => ({
        id: sid,
        label: tp(`settingsSub.${sid}`),
        iconPath: PROJECT_SETTINGS_ICONS[sid],
    }));

    const [activityLogError, setActivityLogError] = useState<string | null>(null);
    const [activityLogLoading, setActivityLogLoading] = useState(false);
    const [activityLogItems, setActivityLogItems] = useState<ApiProjectActivityItem[]>([]);

    const activityRows = activityLogItems.map((item) => ({
        id: item.id,
        resourceType: item.resourceType,
        action: item.action,
        line: formatProjectActivityLine(item, tp),
        createdAtIso: item.createdAt,
    }));

    useEffect(() => {
        if (activeTab !== "settings" || settingsSubTab !== "activity" || !id) {
            return;
        }
        let cancelled = false;
        setActivityLogLoading(true);
        setActivityLogError(null);
        void getProjectActivityLogAction(id).then((r) => {
            if (cancelled) return;
            setActivityLogLoading(false);
            if (r.ok) {
                setActivityLogItems(r.items);
            } else {
                setActivityLogItems([]);
                setActivityLogError(r.message);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [activeTab, settingsSubTab, id]);

    useEffect(() => {
        if (project.projectType === "team" && project.viewerRole !== "LEADER") {
            if (activeTab === "performance" || activeTab === "settings") {
                setActiveTab("overview");
            }
        }
        if (project.projectType !== "team" && activeTab === "wiki") {
            setActiveTab("overview");
        }
    }, [project, activeTab]);

    useEffect(() => {
        if (initialProject.id === id) {
            setProject(initialProject);
        }
    }, [id, initialProject]);

    if (!id) {
        return (
            <div className="flex min-h-full items-center justify-center p-8">
                <p className="text-stone-500 dark:text-elivis-ink-secondary">{tp("noProjectId")}</p>
            </div>
        );
    }

    return (
        <div
            className={`flex w-full flex-col ${
                activeTab === "wiki" ? "min-h-0 flex-1" : "min-h-full"
            }`}
        >
            {/* 상단: 뒤로가기 + 프로젝트명 + 멤버 아바타 스택 */}
            <div className="border-b border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-4 py-3 sm:px-5 md:px-6">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.push("/projects")}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 dark:text-elivis-ink-secondary transition-colors hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated hover:text-stone-700"
                        aria-label={tp("backToListAria")}
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
                        <div className="flex min-w-0 items-center gap-2">
                            <h1 className="truncate text-lg font-semibold text-stone-800 dark:text-elivis-ink sm:text-xl">
                                {project.name}
                            </h1>
                            <ProjectFavoriteButton
                                projectId={project.id}
                                initialIsFavorite={isFavorite}
                                size="sm"
                                onAdd={() => addProjectFavoriteAction(project.id)}
                                onRemove={() => removeProjectFavoriteAction(project.id)}
                            />
                        </div>
                        <p className="truncate text-xs text-stone-500 dark:text-elivis-ink-secondary sm:text-sm">
                            {project.description || tp("defaultDescription")}
                        </p>
                    </div>
                    <>
                            <button
                                type="button"
                                onClick={() => setMembersModalOpen(true)}
                                className="relative shrink-0 flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 pl-3 text-left transition-colors hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated"
                                aria-haspopup="dialog"
                                aria-expanded={membersModalOpen}
                            >
                                <span className="whitespace-nowrap text-sm font-medium text-stone-600 dark:text-elivis-ink-secondary">
                                    {tp("membersTotal", { count: project.participants.length })}
                                </span>
                                {project.participants.length > 0 && (
                                    <ProjectParticipantAvatarStack participants={project.participants} size="md" />
                                )}
                            </button>

                            {membersModalOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40 bg-stone-900/40"
                                        aria-hidden
                                        onClick={() => setMembersModalOpen(false)}
                                    />
                                    <div
                                        className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(80vh,520px)] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface shadow-xl"
                                        role="dialog"
                                        aria-modal
                                        aria-labelledby="project-members-modal-title"
                                    >
                                        <div className="border-b border-stone-100 dark:border-elivis-line px-5 py-4">
                                            <h2
                                                id="project-members-modal-title"
                                                className="text-base font-semibold text-stone-800 dark:text-elivis-ink"
                                            >
                                                {tp("membersModalTitle")}
                                            </h2>
                                            <p className="mt-0.5 text-sm text-stone-500 dark:text-elivis-ink-secondary">
                                                {tp("membersModalSubtitle", { count: project.participants.length })}
                                            </p>
                                        </div>
                                        <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                                            {project.participants.map((user) => (
                                                <li
                                                    key={user.id}
                                                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-stone-700 dark:text-elivis-ink"
                                                >
                                                    <UserAvatar
                                                        userId={user.id}
                                                        label={user.name}
                                                        avatarUrl={user.avatarUrl}
                                                        sizeClass="h-10 w-10 text-sm"
                                                        ringClass="ring-0"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <span className="font-medium text-stone-800 dark:text-elivis-ink">
                                                            {user.name}
                                                        </span>
                                                        <p className="truncate text-xs text-stone-500 dark:text-elivis-ink-secondary">
                                                            {user.userId}
                                                        </p>
                                                    </div>
                                                    <span className="shrink-0 text-xs text-stone-500 dark:text-elivis-ink-secondary">
                                                        {projectViewerRoleLabel(user.role, tp)}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="border-t border-stone-100 dark:border-elivis-line px-5 py-3">
                                            <button
                                                type="button"
                                                onClick={() => setMembersModalOpen(false)}
                                                className="w-full rounded-lg border border-stone-200 dark:border-elivis-line py-2 text-sm font-medium text-stone-700 dark:text-elivis-ink hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated"
                                            >
                                                {tp("membersModalClose")}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                    </>
                </div>
            </div>

            <ElivisDetailTabBar
                ariaLabel={tp("ariaProjectSubNav")}
                items={visibleTabs}
                activeId={activeTab}
                onSelect={(id) => setActiveTab(id as ProjectTab)}
            />

            {/* 탭별 콘텐츠 */}
            <div
                className={`min-h-0 flex-1 ${
                    activeTab === "wiki" ? "flex min-h-0 flex-col" : ""
                } ${
                    activeTab === "list" || activeTab === "calendar" || activeTab === "wiki"
                        ? ""
                        : "p-4 sm:p-5 md:p-6"
                }`}
            >
                {activeTab === "overview" && (
                    <ProjectOverviewTab
                        project={project}
                        projectTasksData={projectTasksData}
                        onSeeMoreTasks={() => setActiveTab("list")}
                    />
                )}

                {activeTab === "performance" &&
                    project.projectType === "team" &&
                    project.viewerRole === "LEADER" && (
                        <ProjectPerformanceTab
                            project={project}
                            projectTasksData={projectTasksData}
                            taskPanelActions={workspaceTaskPanelActions}
                            currentUserId={currentUserId}
                        />
                    )}

                {activeTab === "list" && (
                    <ProjectTasksTab
                        participants={project.participants}
                        projectTasksData={projectTasksData}
                        taskPanelActions={workspaceTaskPanelActions}
                        createTaskRequest={createTaskRequestAction}
                        currentUserId={currentUserId}
                        projectId={id}
                    />
                )}

                {activeTab === "calendar" && (
                    <ProjectCalendarTab
                        projectTasksData={projectTasksData}
                        taskPanelActions={workspaceTaskPanelActions}
                    />
                )}

                {activeTab === "wiki" && project.projectType === "team" && (
                    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col bg-white dark:bg-elivis-surface">
                        <ProjectWikiTab
                            projectId={id}
                            canEdit={Boolean(
                                currentUserId &&
                                    project.participants.some((p) => p.id === currentUserId),
                            )}
                            wikiAssetBaseUrl={getApiBaseUrl().replace(/\/$/, "")}
                            wikiMediaUpload={
                                currentUserId &&
                                project.participants.some((p) => p.id === currentUserId)
                                    ? (file: File) => uploadProjectWikiMediaAction(id, file)
                                    : undefined
                            }
                            listPages={() => listProjectWikiPagesAction(id)}
                            getPage={(slug: string) => getProjectWikiPageAction(id, slug)}
                            createPage={(input: {
                                slug: string;
                                title: string;
                                contentMd: string;
                            }) => createProjectWikiPageAction(id, input)}
                            updatePage={(
                                slug: string,
                                input: { title: string; contentMd: string },
                            ) => updateProjectWikiPageAction(id, slug, input)}
                            deletePage={(slug: string) =>
                                deleteProjectWikiPageAction(id, slug)
                            }
                            reorderPages={(slugs: string[]) =>
                                reorderProjectWikiPagesAction(id, slugs)
                            }
                        />
                    </div>
                )}

                {activeTab === "settings" &&
                    (project.projectType !== "team" || project.viewerRole === "LEADER") && (
                    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
                        <ElivisDetailSettingsNav
                            ariaLabel={tp("ariaSettingsSubNav")}
                            items={settingsSubTabs}
                            activeId={settingsSubTab}
                            onSelect={(id) => setSettingsSubTab(id as ProjectSettingsSubTab)}
                        />

                        <div className="min-w-0 flex-1 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm dark:border-elivis-line dark:bg-elivis-surface sm:p-7">
                            {settingsSubTab === "project" ? (
                                <ProjectSettingsProjectTab
                                    project={project}
                                    onUpdated={setProject}
                                    settingsActions={{
                                        updateProject: projectSettingsActions.updateProject,
                                        searchUsers: projectSettingsActions.searchUsers,
                                        addProjectMember: projectSettingsActions.addProjectMember,
                                    }}
                                />
                            ) : settingsSubTab === "security" ? (
                                <ProjectSettingsSecurityTab
                                    project={project}
                                    settingsActions={{
                                        deleteProject: projectSettingsActions.deleteProject,
                                    }}
                                    onAfterProjectDelete={() => router.push("/projects")}
                                />
                            ) : activityLogLoading ? (
                                <p className="text-sm text-stone-500 dark:text-elivis-ink-secondary">{tp("activity.loading")}</p>
                            ) : activityLogError ? (
                                <p className="text-sm text-red-600 dark:text-red-400">{activityLogError}</p>
                            ) : (
                                <ProjectSettingsActivityTab
                                    title={tp("activity.title")}
                                    subtitle={tp("activity.subtitle")}
                                    emptyMessage={tp("activity.empty")}
                                    rows={activityRows}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
