import type { Prisma, SmtpSettings } from "@prisma/client";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { t } from "@repo/i18n";

import {
    getSmtpSettingsRow,
    sendSmtpTestMail,
    smtpSettingsReady,
} from "../services/smtp-mail.service";
import { MSG } from "../utils/messages";
import { badRequest, ok } from "../utils/response";

const ROW_ID = "default";

export interface PatchSmtpBody {
    enabled?: boolean;
    host?: string;
    port?: number;
    secure?: boolean;
    rejectUnauthorized?: boolean;
    authUser?: string;
    /** 비어 있지 않을 때만 적용 */
    authPass?: string;
    /** true면 저장된 비밀번호 제거 */
    clearAuthPass?: boolean;
    fromEmail?: string;
    fromName?: string;
}

export interface TestSmtpBody {
    to: string;
}

function publicSmtp(row: SmtpSettings) {
    return {
        enabled: row.enabled,
        host: row.host,
        port: row.port,
        secure: row.secure,
        rejectUnauthorized: row.rejectUnauthorized,
        authUser: row.authUser,
        hasAuthPass: row.authPass.length > 0,
        fromEmail: row.fromEmail,
        fromName: row.fromName,
        updatedAt: row.updatedAt.toISOString(),
    };
}

function isValidRecipientEmail(s: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export function createSmtpSettingsController(app: FastifyInstance) {
    async function getSmtp(request: FastifyRequest, reply: FastifyReply) {
        const row = await getSmtpSettingsRow(app.prisma);
        return reply.send(ok(publicSmtp(row), t(request.lang, MSG.ADMIN_SMTP_FETCHED)));
    }

    async function patchSmtp(
        request: FastifyRequest<{ Body: PatchSmtpBody }>,
        reply: FastifyReply,
    ) {
        const lang = request.lang;
        const body = request.body ?? {};
        const row = await getSmtpSettingsRow(app.prisma);

        const data: Prisma.SmtpSettingsUpdateInput = {};

        if (body.enabled !== undefined) data.enabled = body.enabled;
        if (body.host !== undefined) data.host = String(body.host).trim();
        if (body.fromEmail !== undefined) data.fromEmail = String(body.fromEmail).trim();
        if (body.fromName !== undefined) data.fromName = String(body.fromName).trim();
        if (body.authUser !== undefined) data.authUser = String(body.authUser).trim();
        if (body.secure !== undefined) data.secure = body.secure;
        if (body.rejectUnauthorized !== undefined) data.rejectUnauthorized = body.rejectUnauthorized;

        if (body.port !== undefined) {
            const p = Number(body.port);
            if (!Number.isInteger(p) || p < 1 || p > 65535) {
                return reply.code(400).send(badRequest(t(lang, MSG.ADMIN_SMTP_PORT_INVALID)));
            }
            data.port = p;
        }

        if (body.clearAuthPass === true) {
            data.authPass = "";
        } else if (typeof body.authPass === "string" && body.authPass.length > 0) {
            data.authPass = body.authPass;
        }

        const nextEnabled = body.enabled !== undefined ? body.enabled : row.enabled;
        const nextHost = body.host !== undefined ? String(body.host).trim() : row.host;
        const nextFromEmail =
            body.fromEmail !== undefined ? String(body.fromEmail).trim() : row.fromEmail;

        if (nextEnabled && (!nextHost || !nextFromEmail)) {
            return reply.code(400).send(badRequest(t(lang, MSG.ADMIN_SMTP_INCOMPLETE)));
        }

        const updated =
            Object.keys(data).length > 0
                ? await app.prisma.smtpSettings.update({
                      where: { id: ROW_ID },
                      data,
                  })
                : row;

        return reply.send(ok(publicSmtp(updated), t(lang, MSG.ADMIN_SMTP_UPDATED)));
    }

    async function testSmtp(
        request: FastifyRequest<{ Body: TestSmtpBody }>,
        reply: FastifyReply,
    ) {
        const lang = request.lang;
        const row = await getSmtpSettingsRow(app.prisma);

        if (!smtpSettingsReady(row)) {
            return reply.code(400).send(badRequest(t(lang, MSG.ADMIN_SMTP_NOT_CONFIGURED)));
        }

        const to = String(request.body?.to ?? "").trim();
        if (!isValidRecipientEmail(to)) {
            return reply.code(400).send(badRequest(t(lang, MSG.ADMIN_SMTP_INVALID_TO)));
        }

        try {
            await sendSmtpTestMail(row, to);
        } catch (err) {
            request.log.warn({ err }, "smtp test send failed");
            return reply.code(400).send(badRequest(t(lang, MSG.ADMIN_SMTP_TEST_FAILED)));
        }

        return reply.send(ok(null, t(lang, MSG.ADMIN_SMTP_TEST_SENT)));
    }

    return { getSmtp, patchSmtp, testSmtp };
}
