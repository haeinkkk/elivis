"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, useState, type ComponentType } from "react";
import { useTranslations } from "next-intl";

export type AdminSidebarSize = "expanded" | "collapsed" | "hidden";

type NavLeafDef = {
    kind: "leaf";
    href: string;
    labelKey:
        | "navDashboard"
        | "navUsers"
        | "navOverallPerformance"
        | "navSecurityPublicSignup"
        | "navSecurityLdap"
        | "navSettingsEmail"
        | "navSystemLogs";
    icon: ComponentType<{ className?: string }>;
};

type NavGroupDef = {
    kind: "group";
    id: "security" | "settings";
    labelKey: "navSecurity" | "navSystemSettings";
    icon: ComponentType<{ className?: string }>;
    children: Array<{
        href: string;
        labelKey: "navSecurityPublicSignup" | "navSecurityLdap" | "navSettingsEmail";
        icon: ComponentType<{ className?: string }>;
    }>;
};

const adminNavStructure: (NavLeafDef | NavGroupDef)[] = [
    { kind: "leaf", href: "/admin", labelKey: "navDashboard", icon: DashboardIcon },
    { kind: "leaf", href: "/admin/users", labelKey: "navUsers", icon: UsersIcon },
    { kind: "leaf", href: "/admin/performance", labelKey: "navOverallPerformance", icon: ChartBarIcon },
    {
        kind: "group",
        id: "security",
        labelKey: "navSecurity",
        icon: LockClosedIcon,
        children: [
            {
                href: "/admin/security/public-signup",
                labelKey: "navSecurityPublicSignup",
                icon: UserPlusIcon,
            },
            { href: "/admin/security/ldap", labelKey: "navSecurityLdap", icon: ServerStackIcon },
        ],
    },
    {
        kind: "group",
        id: "settings",
        labelKey: "navSystemSettings",
        icon: CogIcon,
        children: [
            { href: "/admin/settings/email", labelKey: "navSettingsEmail", icon: MailIcon },
        ],
    },
    { kind: "leaf", href: "/admin/system-logs", labelKey: "navSystemLogs", icon: LogsIcon },
];

function ChartBarIcon({ className }: { className?: string }) {
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
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
            />
        </svg>
    );
}

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

function LogsIcon({ className }: { className?: string }) {
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
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
            />
        </svg>
    );
}

function MailIcon({ className }: { className?: string }) {
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
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
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

function LockClosedIcon({ className }: { className?: string }) {
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
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
        </svg>
    );
}

function CogIcon({ className }: { className?: string }) {
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
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
    );
}

function UserPlusIcon({ className }: { className?: string }) {
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
                d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
            />
        </svg>
    );
}

function ServerStackIcon({ className }: { className?: string }) {
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
                d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3v5.25a3 3 0 0 1-3 3m-16.5 0a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3m-19.5 0v-7.5a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3v7.5"
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

function ChevronIcon({ className, open }: { className?: string; open: boolean }) {
    return (
        <svg
            className={`${className ?? ""} transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
    );
}

interface AdminSidebarProps {
    open: boolean;
    onClose: () => void;
    size: AdminSidebarSize;
    onSizeChange: (s: AdminSidebarSize) => void;
}

function leafIsActive(pathname: string, href: string): boolean {
    return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({ open, onClose, size, onSizeChange }: AdminSidebarProps) {
    const pathname = usePathname();
    const tSidebar = useTranslations("sidebar");
    const tAdmin = useTranslations("admin.sidebar");
    const showLabels = size === "expanded";
    const showFloatingRestore = size === "hidden";

    const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(() => new Set());

    /** 접힘은 사용자 토글만 반영 (경로에 맞춰 강제 펼침하면 보안 등이 접히지 않음) */
    const isGroupExpanded = useCallback(
        (id: string) => !collapsedGroupIds.has(id),
        [collapsedGroupIds],
    );

    const toggleGroup = useCallback((id: string) => {
        setCollapsedGroupIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const groupChildActive = useMemo(() => {
        const map: Record<string, boolean> = {};
        for (const item of adminNavStructure) {
            if (item.kind === "group") {
                map[item.id] = item.children.some((c) => leafIsActive(pathname, c.href));
            }
        }
        return map;
    }, [pathname]);

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
                                {tAdmin("brandSubtitle")}
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
                        {adminNavStructure.map((item) => {
                            if (item.kind === "leaf") {
                                const { href, labelKey, icon: Icon } = item;
                                const isActive = leafIsActive(pathname, href);
                                return (
                                    <li key={href}>
                                        <Link
                                            href={href}
                                            onClick={onClose}
                                            title={!showLabels ? tAdmin(labelKey) : undefined}
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
                            }

                            const groupActive = groupChildActive[item.id];
                            const expanded = isGroupExpanded(item.id);
                            const GroupIcon = item.icon;

                            if (!showLabels) {
                                return (
                                    <li key={item.id} className="space-y-0.5">
                                        {item.children.map((child) => {
                                            const ChildIcon = child.icon;
                                            const isActive = leafIsActive(pathname, child.href);
                                            return (
                                                <Link
                                                    key={child.href}
                                                    href={child.href}
                                                    onClick={onClose}
                                                    title={tAdmin(child.labelKey)}
                                                    className={`
                          flex items-center justify-center rounded-lg px-2 py-2.5 text-sm font-medium transition-colors
                          ${
                              isActive
                                  ? "bg-orange-50 text-orange-800"
                                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-800"
                          }
                        `}
                                                >
                                                    <ChildIcon className="h-5 w-5 shrink-0 opacity-80" />
                                                </Link>
                                            );
                                        })}
                                    </li>
                                );
                            }

                            return (
                                <li key={item.id} className="space-y-0.5">
                                    <button
                                        type="button"
                                        onClick={() => toggleGroup(item.id)}
                                        className={`
                      flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors
                      ${
                          groupActive
                              ? "text-orange-800"
                              : "text-stone-700 hover:bg-stone-50 hover:text-stone-800"
                      }
                    `}
                                        aria-expanded={expanded}
                                    >
                                        <GroupIcon className="h-5 w-5 shrink-0 opacity-80" />
                                        <span className="min-w-0 flex-1 truncate text-left">
                                            {tAdmin(item.labelKey)}
                                        </span>
                                        <ChevronIcon className="h-4 w-4 shrink-0 opacity-70" open={expanded} />
                                    </button>
                                    {expanded && (
                                        <ul className="ml-2 space-y-0.5 border-l border-stone-100 pl-2">
                                            {item.children.map((child) => {
                                                const ChildIcon = child.icon;
                                                const isActive = leafIsActive(pathname, child.href);
                                                return (
                                                    <li key={child.href}>
                                                        <Link
                                                            href={child.href}
                                                            onClick={onClose}
                                                            className={`
                                flex items-center gap-2 rounded-lg py-1.5 pl-1 pr-2 text-xs font-medium transition-colors
                                ${
                                    isActive
                                        ? "bg-orange-50 text-orange-800"
                                        : "text-stone-500 hover:bg-stone-100 hover:text-stone-700"
                                }
                              `}
                                                        >
                                                            <ChildIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                                                            <span className="min-w-0 flex-1 truncate">
                                                                {tAdmin(child.labelKey)}
                                                            </span>
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
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
