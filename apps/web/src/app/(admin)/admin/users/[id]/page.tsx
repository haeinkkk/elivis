import { notFound } from "next/navigation";

import type { AdminUserDetail } from "@/lib/admin.server";
import { fetchAdminUser } from "@/lib/admin.server";
import { getMyProfile } from "@/lib/users";

import { AdminEditUserClient } from "./AdminEditUserClient";

interface AdminEditUserPageProps {
    params: Promise<{ id: string }>;
}

export default async function AdminEditUserPage({ params }: AdminEditUserPageProps) {
    const { id } = await params;

    const [user, me] = await Promise.all([fetchAdminUser(id), getMyProfile()]);

    if (!user) notFound();

    return <AdminEditUserClient user={user as AdminUserDetail} isSelf={me?.id === user.id} />;
}
