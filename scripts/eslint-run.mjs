#!/usr/bin/env node
/**
 * pnpm + hoisted node_modules 환경에서 패키지마다 다른 eslint 버전이 잡히는 문제를 피하기 위해
 * 저장소 루트에 설치된 ESLint 9 바이너리만 사용합니다.
 * 각 워크스페이스 lint 스크립트: node <루트까지 상대경로>/scripts/eslint-run.mjs …
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const eslintBin = path.join(rootDir, "node_modules", "eslint", "bin", "eslint.js");

if (!fs.existsSync(eslintBin)) {
    console.error(`eslint-run: not found: ${eslintBin}\nRun pnpm install at the repository root.`);
    process.exit(1);
}

const args = process.argv.slice(2);
const r = spawnSync(process.execPath, [eslintBin, ...args], {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env,
});
process.exit(r.status ?? 1);
