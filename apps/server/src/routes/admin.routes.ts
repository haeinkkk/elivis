import type { FastifyInstance } from "fastify";

import { createAdminController } from "../controllers/admin.controller";
import type {
    UpdateRoleBody,
    UpdateRoleParams,
    CreateUserBody,
    UserParams,
    UpdateUserBody,
} from "../controllers/admin.controller";
import { authenticateAdmin, authenticateUser } from "../middleware/auth";

export async function adminRoutes(app: FastifyInstance) {
    const { listUsers, createUser, getUser, updateUser, updateUserRole } =
        createAdminController(app);

    const guard = { preHandler: [authenticateUser, authenticateAdmin] };

    app.get("/admin/users",                                   guard, listUsers);
    app.post<{ Body: CreateUserBody }>("/admin/users",        guard, createUser);
    app.get<{ Params: UserParams }>("/admin/users/:userId",   guard, getUser);
    app.patch<{ Params: UserParams; Body: UpdateUserBody }>(
        "/admin/users/:userId",                               guard, updateUser,
    );
    app.patch<{ Params: UpdateRoleParams; Body: UpdateRoleBody }>(
        "/admin/users/:userId/role",                          guard, updateUserRole,
    );
}
