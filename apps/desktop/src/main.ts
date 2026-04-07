import { existsSync } from "node:fs";
import path from "node:path";

import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, Notification, shell, Tray } from "electron";
import type { MenuItemConstructorOptions } from "electron";

import { PACKAGED_WEB_URL } from "./packagedWebUrl";

const isDev = process.env.ELECTRON_DEV === "1" || !app.isPackaged;

/** 작업 표시줄·Windows 토스트 헤더 등에 "Electron" 대신 표시 (package.json name 이 @repo/... 일 때 특히 필요) */
app.setName("Elivis");
/** Windows: 알림·작업 표시줄 그룹 — `electron-builder` 의 `appId` 와 동일. 공식 권장은 `app.ready` 이전 호출 */
if (process.platform === "win32") {
    app.setAppUserModelId("com.elivis.desktop");
}

const GITHUB_REPO_URL = "https://github.com/haeinkkk/elivis";
/** 저장소 `docs/` 폴더 (GitHub에서 보기) */
const GITHUB_DOCS_URL = `${GITHUB_REPO_URL}/tree/main/docs`;

let mainWindow: BrowserWindow | null = null;
/** true면 실제로 앱을 종료(메뉴·트레이·모달·Cmd+Q 등). false일 때 X는 모달로 동작 */
let isQuittingApp = false;
let tray: Tray | null = null;

/** 패키지 루트 기준 `static/` (빌드 후 `dist` 옆) */
function staticFile(...segments: string[]): string {
    return path.join(__dirname, "..", "static", ...segments);
}

/** `icons/windows/*.ico` 또는 `sync-icon` 결과 `dist/icon.ico` (절대 경로) */
function resolveWindowIcon(): string | undefined {
    const candidates = [
        path.join(__dirname, "icon.ico"),
        path.join(__dirname, "..", "icons", "windows", "icon.ico"),
        path.join(__dirname, "..", "icons", "windows", "favicon.ico"),
        path.join(__dirname, "..", "build", "icon.ico"),
        path.join(__dirname, "..", "..", "web", "public", "favicon.ico"),
    ];
    for (const candidate of candidates) {
        const p = path.resolve(candidate);
        if (existsSync(p)) return p;
    }
    return undefined;
}

/** Windows 작업 표시줄·창 프레임 — `NativeImage` 우선(문자열 경로만 넘기면 기본 Electron 아이콘으로 남는 경우가 있음) */
function getBrowserWindowIcon(): Electron.NativeImage | string | undefined {
    const p = resolveWindowIcon();
    if (!p) return undefined;
    const img = nativeImage.createFromPath(p);
    if (!img.isEmpty()) return img;
    return p;
}

/** 시스템 알림용 — favicon 기반 `NativeImage`(토스트에서 앱 아이콘으로 잘 나오게) */
function resolveNotificationIcon(): Electron.NativeImage | string | undefined {
    const p = resolveWindowIcon();
    if (!p) return undefined;
    try {
        const img = nativeImage.createFromPath(p);
        return img.isEmpty() ? p : img;
    } catch {
        return p;
    }
}

function buildNativeNotificationOptions(payload: { title: string; body: string }): Electron.NotificationConstructorOptions {
    const line1 = payload.title.trim();
    const line2 = (payload.body || "").trim();
    const icon = resolveNotificationIcon();

    const base: Electron.NotificationConstructorOptions = {
        title: "Elivis",
        silent: false,
        ...(icon ? { icon } : {}),
    };

    /** macOS: 상단 제목은 Elivis, 그 아래 한 줄은 알림 유형 등 */
    if (process.platform === "darwin") {
        return {
            ...base,
            ...(line1 ? { subtitle: line1 } : {}),
            body: line2 || (line1 ? undefined : "새 알림"),
        };
    }

    /** Windows / Linux: 본문에 알림 제목·내용을 이어 붙임 */
    const body = [line1, line2].filter(Boolean).join("\n") || "새 알림";
    return { ...base, body };
}

function normalizeRemoteWebUrl(raw: string | undefined): string | undefined {
    const s = raw?.trim();
    if (!s) return undefined;
    let u = s;
    if (!/^https?:\/\//i.test(u)) {
        u = `https://${u}`;
    }
    try {
        const parsed = new URL(u);
        return parsed.href.endsWith("/") ? parsed.href : `${parsed.href}/`;
    } catch {
        return undefined;
    }
}

async function checkInternetReachable(): Promise<boolean> {
    const probes = ["https://www.gstatic.com/generate_204", "https://1.1.1.1"];
    for (const url of probes) {
        try {
            const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(4000) });
            if (res.ok || res.status === 204 || res.status === 405) return true;
        } catch {
            /* 다음 URL 시도 */
        }
    }
    return false;
}

async function checkDevServerReachable(): Promise<boolean> {
    try {
        const res = await fetch("http://127.0.0.1:3000", {
            method: "GET",
            signal: AbortSignal.timeout(6000),
            redirect: "manual",
        });
        return res.status < 500;
    } catch {
        return false;
    }
}

type AppTarget =
    | { kind: "app"; url: string }
    | { kind: "offline" }
    | { kind: "noserver" }
    | { kind: "nobuild" };

