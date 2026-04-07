import path from "path";

/**
 * 기본 로그 루트: 모노레포 루트의 **`.logs`** (끝에 `s`).
 * 예전 루트 `.log`(평면) 경로는 쓰지 않습니다. 에디터에서 문자열 `.log`만 검색하면 `.logs` 줄이 함께 잡힐 수 있습니다.
 * 일별 하위 디렉터리(`YYYY-MM-DD/`) 안에 NDJSON 파일을 둡니다.
 */
export function getDefaultLogsRootDir(): string {
    return path.resolve(__dirname, "../../../../..", ".logs");
}
