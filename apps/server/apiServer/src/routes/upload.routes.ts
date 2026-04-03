import type { FastifyInstance } from "fastify";

import { uploadController } from "../controllers/upload.controller";
import { authenticateUser } from "../middleware/auth";

export async function uploadRoutes(app: FastifyInstance) {
    const { uploadFile } = uploadController(app);

    app.post("/upload", { preHandler: [authenticateUser] }, uploadFile);
}
