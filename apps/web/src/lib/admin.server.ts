import "server-only";

import { cookies } from "next/headers";

import { apiUrl } from "./api";
import { AT_COOKIE } from "./auth.server";
import { formatListDateTime } from "./format-list-date";

export interface AdminUserRow {
    id: string;
    email: string;
    name: string | null;
    systemRole: "SUPER_ADMIN" | "USER";
    createdAt: string;
    /** 목록 표시용 — 서버에서만 채워 hydration과 맞춤 */
    createdAtLabel?: string;
    _count: { memberships: number };
    memberships?: { project: { name: string } }[];
}

export interface AdminUserMembership {
    role: "LEADER" | "DEPUTY_LEADER" | "MEMBER";
    joinedAt: string;
    project: { id: string; name: string; description: string | null };
}

export interface AdminUserDetail extends Omit<AdminUserRow, "memberships"> {
    memberships: AdminUserMembership[];
}

interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
}

export function normalizeAdminUserRow(row: AdminUserRow): AdminUserRow {
    return {
        ...row,
        memberships: Array.isArray(row.memberships) ? row.memberships : [],
        createdAtLabel: formatListDateTime(row.createdAt),
    };
}

async function buildHeaders() {
    const jar = await cookies();
    return {
        Authorization: `Bearer ${jar.get(AT_COOKIE)?.value ?? ""}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Language": jar.get("elivis_lang")?.value ?? "ko",
    };
}

/** SUPER_ADMIN 전용 — 단일 유저(프로젝트 포함). 실패 시 null */
export async function fetchAdminUser(userId: string): Promise<AdminUserDetail | null> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return null;

    try {
        const res = await fetch(apiUrl(`/api/admin/users/${userId}`), {
            headers: await buildHeaders(),
            cache: "no-store",
        });

        if (!res.ok) return null;

        const body = (await res.json()) as ApiResponse<AdminUserDetail>;
        return body.data;
    } catch {
        return null;
    }
}

/** SUPER_ADMIN 전용. 실패 시 null */
export async function fetchAdminUsers(): Promise<AdminUserRow[] | null> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return null;

    try {
        const res = await fetch(apiUrl("/api/admin/users"), {
            headers: await buildHeaders(),
            cache: "no-store",
        });

        if (!res.ok) return null;

        const body = (await res.json()) as ApiResponse<AdminUserRow[]>;
        const rows = body.data;
        if (!Array.isArray(rows)) return null;
        return rows.map(normalizeAdminUserRow);
    } catch {
        return null;
    }
}
