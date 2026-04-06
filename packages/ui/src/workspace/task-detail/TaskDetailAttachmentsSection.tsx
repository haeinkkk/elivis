"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import type { ApiWorkspaceTaskAttachment } from "../../types/workspace-api";
import type { WorkspaceTaskDetailActions } from "../../types/workspace-task-detail-actions";
import {
    formatTaskDetailBytes,
    taskDetailFileIcon,
    taskDetailServerUrl,
} from "./task-detail-utils";

export function TaskDetailAttachmentsSection({
    actions,
    workspaceId,
    taskId,
    readOnly = false,
}: {
    actions: WorkspaceTaskDetailActions;
    workspaceId: string;
    taskId: string;
    readOnly?: boolean;
}) {
    const t = useTranslations("workspace");
    const [attachments, setAttachments] = useState<ApiWorkspaceTaskAttachment[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        actions.listTaskAttachmentsAction(workspaceId, taskId).then((res) => {
            if (res.ok) setAttachments(res.attachments);
            setLoading(false);
        });
    }, [actions, workspaceId, taskId]);

    async function handleFiles(files: FileList | null) {
        if (!files || files.length === 0) return;
        setUploading(true);
        for (const file of Array.from(files)) {
            const fd = new FormData();
            fd.append("file", file);
            const res = await actions.uploadTaskAttachmentAction(workspaceId, taskId, fd);
            if (res.ok) setAttachments((prev) => [...prev, res.attachment]);
        }
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
    }

    async function remove(attachmentId: string) {
        const res = await actions.deleteTaskAttachmentAction(workspaceId, taskId, attachmentId);
        if (res.ok) setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    }

    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                    {t("taskDetail.attachments")}
                </h3>
                {!readOnly && (
                    <>
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            className="flex items-center gap-1 rounded-lg border border-stone-200 px-2 py-1 text-xs text-stone-500 hover:bg-stone-50 disabled:opacity-40"
                        >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 4v16m8-8H4"
                                />
                            </svg>
                            {t("taskDetail.addFile")}
                        </button>
                        <input
                            ref={fileRef}
                            type="file"
                            multiple
                            hidden
                            onChange={(e) => handleFiles(e.target.files)}
                        />
                    </>
                )}
            </div>

            <div
                onClick={() => !readOnly && !uploading && fileRef.current?.click()}
                onDragOver={(e) => {
                    if (readOnly) return;
                    e.preventDefault();
                    setIsDragOver(true);
                }}
                onDragEnter={(e) => {
                    if (readOnly) return;
                    e.preventDefault();
                    setIsDragOver(true);
                }}
                onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (!readOnly) handleFiles(e.dataTransfer.files);
                }}
                className={`mb-3 flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-xs transition-all ${readOnly ? "cursor-default" : "cursor-pointer"} ${
                    isDragOver
                        ? "scale-[1.01] border-stone-500 bg-stone-100 text-stone-600"
                        : "border-stone-200 bg-stone-50/50 text-stone-400 hover:border-stone-300 hover:bg-stone-50"
                }`}
            >
                {uploading ? (
                    <>
                        <svg className="h-5 w-5 animate-spin text-stone-400" fill="none" viewBox="0 0 24 24">
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v8H4z"
                            />
                        </svg>
                        <span>{t("taskDetail.uploading")}</span>
                    </>
                ) : isDragOver ? (
                    <>
                        <svg
                            className="h-6 w-6 text-stone-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                        </svg>
                        <span className="font-medium">{t("taskDetail.dropHere")}</span>
                    </>
                ) : readOnly ? (
                    <span className="text-stone-300">첨부파일 보기 전용</span>
                ) : (
                    <>
                        <svg
                            className="h-5 w-5 text-stone-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                            />
                        </svg>
                        <span>{t("taskDetail.dragOrClick")}</span>
                    </>
                )}
            </div>

            {loading ? (
                <p className="text-xs text-stone-400">{t("taskDetail.commentsLoading")}</p>
            ) : attachments.length === 0 ? (
                <p className="text-xs text-stone-300">{t("taskDetail.noFiles")}</p>
            ) : (
                <ul className="space-y-1.5">
                    {attachments.map((a) => (
                        <li
                            key={a.id}
                            className="flex items-center gap-2 rounded-lg border border-stone-100 bg-white px-3 py-2"
                        >
                            <span className="text-base">{taskDetailFileIcon(a.mimeType)}</span>
                            <div className="min-w-0 flex-1">
                                <a
                                    href={taskDetailServerUrl(a.fileUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block truncate text-xs font-medium text-stone-700 hover:underline"
                                >
                                    {a.fileName}
                                </a>
                                <span className="text-[10px] text-stone-400">
                                    {formatTaskDetailBytes(a.fileSize)}
                                </span>
                            </div>
                            {!readOnly && (
                                <button
                                    type="button"
                                    onClick={() => remove(a.id)}
                                    className="shrink-0 rounded p-0.5 text-stone-300 hover:bg-red-50 hover:text-red-400"
                                >
                                    <svg
                                        className="h-3.5 w-3.5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
