"use client";

export default function TrashPage() {
  return (
    <div className="w-full p-4 text-left sm:p-5 md:p-6 lg:p-8">
      <div className="w-full max-w-full">
        <h2 className="text-2xl font-semibold text-stone-800 sm:text-3xl">휴지통</h2>
        <p className="mt-2 text-stone-600">
          삭제된 페이지는 30일 후에 완전히 제거됩니다.
        </p>
        <div className="mt-6 rounded-2xl border border-dashed border-stone-200 bg-white/50 p-8 text-left sm:mt-8 sm:p-10 md:p-12">
          <p className="text-stone-400">휴지통이 비어 있습니다.</p>
        </div>
      </div>
    </div>
  );
}
