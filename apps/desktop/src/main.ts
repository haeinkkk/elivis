import { existsSync } from "node:fs";
import path from "node:path";

import { app, BrowserWindow } from "electron";

const isDev =
  process.env.ELECTRON_DEV === "1" || !app.isPackaged;

function resolveWebOutDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "web-out");
  }
  return path.join(__dirname, "..", "..", "web", "out");
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    void win.loadURL("http://localhost:3000");
    win.webContents.openDevTools({ mode: "detach" });
    return;
  }

  const indexHtml = path.join(resolveWebOutDir(), "index.html");
  if (existsSync(indexHtml)) {
    void win.loadFile(indexHtml);
    return;
  }

  console.warn(
    `[desktop] No static export at ${indexHtml}. ` +
      "Build web with ELECTRON_STATIC=1 or run `pnpm --filter web start` and use loadURL fallback.",
  );
  void win.loadURL("http://127.0.0.1:3000");
}

void app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
