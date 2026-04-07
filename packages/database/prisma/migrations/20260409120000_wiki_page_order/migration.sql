-- AlterTable
ALTER TABLE "ProjectWikiPage" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Backfill: 홈 우선, 그다음 생성 순
UPDATE "ProjectWikiPage" AS p
SET "order" = sub.ord
FROM (
    SELECT
        id,
        (ROW_NUMBER() OVER (
            PARTITION BY "projectId"
            ORDER BY CASE WHEN slug = 'home' THEN 0 ELSE 1 END, "createdAt" ASC
        ) - 1) AS ord
    FROM "ProjectWikiPage"
) AS sub
WHERE p.id = sub.id;

-- CreateIndex
CREATE INDEX "ProjectWikiPage_projectId_order_idx" ON "ProjectWikiPage"("projectId", "order");
