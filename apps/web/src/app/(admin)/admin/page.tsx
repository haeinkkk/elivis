import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { fetchAdminUsers } from "@/lib/server/admin.server";

export default async function AdminDashboardPage() {
    const tRole = await getTranslations("domain.systemRole");
    const t = await getTranslations("admin.dashboard");
    const users = await fetchAdminUsers();

    if (!users) {
        return (
            <div className="w-full rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-stone-600">{t("loadError")}</p>
            </div>
        );
    }

    const total = users.length;
    const superAdminCount = users.filter((u) => u.systemRole === "SUPER_ADMIN").length;

    return (
        <div className="w-full max-w-full">
            <p className="text-stone-600">{t("intro")}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:mt-8">
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                        {t("statUsers")}
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-stone-800">{total}</p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                        {tRole("SUPER_ADMIN")}
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-stone-800">
                        {superAdminCount}
                    </p>
                </div>
                <div className="rounded-2xl border border-dashed border-stone-200 bg-white/50 p-5 sm:col-span-2 lg:col-span-1">
                    <p className="text-sm font-medium text-stone-700">{t("quickLinks")}</p>
                    <Link
                        href="/admin/users"
                        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
                    >
                        {t("ctaUsers")}
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                            />
                        </svg>
                    </Link>
                </div>
            </div>

            <div className="mt-8 rounded-2xl border border-dashed border-stone-200 bg-white/50 p-6 sm:p-8">
                <p className="text-sm text-stone-500">{t("footer")}</p>
            </div>
        </div>
    );
}
