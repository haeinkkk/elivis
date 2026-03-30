"use client";

import Link from "next/link";

export default function DashboardHomePage() {
  const stats = [
    { label: "전체 프로젝트", value: "0", href: "/projects", icon: ProjectIcon },
    { label: "페이지", value: "0", href: "/pages", icon: DocumentIcon },
    { label: "최근 7일 활동", value: "0", href: "/", icon: ActivityIcon },
    { label: "휴지통", value: "0", href: "/trash", icon: TrashIcon },
  ];

  const recentProjects: { id: string; name: string; updated: string; pages: number }[] = [];
  const recentActivity: { id: string; text: string; time: string }[] = [];

  return (
    <div className="p-4 sm:p-5 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 sm:mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500 sm:text-sm">
            대시보드
          </p>
          <h2 className="mt-1 text-xl font-semibold text-stone-800 sm:text-2xl md:text-3xl">
            프로젝트 현황
          </h2>
          <p className="mt-1 text-sm text-stone-500 sm:text-base">
            워크스페이스의 프로젝트와 페이지를 한눈에 관리하세요.
          </p>
        </div>

        <section className="mb-8 sm:mb-10">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {stats.map(({ label, value, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="group flex items-start gap-4 rounded-xl border border-stone-200 bg-white p-4 transition-all hover:border-stone-300 hover:shadow-md sm:p-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600 transition-colors group-hover:bg-amber-50 group-hover:text-amber-700 sm:h-11 sm:w-11">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-stone-500 sm:text-sm">
                    {label}
                  </p>
                  <p className="mt-0.5 text-2xl font-semibold tabular-nums text-stone-800 sm:text-3xl">
                    {value}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-8 sm:mb-10">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500 sm:mb-4">
            빠른 작업
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <Link
              href="/pages"
              className="group flex flex-col rounded-xl border border-stone-200 bg-white p-4 transition-all hover:border-amber-200 hover:shadow-md sm:p-5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-100 sm:h-11 sm:w-11">
                <PlusIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>
              <h4 className="mt-3 font-semibold text-stone-800">새 페이지</h4>
              <p className="mt-1 text-sm text-stone-500">
                빈 페이지를 만들어 아이디어를 정리하세요.
              </p>
            </Link>
            <Link
              href="/projects/new"
              className="group flex flex-col rounded-xl border border-stone-200 bg-white p-4 transition-all hover:border-amber-200 hover:shadow-md sm:p-5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-stone-600 transition-colors group-hover:bg-stone-200 sm:h-11 sm:w-11">
                <FolderPlusIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>
              <h4 className="mt-3 font-semibold text-stone-800">새 프로젝트</h4>
              <p className="mt-1 text-sm text-stone-500">
                프로젝트를 만들고 페이지를 묶어 관리하세요.
              </p>
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3 sm:px-5 sm:py-4">
              <h3 className="text-sm font-semibold text-stone-800 sm:text-base">
                최근 프로젝트
              </h3>
              <Link
                href="/projects"
                className="text-xs font-medium text-amber-700 hover:text-amber-800 sm:text-sm"
              >
                전체 보기
              </Link>
            </div>
            <div className="min-h-[140px] p-4 sm:p-5">
              {recentProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-stone-200 bg-stone-50/50 py-10 text-center">
                  <FolderIcon className="h-10 w-10 text-stone-300 sm:h-12 sm:w-12" />
                  <p className="mt-2 text-sm text-stone-500">프로젝트가 없습니다.</p>
                  <Link
                    href="/projects/new"
                    className="mt-2 text-sm font-medium text-amber-700 hover:text-amber-800"
                  >
                    첫 프로젝트 만들기 →
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {recentProjects.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/projects/${p.id}`}
                        className="flex items-center justify-between py-3 text-sm hover:bg-stone-50"
                      >
                        <span className="font-medium text-stone-800">{p.name}</span>
                        <span className="text-stone-500">{p.pages}페이지</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3 sm:px-5 sm:py-4">
              <h3 className="text-sm font-semibold text-stone-800 sm:text-base">
                최근 활동
              </h3>
            </div>
            <div className="min-h-[140px] p-4 sm:p-5">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-stone-200 bg-stone-50/50 py-10 text-center">
                  <ActivityIcon className="h-10 w-10 text-stone-300 sm:h-12 sm:w-12" />
                  <p className="mt-2 text-sm text-stone-500">아직 활동이 없습니다.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {recentActivity.map((a) => (
                    <li key={a.id} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                      <div>
                        <p className="text-stone-800">{a.text}</p>
                        <p className="text-xs text-stone-500">{a.time}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ProjectIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  );
}
function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}
function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3 8m9 0-1 3 8m-9 0 3 8" />
    </svg>
  );
}
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
function FolderPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  );
}
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  );
}
