/**
 * 서버 전체 응답 메시지 키 → i18n 경로 테이블
 *
 * 실제 번역 문자열은 packages/i18n/src/locales/*.ts 에 있습니다.
 * 사용법: t(request.lang, MSG.AUTH_LOGIN)
 */
export const MSG = {
    // ── 인증 ──────────────────────────────────────────────────────────────────
    AUTH_SIGNUP: "server.auth.signup",
    AUTH_LOGIN: "server.auth.login",
    AUTH_LOGOUT: "server.auth.logout",
    AUTH_LOGOUT_ALL: "server.auth.logoutAll",
    AUTH_TOKEN_REFRESHED: "server.auth.tokenRefreshed",
    AUTH_EMAIL_REQUIRED: "server.auth.emailRequired",
    AUTH_INVALID_CREDENTIALS: "server.auth.invalidCredentials",
    AUTH_EMAIL_CONFLICT: "server.auth.emailConflict",
    AUTH_REFRESH_TOKEN_REQUIRED: "server.auth.refreshTokenRequired",
    AUTH_REFRESH_TOKEN_INVALID: "server.auth.refreshTokenInvalid",
    AUTH_TOKEN_MISSING: "server.auth.tokenMissing",
    AUTH_TOKEN_INVALID: "server.auth.tokenInvalid",
    AUTH_TOKEN_WRONG_TYPE: "server.auth.tokenWrongType",

    // ── 초기 설치 ──────────────────────────────────────────────────────────────
    SETUP_TOKEN_INVALID: "server.setup.tokenInvalid",
    SETUP_TOKEN_EXPIRED: "server.setup.tokenExpired",

    // ── 권한 ──────────────────────────────────────────────────────────────────
    FORBIDDEN_ADMIN_ONLY: "server.forbidden.adminOnly",
    FORBIDDEN_NOT_MEMBER: "server.forbidden.notMember",
    FORBIDDEN_MANAGER_ONLY: "server.forbidden.managerOnly",

    // ── 프로젝트 ────────────────────────────────────────────────────────────────
    PROJECT_CREATED: "server.project.created",
    PROJECT_FETCHED: "server.project.fetched",
    PROJECT_MEMBER_ADDED: "server.project.memberAdded",
    PROJECT_NAME_REQUIRED: "server.project.nameRequired",
    PROJECT_NOT_FOUND: "server.project.notFound",
    PROJECT_TEAM_NOT_MEMBER: "server.project.teamNotMember",

    // ── 팀 ────────────────────────────────────────────────────────────────────
    TEAM_CREATED: "server.team.created",
    TEAM_LIST_FETCHED: "server.team.listFetched",
    TEAM_NAME_REQUIRED: "server.team.nameRequired",
    TEAM_NAME_DUPLICATE: "server.team.nameDuplicate",
    TEAM_MEMBER_INVALID: "server.team.memberInvalid",
    TEAM_NOT_FOUND: "server.team.notFound",
    TEAM_DETAIL_FETCHED: "server.team.detailFetched",
    TEAM_MEMBER_ADDED: "server.team.memberAdded",
    TEAM_MEMBER_ADD_FORBIDDEN: "server.team.memberAddForbidden",
    TEAM_MEMBER_ALREADY: "server.team.memberAlready",
    TEAM_EDIT_FORBIDDEN: "server.team.editForbidden",
    TEAM_BANNER_UPDATED: "server.team.bannerUpdated",
    TEAM_BANNER_REMOVED: "server.team.bannerRemoved",
    TEAM_BANNER_REQUIRED: "server.team.bannerRequired",
    TEAM_BANNER_INVALID: "server.team.bannerInvalid",
    TEAM_UPDATED: "server.team.updated",
    TEAM_UPDATE_FIELDS_REQUIRED: "server.team.updateFieldsRequired",
    TEAM_INTRO_LAYOUT_INVALID: "server.team.introLayoutInvalid",
    TEAM_DELETED: "server.team.deleted",
    TEAM_DELETE_NAME_MISMATCH: "server.team.deleteNameMismatch",

    // ── 관리자 ────────────────────────────────────────────────────────────────
    ADMIN_USERS_FETCHED: "server.admin.usersFetched",
    ADMIN_USER_FETCHED: "server.admin.userFetched",
    ADMIN_USER_ROLE_UPDATED: "server.admin.userRoleUpdated",
    ADMIN_USER_CREATED: "server.admin.userCreated",
    ADMIN_USER_UPDATED: "server.admin.userUpdated",
    ADMIN_USER_NOT_FOUND: "server.admin.userNotFound",

    // ── 유저 ──────────────────────────────────────────────────────────────────
    USER_PROFILE_FETCHED: "server.user.profileFetched",
    USER_UPDATED: "server.user.updated",
    USER_AVATAR_UPDATED: "server.user.avatarUpdated",
    USER_AVATAR_REMOVED: "server.user.avatarRemoved",
    USER_AVATAR_REQUIRED: "server.user.avatarRequired",
    USER_AVATAR_INVALID: "server.user.avatarInvalid",
    USER_NOT_FOUND: "server.user.notFound",
    USER_SEARCH_RESULTS: "server.user.searchResults",

    // ── 유효성 검사 ────────────────────────────────────────────────────────────
    VALIDATION_INVALID_STATUS: "server.validation.invalidStatus",

    // ── 헬스 체크 ─────────────────────────────────────────────────────────────
    HEALTH_OK: "server.health.ok",
    HEALTH_DB_ERROR: "server.health.dbError",
} as const;

export type MsgKey = keyof typeof MSG;
