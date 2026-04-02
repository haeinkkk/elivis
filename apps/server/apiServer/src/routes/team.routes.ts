import type { FastifyInstance } from "fastify";

import {
    createTeamController,
    type AddTeamMemberBody,
    type CreateTeamBody,
    type DeleteTeamBody,
    type DelegateLeaderBody,
    type UpdateTeamBody,
} from "../controllers/team.controller";
import { authenticateUser } from "../middleware/auth";

export async function teamRoutes(app: FastifyInstance) {
    const {
        createTeam,
        listTeams,
        updateMyTeamPins,
        getTeam,
        addTeamMember,
        removeTeamMember,
        delegateLeader,
        updateTeam,
        deleteTeam,
        uploadTeamBanner,
        deleteTeamBanner,
    } = createTeamController(app);

    // `GET /teams`는 `GET /teams/:id`보다 먼저 등록 (파라미터 라우트와 충돌 방지)
    app.get<{
        Querystring: {
            q?: string;
            take?: string;
            skip?: string;
            kind?: string;
            leaderOnly?: string;
            myRole?: string;
        };
    }>("/teams", { preHandler: [authenticateUser] }, listTeams);

    app.post<{ Body: CreateTeamBody }>("/teams", { preHandler: [authenticateUser] }, createTeam);

    app.put<{ Body: { teamIds: string[] } }>(
        "/teams/pins",
        { preHandler: [authenticateUser] },
        updateMyTeamPins,
    );

    app.get<{ Params: { id: string } }>("/teams/:id", { preHandler: [authenticateUser] }, getTeam);

    /** 팀 소개 등 수정 — PUT·PATCH 둘 다 허용 (프록시/클라이언트 호환) */
    app.put<{ Params: { id: string }; Body: UpdateTeamBody }>(
        "/teams/:id",
        { preHandler: [authenticateUser] },
        updateTeam,
    );
    app.patch<{ Params: { id: string }; Body: UpdateTeamBody }>(
        "/teams/:id",
        { preHandler: [authenticateUser] },
        updateTeam,
    );

    app.delete<{ Params: { id: string }; Body: DeleteTeamBody }>(
        "/teams/:id",
        { preHandler: [authenticateUser] },
        deleteTeam,
    );

    app.post<{ Params: { id: string } }>(
        "/teams/:id/banner",
        { preHandler: [authenticateUser] },
        uploadTeamBanner,
    );

    app.delete<{ Params: { id: string } }>(
        "/teams/:id/banner",
        { preHandler: [authenticateUser] },
        deleteTeamBanner,
    );

    app.post<{ Params: { id: string }; Body: AddTeamMemberBody }>(
        "/teams/:id/members",
        { preHandler: [authenticateUser] },
        addTeamMember,
    );

    app.delete<{ Params: { id: string; userId: string } }>(
        "/teams/:id/members/:userId",
        { preHandler: [authenticateUser] },
        removeTeamMember,
    );

    app.put<{ Params: { id: string }; Body: DelegateLeaderBody }>(
        "/teams/:id/leader",
        { preHandler: [authenticateUser] },
        delegateLeader,
    );
}
