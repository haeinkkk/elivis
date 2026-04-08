import { redirect } from "next/navigation";

/** 예전 URL 북마크 → 팀 상세 + 가입 신청 모달 */
export default async function TeamJoinRequestsLegacyRedirect({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    redirect(`/teams/${encodeURIComponent(id)}?tab=members&joinRequests=1`);
}
