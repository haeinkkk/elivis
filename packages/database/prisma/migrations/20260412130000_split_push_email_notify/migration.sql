-- Split single notifyEnabled into push + email channels (after 20260412120000_team_project_notify_prefs)

ALTER TABLE "ProjectMember" ADD COLUMN "notifyPushEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ProjectMember" ADD COLUMN "notifyEmailEnabled" BOOLEAN NOT NULL DEFAULT true;
UPDATE "ProjectMember" SET "notifyPushEnabled" = "notifyEnabled", "notifyEmailEnabled" = "notifyEnabled";
ALTER TABLE "ProjectMember" DROP COLUMN "notifyEnabled";

ALTER TABLE "TeamMember" ADD COLUMN "notifyPushEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TeamMember" ADD COLUMN "notifyEmailEnabled" BOOLEAN NOT NULL DEFAULT true;
UPDATE "TeamMember" SET "notifyPushEnabled" = "notifyEnabled", "notifyEmailEnabled" = "notifyEnabled";
ALTER TABLE "TeamMember" DROP COLUMN "notifyEnabled";
