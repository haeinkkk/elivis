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
            <div className="w-full p-4 text-left sm:p-5 md:p-6 lg:p-8">
                <div className="max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                    <p className="text-sm text-stone-600">{t("loadError")}</p>
                </div>
            </div>
        );
    }

    return <AdminUsersTableClient users={users} currentUserId={user.id} />;
}
