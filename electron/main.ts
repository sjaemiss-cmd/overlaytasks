import { app, BrowserWindow, Menu, Tray, ipcMain, screen } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import Store from "electron-store";

// Debug logging to file
const logFilePath = path.join(app.getPath("userData"), "debug.log");
const debugLog = (message: string) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  try {
    fs.appendFileSync(logFilePath, logMessage);
  } catch {
    // Ignore write errors
  }
};

// Clear log on startup
try {
  fs.writeFileSync(logFilePath, `=== App Started at ${new Date().toISOString()} ===\n`);
} catch {
  // Ignore
}
import type {
  AppSettings,
  SortMode,
  Task,
  ThemeMode,
  WindowMode,
  WindowSize,
  WindowState
} from "./types.js";

interface StoreSchema {
  tasks: Task[];
  taskOrder: string[];
  manualOrder: boolean;
  settings: AppSettings;
  windowState: WindowState | null;
  windowStateNormal: WindowState | null;
  windowMode: WindowMode;
}

const defaultSettings: AppSettings = {
  startMode: "normal",
  alwaysOnTop: true,
  launchOnStartup: false,
  language: "ko",
  panelOpacity: 0.8,
  panelBlur: 16,
  notifyThresholds: [60, 30, 15],
  heartbeatThreshold: 180,
  soundEnabled: false,
  defaultSort: "deadline",
  manualOrderPriority: true,
  hideCompletedTab: false,
  hideHoldTab: false,
  autoSave: true,
  theme: "ocean",
  fontSize: "md"
};

const store = new Store<StoreSchema>({
  defaults: {
    tasks: [],
    taskOrder: [],
    manualOrder: false,
    settings: defaultSettings,
    windowState: null,
    windowStateNormal: null,
    windowMode: "normal"
  }
});

const clampSettings = (input: AppSettings): AppSettings => {
  const thresholds = Array.isArray(input.notifyThresholds)
    ? input.notifyThresholds.filter((value) => Number.isFinite(value) && value > 0)
    : defaultSettings.notifyThresholds;
  const sortMode: SortMode = input.defaultSort === "created" ? "created" : "deadline";
  const theme: ThemeMode =
    input.theme === "emerald" || input.theme === "mono" ? input.theme : "ocean";
  const panelOpacity = Math.min(0.95, Math.max(0.5, Number(input.panelOpacity) || 0.8));
  const panelBlur = Math.min(28, Math.max(8, Number(input.panelBlur) || 16));
  const heartbeatThreshold = Math.min(360, Math.max(30, Number(input.heartbeatThreshold) || 180));
  const fontSize = input.fontSize === "sm" || input.fontSize === "lg" ? input.fontSize : "md";
  return {
    startMode: input.startMode === "mini" ? "mini" : "normal",
    alwaysOnTop: input.alwaysOnTop === false ? false : true,
    launchOnStartup: input.launchOnStartup === true,
    language: input.language === "en" ? "en" : "ko",
    panelOpacity,
    panelBlur,
    notifyThresholds: thresholds,
    heartbeatThreshold,
    soundEnabled: input.soundEnabled === true,
    defaultSort: sortMode,
    manualOrderPriority: input.manualOrderPriority !== false,
    hideCompletedTab: input.hideCompletedTab === true,
    hideHoldTab: input.hideHoldTab === true,
    autoSave: input.autoSave !== false,
    theme,
    fontSize
  };
};

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let saveWindowStateTimer: NodeJS.Timeout | null = null;
const defaultWindowSize = { width: 420, height: 720 };
const miniHeight = 78;

// Validate window bounds to ensure visibility on screen
const validateWindowBounds = (bounds: { x?: number; y?: number; width: number; height: number }) => {
  const displays = screen.getAllDisplays();
  const { x, y, width, height } = bounds;

  if (x === undefined || y === undefined) {
    return { x: undefined, y: undefined, width, height };
  }

  const isVisibleOnAnyDisplay = displays.some(display => {
    const { x: dx, y: dy, width: dw, height: dh } = display.bounds;
    const visibleX = x + 100 > dx && x < dx + dw;
    const visibleY = y + 50 > dy && y < dy + dh;
    return visibleX && visibleY;
  });

  if (isVisibleOnAnyDisplay) {
    return { x, y, width, height };
  }

  console.log("[Window] Saved position is off-screen, centering window");
  return { x: undefined, y: undefined, width, height };
};

