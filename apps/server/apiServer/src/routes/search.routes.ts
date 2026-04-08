import type { FastifyInstance } from "fastify";

import { createSearchController } from "../controllers/search.controller";
import { authenticateUser } from "../middleware/auth";

export async function searchRoutes(app: FastifyInstance) {
    const { quickSearch } = createSearchController(app);

    app.get<{ Querystring: { q?: string; take?: string } }>(
        "/search/quick",
        { preHandler: [authenticateUser] },
        quickSearch,
    );
}
