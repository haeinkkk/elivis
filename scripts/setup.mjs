#!/usr/bin/env node
/**
 * scripts/setup.mjs
 *
 * `pnpm run setup` 으로 실행. (`pnpm setup` 만 치면 pnpm 내장 명령이 실행됨)
 *
 *  1) 환경 변수 파일 확인 / 자동 생성 (.env 없으면 example 복사)
 *  2) 패키지 설치 (pnpm install)
 *  3) PostgreSQL 컨테이너 기동 + healthcheck 통과까지 대기
 *     (docker compose up -d --wait)
 *  4) DB 마이그레이션 (prisma generate + prisma migrate dev)
 */

import { spawnSync }              from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import { fileURLToPath }           from "node:url";
import path                        from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ─────────────────────────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────────────────────────

function run(label, cmd) {
  console.log(`\n  ▶  ${label}`);
  console.log(`     $ ${cmd}\n`);
  const result = spawnSync(cmd, { shell: true, stdio: "inherit", cwd: ROOT });
  if (result.status !== 0) {
    console.error(`\n  ✖  실패: ${label}\n`);
    process.exit(result.status ?? 1);
  }
}

function copyIfMissing(src, dest) {
  if (!existsSync(dest)) {
    copyFileSync(src, dest);
    console.log(`  ✔  생성: ${path.relative(ROOT, dest)}  (← ${path.relative(ROOT, src)} 복사)`);
  } else {
    console.log(`  ·  존재: ${path.relative(ROOT, dest)}  (건너뜀)`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 셋업 시작
// ─────────────────────────────────────────────────────────────────────────────

console.log(`
╔══════════════════════════════════════════════════╗
║          Elivis — 개발 환경 셋업 시작              ║
╚══════════════════════════════════════════════════╝`);

// ── 1. 환경 변수 파일 ─────────────────────────────────────────────────────────
// .env 파일은 루트 1개로 통합 관리됩니다.
// apps/server 와 apps/web 은 모두 루트 .env 를 직접 참조합니다.
console.log("\n─── Step 1 / 4  환경 변수 파일 준비 ──────────────────────────────────\n");

copyIfMissing(
  path.join(ROOT, "env.example"),
  path.join(ROOT, ".env"),
);

// ── 2. 패키지 설치 ────────────────────────────────────────────────────────────
console.log("\n─── Step 2 / 4  패키지 설치 ──────────────────────────────────────────");
run("pnpm install", "pnpm install");

// ── 3. Docker — PostgreSQL 기동 + 헬스체크 통과 대기 ─────────────────────────
console.log("\n─── Step 3 / 4  PostgreSQL 컨테이너 기동 ─────────────────────────────");
console.log("     (docker-compose.yml › elivis-postgres 서비스)");
console.log("     --wait : healthcheck 가 통과될 때까지 블로킹됩니다.\n");

run(
  "docker compose up -d --wait",
  "docker compose up -d --wait",
);

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
