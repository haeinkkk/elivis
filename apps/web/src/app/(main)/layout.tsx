import { redirect } from "next/navigation";

import { getMyProfile } from "@/lib/users";
import { fetchWorkspaceList } from "@/lib/workspaces.server";
import { MainLayoutClient } from "./MainLayoutClient";

// 인증 보호는 proxy.ts 에서 처리합니다.
// 이 layout 은 유저 프로필을 fetch 해서 클라이언트 레이아웃에 전달합니다.
// getMyProfile() 이 null 을 반환하는 경우(서버 연결 실패 · 토큰 만료)에는 /login 으로 리다이렉트합니다.

export default async function MainLayout({ children }: { children: React.ReactNode }) {
    const [user, workspaces] = await Promise.all([
        getMyProfile(),
        fetchWorkspaceList(),
    ]);

    if (!user) {
        redirect("/login");
    }

    return (
        <MainLayoutClient user={user} workspaces={workspaces ?? []}>
            {children}
        </MainLayoutClient>
    );
}
