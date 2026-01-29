import type {
  AppSettings,
  CloudConfig,
  CloudConfigStatus,
  GoogleOAuthStartResult,
  FontSize,
  Language,
  ProfileKind,
  ProfileSummary,
  SortMode,
  SyncState,
  SyncStatus,
  Task,
  TaskOrderState,
  TaskStatus,
  ThemeMode,
  WindowMode,
  WindowSize,
  WindowState
} from "../shared/types";

export type {
  AppSettings,
  CloudConfig,
  CloudConfigStatus,
  GoogleOAuthStartResult,
  FontSize,
  Language,
  ProfileKind,
  ProfileSummary,
  SortMode,
  SyncState,
  SyncStatus,
  Task,
  TaskOrderState,
  TaskStatus,
  ThemeMode,
  WindowMode,
  WindowSize,
  WindowState
};

export interface IpcApi {
  getTasks: () => Promise<Task[]>;
  saveTasks: (tasks: Task[]) => Promise<void>;
  getTaskOrder: () => Promise<TaskOrderState>;
  saveTaskOrder: (state: TaskOrderState) => Promise<void>;

  getCloudConfig: () => Promise<CloudConfig>;
  getCloudConfigStatus: () => Promise<CloudConfigStatus>;
  setCloudConfig: (config: CloudConfig) => Promise<void>;

  getDeviceId: () => Promise<string>;

  getActiveProfileKey: () => Promise<string>;
  getActiveProfileSummary: () => Promise<ProfileSummary | null>;
  setActiveProfileKey: (profileKey: string) => Promise<void>;

  onAuthDeepLink: (callback: (url: string) => void) => () => void;

  startGoogleLogin: () => Promise<GoogleOAuthStartResult>;
  signOut: () => Promise<void>;
  onAuthSessionChanged: (callback: (profileKey: string) => void) => () => void;

  onTasksChanged: (callback: () => void) => () => void;
  onSyncError: (callback: (error: string) => void) => () => void;
  onDebugLog: (callback: (message: string) => void) => () => void;

  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  exportSettings: () => Promise<string>;
  importSettings: (payload: string) => Promise<void>;
  resetSync: () => Promise<void>;
  undeleteAll: () => Promise<{ count: number }>;
  getWindowState: () => Promise<WindowState | null>;
  getWindowBounds: () => Promise<WindowState | null>;
  saveWindowState: (state: WindowState) => Promise<void>;
  resizeWindow: (size: WindowSize) => Promise<void>;
  setWindowMode: (mode: WindowMode) => Promise<void>;
  getWindowMode: () => Promise<WindowMode>;
  minimize: () => Promise<void>;
  close: () => Promise<void>;
  onWindowModeChanged: (callback: (mode: WindowMode) => void) => () => void;
  setAlwaysOnTop: (enabled: boolean) => Promise<void>;
  resetWindowSize: () => Promise<void>;
}
