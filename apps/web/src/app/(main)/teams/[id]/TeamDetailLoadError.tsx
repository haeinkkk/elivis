import Link from "next/link";

/** API 오류·네트워크 등으로 팀 상세를 불러오지 못했을 때 */
export function TeamDetailLoadError() {
    return (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="max-w-md text-stone-600">
                팀 정보를 불러오지 못했습니다. API 서버가 실행 중인지, 주소 설정(
                <code className="rounded bg-stone-100 px-1 text-sm">NEXT_PUBLIC_API_URL</code>)을
                확인한 뒤 다시 시도해 주세요.
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