const createWindow = () => {
  debugLog("createWindow() called");
  debugLog(`app.isPackaged: ${app.isPackaged}`);
  debugLog(`app.getAppPath(): ${app.getAppPath()}`);

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  debugLog(`currentDir: ${currentDir}`);

  const savedState = store.get("windowStateNormal") ?? store.get("windowState");
  debugLog(`savedState: ${JSON.stringify(savedState)}`);

  const settings = clampSettings(store.get("settings"));
  debugLog(`settings.startMode: ${settings.startMode}`);
  debugLog(`settings.alwaysOnTop: ${settings.alwaysOnTop}`);

  // Validate saved window position
  const validatedBounds = validateWindowBounds({
    x: savedState?.x,
    y: savedState?.y,
    width: savedState?.width ?? defaultWindowSize.width,
    height: savedState?.height ?? defaultWindowSize.height
  });
  debugLog(`validatedBounds: ${JSON.stringify(validatedBounds)}`);

  const preloadPath = path.join(currentDir, "preload.cjs");
  debugLog(`preloadPath: ${preloadPath}`);
  debugLog(`preload exists: ${fs.existsSync(preloadPath)}`);

  debugLog("Creating BrowserWindow...");
  const win = new BrowserWindow({
    width: validatedBounds.width,
    height: validatedBounds.height,
    x: validatedBounds.x,
    y: validatedBounds.y,
    show: true,
    transparent: true,
    frame: false,
    alwaysOnTop: settings.alwaysOnTop,
    resizable: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  debugLog(`BrowserWindow created. ID: ${win.id}`);
  debugLog(`Window bounds after creation: ${JSON.stringify(win.getBounds())}`);
  debugLog(`Window isVisible: ${win.isVisible()}`);

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";

  // Error handling for debugging
  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    debugLog(`LOAD FAILED: ${errorCode} - ${errorDescription}`);
  });

  win.webContents.on("did-finish-load", () => {
    debugLog("did-finish-load event fired");
    win.show();
    debugLog(`After show() - isVisible: ${win.isVisible()}`);
  });

  win.on("ready-to-show", () => {
    debugLog("ready-to-show event fired");
  });

  if (app.isPackaged) {
    const indexPath = path.join(app.getAppPath(), "dist", "index.html");
    debugLog(`Packaged mode. indexPath: ${indexPath}`);
    debugLog(`index.html exists: ${fs.existsSync(indexPath)}`);
    win.loadFile(indexPath).then(() => {
      debugLog("loadFile() promise resolved");
    }).catch((err) => {
      debugLog(`loadFile() ERROR: ${err.message}`);
    });
  } else {
    debugLog(`Dev mode. Loading URL: ${devServerUrl}`);
    win.loadURL(devServerUrl);
    win.webContents.openDevTools({ mode: "detach" });
  }

  if (settings.startMode === "mini") {
    store.set("windowMode", "mini");
    win.setBounds({ ...win.getBounds(), height: miniHeight });
    win.webContents.once("did-finish-load", () => {
      win.webContents.send("window:mode-changed", "mini");
    });
  } else {
    store.set("windowMode", "normal");
  }

  app.setLoginItemSettings({ openAtLogin: settings.launchOnStartup });

  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event) => {
    event.preventDefault();
  });

  const saveWindowState = () => {
    const bounds = win.getBounds();
    store.set("windowState", bounds);
    if (store.get("windowMode") === "normal") {
      store.set("windowStateNormal", bounds);
    }
  };

  const scheduleSaveWindowState = () => {
    if (saveWindowStateTimer) {
      clearTimeout(saveWindowStateTimer);
    }
    saveWindowStateTimer = setTimeout(() => {
      saveWindowState();
    }, 200);
  };

  win.on("resize", scheduleSaveWindowState);
  win.on("move", scheduleSaveWindowState);
  win.on("close", saveWindowState);

  return win;
};

const buildTrayMenu = () => {
  if (!mainWindow) {
    return Menu.buildFromTemplate([
      { label: "Todos Overlay", enabled: false },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() }
    ]);
  }
  return Menu.buildFromTemplate([
    {
      label: mainWindow.isVisible() ? "Hide" : "Show",
      click: () => {
        if (!mainWindow) return;
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
        }
        tray?.setContextMenu(buildTrayMenu());
      }
    },
    {
      label: "Always on Top",
      type: "checkbox",
      checked: mainWindow.isAlwaysOnTop(),
      click: (item) => {
        if (!mainWindow) return;
        mainWindow.setAlwaysOnTop(item.checked);
      }
    },
    {
      label: store.get("windowMode") === "mini" ? "Switch to Normal" : "Switch to Mini",
      click: () => {
        if (!mainWindow) return;
        const currentMode = store.get("windowMode");
        const nextMode: WindowMode = currentMode === "mini" ? "normal" : "mini";
        store.set("windowMode", nextMode);
        if (nextMode === "mini") {
          store.set("windowStateNormal", mainWindow.getBounds());
          mainWindow.setBounds({ ...mainWindow.getBounds(), height: 78 });
        } else {
          const normal = store.get("windowStateNormal");
          if (normal) {
            mainWindow.setBounds({ ...mainWindow.getBounds(), width: normal.width, height: normal.height });
          }
        }
        mainWindow.webContents.send("window:mode-changed", nextMode);
        tray?.setContextMenu(buildTrayMenu());
      }
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => app.quit()
    }
  ]);
};

