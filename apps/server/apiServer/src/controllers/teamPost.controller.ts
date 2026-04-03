import { generatePublicId } from "@repo/database";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { badRequest, created, forbidden, notFound, ok } from "../utils/response";

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

export interface TeamPostParams {
    teamId: string;
}
export interface TeamPostItemParams {
    teamId: string;
    postId: string;
}
export interface CommentItemParams {
    teamId: string;
    postId: string;
    commentId: string;
}

export interface AttachmentInput {
    url: string;
    name: string;
    mimeType: string;
    size: number;
}

export interface CreatePostBody {
    title: string;
    content: string;
    category?: string;
    attachments?: AttachmentInput[];
}
export interface UpdatePostBody {
    title?: string;
    content?: string;
    category?: string;
    /** 새 첨부파일 목록 (기존 목록을 이 목록으로 교체) */
    attachments?: AttachmentInput[];
}
export interface CreateCommentBody {
    content: string;
    parentId?: string;
}

const VALID_CATEGORIES = ["general", "notice", "discussion", "share"] as const;

const AUTHOR_SELECT = {
    id: true,
    name: true,
    email: true,
    avatarUrl: true,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 유틸: 팀 멤버 확인
// ─────────────────────────────────────────────────────────────────────────────

async function getTeamMembership(
    app: FastifyInstance,
    teamId: string,
    userId: string,
) {
    return app.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId } },
        select: { role: true },
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 컨트롤러 팩토리
// ─────────────────────────────────────────────────────────────────────────────

