import type { PrismaClient, SmtpSettings } from "@prisma/client";
import nodemailer from "nodemailer";

const DEFAULT_ROW_ID = "default";

export async function getSmtpSettingsRow(prisma: PrismaClient): Promise<SmtpSettings> {
    const row = await prisma.smtpSettings.findUnique({ where: { id: DEFAULT_ROW_ID } });
    if (row) return row;
    return prisma.smtpSettings.create({
        data: { id: DEFAULT_ROW_ID },
    });
}

export function smtpSettingsReady(row: SmtpSettings): boolean {
    if (!row.enabled) return false;
    if (!row.host.trim()) return false;
    if (!row.fromEmail.trim()) return false;
    return true;
}

function buildMailFrom(row: SmtpSettings): string {
    const email = row.fromEmail.trim();
    const name = row.fromName.trim();
    if (!name) return email;
    return `"${name.replace(/"/g, '\\"')}" <${email}>`;
}

export function createTransportFromRow(row: SmtpSettings) {
    const host = row.host.trim();
    if (!host) {
        throw new Error("SMTP host is empty");
    }

    const port = row.port;
    if (!Number.isFinite(port) || port < 1 || port > 65535) {
        throw new Error("SMTP port is invalid");
    }

    const user = row.authUser.trim();
    const pass = row.authPass;
    const hasAuth = user.length > 0 && pass.length > 0;

    return nodemailer.createTransport({
        host,
        port,
        secure: row.secure,
        auth: hasAuth ? { user, pass } : undefined,
        tls: {
            rejectUnauthorized: row.rejectUnauthorized,
        },
    });
}

export async function sendSmtpTestMail(row: SmtpSettings, to: string): Promise<void> {
    if (!smtpSettingsReady(row)) {
        throw new Error("SMTP is not configured or disabled");
    }

    const transporter = createTransportFromRow(row);
    await transporter.sendMail({
        from: buildMailFrom(row),
        to: to.trim(),
        subject: "Elivis — SMTP test",
        text: "This is a test email from your Elivis server. SMTP settings are working.",
        html: "<p>This is a test email from your <strong>Elivis</strong> server. SMTP settings are working.</p>",
    });
}

/** 다른 기능(알림 등)에서 재사용 */
export async function sendMailFromSettings(
    row: SmtpSettings,
    options: { to: string; subject: string; text: string; html?: string },
): Promise<void> {
    if (!smtpSettingsReady(row)) {
        throw new Error("SMTP is not configured or disabled");
    }
    const transporter = createTransportFromRow(row);
    await transporter.sendMail({
        from: buildMailFrom(row),
        to: options.to.trim(),
        subject: options.subject,
        text: options.text,
        ...(options.html ? { html: options.html } : {}),
    });
}
