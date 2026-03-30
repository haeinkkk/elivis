"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export const NOTIFICATION_READ_KEY = "elivis-notifications-all-read";
export const NOTIFICATION_READ_EVENT = "elivis-notifications-read";

export type SidebarSize = "expanded" | "collapsed" | "hidden";

const navItems = [
  { href: "/", label: "대시보드", icon: HomeIcon, redDot: false },
  { href: "/mywork", label: "내작업", icon: FolderIcon, redDot: false },
  { href: "/teams", label: "팀", icon: TeamIcon, redDot: false },
  { href: "/projects", label: "프로젝트", icon: ProjectIcon, redDot: false },
  { href: "/notification", label: "알림", icon: BellIcon, redDot: true },
];

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
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
function TeamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  );
}
function ProjectIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
  );
}
function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75v-.7V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  );
}
interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
  size: SidebarSize;
  onSizeChange: (s: SidebarSize) => void;
}

function getHasUnreadNotifications(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(NOTIFICATION_READ_KEY) !== "1";
}

export function AppSidebar({
  open,
  onClose,
  size,
  onSizeChange,
}: AppSidebarProps) {
  const pathname = usePathname();
  // 서버/클라이언트 초기 렌더를 동일하게 하기 위해 false로 고정. 실제 값은 useEffect에서 반영.
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const showLabels = size === "expanded";
  const showFloatingRestore = size === "hidden";

  useEffect(() => {
    setHasUnreadNotifications(getHasUnreadNotifications());
    const handler = () => setHasUnreadNotifications(false);
    window.addEventListener(NOTIFICATION_READ_EVENT, handler);
    return () => window.removeEventListener(NOTIFICATION_READ_EVENT, handler);
  }, []);

  return (
    <>
      {/* 2차 접기(완전 사라짐) 상태에서 데스크톱 복귀 버튼 */}
      {showFloatingRestore && (
        <button
          type="button"
          onClick={() => onSizeChange("expanded")}
          className="fixed left-2 top-16 z-60 hidden h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white/90 shadow-sm backdrop-blur md:flex hover:bg-white"
          aria-label="사이드바 다시 열기"
        >
          <svg
            className="h-5 w-5 text-stone-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5.25L15.75 12 9 18.75"
            />
          </svg>
        </button>
      )}

      {/* 모바일 오버레이 (트랜지션 적용) */}
      <div
        role="button"
        tabIndex={0}
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className={`fixed inset-0 z-40 bg-stone-900/20 backdrop-blur-[2px] md:hidden transition-opacity duration-200 ease-out ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
        aria-label="사이드바 닫기"
      />

      <aside
        className={`
          fixed left-0 top-0 z-50 flex h-full max-w-[85vw] flex-col bg-white border-r border-stone-200 overflow-hidden
          transition-[width,opacity,transform] duration-200 ease-out
          ${size === "expanded" ? "w-[280px]" : size === "collapsed" ? "w-[72px]" : "w-0 border-r-0 opacity-0 pointer-events-none"}
          ${open ? "translate-x-0" : "-translate-x-full"} md:transform-none md:static
        `}
      >
        <div
          className={`flex h-14 shrink-0 items-center gap-2 border-b border-stone-100 ${
            showLabels ? "px-4" : "justify-center px-2"
          }`}
        >
          {showLabels && (
            <Link
              href="/"
              className="inline-flex items-center gap-2"
            >
              <span className="text-lg font-semibold tracking-tight text-stone-800">
                Elivis
              </span>
            </Link>
          )}

          <div className={`flex items-center gap-1 ${showLabels ? "ml-auto" : ""}`}>
            {size !== "hidden" && (
              <button
                type="button"
                onClick={() => {
                  if (size === "expanded") {
                    onSizeChange("collapsed");
                    return;
                  }
                  if (size === "collapsed") {
                    onSizeChange("hidden");
                    onClose();
                  }
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-100"
                aria-label="사이드바 접기/숨기기"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        <nav
          className={`flex-1 overflow-y-auto ${
            showLabels ? "p-3" : "p-2"
          }`}
        >
          <ul className="space-y-0.5">
            {navItems.map(({ href, label, icon: Icon, redDot }) => {
              const isActive = pathname === href;
              const showRedDot =
                href === "/notification" ? hasUnreadNotifications : redDot;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className={`
                      flex items-center rounded-lg text-sm font-medium transition-colors
                      ${showLabels ? "gap-3 px-3 py-2.5" : "justify-center px-2 py-2.5"}
                      ${isActive
                        ? "bg-orange-50 text-orange-800"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-800"
                      }
                    `}
                  >
                    <span className="relative shrink-0">
                      <Icon className="h-5 w-5 opacity-80" />
                      {showRedDot && !showLabels && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500"
                          aria-hidden
                        />
                      )}
                    </span>
                    {showLabels && (
                      <>
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                        {showRedDot && (
                          <span
                            className="ml-auto h-2 w-2 shrink-0 rounded-full bg-red-500"
                            aria-hidden
                          />
                        )}
                      </>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div
            className={`${
              showLabels ? "my-4 border-t border-stone-100 pt-4" : "my-3 border-t border-stone-100 pt-3"
            }`}
          >
            {showLabels && (
              <p className="px-3 text-xs font-medium uppercase tracking-wider text-stone-400">
                워크스페이스
              </p>
            )}
            <Link
              href="/workspace"
              onClick={onClose}
              className={`mt-2 flex w-full items-center gap-3 rounded-lg text-sm text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-800 ${
                showLabels ? "px-3 py-2.5 text-left" : "justify-center px-2 py-2.5"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-200 text-xs font-medium text-stone-600">
                M
              </span>
              {showLabels && <span className="truncate">내 워크스페이스</span>}
            </Link>
          </div>
        </nav>

      </aside>
    </>
  );
}
