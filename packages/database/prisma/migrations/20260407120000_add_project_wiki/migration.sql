-- CreateTable
CREATE TABLE "ProjectWiki" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contentMd" TEXT NOT NULL DEFAULT '',
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectWiki_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectWiki_projectId_key" ON "ProjectWiki"("projectId");

-- CreateIndex
CREATE INDEX "ProjectWiki_updatedById_idx" ON "ProjectWiki"("updatedById");

-- AddForeignKey
ALTER TABLE "ProjectWiki" ADD CONSTRAINT "ProjectWiki_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectWiki" ADD CONSTRAINT "ProjectWiki_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
