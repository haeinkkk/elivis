import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { fetchAdminUsers } from "@/lib/server/admin.server";
import { getMyProfile } from "@/lib/server/user-profile.server";

import { AdminUsersTableClient } from "./AdminUsersTableClient";

export default async function AdminUsersPage() {
    const user = await getMyProfile();
    if (!user) {
        redirect("/login");
    }

    const t = await getTranslations("admin.usersPage");
    const users = await fetchAdminUsers();

    if (!users) {
        return (
            <div className="w-full rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface p-6 shadow-sm">
                <p className="text-sm text-stone-600 dark:text-elivis-ink-secondary">{t("loadError")}</p>
            </div>
        );
    }

    return <AdminUsersTableClient users={users} currentUserId={user.id} />;
}
