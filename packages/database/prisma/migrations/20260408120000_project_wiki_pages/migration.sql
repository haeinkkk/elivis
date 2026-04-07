-- CreateTable
CREATE TABLE "ProjectWikiPage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentMd" TEXT NOT NULL DEFAULT '',
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectWikiPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectWikiPage_projectId_slug_key" ON "ProjectWikiPage"("projectId", "slug");

-- CreateIndex
CREATE INDEX "ProjectWikiPage_projectId_idx" ON "ProjectWikiPage"("projectId");

-- CreateIndex
CREATE INDEX "ProjectWikiPage_updatedById_idx" ON "ProjectWikiPage"("updatedById");

-- AddForeignKey
ALTER TABLE "ProjectWikiPage" ADD CONSTRAINT "ProjectWikiPage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectWikiPage" ADD CONSTRAINT "ProjectWikiPage_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrate legacy single-page wiki (if present)
INSERT INTO "ProjectWikiPage" ("id", "projectId", "slug", "title", "contentMd", "updatedById", "createdAt", "updatedAt")
SELECT "id", "projectId", 'home', '홈', "contentMd", "updatedById", "createdAt", "updatedAt"
FROM "ProjectWiki"
ON CONFLICT ("projectId", "slug") DO NOTHING;

-- DropTable
DROP TABLE IF EXISTS "ProjectWiki";
