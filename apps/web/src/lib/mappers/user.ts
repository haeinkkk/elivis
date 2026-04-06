import type { UserProfile } from "../user/user-types";

/** GET/PATCH /api/users/me 응답 `data` */
export type ApiUserProfile = UserProfile;

/** GET /api/users/search 응답 `data` 한 행 */
export type ApiUserSearchRow = {
    id: string;
    email: string;
    name: string | null;
};
