import { getTranslations } from "next-intl/server";

import { fetchAdminAuthSettings } from "@/lib/server/admin-auth-settings.server";

import { AdminLdapSettingsClient } from "./AdminLdapSettingsClient";

export default async function AdminSecurityLdapPage() {
    const t = await getTranslations("admin.securityLdapPage");
    const initial = await fetchAdminAuthSettings();

    if (!initial) {
        return (
            <div className="w-full rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface p-6 shadow-sm">
                <p className="text-sm text-stone-600 dark:text-elivis-ink-secondary">{t("loadError")}</p>
            </div>
        );
    }

    return <AdminLdapSettingsClient initial={initial} />;
}
