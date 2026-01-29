export type TaskStatus = "active" | "completed" | "on-hold";

export interface Task {
  id: string;
  title: string;
  deadline: string;
  status: TaskStatus;
  createdAt: string;
}

export interface TaskOrderState {
  order: string[];
  manualOrder: boolean;
}

export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowSize {
  width?: number;
  height?: number;
}

export type WindowMode = "normal" | "mini";

export type SortMode = "deadline" | "created";

export type ThemeMode = "ocean" | "emerald" | "mono";

export type FontSize = "sm" | "md" | "lg";

export type Language = "ko" | "en";

export interface AppSettings {
  startMode: WindowMode;
  alwaysOnTop: boolean;
  launchOnStartup: boolean;
  language: Language;
  panelOpacity: number;
  panelBlur: number;
  notifyThresholds: number[];
  heartbeatThreshold: number;
  soundEnabled: boolean;
  defaultSort: SortMode;
  manualOrderPriority: boolean;
  hideCompletedTab: boolean;
  hideHoldTab: boolean;
  autoSave: boolean;
  theme: ThemeMode;
  fontSize: FontSize;
}

// Force emit
export const _types_check = true;
