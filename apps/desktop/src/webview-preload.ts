import { contextBridge, ipcRenderer } from "electron";

/**
 * webview 게스트(Next 앱)에서 호출 → 호스트(shell)가 `ipc-message`로 받아 메인 프로세스 OS 알림으로 전달.
 */
contextBridge.exposeInMainWorld("elivisNative", {
    showNotification: (title: string, body: string | null): void => {
        ipcRenderer.sendToHost("elivis-native-notification", {
            title,
            body: body ?? "",
        });
    },
});
