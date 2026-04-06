/**
 * 업무 과부하 지수 (Workload Score) — React/TypeScript
 * Total Score = Σ (Priority × StatusFactor × TimeFactor)
 */

import type { ApiWorkspaceStatusSemantic, ApiWorkspaceTask } from "../../types/workspace-api";

/** 막대 그래프 등 시각화 축의 고정 만점 (팀 최고점과 무관) */
export const WORKLOAD_CHART_MAX_SCORE = 1000;

/** UI·집계용 상태 (한글 라벨과 스펙 동일) */
export type WorkloadTaskStatus = "대기" | "진행중" | "검토중" | "보류" | "완료";

export interface WorkloadTask {
    id: string;
    title: string;
    status: WorkloadTaskStatus;
    /** 1~100 */
    priority: number;
    startDate: Date;
    /** 마감 기준일 (API의 dueDate에 대응) */
    endDate: Date;
}

const STATUS_FACTOR: Record<WorkloadTaskStatus, number> = {
    진행중: 1.0,
    검토중: 0.5,
    대기: 0.3,
    보류: 0.2,
    완료: 0,
};

/** 오늘·endDate(당일 자정 기준)로 잔여 일수에 따른 TimeFactor */
export function timeFactorForEndDate(endDate: Date, now: Date): number {
    const startOfDay = (d: Date) => {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
    };
    const end = startOfDay(endDate);
    const today = startOfDay(now);
    const daysLeft = Math.round((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

    if (daysLeft <= 0) return 3.0;
    if (daysLeft <= 2) return 2.0;
    if (daysLeft <= 6) return 1.5;
    return 1.0;
}

/** 단일 업무 라인 점수 (완료 시 0) */
export function taskWorkloadLineScore(task: WorkloadTask, now: Date): number {
    const sf = STATUS_FACTOR[task.status];
    if (sf === 0) return 0;
    const p = Math.min(100, Math.max(1, task.priority));
    const tf = timeFactorForEndDate(task.endDate, now);
    return p * sf * tf;
}

export function calculateWorkloadScore(tasks: WorkloadTask[], now: Date = new Date()) {
    const lineItems = tasks.map((task) => ({
        taskId: task.id,
        score: taskWorkloadLineScore(task, now),
    }));
    const total = lineItems.reduce((acc, x) => acc + x.score, 0);
    return { total, lineItems, now };
}

export type WorkloadBand = "relaxed" | "normal" | "overload" | "danger";

export function getWorkloadBand(score: number): WorkloadBand {
    if (score <= 150) return "relaxed";
    if (score <= 400) return "normal";
    if (score <= 700) return "overload";
    return "danger";
}

/** 스펙 문구 (UI에서는 i18n 키 사용 권장) */
export function getWorkloadDiagnosisMessage(score: number): string {
    if (score <= 150) return "여유 (신규 업무 수용 가능)";
    if (score <= 400) return "적정 (몰입 중)";
    if (score <= 700) return "과부하 (관리 필요)";
    return "위험 (번아웃 주의 및 조정 필수)";
}

// ── API 태스크 매핑 ─────────────────────────────────────────────

export function semanticToWorkloadStatus(semantic: ApiWorkspaceStatusSemantic): WorkloadTaskStatus {
    switch (semantic) {
        case "WAITING":
            return "대기";
        case "IN_PROGRESS":
            return "진행중";
        case "REVIEW":
            return "검토중";
        case "ON_HOLD":
            return "보류";
        case "DONE":
            return "완료";
        default:
            return "대기";
    }
}

export function apiTaskToWorkloadTask(
    task: ApiWorkspaceTask,
    statusSemantic: ApiWorkspaceStatusSemantic,
): WorkloadTask {
    const raw = task.priority?.value ?? 50;
    const priority = Number.isFinite(raw) ? Math.min(100, Math.max(1, raw)) : 50;
    const start = task.startDate ? new Date(task.startDate) : new Date(task.createdAt);
    const end = task.dueDate
        ? new Date(task.dueDate)
        : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
        id: task.id,
        title: task.title,
        status: semanticToWorkloadStatus(statusSemantic),
        priority,
        startDate: start,
        endDate: end,
    };
}

export function workloadTaskFromProjectTask(
    task: ApiWorkspaceTask,
    statusById: Map<string, { semantic: ApiWorkspaceStatusSemantic }>,
): WorkloadTask {
    const s = statusById.get(task.statusId);
    const semantic = s?.semantic ?? task.status.semantic;
    return apiTaskToWorkloadTask(task, semantic);
}
