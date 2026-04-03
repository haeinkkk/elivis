import type { FastifyInstance } from "fastify";

import {
    createTeamPostController,
    type CreatePostBody,
    type UpdatePostBody,
    type CreateCommentBody,
    type TeamPostParams,
    type TeamPostItemParams,
    type CommentItemParams,
} from "../controllers/teamPost.controller";
import { authenticateUser } from "../middleware/auth";

export async function teamPostRoutes(app: FastifyInstance) {
    const {
        listPosts,
        getPost,
        createPost,
        updatePost,
        deletePost,
        togglePin,
        createComment,
        deleteComment,
    } = createTeamPostController(app);

    // ── 게시글 목록 ─────────────────────────────────────────────────────────────
    app.get<{
        Params: TeamPostParams;
        Querystring: { category?: string; take?: string; skip?: string };
    }>("/teams/:teamId/posts", { preHandler: [authenticateUser] }, listPosts);

    // ── 게시글 작성 ─────────────────────────────────────────────────────────────
    app.post<{ Params: TeamPostParams; Body: CreatePostBody }>(
        "/teams/:teamId/posts",
        { preHandler: [authenticateUser] },
        createPost,
    );

    // ── 게시글 상세 ─────────────────────────────────────────────────────────────
    app.get<{ Params: TeamPostItemParams }>(
        "/teams/:teamId/posts/:postId",
        { preHandler: [authenticateUser] },
        getPost,
    );

    // ── 게시글 수정 ─────────────────────────────────────────────────────────────
    app.patch<{ Params: TeamPostItemParams; Body: UpdatePostBody }>(
        "/teams/:teamId/posts/:postId",
        { preHandler: [authenticateUser] },
        updatePost,
    );

    // ── 게시글 삭제 ─────────────────────────────────────────────────────────────
    app.delete<{ Params: TeamPostItemParams }>(
        "/teams/:teamId/posts/:postId",
        { preHandler: [authenticateUser] },
        deletePost,
    );

    // ── 고정 토글 ───────────────────────────────────────────────────────────────
    app.patch<{ Params: TeamPostItemParams }>(
        "/teams/:teamId/posts/:postId/pin",
        { preHandler: [authenticateUser] },
        togglePin,
    );

    // ── 댓글 작성 ───────────────────────────────────────────────────────────────
    app.post<{ Params: TeamPostItemParams; Body: CreateCommentBody }>(
        "/teams/:teamId/posts/:postId/comments",
        { preHandler: [authenticateUser] },
        createComment,
    );

    // ── 댓글 삭제 ───────────────────────────────────────────────────────────────
    app.delete<{ Params: CommentItemParams }>(
        "/teams/:teamId/posts/:postId/comments/:commentId",
        { preHandler: [authenticateUser] },
        deleteComment,
    );
}
