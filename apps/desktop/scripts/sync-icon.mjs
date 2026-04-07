/**
 * 데스크톱 앱 아이콘(웹과 별도):
 * - Windows: `icons/windows/icon.ico` 또는 `icons/windows/favicon.ico` → build·dist `icon.ico`
 * - macOS: `icons/mac/icon.icns` 또는 `icons/mac/favicon.icns` → `build/icon.icns`
 *
 * Windows ICO 없으면 `apps/web/public/favicon.ico` 폴백.
 */
import { copyFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(__dirname, "..");
const winDir = path.join(desktopRoot, "icons", "windows");
const macDir = path.join(desktopRoot, "icons", "mac");
const winSrc =
    [path.join(winDir, "icon.ico"), path.join(winDir, "favicon.ico")].find((p) => existsSync(p)) ??
    null;
const macSrc =
    [path.join(macDir, "icon.icns"), path.join(macDir, "favicon.icns")].find((p) => existsSync(p)) ??
    null;
const faviconFallback = path.join(desktopRoot, "..", "web", "public", "favicon.ico");

const buildDir = path.join(desktopRoot, "build");
const distDir = path.join(desktopRoot, "dist");
const destIcoBuild = path.join(buildDir, "icon.ico");
const destIcoDist = path.join(distDir, "icon.ico");
const destIcnsBuild = path.join(buildDir, "icon.icns");

const icoSource = winSrc ?? (existsSync(faviconFallback) ? faviconFallback : null);

if (!icoSource) {
    console.warn(
        "[desktop] icons/windows/*.ico 또는 apps/web/public/favicon.ico 없음 — ICO 동기화 생략",
    );
} else {
    mkdirSync(buildDir, { recursive: true });
    mkdirSync(distDir, { recursive: true });
    copyFileSync(icoSource, destIcoBuild);
    copyFileSync(icoSource, destIcoDist);
    console.log(`[desktop] ${path.relative(desktopRoot, icoSource)} → build/icon.ico, dist/icon.ico`);
}

if (macSrc) {
    mkdirSync(buildDir, { recursive: true });
    copyFileSync(macSrc, destIcnsBuild);
    console.log(`[desktop] ${path.relative(desktopRoot, macSrc)} → build/icon.icns`);
} else {
    try {
        if (existsSync(destIcnsBuild)) unlinkSync(destIcnsBuild);
    } catch {
        /* noop */
    }
}

if (!icoSource && !macSrc) {
    process.exit(0);
}
