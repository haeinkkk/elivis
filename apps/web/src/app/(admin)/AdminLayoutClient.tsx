"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { logoutAction } from "@/app/actions/auth";
import { setLanguageAction } from "@/app/actions/language";
import { updateStatusAction } from "@/app/actions/users";
import type { UserProfile } from "@/lib/server/user-profile.server";
import { AdminHeader, AdminSidebar, TopLoadingBar, UserStatusProvider, type AdminSidebarSize } from "@repo/ui";

interface AdminLayoutClientProps {
    children: React.ReactNode;
    user: UserProfile | null;
}

export function AdminLayoutClient({ children, user }: AdminLayoutClientProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarSize, setSidebarSize] = useState<AdminSidebarSize>("expanded");
    const pathname = usePathname();
    const tHeader = useTranslations("admin.header");

    function getAdminPageTitle(path: string | null): string {
        if (!path) return tHeader("fallback");
        if (path === "/admin") return tHeader("titleDashboard");
        if (path === "/admin/users") return tHeader("titleUsers");
        if (path.startsWith("/admin/users")) return tHeader("titleUsers");
        if (path.startsWith("/admin")) return tHeader("titleGeneric");
        return tHeader("fallback");
    }

    const title = getAdminPageTitle(pathname);

    return (
        <UserStatusProvider initialStatus={user?.status ?? "WORKING"}>
            <div className="flex h-screen bg-[#f8f7f5]">
                <TopLoadingBar />
                <AdminSidebar
                    open={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    size={sidebarSize}
                    onSizeChange={setSidebarSize}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                    <AdminHeader
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
                    <main className="relative z-0 min-h-0 flex-1 overflow-auto">{children}</main>
                </div>
            </div>
        </UserStatusProvider>
    );
}
