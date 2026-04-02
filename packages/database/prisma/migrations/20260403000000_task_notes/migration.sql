-- CreateTable: 업무 노트 (리치 텍스트, 여러 개 작성 가능)
CREATE TABLE "WorkspaceTaskNote" (
    "id"        TEXT         NOT NULL,
    "taskId"    TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "content"   TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceTaskNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceTaskNote_taskId_idx" ON "WorkspaceTaskNote"("taskId");
CREATE INDEX "WorkspaceTaskNote_userId_idx" ON "WorkspaceTaskNote"("userId");

-- AddForeignKey
ALTER TABLE "WorkspaceTaskNote" ADD CONSTRAINT "WorkspaceTaskNote_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "WorkspaceTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceTaskNote" ADD CONSTRAINT "WorkspaceTaskNote_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
