import type { ProjectDetailModel, ProjectDetailViewerRole } from "../../types/project-detail";

export const PROJECT_DETAIL_STATUS_COLOR_MAP: Record<string, string> = {
    gray: "#78716c",
    red: "#ef4444",
    orange: "#f97316",
    yellow: "#eab308",
    green: "#22c55e",
    blue: "#3b82f6",
    purple: "#a855f7",
    pink: "#ec4899",
};

export function statusCssColor(color: string): string {
    return PROJECT_DETAIL_STATUS_COLOR_MAP[color] ?? "#78716c";
}

/** 완료 상태 판별 (color=green 또는 이름에 "완료"/"done"/"complete" 포함) */
export function isCompletedStatus(s: { color: string; name: string }): boolean {
    return (
        s.color === "green" ||
        s.name.includes("완료") ||
        s.name.toLowerCase().includes("done") ||
        s.name.toLowerCase().includes("complete")
    );
}

/** 진행중 상태 판별 */
export function isInProgressStatus(s: { color: string; name: string }): boolean {
    return (
        s.color === "blue" || s.name.includes("진행") || s.name.toLowerCase().includes("progress")
    );
}

export function formatProjectDetailDateKo(dateStr: string): string {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "—";
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${y}년 ${m}월 ${day}일`;
}

export function getRemainingDays(endDateStr: string, noEndDate: boolean): number | null {
    if (noEndDate || !endDateStr) return null;
    const end = new Date(endDateStr);
    if (Number.isNaN(end.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diff = Math.ceil((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    return diff;
}

export function getProgressPercent(
    project: Pick<ProjectDetailModel, "startDate" | "endDate" | "noEndDate">,
): number | null {
    if (!project.startDate) return null;
    if (project.noEndDate || !project.endDate) return 100;
    const start = new Date(project.startDate).getTime();
    const end = new Date(project.endDate).getTime();
    const now = Date.now();
    if (end <= start) return 100;
    const p = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
    return Math.round(p);
}

/** 무한(종료일 없음)일 때 시작일로부터 경과 일수 */
export function getDaysSinceStart(project: Pick<ProjectDetailModel, "startDate">): number | null {
    if (!project.startDate) return null;
    const start = new Date(project.startDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil((today.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
}

export function projectDetailRoleLabelKo(role: ProjectDetailViewerRole | undefined): string {
    switch (role) {
        case "LEADER":
            return "프로젝트 리더";
        case "DEPUTY_LEADER":
            return "부리더";
        default:
            return "멤버";
    }
}
