import { redirect } from "next/navigation";

/** 이전 경로 호환 — 시스템 설정 › 이메일로 이동 */
export default function AdminEmailRedirectPage() {
    redirect("/admin/settings/email");
}
