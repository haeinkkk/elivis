import { Client } from "ldapts";

/** DB·관리자 UI에서 내려주는 LDAP 연결 설정 */
export type LdapAuthenticateConfig = {
    url: string;
    /** 비어 있지 않으면 DN 템플릿 직접 bind 모드 */
    userDnTemplate: string;
    bindDn: string;
    bindPassword: string;
    searchBase: string;
    searchFilter: string;
    nameAttribute: string;
    timeoutMs: number;
};

/** RFC4515 filter 값 이스케이프 */
export function escapeLdapFilterValue(value: string): string {
    return value.replace(/[\\\x00*()]/g, (ch) => {
        const code = ch.charCodeAt(0);
        return `\\${code.toString(16).padStart(2, "0")}`;
    });
}

function applyDnTemplate(template: string, email: string): string {
    const localPart = email.includes("@") ? email.slice(0, email.indexOf("@")) : email;
    return template.replace(/\{\{email\}\}/g, email).replace(/\{\{localPart\}\}/g, localPart);
}

function pickFirstStringAttr(entry: Record<string, unknown>, attr: string): string | null {
    const key = Object.keys(entry).find((k) => k.toLowerCase() === attr.toLowerCase());
    if (!key) return null;
    const v = entry[key];
    if (v == null) return null;
    if (Array.isArray(v)) {
        const first = v[0];
        if (first == null) return null;
        if (typeof first === "string") return first;
        if (Buffer.isBuffer(first)) return first.toString("utf8");
        return String(first);
    }
    if (typeof v === "string") return v;
    if (Buffer.isBuffer(v)) return v.toString("utf8");
    return String(v);
}

function clampTimeout(ms: number): number {
    if (!Number.isFinite(ms)) return 15_000;
    return Math.min(120_000, Math.max(1_000, Math.floor(ms)));
}

/**
 * LDAP 인증. 성공 시 DN·표시 이름(가능하면).
 * - userDnTemplate 이 비어 있지 않으면: 해당 DN으로 직접 bind
 * - 아니면: bindDn(+PW)로 검색 후 사용자 DN으로 bind (bindDn 비면 익명 bind 시도)
 */
export async function authenticateLdap(
    email: string,
    password: string,
    cfg: LdapAuthenticateConfig | null,
): Promise<{ dn: string; displayName: string | null } | null> {
    if (!cfg) return null;

    const url = cfg.url.trim();
    if (!url) return null;

    const timeoutMs = clampTimeout(cfg.timeoutMs);
    const dnTemplate = cfg.userDnTemplate.trim();

    if (dnTemplate) {
        const userDn = applyDnTemplate(dnTemplate, email);
        const client = new Client({
            url,
            timeout: timeoutMs,
            connectTimeout: timeoutMs,
            strictDN: false,
        });
        try {
            await client.bind(userDn, password);
            return { dn: userDn, displayName: null };
        } catch {
            return null;
        } finally {
            try {
                await client.unbind();
            } catch {
                /* ignore */
            }
        }
    }

    const searchBase = cfg.searchBase.trim();
    const bindDn = cfg.bindDn.trim();
    const bindPassword = cfg.bindPassword ?? "";
    const filterTemplate = cfg.searchFilter.trim() || "(mail={{email}})";
    const nameAttr = cfg.nameAttribute.trim() || "cn";

    if (!searchBase) return null;

    const escapedEmail = escapeLdapFilterValue(email);
    const filter = filterTemplate.replace(/\{\{email\}\}/g, escapedEmail);

    const admin = new Client({
        url,
        timeout: timeoutMs,
        connectTimeout: timeoutMs,
        strictDN: false,
    });

    let userDn: string;
    let displayName: string | null = null;

    try {
        if (bindDn) {
            await admin.bind(bindDn, bindPassword);
        } else {
            await admin.bind("", "");
        }

        const { searchEntries } = await admin.search(searchBase, {
            scope: "sub",
            filter,
            attributes: [nameAttr, "mail", "displayName"],
            sizeLimit: 5,
        });

        if (searchEntries.length === 0) return null;

        const entry = searchEntries[0] as unknown as Record<string, unknown>;
        userDn = String(entry.dn ?? "");
        if (!userDn) return null;

        displayName =
            pickFirstStringAttr(entry, nameAttr) ??
            pickFirstStringAttr(entry, "displayName") ??
            pickFirstStringAttr(entry, "cn");
    } catch {
        try {
            await admin.unbind();
        } catch {
            /* ignore */
        }
        return null;
    }

    try {
        await admin.unbind();
    } catch {
        /* ignore */
    }

    const userClient = new Client({
        url,
        timeout: timeoutMs,
        connectTimeout: timeoutMs,
        strictDN: false,
    });
    try {
        await userClient.bind(userDn, password);
        return { dn: userDn, displayName };
    } catch {
        return null;
    } finally {
        try {
            await userClient.unbind();
        } catch {
            /* ignore */
        }
    }
}
