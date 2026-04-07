import type { FastifyInstance } from "fastify";

import { createAdminController } from "../controllers/admin.controller";
import type {
    UpdateRoleBody,
    UpdateRoleParams,
    CreateUserBody,
    UserParams,
    UpdateUserBody,
} from "../controllers/admin.controller";
import {
    createAdminAuthSettingsController,
    type LdapTestBody,
    type PatchAuthSettingsBody,
} from "../controllers/admin-auth-settings.controller";
import {
    createSmtpSettingsController,
    type PatchSmtpBody,
    type TestSmtpBody,
} from "../controllers/smtp-settings.controller";
import { createSystemLogsController, type SystemLogsQuery } from "../controllers/system-logs.controller";
import { authenticateAdmin, authenticateUser } from "../middleware/auth";

export async function adminRoutes(app: FastifyInstance) {
    const { listUsers, createUser, getUser, updateUser, updateUserRole } =
        createAdminController(app);
    const { getAuthSettings, patchAuthSettings, postLdapTest } = createAdminAuthSettingsController(app);
    const { getSmtp, patchSmtp, testSmtp } = createSmtpSettingsController(app);
    const { getSystemLogs } = createSystemLogsController(app);

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

    app.get("/admin/auth-settings", guard, getAuthSettings);
    app.patch<{ Body: PatchAuthSettingsBody }>("/admin/auth-settings", guard, patchAuthSettings);
    app.post<{ Body: LdapTestBody }>("/admin/auth-settings/ldap-test", guard, postLdapTest);

    app.get("/admin/smtp", guard, getSmtp);
    app.patch<{ Body: PatchSmtpBody }>("/admin/smtp", guard, patchSmtp);
    app.post<{ Body: TestSmtpBody }>("/admin/smtp/test", guard, testSmtp);

    app.get<{ Querystring: SystemLogsQuery }>("/admin/system-logs", guard, getSystemLogs);
}
