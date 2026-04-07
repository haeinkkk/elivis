/**
 * 개발 시 Windows 작업 관리자·토스트가 `electron.exe` 대신 `elivis.exe`로 보이게 함.
 * `node_modules/electron/dist` 안에 `electron.exe` 복사본을 `elivis.exe`로 두고 같은 경로에서 실행 (DLL 의존성 유지).
 */
import { spawn } from "node:child_process";
import { copyFileSync, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const electronPath = require("electron");
const mainRel = process.argv[2] ?? "dist/main.js";
const mainJs = path.isAbsolute(mainRel) ? mainRel : path.join(desktopRoot, mainRel);

function resolveExecutable() {
    if (process.platform !== "win32") {
        return electronPath;
    }
    const dir = path.dirname(electronPath);
    const elivis = path.join(dir, "elivis.exe");
    if (
        !existsSync(elivis) ||
        statSync(electronPath).mtimeMs > statSync(elivis).mtimeMs
    ) {
        copyFileSync(electronPath, elivis);
    }
    return elivis;
}

const exe = resolveExecutable();
const child = spawn(exe, [mainJs], {
    cwd: desktopRoot,
    stdio: "inherit",
    env: process.env,
    shell: false,
});

child.on("exit", (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }
    process.exit(code ?? 0);
});
