# Windows all-in-one setup: deps + Docker (Postgres/Redis) + Prisma migrate
# Run from repo root: pnpm run setup:win
# Or: powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1
#
# NOTE: Keep this file ASCII-only. Windows PowerShell 5.1 mis-parses UTF-8 without BOM
# and breaks strings (Korean text becomes mojibake and triggers parser errors).

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

Write-Host ""
Write-Host "==========================================================="
Write-Host "  Elivis setup (Windows)"
Write-Host "==========================================================="
Write-Host ""
Write-Host "  Prerequisites:"
Write-Host "    - Node.js 24.14+  (node -v)"
Write-Host "    - pnpm 9.x        (corepack enable; corepack prepare pnpm@9.14.2 --activate)"
Write-Host "    - Docker Desktop running (WSL2 backend recommended)"
Write-Host ""
Write-Host "  This script will:"
Write-Host "    1. Copy env.example to .env if .env is missing"
Write-Host "    2. Run pnpm install"
Write-Host "    3. Run docker compose up (Postgres + Redis)"
Write-Host "    4. Run Prisma generate and migrate dev"
Write-Host ""

$setupJs = Join-Path $Root "scripts\setup.mjs"
& node $setupJs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
