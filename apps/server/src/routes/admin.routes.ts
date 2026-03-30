import type { FastifyInstance } from "fastify";

import { createAdminController } from "../controllers/admin.controller";
import type { UpdateRoleBody, UpdateRoleParams } from "../controllers/admin.controller";
import { authenticateAdmin, authenticateUser } from "../middleware/auth";

export async function adminRoutes(app: FastifyInstance) {
  const { listUsers, updateUserRole } = createAdminController(app);

  app.get(
    "/admin/users",
    { preHandler: [authenticateUser, authenticateAdmin] },
    listUsers,
  );

  app.patch<{ Params: UpdateRoleParams; Body: UpdateRoleBody }>(
    "/admin/users/:userId/role",
    { preHandler: [authenticateUser, authenticateAdmin] },
    updateUserRole,
  );
}