export function createTeamPostController(app: FastifyInstance) {
    // ── 게시글 목록 ────────────────────────────────────────────────────────────
    async function listPosts(
        request: FastifyRequest<{
            Params: TeamPostParams;
            Querystring: { category?: string; take?: string; skip?: string };
        }>,
        reply: FastifyReply,
    ) {
        const { teamId } = request.params;
        const { category, take = "20", skip = "0" } = request.query;
        const userId = request.userId;

        const membership = await getTeamMembership(app, teamId, userId);
        if (!membership) return reply.code(403).send(forbidden("팀 멤버만 접근할 수 있습니다."));

        const where = {
            teamId,
            ...(category && VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])
                ? { category }
                : {}),
        };

        const [posts, total] = await Promise.all([
            app.prisma.teamPost.findMany({
                where,
                include: {
                    author: { select: AUTHOR_SELECT },
                    _count: { select: { comments: true } },
                },
                orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
                take: Math.min(Number(take) || 20, 50),
                skip: Number(skip) || 0,
            }),
            app.prisma.teamPost.count({ where }),
        ]);

        return reply.send(ok({ posts, total }, "ok"));
    }

    // ── 게시글 상세 (댓글 포함) ────────────────────────────────────────────────
    async function getPost(
        request: FastifyRequest<{ Params: TeamPostItemParams }>,
        reply: FastifyReply,
    ) {
        const { teamId, postId } = request.params;
        const userId = request.userId;

        const membership = await getTeamMembership(app, teamId, userId);
        if (!membership) return reply.code(403).send(forbidden("팀 멤버만 접근할 수 있습니다."));

        const post = await app.prisma.teamPost.findUnique({
            where: { id: postId },
            include: {
                author: { select: AUTHOR_SELECT },
                attachments: { orderBy: { createdAt: "asc" } },
                // 모든 댓글을 flat으로 조회 — 클라이언트에서 트리 구성
                comments: {
                    include: { author: { select: AUTHOR_SELECT } },
                    orderBy: { createdAt: "asc" },
                },
            },
        });

        if (!post || post.teamId !== teamId) {
            return reply.code(404).send(notFound("게시글을 찾을 수 없습니다."));
        }

        return reply.send(ok(post, "ok"));
    }

    // ── 게시글 작성 ────────────────────────────────────────────────────────────
    async function createPost(
        request: FastifyRequest<{ Params: TeamPostParams; Body: CreatePostBody }>,
        reply: FastifyReply,
    ) {
        const { teamId } = request.params;
        const { title, content, category = "general", attachments = [] } = request.body;
        const userId = request.userId;

        if (!title?.trim() || !content?.trim()) {
            return reply.code(400).send(badRequest("제목과 내용은 필수입니다."));
        }
        if (!VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
            return reply.code(400).send(badRequest("유효하지 않은 카테고리입니다."));
        }

        const membership = await getTeamMembership(app, teamId, userId);
        if (!membership) return reply.code(403).send(forbidden("팀 멤버만 게시글을 작성할 수 있습니다."));

        const postId = generatePublicId();
        const post = await app.prisma.teamPost.create({
            data: {
                id: postId,
                teamId,
                authorId: userId,
                title: title.trim(),
                content: content.trim(),
                category,
                attachments: {
                    create: attachments.map((a) => ({
                        id: generatePublicId(),
                        url: a.url,
                        name: a.name,
                        mimeType: a.mimeType,
                        size: a.size,
                    })),
                },
            },
            include: {
                author: { select: AUTHOR_SELECT },
                attachments: { orderBy: { createdAt: "asc" } },
                _count: { select: { comments: true } },
            },
        });

        return reply.code(201).send(created({ post }, "게시글이 작성되었습니다."));
    }

    // ── 게시글 수정 ────────────────────────────────────────────────────────────
    async function updatePost(
        request: FastifyRequest<{ Params: TeamPostItemParams; Body: UpdatePostBody }>,
        reply: FastifyReply,
    ) {
        const { teamId, postId } = request.params;
        const { title, content, category, attachments } = request.body;
        const userId = request.userId;

        const [membership, post] = await Promise.all([
            getTeamMembership(app, teamId, userId),
            app.prisma.teamPost.findUnique({ where: { id: postId }, select: { id: true, teamId: true, authorId: true } }),
        ]);

        if (!membership) return reply.code(403).send(forbidden("팀 멤버만 접근할 수 있습니다."));
        if (!post || post.teamId !== teamId) return reply.code(404).send(notFound("게시글을 찾을 수 없습니다."));

        if (post.authorId !== userId && membership.role !== "LEADER") {
            return reply.code(403).send(forbidden("작성자 또는 팀장만 수정할 수 있습니다."));
        }
        if (category && !VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
            return reply.code(400).send(badRequest("유효하지 않은 카테고리입니다."));
        }

        // 첨부파일 교체: 기존 삭제 후 새로 생성
        if (attachments !== undefined) {
            await app.prisma.teamPostAttachment.deleteMany({ where: { postId } });
        }

        const updated = await app.prisma.teamPost.update({
            where: { id: postId },
            data: {
                ...(title?.trim() ? { title: title.trim() } : {}),
                ...(content?.trim() ? { content: content.trim() } : {}),
                ...(category ? { category } : {}),
                ...(attachments !== undefined
                    ? {
                          attachments: {
                              create: attachments.map((a) => ({
                                  id: generatePublicId(),
                                  url: a.url,
                                  name: a.name,
                                  mimeType: a.mimeType,
                                  size: a.size,
                              })),
                          },
                      }
                    : {}),
            },
            include: {
                author: { select: AUTHOR_SELECT },
                attachments: { orderBy: { createdAt: "asc" } },
                _count: { select: { comments: true } },
            },
        });

        return reply.send(ok({ post: updated }, "수정되었습니다."));
    }

    // ── 게시글 삭제 ────────────────────────────────────────────────────────────
    async function deletePost(
        request: FastifyRequest<{ Params: TeamPostItemParams }>,
        reply: FastifyReply,
    ) {
        const { teamId, postId } = request.params;
        const userId = request.userId;

        const [membership, post] = await Promise.all([
            getTeamMembership(app, teamId, userId),
            app.prisma.teamPost.findUnique({ where: { id: postId }, select: { id: true, teamId: true, authorId: true } }),
        ]);

        if (!membership) return reply.code(403).send(forbidden("팀 멤버만 접근할 수 있습니다."));
        if (!post || post.teamId !== teamId) return reply.code(404).send(notFound("게시글을 찾을 수 없습니다."));

        if (post.authorId !== userId && membership.role !== "LEADER") {
            return reply.code(403).send(forbidden("작성자 또는 팀장만 삭제할 수 있습니다."));
        }

        await app.prisma.teamPost.delete({ where: { id: postId } });
        return reply.send(ok({ id: postId }, "삭제되었습니다."));
    }

    // ── 고정 토글 (팀장 전용) ──────────────────────────────────────────────────
    async function togglePin(
        request: FastifyRequest<{ Params: TeamPostItemParams }>,
        reply: FastifyReply,
    ) {
        const { teamId, postId } = request.params;
        const userId = request.userId;

        const membership = await getTeamMembership(app, teamId, userId);
        if (!membership || membership.role !== "LEADER") {
            return reply.code(403).send(forbidden("팀장만 고정할 수 있습니다."));
        }

        const post = await app.prisma.teamPost.findUnique({
            where: { id: postId },
            select: { id: true, teamId: true, isPinned: true },
        });
        if (!post || post.teamId !== teamId) return reply.code(404).send(notFound("게시글을 찾을 수 없습니다."));

        const updated = await app.prisma.teamPost.update({
            where: { id: postId },
            data: { isPinned: !post.isPinned },
            include: {
                author: { select: AUTHOR_SELECT },
                _count: { select: { comments: true } },
            },
        });

        return reply.send(ok({ post: updated }, "ok"));
    }

    // ── 댓글 작성 ──────────────────────────────────────────────────────────────
    async function createComment(
        request: FastifyRequest<{ Params: TeamPostItemParams; Body: CreateCommentBody }>,
        reply: FastifyReply,
    ) {
        const { teamId, postId } = request.params;
        const { content, parentId } = request.body;
        const userId = request.userId;

        if (!content?.trim()) {
            return reply.code(400).send(badRequest("댓글 내용은 필수입니다."));
        }

        const [membership, post] = await Promise.all([
            getTeamMembership(app, teamId, userId),
            app.prisma.teamPost.findUnique({ where: { id: postId }, select: { id: true, teamId: true } }),
        ]);

        if (!membership) return reply.code(403).send(forbidden("팀 멤버만 댓글을 작성할 수 있습니다."));
        if (!post || post.teamId !== teamId) return reply.code(404).send(notFound("게시글을 찾을 수 없습니다."));

        // parentId가 있으면 해당 댓글이 같은 게시글 소속인지만 확인 (깊이 제한 없음)
        if (parentId) {
            const parent = await app.prisma.teamPostComment.findUnique({
                where: { id: parentId },
                select: { postId: true },
            });
            if (!parent || parent.postId !== postId) {
                return reply.code(400).send(badRequest("유효하지 않은 부모 댓글입니다."));
            }
        }

        const comment = await app.prisma.teamPostComment.create({
            data: {
                id: generatePublicId(),
                postId,
                authorId: userId,
                parentId: parentId ?? null,
                content: content.trim(),
            },
            include: { author: { select: AUTHOR_SELECT } },
        });

        return reply.code(201).send(created({ comment }, "댓글이 작성되었습니다."));
    }

    // ── 댓글 삭제 ──────────────────────────────────────────────────────────────
    async function deleteComment(
        request: FastifyRequest<{ Params: CommentItemParams }>,
        reply: FastifyReply,
    ) {
        const { teamId, postId, commentId } = request.params;
        const userId = request.userId;

        const [membership, comment] = await Promise.all([
            getTeamMembership(app, teamId, userId),
            app.prisma.teamPostComment.findUnique({
                where: { id: commentId },
                select: { id: true, postId: true, authorId: true },
            }),
        ]);

        if (!membership) return reply.code(403).send(forbidden("팀 멤버만 접근할 수 있습니다."));
        if (!comment || comment.postId !== postId) return reply.code(404).send(notFound("댓글을 찾을 수 없습니다."));

        if (comment.authorId !== userId && membership.role !== "LEADER") {
            return reply.code(403).send(forbidden("작성자 또는 팀장만 댓글을 삭제할 수 있습니다."));
        }

        await app.prisma.teamPostComment.delete({ where: { id: commentId } });
        return reply.send(ok({ id: commentId }, "삭제되었습니다."));
    }

    return {
        listPosts,
        getPost,
        createPost,
        updatePost,
        deletePost,
        togglePin,
        createComment,
        deleteComment,
    };
}
