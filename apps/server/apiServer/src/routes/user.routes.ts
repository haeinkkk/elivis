import type { FastifyInstance } from "fastify";

import { createUserController, type UpdateMeBody } from "../controllers/user.controller";
import { authenticateUser } from "../middleware/auth";

export async function userRoutes(app: FastifyInstance) {
    const { getMe, updateMe, uploadAvatar, deleteAvatar, searchUsers } = createUserController(app);

    app.get<{ Querystring: { q?: string } }>(
        "/users/search",
        { preHandler: [authenticateUser] },
        searchUsers,
    );

    app.get("/users/me", { preHandler: [authenticateUser] }, getMe);
    app.patch<{ Body: UpdateMeBody }>("/users/me", { preHandler: [authenticateUser] }, updateMe);
    app.post("/users/me/avatar", { preHandler: [authenticateUser] }, uploadAvatar);
    app.delete("/users/me/avatar", { preHandler: [authenticateUser] }, deleteAvatar);
}
