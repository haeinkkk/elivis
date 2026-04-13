"use client";

export default function PagesListPage() {
    return (
        <div className="w-full p-4 text-left sm:p-5 md:p-6 lg:p-8">
            <div className="w-full max-w-full">
                <h2 className="text-2xl font-semibold text-stone-800 dark:text-elivis-ink sm:text-3xl">모든 페이지</h2>
                <p className="mt-2 text-stone-600 dark:text-elivis-ink-secondary">생성한 페이지를 검색하고 관리하세요.</p>
                <div className="mt-6 rounded-2xl border border-dashed border-stone-200 dark:border-elivis-line bg-white/50 p-8 text-left sm:mt-8 sm:p-10 md:p-12">
                    <p className="text-stone-400 dark:text-elivis-ink-secondary">페이지 목록이 여기에 표시됩니다.</p>
                </div>
            </div>
        </div>
    );
}
