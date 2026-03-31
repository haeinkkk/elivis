-- AlterTable: 프로젝트에 소속 팀(선택)
ALTER TABLE "Project" ADD COLUMN "teamId" TEXT;

-- CreateIndex
CREATE INDEX "Project_teamId_idx" ON "Project"("teamId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
