/** POST /api/auth/login 응답 `data` */

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
