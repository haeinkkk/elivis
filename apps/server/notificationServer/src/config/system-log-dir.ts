import path from "path";

/**
 * 모노레포 루트의 **`.logs`** (`notificationServer/src/config` 기준 5단계 상위).
 * 예전 `.log` 평면 경로는 미사용. (검색 시 `.log`는 `.logs`와 부분 일치할 수 있음.)
 */
export function getDefaultLogsRootDir(): string {
    return path.resolve(__dirname, "../../../../..", ".logs");
}
