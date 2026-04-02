"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { TopLoadingBar } from "@/components/TopLoadingBar";
import type { UserProfile } from "@/lib/users";
import type { ApiWorkspaceListItem } from "@/lib/map-api-workspace";
import { UserStatusProvider } from "@/context/UserStatusContext";

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
}

export function MainLayoutClient({ children, user, workspaces }: MainLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [sidebarSize, setSidebarSize]   = useState<"expanded" | "collapsed" | "hidden">("expanded");
  const pathname = usePathname();
  const title    = getPageTitle(pathname);

  return (
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
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader
            onMenuClick={() => setSidebarOpen((o) => !o)}
            title={title}
            user={user}
          />
          <main className="relative z-0 min-h-0 flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </UserStatusProvider>
  );
}
