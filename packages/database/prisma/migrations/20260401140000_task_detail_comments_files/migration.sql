-- ============================================================
-- 업무 상세: description 컬럼 + 댓글 + 첨부파일 테이블 추가
-- ============================================================

-- WorkspaceTask 에 description 컬럼 추가
ALTER TABLE "WorkspaceTask" ADD COLUMN "description" TEXT;

-- ──────────────────────────────────────────────────────────────
-- WorkspaceTaskComment
-- ──────────────────────────────────────────────────────────────
CREATE TABLE "WorkspaceTaskComment" (
    "id"        TEXT         NOT NULL,
    "taskId"    TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "content"   TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceTaskComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkspaceTaskComment_taskId_idx" ON "WorkspaceTaskComment"("taskId");
CREATE INDEX "WorkspaceTaskComment_userId_idx" ON "WorkspaceTaskComment"("userId");

ALTER TABLE "WorkspaceTaskComment"
    ADD CONSTRAINT "WorkspaceTaskComment_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "WorkspaceTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceTaskComment"
    ADD CONSTRAINT "WorkspaceTaskComment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ──────────────────────────────────────────────────────────────
-- WorkspaceTaskAttachment
-- ──────────────────────────────────────────────────────────────
CREATE TABLE "WorkspaceTaskAttachment" (
    "id"        TEXT         NOT NULL,
    "taskId"    TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "fileName"  TEXT         NOT NULL,
    "fileSize"  INTEGER      NOT NULL,
    "mimeType"  TEXT         NOT NULL,
    "fileUrl"   TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceTaskAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkspaceTaskAttachment_taskId_idx" ON "WorkspaceTaskAttachment"("taskId");
CREATE INDEX "WorkspaceTaskAttachment_userId_idx" ON "WorkspaceTaskAttachment"("userId");

ALTER TABLE "WorkspaceTaskAttachment"
    ADD CONSTRAINT "WorkspaceTaskAttachment_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "WorkspaceTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceTaskAttachment"
    ADD CONSTRAINT "WorkspaceTaskAttachment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
