import Link from "next/link";

/** HTTP 404 — 팀이 없거나 이 팀의 멤버가 아닐 때 */
export default function TeamNotFound() {
    return (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="max-w-md text-stone-600">
                팀을 찾을 수 없습니다. 삭제되었거나, 이 팀의 멤버가 아닐 수 있습니다.
            </p>
            <Link
                href="/teams"
                className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            >
                팀 목록으로
            </Link>
        </div>
    );
}
