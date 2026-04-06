import type { TeamMemberRow } from "../../types/team-detail";

export function truncateTeamText(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + "…";
}

export function displayTeamMemberName(u: { name: string | null; email: string }): string {
    return u.name?.trim() || u.email.split("@")[0] || u.email;
}

export function formatTeamDateIso(iso: string, locale: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const tag = locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "en-US";
    return d.toLocaleDateString(tag, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

export function teamMemberRoleKey(role: TeamMemberRow["role"]): "LEADER" | "MEMBER" {
    return role === "LEADER" ? "LEADER" : "MEMBER";
}

export const TEAM_AVATAR_STACK_MAX = 4;
