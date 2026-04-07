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
        if (path === "/admin/performance" || path.startsWith("/admin/performance/"))
            return tHeader("titleOverallPerformance");
        if (path === "/admin/email") return tHeader("titleEmail");
        if (path === "/admin/settings/email" || path.startsWith("/admin/settings/email/"))
            return tHeader("titleSettingsEmail");
        if (path === "/admin/security/public-signup" || path.startsWith("/admin/security/public-signup/"))
            return tHeader("titleSecurityPublicSignup");
        if (path === "/admin/security/ldap" || path.startsWith("/admin/security/ldap/"))
            return tHeader("titleSecurityLdap");
        if (path === "/admin/system-logs" || path.startsWith("/admin/system-logs"))
            return tHeader("titleSystemLogs");
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
                    <main className="relative z-0 flex min-h-0 flex-1 flex-col overflow-auto">
                        {/* (main) 앱과 동일: 콘텐츠는 full-width · text-start */}
                        <div className="w-full min-h-0 flex-1 p-4 text-left sm:p-5 md:p-6 lg:p-8">
                            <div className="w-full min-w-0 max-w-full text-left">{children}</div>
                        </div>
                    </main>
                </div>
            </div>
        </UserStatusProvider>
    );
}
