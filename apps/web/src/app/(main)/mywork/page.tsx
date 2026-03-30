"use client";

export default function MyWorkPage() {
  return (
    <div className="w-full p-4 text-left sm:p-5 md:p-6 lg:p-8">
      <div className="w-full max-w-full">
        <h2 className="text-2xl font-semibold text-stone-800 sm:text-3xl">
          내작업
        </h2>
        <p className="mt-2 text-stone-600">
          앞으로 해야 할 작업을 타임라인으로 확인하세요.
        </p>
        <div className="mt-12 flex flex-col items-center justify-center py-16 text-center sm:mt-16 sm:py-24">
          <p className="text-4xl sm:text-5xl" aria-hidden>
            🎉
          </p>
          <p className="mt-4 text-2xl font-bold text-stone-900 sm:text-3xl">
            축하드립니다
          </p>
          <p className="mt-2 text-xl font-bold text-stone-900 sm:text-2xl">
            일을 다 끝내셨군요!
          </p>
        </div>
      </div>
    </div>
  );
}
