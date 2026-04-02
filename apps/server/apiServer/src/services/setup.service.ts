import { randomBytes } from "node:crypto";

// ─────────────────────────────────────────────────────────────────────────────
// 메모리 내 Setup Token
//  - 서버 최초 실행 시, DB에 유저가 없으면 토큰이 생성됩니다.
//  - 첫 번째 SUPER_ADMIN 계정이 만들어지면 즉시 null 로 초기화됩니다.
//  - 서버를 재시작하면 항상 초기화됩니다.
// ─────────────────────────────────────────────────────────────────────────────

let _token: string | null = null;

/** 16자리 랜덤 hex 토큰을 생성하고 메모리에 저장합니다. */
export function initSetupToken(): string {
    _token = randomBytes(8).toString("hex"); // 8 bytes → 16 hex chars
    return _token;
}

/** 현재 저장된 토큰을 반환합니다. 활성 토큰이 없으면 null. */
export function getSetupToken(): string | null {
    return _token;
}

/** 입력된 토큰이 메모리의 토큰과 일치하는지 검증합니다. */
export function validateSetupToken(input: string): boolean {
    return _token !== null && _token === input;
}

/** 토큰을 무효화합니다. 첫 번째 SUPER_ADMIN 생성 후 반드시 호출하세요. */
export function clearSetupToken(): void {
    _token = null;
}

/** Setup 모드(토큰이 활성 상태)인지 확인합니다. */
export function isSetupModeActive(): boolean {
    return _token !== null;
}
