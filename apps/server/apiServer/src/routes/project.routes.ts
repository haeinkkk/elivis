import type { FastifyInstance } from "fastify";

import { createProjectController } from "../controllers/project.controller";
import { createProjectsController } from "../controllers/projects.controller";
import type {
    AddMemberBody,
    CreateProjectBody,
    DeleteProjectBody,
    ProjectParams,
    UpdateProjectBody,
} from "../controllers/project.controller";
import type { GetProjectsQuery } from "../controllers/projects.controller";
import { authenticateProjectManager, authenticateUser } from "../middleware/auth";

export async function projectRoutes(app: FastifyInstance) {
    const { createProject, getProject, updateProject, deleteProject, addMember } =
        createProjectController(app);
    const { getProjects } = createProjectsController(app);

    app.post<{ Body: CreateProjectBody }>(
        "/projects",
        { preHandler: [authenticateUser] },
        createProject,
    );

    app.get<{ Querystring: GetProjectsQuery }>(
        "/projects",
        { preHandler: [authenticateUser] },
        getProjects,
    );

    app.get<{ Params: ProjectParams }>(
        "/projects/:projectId",
        { preHandler: [authenticateUser] },
        getProject,
    );

    app.patch<{ Params: ProjectParams; Body: UpdateProjectBody }>(
        "/projects/:projectId",
        { preHandler: [authenticateUser] },
        updateProject,
    );

    app.delete<{ Params: ProjectParams; Body: DeleteProjectBody }>(
        "/projects/:projectId",
        { preHandler: [authenticateUser] },
        deleteProject,
    );

    app.post<{ Params: ProjectParams; Body: AddMemberBody }>(
        "/projects/:projectId/members",
        { preHandler: [authenticateUser, authenticateProjectManager] },
        addMember,
    );
}
