-- CreateTable
CREATE TABLE "AuthSettings" (
    "id" TEXT NOT NULL,
    "publicSignupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AuthSettings" ("id", "publicSignupEnabled", "updatedAt")
VALUES ('default', false, CURRENT_TIMESTAMP);
