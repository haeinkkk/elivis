import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
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

export interface ChangePasswordBody {
    currentPassword: string;
    newPassword: string;
}

export interface PatchNotificationPrefsBody {
    teams?: {
        teamId: string;
        notifyPushEnabled?: boolean;
        notifyEmailEnabled?: boolean;
    }[];
    projects?: {
        projectId: string;
        notifyPushEnabled?: boolean;
        notifyEmailEnabled?: boolean;
    }[];
}

const MIN_NEW_PASSWORD_LEN = 8;

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
        authProvider: true,
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

    // ── PATCH /api/users/me/password ───────────────────────────────────────────
    async function changePassword(
        request: FastifyRequest<{ Body: ChangePasswordBody }>,
        reply: FastifyReply,
    ) {
        const { currentPassword, newPassword } = request.body ?? ({} as ChangePasswordBody);
        if (
            typeof currentPassword !== "string" ||
            typeof newPassword !== "string" ||
            !currentPassword ||
            !newPassword
        ) {
            return reply
                .code(400)
                .send(badRequest(t(request.lang, MSG.USER_PASSWORD_FIELDS_REQUIRED)));
        }
        if (newPassword.length < MIN_NEW_PASSWORD_LEN) {
            return reply
                .code(400)
                .send(badRequest(t(request.lang, MSG.USER_PASSWORD_NEW_TOO_SHORT)));
        }

        const row = await app.prisma.user.findUnique({
            where: { id: request.userId },
            select: { password: true, authProvider: true },
        });
        if (!row) {
            return reply.code(404).send(notFound(t(request.lang, MSG.USER_NOT_FOUND)));
        }
        if (row.authProvider !== "LOCAL") {
            return reply.code(400).send(badRequest(t(request.lang, MSG.USER_PASSWORD_LDAP_ONLY)));
        }
        const valid = row.password && (await bcrypt.compare(currentPassword, row.password));
        if (!valid) {
            return reply
                .code(400)
                .send(badRequest(t(request.lang, MSG.USER_PASSWORD_CURRENT_WRONG)));
        }

        const hashed = await bcrypt.hash(newPassword, 12);
        await app.prisma.user.update({
            where: { id: request.userId },
            data: { password: hashed },
        });

        return reply.send(ok({ success: true }, t(request.lang, MSG.USER_PASSWORD_UPDATED)));
    }

    async function buildNotificationPrefs(userId: string) {
        const [teamRows, projectRows] = await Promise.all([
            app.prisma.teamMember.findMany({
                where: { userId },
                select: {
                    notifyPushEnabled: true,
                    notifyEmailEnabled: true,
                    team: { select: { id: true, name: true } },
                },
                orderBy: { team: { name: "asc" } },
            }),
            app.prisma.projectMember.findMany({
                where: { userId },
                select: {
                    notifyPushEnabled: true,
                    notifyEmailEnabled: true,
                    project: { select: { id: true, name: true } },
                },
                orderBy: { project: { name: "asc" } },
            }),
        ]);
        return {
            teams: teamRows.map((r) => ({
                id: r.team.id,
                name: r.team.name,
                notifyPushEnabled: r.notifyPushEnabled,
                notifyEmailEnabled: r.notifyEmailEnabled,
            })),
            projects: projectRows.map((r) => ({
                id: r.project.id,
                name: r.project.name,
                notifyPushEnabled: r.notifyPushEnabled,
                notifyEmailEnabled: r.notifyEmailEnabled,
            })),
        };
    }

    // ── GET /api/users/me/notification-preferences ─────────────────────────────
    async function getNotificationPreferences(request: FastifyRequest, reply: FastifyReply) {
        const data = await buildNotificationPrefs(request.userId);
        return reply.send(ok(data, t(request.lang, MSG.USER_NOTIFICATION_PREFS_FETCHED)));
    }

    // ── PATCH /api/users/me/notification-preferences ───────────────────────────
    async function patchNotificationPreferences(
        request: FastifyRequest<{ Body: PatchNotificationPrefsBody }>,
        reply: FastifyReply,
    ) {
        const { teams, projects } = request.body ?? {};
        const userId = request.userId;

        if (teams?.length) {
            for (const row of teams) {
                if (!row?.teamId) continue;
                const data: {
                    notifyPushEnabled?: boolean;
                    notifyEmailEnabled?: boolean;
                } = {};
                if (row.notifyPushEnabled !== undefined) {
                    data.notifyPushEnabled = row.notifyPushEnabled;
                }
                if (row.notifyEmailEnabled !== undefined) {
                    data.notifyEmailEnabled = row.notifyEmailEnabled;
                }
                if (Object.keys(data).length === 0) continue;
                await app.prisma.teamMember.updateMany({
                    where: { userId, teamId: row.teamId },
                    data,
                });
            }
        }
        if (projects?.length) {
            for (const row of projects) {
                if (!row?.projectId) continue;
                const data: {
                    notifyPushEnabled?: boolean;
                    notifyEmailEnabled?: boolean;
                } = {};
                if (row.notifyPushEnabled !== undefined) {
                    data.notifyPushEnabled = row.notifyPushEnabled;
                }
                if (row.notifyEmailEnabled !== undefined) {
                    data.notifyEmailEnabled = row.notifyEmailEnabled;
                }
                if (Object.keys(data).length === 0) continue;
                await app.prisma.projectMember.updateMany({
                    where: { userId, projectId: row.projectId },
                    data,
                });
            }
        }

        const data = await buildNotificationPrefs(userId);
        return reply.send(ok(data, t(request.lang, MSG.USER_NOTIFICATION_PREFS_UPDATED)));
    }

    return {
        getMe,
        updateMe,
        uploadAvatar,
        deleteAvatar,
        searchUsers,
        changePassword,
        getNotificationPreferences,
        patchNotificationPreferences,
    };
}
