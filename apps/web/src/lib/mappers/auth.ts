/** POST /api/auth/login 응답 `data` */
/** POST /api/auth/signup 성공 시에도 동일 형태(accessToken·refreshToken·user) */

export type ApiAuthUser = {
    id: string;
    email: string;
    name: string | null;
    systemRole: "SUPER_ADMIN" | "USER";
};

export type ApiAuthLoginData = {
    accessToken: string;
    refreshToken: string;
    user: ApiAuthUser;
};
