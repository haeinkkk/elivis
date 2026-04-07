import path from "path";

import { contextBridge, ipcRenderer } from "electron";

/** webview `preload` 속성에는 절대 경로가 필요합니다. */
const webviewPreloadPath = path.join(__dirname, "webview-preload.js");

contextBridge.exposeInMainWorld("elivisDesktop", {
    platform: process.platform,
    /** webview에 넣을 절대 경로 (`preload`는 `src` 지정 전에 설정) */
    getWebviewPreloadPath: (): string => webviewPreloadPath,
    /** Windows/macOS 시스템 알림(토스트) — 메인 프로세스에서 표시 */
    showNativeNotification: (payload: { title: string; body: string }): Promise<void> =>
        ipcRenderer.invoke("desktop:show-native-notification", payload),
    /** 셸이 앱 URL을 받아 webview에 넣을 때 */
    onShellStartApp: (cb: (url: string) => void) => {
        ipcRenderer.on("shell:start-app", (_e, url: string) => {
            cb(url);
        });
    },
    /** 오프라인/오류 화면에서 다시 시도 */
    retryShell: (): Promise<void> => ipcRenderer.invoke("desktop:retry-shell"),
});
