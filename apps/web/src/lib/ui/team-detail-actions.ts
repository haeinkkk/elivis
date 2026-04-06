import {
    addTeamMemberAction,
    deleteTeamBannerAction,
    searchUsersForTeamAction,
    uploadTeamBannerAction,
} from "@/app/actions/teams";
import {
    createTeamPostAction,
    createTeamPostCommentAction,
    deleteTeamPostAction,
    deleteTeamPostCommentAction,
    getTeamPostAction,
    listTeamPostsAction,
    toggleTeamPostPinAction,
    updateTeamPostAction,
    uploadTeamPostFileAction,
} from "@/app/actions/teamPosts";
import type { TeamBannerActions } from "@repo/ui";
import type { TeamCommunityPostsActions } from "@repo/ui";
import type { TeamMemberInviteActions } from "@repo/ui";

export const teamBannerActionsForUi: TeamBannerActions = {
    uploadTeamBanner: uploadTeamBannerAction,
    deleteTeamBanner: deleteTeamBannerAction,
};

export const teamInviteActionsForUi: TeamMemberInviteActions = {
    searchUsersForTeam: searchUsersForTeamAction,
    addTeamMember: addTeamMemberAction,
};

export const teamCommunityPostsActionsForUi: TeamCommunityPostsActions = {
    listTeamPostsAction,
    getTeamPostAction,
    createTeamPostAction,
    updateTeamPostAction,
    deleteTeamPostAction,
    toggleTeamPostPinAction,
    createTeamPostCommentAction,
    deleteTeamPostCommentAction,
    uploadTeamPostFileAction,
};
