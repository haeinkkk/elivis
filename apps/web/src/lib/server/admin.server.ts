import "server-only";

import { cookies } from "next/headers";

import type { ApiEnvelope } from "../http/api-envelope";
import type {
    ApiAdminUserDetail,
    ApiAdminUserMembership,
    ApiAdminUserRow,
} from "../mappers/admin";
import { apiUrl } from "../http/api-base-url";
import { AT_COOKIE } from "./auth.server";
import { apiFetchHeaders } from "../http/api-auth-headers.server";
import { formatListDateTime } from "../display/format-list-date";

export type {
    ApiAdminUserDetail,
    ApiAdminUserMembership,
    ApiAdminUserRow,
} from "../mappers/admin";

export type AdminUserRow = ApiAdminUserRow;
export type AdminUserMembership = ApiAdminUserMembership;
export type AdminUserDetail = ApiAdminUserDetail;

export function normalizeAdminUserRow(row: ApiAdminUserRow): ApiAdminUserRow {
    return {
        ...row,
        accessBlocked: Boolean(row.accessBlocked),
        memberships: Array.isArray(row.memberships) ? row.memberships : [],
        teamMemberships: Array.isArray(row.teamMemberships) ? row.teamMemberships : [],
        createdAtLabel: formatListDateTime(row.createdAt),
    };
}

/** SUPER_ADMIN 전용 — 단일 유저(프로젝트 포함). 실패 시 null */
export async function fetchAdminUser(userId: string): Promise<ApiAdminUserDetail | null> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return null;

    try {
        const res = await fetch(apiUrl(`/api/admin/users/${userId}`), {
            headers: await apiFetchHeaders(),
            cache: "no-store",
        });

        if (!res.ok) return null;

        const body = (await res.json()) as ApiEnvelope<ApiAdminUserDetail>;
        const row = body.data;
        return {
            ...row,
            accessBlocked: Boolean(row.accessBlocked),
            memberships: Array.isArray(row.memberships) ? row.memberships : [],
            teamMemberships: Array.isArray(row.teamMemberships) ? row.teamMemberships : [],
        };
    } catch {
        return null;
    }
}

/** SUPER_ADMIN 전용. 실패 시 null */
export async function fetchAdminUsers(): Promise<ApiAdminUserRow[] | null> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return null;

    try {
        const res = await fetch(apiUrl("/api/admin/users"), {
            headers: await apiFetchHeaders(),
            cache: "no-store",
        });

        if (!res.ok) return null;

        const body = (await res.json()) as ApiEnvelope<ApiAdminUserRow[]>;
        const rows = body.data;
        if (!Array.isArray(rows)) return null;
        return rows.map(normalizeAdminUserRow);
    } catch {
        return null;
    }
}
