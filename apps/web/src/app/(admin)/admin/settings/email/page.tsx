import { getTranslations } from "next-intl/server";

import { fetchAdminSmtpSettings } from "@/lib/server/admin-smtp.server";

import { AdminEmailSettingsClient } from "./AdminEmailSettingsClient";

export default async function AdminSettingsEmailPage() {
    const t = await getTranslations("admin.emailPage");
    const initial = await fetchAdminSmtpSettings();

    if (!initial) {
        return (
            <div className="w-full rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-stone-600">{t("loadError")}</p>
            </div>
        );
    }

    return <AdminEmailSettingsClient initial={initial} />;
}
