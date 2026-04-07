import path from "path";

/** 모노레포 루트의 `.log` (`notificationServer/src/config` 기준 5단계 상위) */
export function getDefaultSystemLogDir(): string {
    return path.resolve(__dirname, "../../../../..", ".log");
}
