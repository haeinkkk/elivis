import { redirect } from "next/navigation";

import { getMyProfile } from "@/lib/users";

import { AdminLayoutClient } from "./AdminLayoutClient";

export default async function AdminGroupLayout({ children }: { children: React.ReactNode }) {
    const user = await getMyProfile();

    if (!user) {
        redirect("/login");
    }
    if (user.systemRole !== "SUPER_ADMIN") {
        redirect("/");
    }

    return <AdminLayoutClient user={user}>{children}</AdminLayoutClient>;
}
