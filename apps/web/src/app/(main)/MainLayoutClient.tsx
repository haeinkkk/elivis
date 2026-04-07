"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { logoutAction } from "@/app/actions/auth";
import { setLanguageAction } from "@/app/actions/language";
import { updateStatusAction } from "@/app/actions/users";
import { updateWorkspaceSidebarLabelAction } from "@/app/actions/workspaces";
import type { ApiProjectFavoriteItem } from "@/lib/mappers/project";
import type { ApiTeamFavoriteItem } from "@/lib/mappers/team";
import type { ApiWorkspaceListItem } from "@/lib/mappers/workspace";
import type { UserProfile } from "@/lib/server/user-profile.server";
import {
    AppHeader,
    AppSidebar,
    NotificationContext,
    NotificationPanel,
    NotificationToastStack,
    requestDesktopNotificationPermission,
    TopLoadingBar,
    useNotificationToastQueue,
    useNotifications,
    UserStatusProvider,
} from "@repo/ui";

function getPageTitle(pathname: string | null, tNav: (key: string) => string): string {
    if (!pathname) return tNav("myWork");

    const exact: Record<string, string> = {
        "/mywork": "myWork",
        "/teams": "teams",
        "/teams/new": "newTeam",
        "/projects": "projects",
        "/projects/new": "newProject",
        "/notification": "notifications",
        "/workspace": "workspace",
        "/trash": "trash",
        "/settings": "settings",
        "/pages": "pages",
    };

    const key = exact[pathname];
    if (key) return tNav(key);

    if (pathname.startsWith("/projects/") && pathname !== "/projects") return tNav("projects");
    if (pathname.startsWith("/mywork/") && pathname !== "/mywork") return tNav("myWork");
    if (pathname.startsWith("/teams/") && pathname !== "/teams") return tNav("teams");

    return tNav("myWork");
}

interface MainLayoutClientProps {
    children: React.ReactNode;
    user: UserProfile | null;
    workspaces: ApiWorkspaceListItem[];
    accessToken: string | null;
    teamFavorites: ApiTeamFavoriteItem[];
    projectFavorites: ApiProjectFavoriteItem[];
}

export function MainLayoutClient({
    children,
    user,
    workspaces,
    accessToken,
    teamFavorites,
    projectFavorites,
}: MainLayoutClientProps) {
    const tNav = useTranslations("nav");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarSize, setSidebarSize] = useState<"expanded" | "collapsed" | "hidden">("expanded");
    const pathname = usePathname();
    const title = getPageTitle(pathname, tNav);

    const {
        items: toastItems,
        push: pushToast,
        dismiss: dismissToast,
    } = useNotificationToastQueue();
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(
        accessToken,
        {
            onNotificationNew: pushToast,
        },
    );

    const [notifPanelOpen, setNotifPanelOpen] = useState(false);

    /** 알림 패널을 여는 모든 경로에서 호출 — 브라우저는 클릭 등 제스처가 있을 때만 알림 권한 프롬프트를 허용하는 경우가 많음 */
    function openNotificationPanel() {
        void requestDesktopNotificationPermission();
        setNotifPanelOpen(true);
    }

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                markAsRead,
                markAllAsRead,
                panelOpen: notifPanelOpen,
                openPanel: openNotificationPanel,
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
                        saveWorkspaceSidebarLabel={updateWorkspaceSidebarLabelAction}
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                        <AppHeader
                            onMenuClick={() => setSidebarOpen((o) => !o)}
                            title={title}
                            user={user}
                            logoutAction={logoutAction}
                            persistUserStatus={async (s) => {
                                const r = await updateStatusAction(s);
                                return { ok: r.ok };
                            }}
                            onSelectLocale={(locale) => void setLanguageAction(locale)}
                        />
                        <main className="relative z-0 flex min-h-0 flex-1 flex-col overflow-auto">
                            {children}
                        </main>
                    </div>

                    <NotificationPanel />
                    <NotificationToastStack items={toastItems} onDismiss={dismissToast} />
                </div>
            </UserStatusProvider>
        </NotificationContext.Provider>
    );
}
