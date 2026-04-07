import { UserAvatar } from "../UserAvatar";

export type ProjectActivityRow = {
    id: string;
    actorId: string;
    /** 활동 주체(기록을 남긴 사용자) 표시용 */
    actorName: string;
    actorEmail: string;
    actorAvatarUrl: string | null;
    /** 한 줄 요약 (이미 번역·포맷됨) */
    line: string;
    /** ISO 8601 — `<time dateTime>`용 */
    createdAtIso: string;
    /** 표시용 시각 문자열 (클라이언트 로캘에서 포맷) */
    createdAtLabel: string;
};

export function ProjectSettingsActivityTab({
    title,
    subtitle,
    rows,
    emptyMessage,
}: {
    title: string;
    subtitle: string;
    rows: ProjectActivityRow[];
    emptyMessage: string;
}) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="mb-1 text-base font-semibold text-stone-800">{title}</h2>
                <p className="text-sm text-stone-500">{subtitle}</p>
            </div>

            {rows.length === 0 ? (
                <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50/80 px-4 py-8 text-center text-sm text-stone-500">
                    {emptyMessage}
                </p>
            ) : (
                <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200/80 bg-stone-50/30">
                    {rows.map((row) => (
                        <li key={row.id} className="flex gap-3 px-4 py-3 first:rounded-t-xl last:rounded-b-xl">
                            <UserAvatar
                                userId={row.actorId}
                                label={row.actorName || row.actorEmail}
                                avatarUrl={row.actorAvatarUrl}
                                sizeClass="h-9 w-9 text-xs"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-stone-500">
                                    <span className="font-medium text-stone-700">{row.actorName}</span>
                                    <span className="text-stone-400"> · </span>
                                    <time dateTime={row.createdAtIso}>{row.createdAtLabel}</time>
                                </p>
                                <p className="mt-1 text-sm text-stone-800">{row.line}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
