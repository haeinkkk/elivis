/**
 * 사용자 목록 가입일 표시 — 서버/브라우저 ICU 차이(오전 vs AM 등)로 인한 hydration 불일치를 피하기 위해
 * hour12: false 로 고정하고 Asia/Seoul 기준으로 통일합니다.
 */
export function formatListDateTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(d);
}
