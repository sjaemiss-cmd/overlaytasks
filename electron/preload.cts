import { contextBridge, ipcRenderer } from "electron";
import type {
  AppSettings,
  Task,
  TaskOrderState,
  WindowMode,
  WindowSize,
  WindowState
} from "./types.js";

contextBridge.exposeInMainWorld("api", {
  getTasks: () => ipcRenderer.invoke("tasks:get") as Promise<Task[]>,
  saveTasks: (tasks: Task[]) => ipcRenderer.invoke("tasks:set", tasks),
  getTaskOrder: () => ipcRenderer.invoke("tasks:order:get") as Promise<TaskOrderState>,
  saveTaskOrder: (state: TaskOrderState) => ipcRenderer.invoke("tasks:order:set", state),
  getSettings: () => ipcRenderer.invoke("settings:get") as Promise<AppSettings>,
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke("settings:set", settings),
  exportSettings: () => ipcRenderer.invoke("settings:export") as Promise<string>,
  importSettings: (payload: string) => ipcRenderer.invoke("settings:import", payload),
  getWindowState: () => ipcRenderer.invoke("window:get") as Promise<WindowState | null>,
  getWindowBounds: () => ipcRenderer.invoke("window:get-bounds") as Promise<WindowState | null>,
  saveWindowState: (state: WindowState) => ipcRenderer.invoke("window:set", state),
  resizeWindow: (size: WindowSize) => ipcRenderer.invoke("window:resize", size),
  setWindowMode: (mode: WindowMode) => ipcRenderer.invoke("window:mode", mode),
  minimize: () => ipcRenderer.invoke("window:minimize"),
  close: () => ipcRenderer.invoke("window:close"),
  setAlwaysOnTop: (enabled: boolean) => ipcRenderer.invoke("window:always-on-top", enabled),
  resetWindowSize: () => ipcRenderer.invoke("window:reset"),
  onWindowModeChanged: (callback: (mode: WindowMode) => void) => {
    const handler = (_event: unknown, mode: WindowMode) => callback(mode);
    ipcRenderer.on("window:mode-changed", handler);
    return () => {
      ipcRenderer.removeListener("window:mode-changed", handler);
    };
  }
});
