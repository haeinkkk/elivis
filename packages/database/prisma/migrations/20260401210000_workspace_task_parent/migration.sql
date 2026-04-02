-- AlterTable: WorkspaceTask에 parentId 컬럼 추가
ALTER TABLE "WorkspaceTask" ADD COLUMN "parentId" TEXT;

-- CreateIndex
CREATE INDEX "WorkspaceTask_parentId_idx" ON "WorkspaceTask"("parentId");

-- AddForeignKey
ALTER TABLE "WorkspaceTask" ADD CONSTRAINT "WorkspaceTask_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WorkspaceTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
