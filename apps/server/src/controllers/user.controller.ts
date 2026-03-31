import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import sharp from "sharp";
import { t } from "@repo/i18n";

import { storageService } from "../index";
import { MSG } from "../utils/messages";
import { badRequest, notFound, ok } from "../utils/response";

// ─────────────────────────────────────────────────────────────────────────────
// 상수 / 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

/** 프로필 썸네일 크기 (px). 정사각형 크롭. */
const AVATAR_SIZE = 256;

/** 이미지를 WebP 썸네일로 압축합니다. */
async function compressAvatar(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
        .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "centre" })
        .webp({ quality: 80 })
        .toBuffer();
}

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

const USER_STATUSES = ["WORKING", "VACATION", "OFF_WORK", "DEEP_FOCUS"] as const;
type UserStatusValue = (typeof USER_STATUSES)[number];

export interface UpdateMeBody {
    name?: string;
    bio?: string;
    status?: UserStatusValue;
}

// ─────────────────────────────────────────────────────────────────────────────
// 컨트롤러
// ─────────────────────────────────────────────────────────────────────────────

export function createUserController(app: FastifyInstance) {
    /** Prisma select 재사용 */
    const userSelect = {
        id: true,
        email: true,
        name: true,
        bio: true,
        status: true,
        avatarUrl: true,
        systemRole: true,
        createdAt: true,
    } as const;

    // ── GET /api/users/me ──────────────────────────────────────────────────────
    async function getMe(request: FastifyRequest, reply: FastifyReply) {
        const user = await app.prisma.user.findUnique({
            where: { id: request.userId },
            select: userSelect,
        });

        if (!user) {
            return reply.code(404).send(notFound(t(request.lang, MSG.USER_NOT_FOUND)));
        }

        return reply.send(ok(user, t(request.lang, MSG.USER_PROFILE_FETCHED)));
    }

    // ── PATCH /api/users/me ────────────────────────────────────────────────────
    async function updateMe(request: FastifyRequest<{ Body: UpdateMeBody }>, reply: FastifyReply) {
        const { name, bio, status } = request.body;

        if (name !== undefined && name.trim().length === 0) {
            return reply.code(400).send(badRequest(t(request.lang, MSG.AUTH_EMAIL_REQUIRED)));
        }

        if (status !== undefined && !USER_STATUSES.includes(status)) {
            return reply.code(400).send(badRequest(t(request.lang, MSG.VALIDATION_INVALID_STATUS)));
        }

        const user = await app.prisma.user.update({
            where: { id: request.userId },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(bio !== undefined && { bio: bio.trim() || null }),
                ...(status !== undefined && { status }),
            },
            select: userSelect,
        });

        return reply.send(ok(user, t(request.lang, MSG.USER_UPDATED)));
    }

    // ── POST /api/users/me/avatar ──────────────────────────────────────────────
    async function uploadAvatar(request: FastifyRequest, reply: FastifyReply) {
        const data = await request.file();

        if (!data) {
            return reply.code(400).send(badRequest(t(request.lang, MSG.USER_AVATAR_REQUIRED)));
        }

        const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (!allowed.includes(data.mimetype)) {
            return reply.code(400).send(badRequest(t(request.lang, MSG.USER_AVATAR_INVALID)));
        }

        // 기존 아바타 URL 조회 (삭제용)
        const existing = await app.prisma.user.findUnique({
            where: { id: request.userId },
            select: { avatarUrl: true },
        });

        // ── 이미지 압축 (256×256 WebP 썸네일) ──────────────────────────────────
        const rawBuffer = await data.toBuffer();
        const compressed = await compressAvatar(rawBuffer);

        // ── 스토리지에 저장 ────────────────────────────────────────────────────
        // 키를 <userId>.webp 로 고정하면 재업로드 시 기존 파일을 덮어씁니다.
        const key = `avatars/${request.userId}.webp`;
        const url = await storageService.upload(key, compressed, "image/webp");

        // 이전 URL과 다를 때만 삭제 (예: local → s3 전환 시 고아 파일 정리)
        if (existing?.avatarUrl && existing.avatarUrl !== url) {
            await storageService.remove(existing.avatarUrl).catch(() => {
                /* 삭제 실패는 무시 — 업로드 자체는 성공 */
            });
        }

        const user = await app.prisma.user.update({
            where: { id: request.userId },
            data: { avatarUrl: url },
            select: userSelect,
        });

        return reply.send(ok(user, t(request.lang, MSG.USER_AVATAR_UPDATED)));
    }

    // ── DELETE /api/users/me/avatar ────────────────────────────────────────────
    async function deleteAvatar(request: FastifyRequest, reply: FastifyReply) {
        const existing = await app.prisma.user.findUnique({
            where: { id: request.userId },
            select: { avatarUrl: true },
        });

        if (existing?.avatarUrl) {
            await storageService.remove(existing.avatarUrl).catch(() => {});
        }

        const user = await app.prisma.user.update({
            where: { id: request.userId },
            data: { avatarUrl: null },
            select: userSelect,
        });

        return reply.send(ok(user, t(request.lang, MSG.USER_AVATAR_REMOVED)));
    }

    // ── GET /api/users/search?q= ─────────────────────────────────────────────
    async function searchUsers(
        request: FastifyRequest<{ Querystring: { q?: string } }>,
        reply: FastifyReply,
    ) {
        const q = request.query.q?.trim() ?? "";
        if (q.length < 1) {
            return reply.send(ok([], t(request.lang, MSG.USER_SEARCH_RESULTS)));
        }

        const users = await app.prisma.user.findMany({
            where: {
                id: { not: request.userId },
                OR: [
                    { email: { contains: q, mode: "insensitive" } },
                    { name: { contains: q, mode: "insensitive" } },
                ],
            },
            select: { id: true, email: true, name: true },
            take: 30,
            orderBy: { email: "asc" },
        });

        return reply.send(ok(users, t(request.lang, MSG.USER_SEARCH_RESULTS)));
    }

    return { getMe, updateMe, uploadAvatar, deleteAvatar, searchUsers };
}
