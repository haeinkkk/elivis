/** 목록·카드 등에서 보여 줄 업무 제목 최대 길이 (초과 시 ...) */
export const TASK_TITLE_LIST_MAX_LEN = 40;

export function formatTaskTitleForList(title: string, maxLen = TASK_TITLE_LIST_MAX_LEN): string {
    const s = title ?? "";
    if (s.length <= maxLen) return s;
    return `${s.slice(0, maxLen)}...`;
}
