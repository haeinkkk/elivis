import type { FastifyInstance } from "fastify";

import { createAuthController } from "../controllers/auth.controller";
import type { LoginBody, RefreshBody, SignupBody } from "../controllers/auth.controller";
import { authenticateUser } from "../middleware/auth";

export async function authRoutes(app: FastifyInstance) {
    const { getAuthConfig, signup, login, refresh, logout, logoutAll } = createAuthController(app);

    // 인증 불필요
    app.get("/auth/config", getAuthConfig);
    app.post<{ Body: SignupBody }>("/auth/signup", signup);
    app.post<{ Body: LoginBody }>("/auth/login", login);
    app.post<{ Body: RefreshBody }>("/auth/refresh", refresh);
    app.post<{ Body: RefreshBody }>("/auth/logout", logout);

    // 인증 필요
    app.post("/auth/logout/all", { preHandler: [authenticateUser] }, logoutAll);
}
