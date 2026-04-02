import { prisma } from "@repo/database";
import fp from "fastify-plugin";

declare module "fastify" {
    interface FastifyInstance {
        prisma: typeof prisma;
    }
}

export const prismaPlugin = fp(
    async (fastify) => {
        fastify.decorate("prisma", prisma);

        try {
            await prisma.$connect();
            fastify.log.info("Database connection established");
        } catch (err) {
            fastify.log.error({ err }, "Database connection failed at startup");
            throw err;
        }

        fastify.addHook("onClose", async () => {
            await prisma.$disconnect();
        });
    },
    { name: "prisma" },
);
