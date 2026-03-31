/**
 * Prisma generate (재시도). Windows에서 엔진 DLL rename EPERM이 나는 경우가 있어,
 * 이미 생성된 클라이언트가 있으면 경고만 출력하고 성공으로 처리합니다.
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = join(pkgRoot, "../..");

/** pnpm은 `@prisma+client@버전/.../node_modules/.prisma/client`에 생성한다. */
function prismaGeneratedIndexExists() {
    const flat = join(workspaceRoot, "node_modules/.prisma/client/index.js");
    if (existsSync(flat)) return true;

    const pnpmDir = join(workspaceRoot, "node_modules/.pnpm");
    if (!existsSync(pnpmDir)) return false;

    try {
        for (const entry of readdirSync(pnpmDir)) {
            if (!entry.startsWith("@prisma+client@")) continue;
            const candidate = join(pnpmDir, entry, "node_modules/.prisma/client/index.js");
            if (existsSync(candidate)) return true;
        }
    } catch {
        return false;
    }
    return false;
}

for (let attempt = 0; attempt < 6; attempt++) {
    try {
        execSync("npx prisma generate", { cwd: pkgRoot, stdio: "inherit", env: process.env });
        process.exit(0);
    } catch {
        if (attempt < 5) await delay(400 + attempt * 250);
    }
}

if (prismaGeneratedIndexExists()) {
    console.warn(
        "[@repo/database] prisma generate가 실패했지만 기존 생성 클라이언트가 있어 빌드를 계속합니다. 스키마를 바꿨다면 `pnpm --filter @repo/database db:generate`를 실행하세요.",
    );
    process.exit(0);
}

process.exit(1);
