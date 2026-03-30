import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("elivisDesktop", {
  platform: process.platform,
});
