export function formatTaskDetailBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatTaskDetailDate(iso: string, locale: string) {
    return new Date(iso).toLocaleString(locale, {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function taskDetailFileIcon(mime: string) {
    if (mime.startsWith("image/")) return "🖼";
    if (mime === "application/pdf") return "📄";
    if (mime.includes("spreadsheet") || mime.includes("excel")) return "📊";
    if (mime.includes("word") || mime.includes("document")) return "📝";
    if (mime.includes("zip") || mime.includes("compressed")) return "🗜";
    return "📎";
}

export function taskDetailServerUrl(path: string) {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
    return `${base}${path}`;
}
