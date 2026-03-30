import type { FastifyInstance } from "fastify";

import { createProjectController } from "../controllers/project.controller";
import type { AddMemberBody, CreateProjectBody, ProjectParams } from "../controllers/project.controller";
import {
  authenticateProjectManager,
  authenticateUser,
} from "../middleware/auth";

export async function projectRoutes(app: FastifyInstance) {
  const { createProject, getProject, addMember } = createProjectController(app);

  app.post<{ Body: CreateProjectBody }>(
    "/projects",
    { preHandler: [authenticateUser] },
    createProject,
  );

  app.get<{ Params: ProjectParams }>(
    "/projects/:projectId",
    { preHandler: [authenticateUser] },
    getProject,
  );

  app.post<{ Params: ProjectParams; Body: AddMemberBody }>(
    "/projects/:projectId/members",
    { preHandler: [authenticateUser, authenticateProjectManager] },
    addMember,
  );
}
