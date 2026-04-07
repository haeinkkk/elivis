import type { FastifyInstance } from "fastify";

import { createProjectController } from "../controllers/project.controller";
import { createProjectsController } from "../controllers/projects.controller";
import { createProjectFavoriteController } from "../controllers/projectFavorite.controller";
import type {
    AddMemberBody,
    CreateProjectBody,
    DeleteProjectBody,
    ProjectParams,
    ProjectWikiCreateBody,
    ProjectWikiReorderBody,
    ProjectWikiUpdateBody,
    UpdateProjectBody,
    WikiPageParams,
} from "../controllers/project.controller";
import type { GetProjectsQuery } from "../controllers/projects.controller";
import { authenticateProjectManager, authenticateUser } from "../middleware/auth";

export async function projectRoutes(app: FastifyInstance) {
    const {
        createProject,
        getProject,
        updateProject,
        deleteProject,
        addMember,
        getProjectActivity,
        getProjectTasks,
        listProjectWikiPages,
        getProjectWikiPage,
        createProjectWikiPage,
        patchProjectWikiPage,
        deleteProjectWikiPage,
        reorderProjectWikiPages,
        uploadProjectWikiMedia,
    } = createProjectController(app);
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

    app.get<{ Params: ProjectParams }>(
        "/projects/:projectId/activity",
        { preHandler: [authenticateUser] },
        getProjectActivity,
    );

    app.get<{ Params: ProjectParams }>(
        "/projects/:projectId/tasks",
        { preHandler: [authenticateUser] },
        getProjectTasks,
    );

    app.post<{ Params: ProjectParams }>(
        "/projects/:projectId/wiki/media",
        { preHandler: [authenticateUser] },
        uploadProjectWikiMedia,
    );

    app.get<{ Params: ProjectParams }>(
        "/projects/:projectId/wiki/pages",
        { preHandler: [authenticateUser] },
        listProjectWikiPages,
    );

    app.get<{ Params: WikiPageParams }>(
        "/projects/:projectId/wiki/pages/:wikiSlug",
        { preHandler: [authenticateUser] },
        getProjectWikiPage,
    );

    app.post<{ Params: ProjectParams; Body: ProjectWikiCreateBody }>(
        "/projects/:projectId/wiki/pages",
        { preHandler: [authenticateUser] },
        createProjectWikiPage,
    );

    app.patch<{ Params: ProjectParams; Body: ProjectWikiReorderBody }>(
        "/projects/:projectId/wiki/pages/reorder",
        { preHandler: [authenticateUser] },
        reorderProjectWikiPages,
    );

    app.patch<{ Params: WikiPageParams; Body: ProjectWikiUpdateBody }>(
        "/projects/:projectId/wiki/pages/:wikiSlug",
        { preHandler: [authenticateUser] },
        patchProjectWikiPage,
    );

    app.delete<{ Params: WikiPageParams }>(
        "/projects/:projectId/wiki/pages/:wikiSlug",
        { preHandler: [authenticateUser] },
        deleteProjectWikiPage,
    );

    // ── 즐겨찾기 ────────────────────────────────────────────────────────────
    const { listFavorites, addFavorite, removeFavorite, checkFavorite } =
        createProjectFavoriteController(app);

    app.get("/projects/favorites", { preHandler: [authenticateUser] }, listFavorites);

    app.get<{ Params: { projectId: string } }>(
        "/projects/:projectId/favorite/status",
        { preHandler: [authenticateUser] },
        checkFavorite,
    );

    app.post<{ Params: { projectId: string } }>(
        "/projects/:projectId/favorite",
        { preHandler: [authenticateUser] },
        addFavorite,
    );

    app.delete<{ Params: { projectId: string } }>(
        "/projects/:projectId/favorite",
        { preHandler: [authenticateUser] },
        removeFavorite,
    );
}
