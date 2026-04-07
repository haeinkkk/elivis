-- AlterTable
ALTER TABLE "User" ADD COLUMN "accessBlocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "accessBlockReason" TEXT;
ALTER TABLE "User" ADD COLUMN "accessBlockedAt" TIMESTAMP(3);
