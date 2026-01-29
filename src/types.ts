import type {
  AppSettings,
  FontSize,
  Language,
  SortMode,
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
  FontSize,
  Language,
  SortMode,
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
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  exportSettings: () => Promise<string>;
  importSettings: (payload: string) => Promise<void>;
  getWindowState: () => Promise<WindowState | null>;
  getWindowBounds: () => Promise<WindowState | null>;
  saveWindowState: (state: WindowState) => Promise<void>;
  resizeWindow: (size: WindowSize) => Promise<void>;
  setWindowMode: (mode: WindowMode) => Promise<void>;
  minimize: () => Promise<void>;
  close: () => Promise<void>;
  onWindowModeChanged: (callback: (mode: WindowMode) => void) => () => void;
  setAlwaysOnTop: (enabled: boolean) => Promise<void>;
  resetWindowSize: () => Promise<void>;
}
