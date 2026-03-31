-- AlterTable: split former `description` into short text + intro markdown
ALTER TABLE "Team" ADD COLUMN "shortDescription" TEXT;
ALTER TABLE "Team" ADD COLUMN "introMessage" TEXT;

UPDATE "Team" SET "introMessage" = "description" WHERE "description" IS NOT NULL;

ALTER TABLE "Team" DROP COLUMN "description";
