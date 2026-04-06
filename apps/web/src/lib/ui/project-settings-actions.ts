import {
    addProjectMemberAction,
    deleteProjectAction,
    updateProjectAction,
} from "@/app/actions/projects";
import { searchUsersForTeamAction } from "@/app/actions/teams";

/** ProjectSettingsPanels(@repo/ui)에 넘기는 서버 액션 묶음 */
export const projectSettingsActions = {
    updateProject: updateProjectAction,
    deleteProject: deleteProjectAction,
    addProjectMember: addProjectMemberAction,
    searchUsers: searchUsersForTeamAction,
};
