import { getMyProfile } from "@/lib/server/user-profile.server";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
    const user = await getMyProfile();

    return <SettingsClient user={user} />;
}
