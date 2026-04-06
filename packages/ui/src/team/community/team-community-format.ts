export function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function formatPostDate(
    iso: string,
    locale: string,
    tRel: (key: "justNow" | "minutesAgo" | "hoursAgo" | "daysAgo", values?: { count: number }) => string,
): string {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return tRel("justNow");
    if (diff < 3600) return tRel("minutesAgo", { count: Math.floor(diff / 60) });
    if (diff < 86400) return tRel("hoursAgo", { count: Math.floor(diff / 3600) });
    if (diff < 86400 * 7) return tRel("daysAgo", { count: Math.floor(diff / 86400) });
    const tag = locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "en-US";
    return d.toLocaleDateString(tag, { month: "short", day: "numeric" });
}
