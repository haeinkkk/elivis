-- AlterTable
ALTER TABLE "AuthSettings" ADD COLUMN     "ldapEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AuthSettings" ADD COLUMN     "ldapUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AuthSettings" ADD COLUMN     "ldapUserDnTemplate" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AuthSettings" ADD COLUMN     "ldapBindDn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AuthSettings" ADD COLUMN     "ldapBindPassword" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AuthSettings" ADD COLUMN     "ldapSearchBase" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AuthSettings" ADD COLUMN     "ldapSearchFilter" TEXT NOT NULL DEFAULT '(mail={{email}})';
ALTER TABLE "AuthSettings" ADD COLUMN     "ldapNameAttribute" TEXT NOT NULL DEFAULT 'cn';
ALTER TABLE "AuthSettings" ADD COLUMN     "ldapTimeoutMs" INTEGER NOT NULL DEFAULT 15000;
