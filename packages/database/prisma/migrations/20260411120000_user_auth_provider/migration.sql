-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'LDAP');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "authProvider" "AuthProvider" NOT NULL DEFAULT 'LOCAL';
