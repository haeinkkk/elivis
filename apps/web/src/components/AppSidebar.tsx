"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { workspaceDisplayName, type ApiWorkspaceListItem } from "@/lib/map-api-workspace";
import { WorkspaceSidebarLabelModal } from "@/components/WorkspaceSidebarLabelModal";
import type { ApiTeamFavoriteItem } from "@/lib/map-api-team";
import type { ApiProjectFavoriteItem } from "@/lib/map-api-project";
import { useNotificationContext } from "@/context/NotificationContext";

export type SidebarSize = "expanded" | "collapsed" | "hidden";

const navItemDefs = [
  { href: "/mywork", labelKey: "myWork" as const, icon: FolderIcon },
  { href: "/teams", labelKey: "teams" as const, icon: TeamIcon },
  { href: "/projects", labelKey: "projects" as const, icon: ProjectIcon },
];
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
  isSuperAdmin?: boolean;
  workspaces?: ApiWorkspaceListItem[];
  /** @deprecated Context에서 직접 읽음. 하위 호환용으로만 유지 */
  unreadNotificationCount?: number;
  /** 팀 즐겨찾기 목록 */
  teamFavorites?: ApiTeamFavoriteItem[];
  /** 프로젝트 즐겨찾기 목록 */
  projectFavorites?: ApiProjectFavoriteItem[];
}


