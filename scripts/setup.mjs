#!/usr/bin/env node
/**
 * scripts/setup.mjs
 *
 * `pnpm run setup` 또는 OS별 스크립트(`setup-mac.sh`, `setup-windows.ps1`)로 실행.
 * (`pnpm setup` 만 치면 pnpm 내장 명령이 실행됨)
 *
 *  0) 사전 점검: Docker 데몬, docker compose, pnpm
 *  1) 환경 변수 파일 확인 / 자동 생성 (.env 없으면 example 복사)
 *  2) 패키지 설치 (pnpm install)
 *  3) PostgreSQL·Redis 컨테이너 기동 + healthcheck 대기
 *  4) DB 마이그레이션 (prisma generate + prisma migrate dev)
 */

import { spawnSync, execFileSync } from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(label, cmd) {
  console.log(`\n  ▶  ${label}`);
  console.log(`     $ ${cmd}\n`);
  const result = spawnSync(cmd, { shell: true, stdio: "inherit", cwd: ROOT });
  if (result.status !== 0) {
    console.error(`\n  ✖  실패: ${label}\n`);
    process.exit(result.status ?? 1);
  }
}

function runSilent(cmd) {
  return spawnSync(cmd, { shell: true, stdio: "pipe", cwd: ROOT });
}

function copyIfMissing(src, dest) {
  if (!existsSync(dest)) {
    copyFileSync(src, dest);
    console.log(`  ✔  생성: ${path.relative(ROOT, dest)}  (← ${path.relative(ROOT, src)} 복사)`);
  } else {
    console.log(`  ·  존재: ${path.relative(ROOT, dest)}  (건너뜀)`);
  }
}

function platformHintDockerDown() {
  const p = process.platform;
  if (p === "darwin") {
    return `
  → macOS: Docker Desktop 앱을 실행한 뒤 메뉴 표시줄 고래 아이콘이
     "실행 중"인지 확인하세요.
     설치: https://docs.docker.com/desktop/install/mac-install/
`;
  }
  if (p === "win32") {
    return `
  → Windows: Docker Desktop을 실행하고, WSL2 백엔드가 켜져 있는지 확인하세요.
     설치: https://docs.docker.com/desktop/install/windows-install/
`;
  }
  return `
  → Linux: Docker 엔진과 docker compose 플러그인이 설치·기동되어 있어야 합니다.
     https://docs.docker.com/engine/install/
`;
}

function getDockerCompose() {
  const v2 = runSilent("docker compose version");
  if (v2.status === 0) {
    return { up: "docker compose up -d --wait", useWaitFlag: true };
  }
  const v1 = runSilent("docker-compose version");
  if (v1.status === 0) {
    // Compose V1에는 --wait 없음 → 기동 후 pg_isready 로 대기
    return { up: "docker-compose up -d", useWaitFlag: false };
  }
  return null;
}

function sleepSyncMs(ms) {
  const sec = Math.max(1, Math.ceil(ms / 1000));
  try {
    if (process.platform === "win32") {
      execFileSync(
        "powershell",
        ["-NoProfile", "-Command", `Start-Sleep -Seconds ${sec}`],
        { stdio: "ignore" },
      );
    } else {
      execFileSync("sleep", [String(sec)], { stdio: "ignore" });
    }
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      /* fallback */
    }
  }
}

function waitForPostgresReady(maxSec = 90) {
  const deadline = Date.now() + maxSec * 1000;
  console.log("     (Postgres 준비 대기 중…)\n");
  while (Date.now() < deadline) {
    const r = runSilent(
      "docker exec elivis-postgres pg_isready -U elivis -d elivis",
    );
    if (r.status === 0) {
      console.log("  ✔  Postgres 가 준비되었습니다.\n");
      return true;
    }
    sleepSyncMs(2000);
  }
  console.error("  ✖  Postgres 가 제한 시간 안에 준비되지 않았습니다.\n");
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 셋업 시작
// ─────────────────────────────────────────────────────────────────────────────

console.log(`
╔══════════════════════════════════════════════════╗
║          Elivis — 개발 환경 셋업 시작              ║
╚══════════════════════════════════════════════════╝`);

console.log("\n─── 사전 점검 ─────────────────────────────────────────────────────────\n");

const pnpmCheck = runSilent("pnpm -v");
if (pnpmCheck.status !== 0) {
  console.error(`  ✖  pnpm 을 찾을 수 없습니다. Node 24+ 와 함께 다음을 실행하세요:`);
  console.error(`     corepack enable\n     corepack prepare pnpm@9.14.2 --activate\n`);
  process.exit(1);
}
console.log(`  ✔  pnpm 사용 가능 (${String(pnpmCheck.stdout).trim()})`);

const dockerInfo = runSilent("docker info");
if (dockerInfo.status !== 0) {
  console.error(`  ✖  Docker 데몬에 연결할 수 없습니다.`);
  console.error(platformHintDockerDown());
  process.exit(1);
}
console.log(`  ✔  Docker 데몬 응답`);

const compose = getDockerCompose();
if (!compose) {
  console.error(`  ✖  docker compose / docker-compose 를 찾을 수 없습니다.`);
  console.error(`     Docker Desktop 최신 버전(Compose V2 포함)을 설치하세요.\n`);
  process.exit(1);
}
console.log(
  `  ✔  Compose 사용: ${compose.up.split(" ").slice(0, 2).join(" ")} …`,
);

// ── 1. 환경 변수 파일 ─────────────────────────────────────────────────────────
console.log("\n─── Step 1 / 4  환경 변수 파일 준비 ──────────────────────────────────\n");

copyIfMissing(path.join(ROOT, "env.example"), path.join(ROOT, ".env"));

// ── 2. 패키지 설치 ────────────────────────────────────────────────────────────
console.log("\n─── Step 2 / 4  패키지 설치 ──────────────────────────────────────────");
run("pnpm install", "pnpm install");

// ── 3. Docker — Postgres + Redis ─────────────────────────────────────────────
console.log("\n─── Step 3 / 4  컨테이너 기동 (PostgreSQL + Redis) ───────────────────");
console.log("     --wait : healthcheck 통과까지 대기\n");

run("Docker Compose 기동", compose.up);
if (!compose.useWaitFlag && !waitForPostgresReady()) {
  process.exit(1);
}

// ── 4. DB 마이그레이션 ────────────────────────────────────────────────────────
console.log("\n─── Step 4 / 4  DB 마이그레이션 ─────────────────────────────────────");
console.log("     prisma generate → prisma migrate dev\n");

run(
  "DB 마이그레이션 (@repo/database db:setup)",
  "pnpm --filter @repo/database db:setup",
);

// ── 완료 ──────────────────────────────────────────────────────────────────────
console.log(`
╔══════════════════════════════════════════════════╗
║          ✅  셋업이 완료되었습니다!                ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  개발 서버 시작   →   pnpm dev                    ║
║                                                  ║
║  각 서비스 주소                                    ║
║    Web    →  http://localhost:3000               ║
║    API    →  http://localhost:4000               ║
║    DB     →  localhost:5432                      ║
║                                                  ║
╚══════════════════════════════════════════════════╝
`);
