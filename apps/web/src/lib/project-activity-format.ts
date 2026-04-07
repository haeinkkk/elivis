import type { ApiProjectActivityItem } from "@/app/actions/projects";

function parseJsonRecord(s: string | null): Record<string, unknown> | null {
    if (!s) return null;
    try {
        const v = JSON.parse(s) as unknown;
        return typeof v === "object" && v !== null && !Array.isArray(v)
            ? (v as Record<string, unknown>)
            : null;
    } catch {
        return null;
    }
}

/** `useTranslations("projects.detail")` 의 `t` */
type ProjectsDetailT = (key: string, values?: Record<string, string | number>) => string;

function roleLabel(tp: ProjectsDetailT, role: string): string {
    if (role === "LEADER") return tp("viewerRoles.LEADER");
    if (role === "DEPUTY_LEADER") return tp("viewerRoles.DEPUTY_LEADER");
    if (role === "MEMBER") return tp("viewerRoles.MEMBER");
    return role || "—";
}

/** `projects.detail` 네임스페이스의 `t`로 한 줄 설명 문자열 생성 */
export function formatProjectActivityLine(item: ApiProjectActivityItem, tp: ProjectsDetailT): string {
    const title = item.resourceName ?? "—";
    const b = parseJsonRecord(item.before);
    const a = parseJsonRecord(item.after);

    switch (item.resourceType) {
        case "PROJECT":
            if (item.action === "CREATED") {
                return tp("activity.projectCreated", { name: title });
            }
            break;
        case "PROJECT_MEMBER": {
            if (item.action === "CREATED") {
                return tp("activity.memberAdded", { name: title });
            }
            if (item.action === "UPDATED") {
                const br = typeof b?.role === "string" ? b.role : "";
                const ar = typeof a?.role === "string" ? a.role : "";
                return tp("activity.memberRoleChanged", {
                    name: title,
                    beforeRole: roleLabel(tp, br),
                    afterRole: roleLabel(tp, ar),
                });
            }
            break;
        }
        case "WIKI_PAGE":
            if (item.action === "CREATED") return tp("activity.wikiCreated", { title });
            if (item.action === "UPDATED") return tp("activity.wikiUpdated", { title });
            if (item.action === "DELETED") return tp("activity.wikiDeleted", { title });
            break;
        case "TASK":
            if (item.action === "CREATED") return tp("activity.taskCreated", { title });
            if (item.action === "DELETED") return tp("activity.taskDeleted", { title });
            break;
        default:
            break;
    }
    return tp("activity.unknown");
}
