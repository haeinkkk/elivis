/** GET/PATCH `/api/admin/smtp` 공개 페이로드 (비밀번호 미포함) */
export interface ApiAdminSmtpSettings {
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    rejectUnauthorized: boolean;
    authUser: string;
    hasAuthPass: boolean;
    fromEmail: string;
    fromName: string;
    updatedAt: string;
}
