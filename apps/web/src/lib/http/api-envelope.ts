/**
 * 백엔드 공통 JSON 래퍼 (`ok` / `created` 등) — `res.json()` 최상위 형태.
 *
 * 규칙:
 * - `data` 페이로드는 `lib/mappers/*.ts`에 `Api*` 접두사로만 정의한다.
 * - 서버에서 받은 JSON → 화면/도메인 모델로 바꿀 때만 `mapApi…To…` 함수를 쓴다.
 * - `ApiEnvelope<T>` / `Api*` 타입은 `server-only`가 아닌 모듈에 둔다 (클라·서버 액션 공용).
 */

export type ApiEnvelope<T> = {
    code: number;
    message: string;
    data: T;
};
