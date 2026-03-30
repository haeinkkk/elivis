"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { TopLoadingBar } from "@/components/TopLoadingBar";

const AUTH_KEY = "elivis-logged-in";

const titles: Record<string, string> = {
  "/": "대시보드",
  "/mywork": "내작업",
  "/teams": "팀",
  "/teams/new": "팀 생성",
  "/projects": "프로젝트",
  "/projects/new": "프로젝트 생성",
  "/notification": "알림",
  "/workspace": "워크스페이스",
  "/trash": "휴지통",
};

function getPageTitle(pathname: string | null): string {
  if (!pathname) return "홈";
  const exact = titles[pathname];
  if (exact) return exact;
  if (pathname.startsWith("/projects/") && pathname !== "/projects") return "프로젝트";
  if (pathname.startsWith("/mywork/") && pathname !== "/mywork") return "프로젝트";
  return "홈";
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSize, setSidebarSize] = useState<
    "expanded" | "collapsed" | "hidden"
  >("expanded");
  const [authChecked, setAuthChecked] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const isLoggedIn =
      typeof window !== "undefined" && !!window.sessionStorage.getItem(AUTH_KEY);
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    setAuthChecked(true);
  }, [router]);

  const title = getPageTitle(pathname);

  return (
    <div className="flex h-screen bg-[#f8f7f5]">
      <TopLoadingBar />
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        size={sidebarSize}
        onSizeChange={setSidebarSize}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader onMenuClick={() => setSidebarOpen((o) => !o)} title={title} />
        <main className="min-h-0 flex-1 overflow-auto">
          {authChecked ? children : (
            <div className="flex h-full min-h-[200px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-700" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