export function AppSidebar({
  open,
  onClose,
  size,
  onSizeChange,
  isSuperAdmin = false,
  workspaces = [],
  teamFavorites = [],
  projectFavorites = [],
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const tNav = useTranslations("nav");
  const tSidebar = useTranslations("sidebar");
  const [workspaceExpanded, setWorkspaceExpanded] = useState(true);
  const [renameWorkspace, setRenameWorkspace] = useState<ApiWorkspaceListItem | null>(null);
  const showLabels = size === "expanded";
  const showFloatingRestore = size === "hidden";

  const { unreadCount: unreadNotificationCount, openPanel } = useNotificationContext();
  const hasUnreadNotifications = unreadNotificationCount > 0;

  return (
    <>
      {/* 2차 접기(완전 사라짐) 상태에서 데스크톱 복귀 버튼 */}
      {showFloatingRestore && (
        <button
          type="button"
          onClick={() => onSizeChange("expanded")}
          className="fixed left-4 top-1/2 z-[60] hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200/90 bg-white text-stone-600 shadow-lg ring-1 ring-stone-200/50 backdrop-blur-sm transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-800 hover:shadow-xl active:scale-[0.98] md:flex"
          aria-label={tSidebar("restore")}
          title={tSidebar("restore")}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden
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
        aria-label={tSidebar("collapse")}
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
                aria-label={tSidebar("collapse")}
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
            {navItemDefs.map(({ href, labelKey, icon: Icon }) => {
              const isActive = pathname === href;
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
                    </span>
                    {showLabels && (
                      <span className="min-w-0 flex-1 truncate">{tNav(labelKey)}</span>
                    )}
                  </Link>
                </li>
              );
            })}

            {/* 알림 버튼 — 패널 열기 */}
            <li>
              <button
                type="button"
                onClick={() => { openPanel(); onClose(); }}
                className={`
                  w-full flex items-center rounded-lg text-sm font-medium transition-colors
                  ${showLabels ? "gap-3 px-3 py-2.5" : "justify-center px-2 py-2.5"}
                  text-stone-600 hover:bg-stone-100 hover:text-stone-800
                `}
              >
                <span className="relative shrink-0">
                  <BellIcon className="h-5 w-5 opacity-80" />
                  {!showLabels && hasUnreadNotifications && (
                    <span
                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white"
                      aria-hidden
                    >
                      {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                    </span>
                  )}
                </span>
                {showLabels && (
                  <>
                    <span className="min-w-0 flex-1 truncate text-left">{tNav("notifications")}</span>
                    {hasUnreadNotifications && (
                      <span
                        className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white"
                        aria-hidden
                      >
                        {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                      </span>
                    )}
                  </>
                )}
              </button>
            </li>
          </ul>

          {/* 팀 즐겨찾기 섹션 */}
          {teamFavorites.length > 0 && (
            <div
              className={`${
                showLabels ? "my-4 border-t border-stone-100 pt-4" : "my-3 border-t border-stone-100 pt-3"
              }`}
            >
              {showLabels ? (
                <>
                  <p className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-stone-400">
                    {tSidebar("favoriteTeams")}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {teamFavorites.map((fav) => {
                      const isActive = pathname === `/teams/${fav.team.id}`;
                      return (
                        <li key={fav.id}>
                          <Link
                            href={`/teams/${fav.team.id}`}
                            onClick={onClose}
                            title={fav.team.name}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                              isActive
                                ? "bg-orange-50 text-orange-800"
                                : "text-stone-600 hover:bg-stone-100 hover:text-stone-800"
                            }`}
                          >
                            <svg
                              className="h-3.5 w-3.5 shrink-0 text-amber-400"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                              />
                            </svg>
                            <span className="min-w-0 flex-1 truncate text-xs">
                              {fav.team.name}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                /* collapsed: 즐겨찾기 팀 아이콘만 */
                <div className="space-y-0.5">
                  {teamFavorites.map((fav) => {
                    const isActive = pathname === `/teams/${fav.team.id}`;
                    return (
                      <Link
                        key={fav.id}
                        href={`/teams/${fav.team.id}`}
                        onClick={onClose}
                        title={fav.team.name}
                        className={`flex justify-center rounded-lg px-2 py-2 transition-colors hover:bg-stone-100 ${
                          isActive ? "text-orange-700" : "text-amber-400"
                        }`}
                      >
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                        </svg>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 프로젝트 즐겨찾기 섹션 */}
          {projectFavorites.length > 0 && (
            <div
              className={`${
                showLabels ? "my-4 border-t border-stone-100 pt-4" : "my-3 border-t border-stone-100 pt-3"
              }`}
            >
              {showLabels ? (
                <>
                  <p className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-stone-400">
                    {tSidebar("favoriteProjects")}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {projectFavorites.map((fav) => {
                      const isActive = pathname === `/projects/${fav.project.id}`;
                      return (
                        <li key={fav.id}>
                          <Link
                            href={`/projects/${fav.project.id}`}
                            onClick={onClose}
                            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                              isActive
                                ? "bg-orange-50 text-orange-800"
                                : "text-stone-600 hover:bg-stone-100 hover:text-stone-800"
                            }`}
                          >
                            <svg
                              className="h-3.5 w-3.5 shrink-0 text-amber-400"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                            </svg>
                            <span className="min-w-0 truncate">{fav.project.name}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                /* collapsed: 즐겨찾기 프로젝트 아이콘만 */
                <div className="space-y-0.5">
                  {projectFavorites.map((fav) => {
                    const isActive = pathname === `/projects/${fav.project.id}`;
                    return (
                      <Link
                        key={fav.id}
                        href={`/projects/${fav.project.id}`}
                        onClick={onClose}
                        title={fav.project.name}
                        className={`flex justify-center rounded-lg px-2 py-2 transition-colors hover:bg-stone-100 ${
                          isActive ? "text-orange-700" : "text-amber-400"
                        }`}
                      >
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                        </svg>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div
            className={`${
              showLabels ? "my-4 border-t border-stone-100 pt-4" : "my-3 border-t border-stone-100 pt-3"
            }`}
          >
            {showLabels ? (
              /* expanded: 헤더 + 토글 버튼 + 목록 */
              <>
                <button
                  type="button"
                  onClick={() => setWorkspaceExpanded((v) => !v)}
                  className="flex w-full items-center justify-between px-3 py-1 text-left"
                >
                  <span className="text-xs font-medium uppercase tracking-wider text-stone-400">
                    {tNav("workspace")}
                  </span>
                  <svg
                    className={`h-3.5 w-3.5 text-stone-400 transition-transform ${workspaceExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {workspaceExpanded && (
                  <ul className="mt-1 space-y-0.5">
                    {workspaces.length === 0 ? (
                      <li className="px-3 py-2 text-xs text-stone-400">
                        워크스페이스가 없습니다
                      </li>
                    ) : (
                      workspaces.map((ws) => {
                        const isActive = pathname === `/mywork/${ws.id}`;
                        const displayName = workspaceDisplayName(ws);
                        return (
                          <li key={ws.id} className="group flex items-stretch gap-0.5">
                            <Link
                              href={`/mywork/${ws.id}`}
                              onClick={onClose}
                              title={displayName}
                              className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                                isActive
                                  ? "bg-orange-50 text-orange-800"
                                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-800"
                              }`}
                            >
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold ${
                                  isActive ? "bg-orange-200 text-orange-800" : "bg-stone-200 text-stone-600"
                                }`}
                              >
                                {displayName[0]?.toUpperCase() ?? "W"}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-xs">{displayName}</span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => setRenameWorkspace(ws)}
                              className="mr-1 shrink-0 self-center rounded-md p-1.5 text-stone-400 opacity-70 transition-opacity hover:bg-stone-100 hover:text-stone-600 md:opacity-0 md:group-hover:opacity-100"
                              aria-label={tSidebar("editWorkspaceDisplayName")}
                              title={tSidebar("editWorkspaceDisplayName")}
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                                />
                              </svg>
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                )}
              </>
            ) : (
              /* collapsed: 아이콘만 — 워크스페이스 목록 페이지로 이동 */
              <Link
                href="/mywork"
                onClick={onClose}
                title={tNav("workspace")}
                className={`flex justify-center rounded-lg px-2 py-2.5 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-800`}
              >
                <svg className="h-5 w-5 opacity-80" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                </svg>
              </Link>
            )}
          </div>
        </nav>

        {/* 관리자 버튼 — SUPER_ADMIN 전용 */}
        {isSuperAdmin && (
          <div className={`shrink-0 border-t border-stone-100 ${showLabels ? "p-3" : "p-2"}`}>
            <Link
              href="/admin"
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className={`
                flex items-center rounded-lg text-xs font-medium text-stone-400 transition-colors
                hover:bg-stone-100 hover:text-stone-600
                ${showLabels ? "gap-2 px-3 py-2" : "justify-center px-2 py-2"}
              `}
            >
              <svg
                className="h-4 w-4 shrink-0"
                fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              {showLabels && <span>관리자</span>}
            </Link>
          </div>
        )}
      </aside>

      <WorkspaceSidebarLabelModal
        workspace={renameWorkspace}
        onClose={() => setRenameWorkspace(null)}
        onSaved={() => router.refresh()}
      />
    </>
  );
}
