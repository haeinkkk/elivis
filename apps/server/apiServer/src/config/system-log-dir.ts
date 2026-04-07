import path from "path";

/**
 * 기본 로그 디렉터리: 모노레포 루트의 `.log`
 * (`apps/server/apiServer/src/...` 기준 5단계 상위)
 */
export function getDefaultSystemLogDir(): string {
    return path.resolve(__dirname, "../../../../..", ".log");
}