async function resolveAppTarget(): Promise<AppTarget> {
    if (isDev) {
        const ok = await checkDevServerReachable();
        if (!ok) return { kind: "noserver" };
        return { kind: "app", url: "http://localhost:3000/" };
    }

    /** 패키징된 앱: `packagedWebUrl.ts`에 하드코딩된 배포 웹 URL */
    const remote = normalizeRemoteWebUrl(PACKAGED_WEB_URL);
    if (!remote) {
        return { kind: "nobuild" };
    }

    if (process.env.ELIVIS_DESKTOP_SKIP_INTERNET_CHECK === "1") {
        return { kind: "app", url: remote };
    }

    const online = await checkInternetReachable();
    if (!online) {
        return { kind: "offline" };
    }

    return { kind: "app", url: remote };
}

function showMainWindow(): void {
    const w = mainWindow;
    if (!w || w.isDestroyed()) return;
    w.show();
    w.focus();
    if (process.platform !== "darwin") {
        w.setSkipTaskbar(false);
    }
}

function setupTray(): void {
    const iconPath = resolveWindowIcon();
    if (!iconPath) return;
    const image = nativeImage.createFromPath(iconPath);
    if (image.isEmpty()) return;
    const trayIcon = image.resize({ width: 16, height: 16 });
    tray = new Tray(trayIcon);
    tray.setToolTip("Elivis");

    const menu = Menu.buildFromTemplate([
        {
            label: "Elivis 열기",
            click: () => {
                showMainWindow();
            },
        },
        { type: "separator" },
        {
            label: "종료",
            click: () => {
                isQuittingApp = true;
                app.quit();
            },
        },
    ]);
    tray.setContextMenu(menu);

    tray.on("click", () => {
        if (process.platform === "darwin") return;
        showMainWindow();
    });
}

function beginShellFlow(win: BrowserWindow): void {
    void win.loadFile(staticFile("shell.html"));
    win.webContents.once("did-finish-load", () => {
        void (async () => {
            if (win.isDestroyed()) return;
            const target = await resolveAppTarget();
            if (win.isDestroyed()) return;

            if (target.kind === "offline") {
                void win.loadFile(staticFile("offline.html"));
                return;
            }
            if (target.kind === "noserver") {
                void win.loadFile(staticFile("noserver.html"));
                return;
            }
            if (target.kind === "nobuild") {
                void win.loadFile(staticFile("nobuild.html"));
                return;
            }
            win.webContents.send("shell:start-app", target.url);
        })();
    });
}

function createWindow(): void {
    const icon = getBrowserWindowIcon();
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        show: false,
        backgroundColor: "#f8f7f5",
        ...(icon ? { icon } : {}),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            /** 일부 환경에서 sandbox 기본값이 preload·contextBridge 노출을 막는 경우가 있어 명시 */
            sandbox: false,
            webviewTag: true,
        },
    });

    mainWindow = win;

    win.on("close", (e) => {
        if (isQuittingApp) return;
        e.preventDefault();
        void (async () => {
            if (win.isDestroyed()) return;
            const { response } = await dialog.showMessageBox(win, {
                type: "question",
                title: "Elivis",
                message: "창을 닫으시겠습니까?",
                detail: "시스템 트레이로 최소화하거나 앱을 완전히 종료할 수 있습니다.",
                buttons: ["시스템 트레이로", "완전 종료", "취소"],
                defaultId: 2,
                cancelId: 2,
                noLink: true,
            });
            if (win.isDestroyed()) return;
            if (response === 0) {
                win.hide();
                if (process.platform !== "darwin") {
                    win.setSkipTaskbar(true);
                }
            } else if (response === 1) {
                isQuittingApp = true;
                app.quit();
            }
        })();
    });

    win.on("closed", () => {
        if (mainWindow === win) {
            mainWindow = null;
        }
    });

    win.once("ready-to-show", () => {
        /** Windows 작업 표시줄 아이콘이 생성자만으로는 안 바뀌는 경우가 있어 표시 직전에 한 번 더 적용 */
        const again = getBrowserWindowIcon();
        if (again) {
            win.setIcon(again);
        }
        win.show();
        if (isDev) {
            win.webContents.openDevTools({ mode: "detach" });
        }
    });
    beginShellFlow(win);
}

function setupApplicationMenu(): void {
    const openIntro = (): void => {
        void shell.openExternal(GITHUB_REPO_URL);
    };
    const openDocs = (): void => {
        void shell.openExternal(GITHUB_DOCS_URL);
    };

    const template: MenuItemConstructorOptions[] = [
        {
            label: "Elivis",
            submenu: [
                { label: "intro", click: openIntro },
                { type: "separator" },
                {
                    label: "Exit",
                    accelerator: process.platform === "darwin" ? "Command+Q" : "Control+Q",
                    click: () => {
                        isQuittingApp = true;
                        app.quit();
                    },
                },
            ],
        },
        {
            label: "Help",
            submenu: [{ label: "document", click: openDocs }],
        },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

void app.whenReady().then(() => {
    setupApplicationMenu();

    ipcMain.handle("desktop:retry-shell", () => {
        const w = mainWindow;
        if (w && !w.isDestroyed()) {
            beginShellFlow(w);
        }
    });

    ipcMain.handle(
        "desktop:show-native-notification",
        (_event, payload: { title: string; body: string }) => {
            if (!Notification.isSupported()) return;
            const n = new Notification(buildNativeNotificationOptions(payload));
            n.on("click", () => {
                showMainWindow();
            });
            /** Electron 메인 프로세스: 생성만으로는 표시되지 않음 — 반드시 `show()` 필요 */
            n.show();
        },
    );

    createWindow();
    setupTray();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        } else {
            showMainWindow();
        }
    });
});

app.on("before-quit", () => {
    isQuittingApp = true;
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
