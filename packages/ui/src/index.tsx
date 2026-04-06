export { Button } from "./Button";
export { NotificationTypeIcon } from "./NotificationTypeIcon";
export type { NotificationTypeIconProps, NotificationTypeIconSize } from "./NotificationTypeIcon";

export { MarkdownContent } from "./MarkdownContent";
export { TopLoadingBar } from "./TopLoadingBar";
export { UserAvatar, getAvatarColor, getInitials, toAvatarSrc } from "./UserAvatar";

export { StatusDropdown, STATUS_STYLE, STATUS_ORDER } from "./StatusDropdown";
export { LanguageSelector } from "./LanguageSelector";
export { ProjectFavoriteButton } from "./ProjectFavoriteButton";
export { TeamFavoriteButton } from "./TeamFavoriteButton";
export { WorkspaceSidebarLabelModal } from "./WorkspaceSidebarLabelModal";

export { AppHeader } from "./AppHeader";
export { AppSidebar, type SidebarSize } from "./AppSidebar";
export { AdminHeader } from "./AdminHeader";
export { AdminSidebar, type AdminSidebarSize } from "./AdminSidebar";

export { NotificationContext, useNotificationContext } from "./context/NotificationContext";
export { UserStatusProvider, useUserStatus } from "./context/UserStatusContext";

export {
    useNotifications,
    requestDesktopNotificationPermission,
    type NotificationItem,
    type UseNotificationsOptions,
} from "./hooks/useNotifications";
export { useNotificationCopy } from "./hooks/useNotificationCopy";

export {
    NotificationPanel,
    NotificationBellButton,
} from "./notifications/NotificationPanel";
export { NotificationBell } from "./notifications/NotificationBell";
export {
    NotificationToastStack,
    useNotificationToastQueue,
    type ToastEntry,
} from "./notifications/NotificationToast";

export { DocxUploader } from "./DocxUploader";
export { DocxAnalysisView } from "./DocxAnalysisView";

export type { UserStatus } from "./types/user-status";
export type { UserProfile } from "./types/user-profile";
export type {
    SidebarWorkspaceListItem,
    SidebarTeamFavoriteItem,
    SidebarProjectFavoriteItem,
} from "./types/app-sidebar";
export type { WorkspaceSidebarLabelTarget } from "./types/workspace-sidebar-label";

export { getApiBaseUrl, apiUrl } from "./utils/api-base-url";
export * from "./utils/team-intro-layout";
export { htmlToMarkdown, markdownToHtml } from "./utils/team-intro-markdown";
export { getNotificationDeepLink } from "./utils/notification-links";
export { workspaceDisplayName } from "./utils/workspace-display-name";
export { formatFileSize, isDocxFile, DOCX_EXT } from "./utils/docx";
export { formatXml } from "./utils/xml-format";
export { extractDocumentXmlFromDocx } from "./utils/extract-docx-xml";

export { TAG_COLORS, COLOR_KEYS, tagColorOf } from "./utils/tag-colors";
export type { TagColorResult } from "./utils/tag-colors";
export { formatTaskTitleForList, TASK_TITLE_LIST_MAX_LEN } from "./utils/task-title-display";

export type {
    ApiWorkspaceTask,
    ApiWorkspaceStatus,
    ApiWorkspacePriority,
    ApiWorkspaceTaskComment,
    ApiWorkspaceTaskNote,
    ApiWorkspaceTaskAttachment,
    ApiTaskUser,
    ApiProjectTasksItem,
    ApiTaskRequest,
    ApiTaskRequestStatus,
} from "./types/workspace-api";
export type {
    WorkspaceDetailMyWorkMutations,
    WorkspaceTaskRequestsActions,
} from "./types/workspace-detail-mutations";
export type { WorkspaceTab, MyWorkView, SortBy, SummarySubTab } from "./workspace-detail/types";
export { MyWorkTab } from "./workspace-detail/MyWorkTab";
export { SummaryTab } from "./workspace-detail/SummaryTab";
export { RequestsTab } from "./workspace-detail/RequestsTab";
export type { WorkspaceTaskDetailActions } from "./types/workspace-task-detail-actions";
export type { CreateWorkspaceTaskFn } from "./types/workspace-calendar-actions";

export type {
    Project,
    ProjectUser,
    ProjectViewerRole,
    ProjectTeam,
    ProjectType,
} from "./types/project-ui";
export type { SearchableUserForProject } from "./types/project-user-search";
export type { ProjectSettingsActions } from "./types/project-settings-actions";
export type { CreateProjectTaskRequestFn } from "./types/project-task-request-action";

export type { TeamDetail, TeamMemberRow, TeamProjectRow } from "./types/team-detail";
export type {
    ApiTeamPost,
    ApiTeamPostAttachment,
    ApiTeamPostAuthor,
    ApiTeamPostComment,
} from "./types/team-posts-api";
export type { TeamCommunityPostsActions } from "./types/team-community-posts-actions";
export type { SearchableUserForTeamInvite, TeamMemberInviteActions } from "./types/team-member-invite-actions";
export type {
    TeamBannerActions,
    TeamBannerMutationResult,
    UpdateTeamFieldsFn,
    UpdateTeamFieldsPayload,
    UpdateTeamFieldsResult,
} from "./types/team-fields-actions";

export { ProjectTasksTab } from "./project/ProjectTasksTab";
export { default as ProjectCalendarTab } from "./project/ProjectCalendarTab";
export { ProjectAddMemberModal } from "./project/ProjectAddMemberModal";
export { TaskRequestModal } from "./project/TaskRequestModal";
export {
    ProjectSettingsProjectTab,
    ProjectSettingsSecurityTab,
} from "./project/ProjectSettingsPanels";
export {
    ProjectDonutChart,
    ProjectOverviewTab,
    ProjectParticipantAvatarStack,
    ProjectPerformanceTab,
    projectDetailRoleLabelKo,
} from "./project/project-detail";
export type {
    ProjectDetailModel,
    ProjectDetailParticipant,
    ProjectDetailTeam,
    ProjectDetailViewerRole,
} from "./types/project-detail";

export { StatusModal } from "./workspace/StatusModal";
export type { StatusModalValue } from "./workspace/StatusModal";
export { default as WorkspaceCalendarTab } from "./workspace/CalendarTab";
export { default as WorkspaceTaskDetailPanel } from "./workspace/TaskDetailPanel";

export { TeamAddMemberModal } from "./team/TeamAddMemberModal";
export { TeamCommunityTab, type PostCategory } from "./team/TeamCommunityTab";
export {
    TeamDetailAvatarStack,
    TeamPublicDetailView,
    TeamSecuritySection,
    TeamActivityLogSection,
    truncateTeamText,
    displayTeamMemberName,
    formatTeamDateIso,
    teamMemberRoleKey,
    type TeamDeleteFn,
} from "./team/team-detail";
export { TeamDetailLoadError } from "./team/TeamDetailLoadError";
export { TeamIntroBannerBlock } from "./team/TeamIntroBannerBlock";
export { TeamIntroEditModal } from "./team/TeamIntroEditModal";
export {
    TeamIntroPageContent,
    type TeamIntroPageContentHandle,
} from "./team/TeamIntroPageContent";
