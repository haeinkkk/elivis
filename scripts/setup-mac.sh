#!/usr/bin/env bash
# macOS(및 Linux)용 올인원 셋업: 의존성 + Docker(Postgres·Redis) + Prisma 마이그레이션
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Elivis 올인원 셋업 — macOS / Linux"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  사전 요구:"
echo "    • Node.js 24.14+  (node -v)"
echo "    • pnpm 9.x        (corepack enable 후 corepack prepare pnpm@9.14.2 --activate)"
echo "    • Docker Desktop (mac) 또는 Docker Engine (Linux) — 지금 실행 중이어야 함"
echo ""
echo "  이 스크립트는 다음을 순서대로 실행합니다:"
echo "    1) .env 없으면 env.example 복사"
echo "    2) pnpm install"
echo "    3) docker compose up (Postgres + Redis)"
echo "    4) Prisma generate + migrate dev"
echo ""

exec node "$ROOT/scripts/setup.mjs"
