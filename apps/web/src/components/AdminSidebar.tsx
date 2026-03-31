"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export type AdminSidebarSize = "expanded" | "collapsed" | "hidden";

const adminNavItems = [
    { href: "/admin", labelKey: "navDashboard" as const, icon: DashboardIcon },
    { href: "/admin/users", labelKey: "navUsers" as const, icon: UsersIcon },
] as const;

function DashboardIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
            />
        </svg>
    );
}

function UsersIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.813-2.022M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
            />
        </svg>
    );
}

function ArrowTopRightIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 1.5L21 3m0 0h-5.25M21 3v5.25"
            />
        </svg>
    );
}

interface AdminSidebarProps {
    open: boolean;
    onClose: () => void;
    size: AdminSidebarSize;
    onSizeChange: (s: AdminSidebarSize) => void;
}

export function AdminSidebar({ open, onClose, size, onSizeChange }: AdminSidebarProps) {
    const pathname = usePathname();
    const tSidebar = useTranslations("sidebar");
    const tAdmin = useTranslations("admin.sidebar");
    const showLabels = size === "expanded";
    const showFloatingRestore = size === "hidden";

    return (
        <>
            {showFloatingRestore && (
                <button
                    type="button"
                    onClick={() => onSizeChange("expanded")}
                    className="fixed left-2 top-16 z-60 hidden h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white/90 shadow-sm backdrop-blur md:flex hover:bg-white"
                    aria-label={tSidebar("restore")}
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
          fixed left-0 top-0 z-50 flex h-full max-w-[85vw] flex-col overflow-hidden border-r border-stone-200 bg-white
          transition-[width,opacity,transform] duration-200 ease-out
          ${size === "expanded" ? "w-[280px]" : size === "collapsed" ? "w-[72px]" : "w-0 border-r-0 opacity-0 pointer-events-none"}
          ${open ? "translate-x-0" : "-translate-x-full"} md:static md:transform-none
        `}
            >
                <div
                    className={`flex h-14 shrink-0 items-center gap-2 border-b border-stone-100 ${
                        showLabels ? "px-4" : "justify-center px-2"
                    }`}
                >
                    {showLabels && (
                        <Link href="/admin" className="inline-flex min-w-0 flex-col" onClick={onClose}>
                            <span className="text-lg font-semibold tracking-tight text-stone-800">
                                Elivis
                            </span>
                            <span className="text-[11px] font-medium uppercase tracking-wider text-orange-700/90">
                                관리
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

                <nav className={`flex-1 overflow-y-auto ${showLabels ? "p-3" : "p-2"}`}>
                    <ul className="space-y-0.5">
                        {adminNavItems.map(({ href, labelKey, icon: Icon }) => {
                            const isActive =
                                href === "/admin"
                                    ? pathname === "/admin"
                                    : pathname === href || pathname.startsWith(`${href}/`);
                            return (
                                <li key={href}>
                                    <Link
                                        href={href}
                                        onClick={onClose}
                                        className={`
                      flex items-center rounded-lg text-sm font-medium transition-colors
                      ${showLabels ? "gap-3 px-3 py-2.5" : "justify-center px-2 py-2.5"}
                      ${
                          isActive
                              ? "bg-orange-50 text-orange-800"
                              : "text-stone-600 hover:bg-stone-100 hover:text-stone-800"
                      }
                    `}
                                    >
                                        <Icon className="h-5 w-5 shrink-0 opacity-80" />
                                        {showLabels && (
                                            <span className="min-w-0 flex-1 truncate">
                                                {tAdmin(labelKey)}
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className={`shrink-0 border-t border-stone-100 ${showLabels ? "p-3" : "p-2"}`}>
                    <Link
                        href="/"
                        onClick={onClose}
                        className={`
              flex items-center rounded-lg text-xs font-medium text-stone-500 transition-colors
              hover:bg-stone-100 hover:text-stone-700
              ${showLabels ? "gap-2 px-3 py-2" : "justify-center px-2 py-2"}
            `}
                    >
                        <ArrowTopRightIcon className="h-4 w-4 shrink-0" />
                        {showLabels && <span>{tAdmin("backToApp")}</span>}
                    </Link>
                </div>
            </aside>
        </>
    );
}
