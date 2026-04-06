import { redirect } from "next/navigation";

import { getMyProfile } from "@/lib/server/user-profile.server";

import { NewProjectPageClient } from "./NewProjectPageClient";

export default async function NewProjectPage() {
    const user = await getMyProfile();
    if (!user) {
        redirect("/login");
    }

    return <NewProjectPageClient currentUser={user} />;
}
