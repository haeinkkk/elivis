import { PrismaClient } from "@prisma/client";

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

export * from "@prisma/client";
export * from "./permissions";
export { generateProjectId, generatePublicId, generateTeamId, generateWorkspaceId } from "./id";
