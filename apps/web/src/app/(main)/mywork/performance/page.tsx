import { redirect } from "next/navigation";

/** 예전 메인 메뉴 URL 호환: 관리자 영역으로 이동 */
export default function LegacyMyworkPerformanceRedirect() {
    redirect("/admin/performance");
}
