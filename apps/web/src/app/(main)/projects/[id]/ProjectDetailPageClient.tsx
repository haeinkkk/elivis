"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";

import { addProjectFavoriteAction, removeProjectFavoriteAction } from "@/app/actions/projects";
import { createTaskRequestAction } from "@/app/actions/taskRequests";
import type { Project } from "@/lib/types/project";
import { projectSettingsActions } from "@/lib/ui/project-settings-actions";
import { workspaceTaskPanelActions } from "@/lib/ui/workspace-task-panel-actions";
import {
    MarkdownContent,
    ProjectCalendarTab,
    ProjectFavoriteButton,
    ProjectOverviewTab,
    ProjectParticipantAvatarStack,
    ProjectPerformanceTab,
    ProjectSettingsProjectTab,
    ProjectSettingsSecurityTab,
    ProjectTasksTab,
    UserAvatar,
    type ApiProjectTasksItem,
} from "@repo/ui";

type ProjectTab = "overview" | "list" | "calendar" | "wiki" | "performance" | "settings";

/** 팀 상세(Settings)와 동일: 모바일 가로 스크롤 / lg 세로 사이드바 */
type ProjectSettingsSubTab = "project" | "security";

const PROJECT_SETTINGS_ICONS: Record<ProjectSettingsSubTab, string> = {
    project:
        "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z",
    security:
        "M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z",
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

    const mainTabs = useMemo(
        () =>
            [
                { id: "overview" as const, label: tp("tabs.overview") },
                { id: "list" as const, label: tp("tabs.list") },
                { id: "calendar" as const, label: tp("tabs.calendar") },
                { id: "wiki" as const, label: tp("tabs.wiki") },
                { id: "performance" as const, label: tp("tabs.performance") },
                { id: "settings" as const, label: tp("tabs.settings") },
            ] satisfies { id: ProjectTab; label: string }[],
        [tp],
    );

    const visibleTabs = useMemo(() => {
        if (project.projectType === "team" && project.viewerRole !== "LEADER") {
            return mainTabs.filter((t) => t.id !== "performance" && t.id !== "settings");
        }
        return mainTabs;
    }, [project, mainTabs]);

    const settingsSubTabs = useMemo(
        () =>
            (["project", "security"] as const).map((sid) => ({
                id: sid,
                label: tp(`settingsSub.${sid}`),
                icon: PROJECT_SETTINGS_ICONS[sid],
            })),
        [tp],
    );

    useEffect(() => {
        if (project.projectType === "team" && project.viewerRole !== "LEADER") {
            if (activeTab === "performance" || activeTab === "settings") {
                setActiveTab("overview");
            }
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
                <p className="text-stone-500">{tp("noProjectId")}</p>
            </div>
        );
    }

    return (
        <div className="flex min-h-full w-full flex-col">
            {/* 상단: 뒤로가기 + 프로젝트명 + 멤버 아바타 스택 */}
            <div className="border-b border-stone-200 bg-white px-4 py-3 sm:px-5 md:px-6">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.push("/projects")}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
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
                            <h1 className="truncate text-lg font-semibold text-stone-800 sm:text-xl">
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
                        <p className="truncate text-xs text-stone-500 sm:text-sm">
                            {project.description || tp("defaultDescription")}
                        </p>
                    </div>
                    <>
                            <button
                                type="button"
                                onClick={() => setMembersModalOpen(true)}
                                className="relative shrink-0 flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 pl-3 text-left transition-colors hover:bg-stone-100"
                                aria-haspopup="dialog"
                                aria-expanded={membersModalOpen}
                            >
                                <span className="whitespace-nowrap text-sm font-medium text-stone-600">
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
                                        className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(80vh,520px)] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-stone-200 bg-white shadow-xl"
                                        role="dialog"
                                        aria-modal
                                        aria-labelledby="project-members-modal-title"
                                    >
                                        <div className="border-b border-stone-100 px-5 py-4">
                                            <h2
                                                id="project-members-modal-title"
                                                className="text-base font-semibold text-stone-800"
                                            >
                                                {tp("membersModalTitle")}
                                            </h2>
                                            <p className="mt-0.5 text-sm text-stone-500">
                                                {tp("membersModalSubtitle", { count: project.participants.length })}
                                            </p>
                                        </div>
                                        <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                                            {project.participants.map((user) => (
                                                <li
                                                    key={user.id}
                                                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-stone-700"
                                                >
                                                    <UserAvatar
                                                        userId={user.id}
                                                        label={user.name}
                                                        avatarUrl={user.avatarUrl}
                                                        sizeClass="h-10 w-10 text-sm"
                                                        ringClass="ring-0"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <span className="font-medium text-stone-800">
                                                            {user.name}
                                                        </span>
                                                        <p className="truncate text-xs text-stone-500">
                                                            {user.userId}
                                                        </p>
                                                    </div>
                                                    <span className="shrink-0 text-xs text-stone-500">
                                                        {projectViewerRoleLabel(user.role, tp)}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="border-t border-stone-100 px-5 py-3">
                                            <button
                                                type="button"
                                                onClick={() => setMembersModalOpen(false)}
                                                className="w-full rounded-lg border border-stone-200 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
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

            {/* 서브메뉴: 대시보드, 업무, 캘린더, 위키, 실적현황·설정(팀 프로젝트는 리더만) */}
            <div className="border-b border-stone-200 bg-white/95">
                <nav
                    className="flex gap-0 overflow-x-auto px-4 sm:px-5 md:px-6"
                    aria-label={tp("ariaProjectSubNav")}
                >
                    {visibleTabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors
                sm:px-5
                ${
                    activeTab === tab.id
                        ? "border-stone-800 text-stone-800"
                        : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700"
                }
              `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* 탭별 콘텐츠 */}
            <div
                className={`min-h-0 flex-1 ${activeTab === "list" || activeTab === "calendar" ? "" : "p-4 sm:p-5 md:p-6"}`}
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

                {activeTab === "wiki" && (
                    <div className="rounded-xl border border-stone-200 bg-white p-6">
                        <h2 className="text-base font-semibold text-stone-800 sm:text-lg">
                            {tp("wikiDemoTitle")}
                        </h2>
                        <p className="mt-1 text-sm text-stone-500">{tp("wikiDemoLead")}</p>
                        <div className="mt-6 rounded-lg border border-stone-100 bg-stone-50/50 p-5 sm:p-6">
                            <MarkdownContent markdown={tp("wikiDemoMarkdown")} />
                        </div>
                        <p className="mt-4 text-xs text-stone-400">{tp("wikiDemoFootnote")}</p>
                    </div>
                )}

                {activeTab === "settings" &&
                    (project.projectType !== "team" || project.viewerRole === "LEADER") && (
                    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
                        <nav
                            className="flex shrink-0 gap-1 overflow-x-auto pb-1 lg:w-44 lg:flex-col lg:overflow-x-visible lg:pb-0"
                            aria-label={tp("ariaSettingsSubNav")}
                        >
                            {settingsSubTabs.map(({ id, label, icon }) => {
                                const isActive = settingsSubTab === id;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setSettingsSubTab(id)}
                                        className={[
                                            "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                            "whitespace-nowrap lg:w-full",
                                            isActive
                                                ? "bg-stone-200 text-stone-900"
                                                : "text-stone-500 hover:bg-stone-50 hover:text-stone-700",
                                        ].join(" ")}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={1.5}
                                            stroke="currentColor"
                                            className="h-4 w-4 shrink-0"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d={icon}
                                            />
                                        </svg>
                                        {label}
                                    </button>
                                );
                            })}
                        </nav>

                        <div className="min-w-0 flex-1 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm sm:p-7">
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
                            ) : (
                                <ProjectSettingsSecurityTab
                                    project={project}
                                    settingsActions={{
                                        deleteProject: projectSettingsActions.deleteProject,
                                    }}
                                    onAfterProjectDelete={() => router.push("/projects")}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
