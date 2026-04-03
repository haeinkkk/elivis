"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { TopLoadingBar } from "@/components/TopLoadingBar";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { useNotifications } from "@/hooks/useNotifications";
import type { UserProfile } from "@/lib/users";
import type { ApiWorkspaceListItem } from "@/lib/map-api-workspace";
import type { ApiTeamFavoriteItem } from "@/lib/map-api-team";
import type { ApiProjectFavoriteItem } from "@/lib/map-api-project";
import { UserStatusProvider } from "@/context/UserStatusContext";
import { NotificationContext } from "@/context/NotificationContext";

const titles: Record<string, string> = {
  "/mywork": "할 일",
  "/teams": "팀",
  "/teams/new": "팀 생성",
  "/projects": "프로젝트",
  "/projects/new": "프로젝트 생성",
  "/notification": "알림",
  "/workspace": "워크스페이스",
  "/trash": "휴지통",
  "/settings": "내 설정",
};

function getPageTitle(pathname: string | null): string {
  if (!pathname) return "할 일";
  const exact = titles[pathname];
  if (exact) return exact;
  if (pathname.startsWith("/projects/") && pathname !== "/projects") return "프로젝트";
  if (pathname.startsWith("/mywork/") && pathname !== "/mywork") return "할 일";
  if (pathname.startsWith("/teams/") && pathname !== "/teams") return "팀";
  return "할 일";
}

interface MainLayoutClientProps {
  children: React.ReactNode;
  user: UserProfile | null;
  workspaces: ApiWorkspaceListItem[];
  accessToken: string | null;
  teamFavorites: ApiTeamFavoriteItem[];
  projectFavorites: ApiProjectFavoriteItem[];
}

export function MainLayoutClient({ children, user, workspaces, accessToken, teamFavorites, projectFavorites }: MainLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [sidebarSize, setSidebarSize]   = useState<"expanded" | "collapsed" | "hidden">("expanded");
  const pathname = usePathname();
  const title    = getPageTitle(pathname);

  // 전역 알림 소켓 — Context로 AppSidebar 뱃지 + 헤더 벨 드롭다운이 공유
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications(accessToken);

  const [notifPanelOpen, setNotifPanelOpen] = useState(false);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        panelOpen: notifPanelOpen,
        openPanel: () => setNotifPanelOpen(true),
        closePanel: () => setNotifPanelOpen(false),
      }}
    >
    <UserStatusProvider initialStatus={user?.status ?? "WORKING"}>
      <div className="flex h-screen bg-[#f8f7f5]">
        <TopLoadingBar />
        <AppSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          size={sidebarSize}
          onSizeChange={setSidebarSize}
          isSuperAdmin={user?.systemRole === "SUPER_ADMIN"}
          workspaces={workspaces}
          teamFavorites={teamFavorites}
          projectFavorites={projectFavorites}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader
            onMenuClick={() => setSidebarOpen((o) => !o)}
            title={title}
            user={user}
          />
          <main className="relative z-0 min-h-0 flex-1 overflow-auto">{children}</main>
        </div>

        {/* 통합 알림 패널 — 헤더 벨 + 사이드바 버튼이 공유 */}
        <NotificationPanel />
      </div>
    </UserStatusProvider>
    </NotificationContext.Provider>
  );
}