const createTray = () => {
  const iconPath = path.join(app.getAppPath(), "icon.png");
  tray = new Tray(iconPath);
  tray.setToolTip("Todos Overlay");
  tray.setContextMenu(buildTrayMenu());
  tray.on("click", () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
    tray?.setContextMenu(buildTrayMenu());
  });
};

app.whenReady().then(() => {
  const isTask = (value: unknown): value is Task => {
    if (!value || typeof value !== "object") return false;
    const task = value as Task;
    const validStatus = task.status === "active" || task.status === "completed" || task.status === "on-hold";
    return (
      typeof task.id === "string" &&
      typeof task.title === "string" &&
      typeof task.deadline === "string" &&
      typeof task.createdAt === "string" &&
      validStatus
    );
  };

  const clampWindowSize = (size: WindowSize) => {
    const minWidth = 320;
    const minHeight = 64;
    const maxWidth = 1400;
    const maxHeight = 1400;
    return {
      width:
        typeof size.width === "number"
          ? Math.max(minWidth, Math.min(maxWidth, size.width))
          : undefined,
      height:
        typeof size.height === "number"
          ? Math.max(minHeight, Math.min(maxHeight, size.height))
          : undefined
    };
  };

  ipcMain.handle("tasks:get", () => store.get("tasks"));
  ipcMain.handle("tasks:set", (_event, tasks: Task[]) => {
    const safeTasks = Array.isArray(tasks) ? tasks.filter(isTask) : [];
    store.set("tasks", safeTasks);
    const order = store.get("taskOrder");
    if (order.length > 0) {
      const taskIds = new Set(safeTasks.map((task) => task.id));
      store.set("taskOrder", order.filter((id) => taskIds.has(id)));
    }
  });
  ipcMain.handle("tasks:order:get", () => ({
    order: store.get("taskOrder"),
    manualOrder: store.get("manualOrder")
  }));
  ipcMain.handle("tasks:order:set", (_event, state: { order: string[]; manualOrder: boolean }) => {
    const safeOrder = Array.isArray(state?.order)
      ? state.order.filter((id) => typeof id === "string")
      : [];
    store.set("taskOrder", safeOrder);
    store.set("manualOrder", state?.manualOrder === true);
  });
  ipcMain.handle("window:get", () => store.get("windowStateNormal"));
  ipcMain.handle("window:get-bounds", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win?.getBounds() ?? null;
  });
  ipcMain.handle("window:set", (_event, state: WindowState) => {
    if (
      typeof state?.x === "number" &&
      typeof state?.y === "number" &&
      typeof state?.width === "number" &&
      typeof state?.height === "number"
    ) {
      store.set("windowState", state);
    }
  });
  ipcMain.handle("window:mode", (_event, mode: WindowMode) => {
    if (mode === "mini" || mode === "normal") {
      if (mode === "mini" && mainWindow) {
        store.set("windowStateNormal", mainWindow.getBounds());
      }
      store.set("windowMode", mode);
      const win = mainWindow;
      win?.webContents.send("window:mode-changed", mode);
    }
  });
  ipcMain.handle("window:mode:get", () => store.get("windowMode"));
  ipcMain.handle("window:resize", (event, size: WindowSize) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const bounds = win.getBounds();
    const next = clampWindowSize(size);
    win.setBounds({
      ...bounds,
      width: next.width ?? bounds.width,
      height: next.height ?? bounds.height
    });
  });
  ipcMain.handle("window:minimize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });
  ipcMain.handle("window:close", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });
  ipcMain.handle("window:always-on-top", (event, enabled: boolean) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.setAlwaysOnTop(Boolean(enabled));
  });
  ipcMain.handle("window:reset", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    win.setSize(defaultWindowSize.width, defaultWindowSize.height);
    win.center();
    const bounds = win.getBounds();
    store.set("windowState", bounds);
    store.set("windowStateNormal", bounds);
  });

  ipcMain.handle("settings:get", () => clampSettings(store.get("settings")));
  ipcMain.handle("settings:set", (_event, input: AppSettings) => {
    const next = clampSettings(input);
    store.set("settings", next);
    mainWindow?.setAlwaysOnTop(next.alwaysOnTop);
    app.setLoginItemSettings({ openAtLogin: next.launchOnStartup });
  });
  ipcMain.handle("settings:export", () => JSON.stringify(store.get("settings")));
  ipcMain.handle("settings:import", (_event, payload: string) => {
    try {
      const parsed = JSON.parse(payload) as AppSettings;
      const next = clampSettings(parsed);
      store.set("settings", next);
      mainWindow?.setAlwaysOnTop(next.alwaysOnTop);
      app.setLoginItemSettings({ openAtLogin: next.launchOnStartup });
    } catch {
      return;
    }
  });

  mainWindow = createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
