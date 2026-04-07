export interface ApiSystemLogFile {
    name: string;
    size: number;
    mtime: string;
}

export interface ApiSystemLogsPayload {
    files: ApiSystemLogFile[];
    file?: string;
    limit?: number;
    levelMin?: string | null;
    search?: string | null;
    entries?: Array<Record<string, unknown> & { raw?: string }>;
}
