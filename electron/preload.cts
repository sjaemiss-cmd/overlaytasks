import { contextBridge, ipcRenderer } from "electron";
import type {
  AppSettings,
  CloudConfig,
  CloudConfigStatus,
  GoogleOAuthStartResult,
  ProfileSummary,
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

  getCloudConfig: () => ipcRenderer.invoke("cloud:config:get") as Promise<CloudConfig>,
  getCloudConfigStatus: () => ipcRenderer.invoke("cloud:config:status") as Promise<CloudConfigStatus>,
  setCloudConfig: (config: CloudConfig) => ipcRenderer.invoke("cloud:config:set", config),

  getDeviceId: () => ipcRenderer.invoke("device:id") as Promise<string>,

  getActiveProfileKey: () => ipcRenderer.invoke("profiles:active:get") as Promise<string>,
  getActiveProfileSummary: () => ipcRenderer.invoke("profiles:active:summary") as Promise<ProfileSummary | null>,
  setActiveProfileKey: (profileKey: string) => ipcRenderer.invoke("profiles:active:set", profileKey),

  onAuthDeepLink: (callback: (url: string) => void) => {
    const handler = (_event: unknown, url: string) => callback(url);
    ipcRenderer.on("auth:deep-link", handler);
    return () => {
      ipcRenderer.removeListener("auth:deep-link", handler);
    };
  },

  startGoogleLogin: () => ipcRenderer.invoke("auth:start-google") as Promise<GoogleOAuthStartResult>,
  signOut: () => ipcRenderer.invoke("auth:signout"),

  onAuthSessionChanged: (callback: (profileKey: string) => void) => {
    const handler = (_event: unknown, profileKey: string) => callback(profileKey);
    ipcRenderer.on("auth:session-changed", handler);
    return () => {
      ipcRenderer.removeListener("auth:session-changed", handler);
    };
  },

  onTasksChanged: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on("tasks:changed", handler);
    return () => {
      ipcRenderer.removeListener("tasks:changed", handler);
    };
  },

  onSyncError: (callback: (error: string) => void) => {
    const handler = (_event: unknown, error: string) => callback(error);
    ipcRenderer.on("sync:error", handler);
    return () => {
      ipcRenderer.removeListener("sync:error", handler);
    };
  },

  onDebugLog: (callback: (message: string) => void) => {
    const handler = (_event: unknown, message: string) => callback(message);
    ipcRenderer.on("debug:log", handler);
    return () => {
      ipcRenderer.removeListener("debug:log", handler);
    };
  },

  getSettings: () => ipcRenderer.invoke("settings:get") as Promise<AppSettings>,
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke("settings:set", settings),
  exportSettings: () => ipcRenderer.invoke("settings:export") as Promise<string>,
  importSettings: (payload: string) => ipcRenderer.invoke("settings:import", payload),
  resetSync: () => ipcRenderer.invoke("tasks:reset-local-and-sync"),
  undeleteAll: () => ipcRenderer.invoke("tasks:undelete-all"),
  getWindowState: () => ipcRenderer.invoke("window:get") as Promise<WindowState | null>,
  getWindowBounds: () => ipcRenderer.invoke("window:get-bounds") as Promise<WindowState | null>,
  saveWindowState: (state: WindowState) => ipcRenderer.invoke("window:set", state),
  resizeWindow: (size: WindowSize) => ipcRenderer.invoke("window:resize", size),
  setWindowMode: (mode: WindowMode) => ipcRenderer.invoke("window:mode", mode),
  getWindowMode: () => ipcRenderer.invoke("window:mode:get") as Promise<WindowMode>,
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
