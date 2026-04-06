import {
    createTaskCommentAction,
    createTaskNoteAction,
    deleteTaskAttachmentAction,
    deleteTaskCommentAction,
    deleteTaskNoteAction,
    listTaskAttachmentsAction,
    listTaskCommentsAction,
    listTaskNotesAction,
    updateWorkspaceTaskAction,
    uploadTaskAttachmentAction,
} from "@/app/actions/workspaces";

/** TaskDetailPanel(@repo/ui)에 넘기는 서버 액션 묶음 */
export const workspaceTaskPanelActions = {
    updateWorkspaceTaskAction,
    listTaskCommentsAction,
    createTaskCommentAction,
    deleteTaskCommentAction,
    listTaskAttachmentsAction,
    uploadTaskAttachmentAction,
    deleteTaskAttachmentAction,
    listTaskNotesAction,
    createTaskNoteAction,
    deleteTaskNoteAction,
};
