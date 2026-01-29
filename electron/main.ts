import { app, BrowserWindow, Menu, Tray, ipcMain, screen, shell } from "electron";
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import crypto from "node:crypto";
import Store from "electron-store";
import { extractDeepLinkUrl } from "./deepLink.js";
import {
  clampCloudConfig,
  DEFAULT_OAUTH_REDIRECT_SCHEME,
  getCloudConfigStatus
} from "./cloudConfig.js";
import {
  buildGoogleAuthorizeUrl,
  exchangeCodeForGoogleTokens,
  generateNonce,
  generatePkcePair,
  generateState,
  parseOAuthCallbackUrl,
  startLoopbackServer
} from "./auth/googleOAuth.js";
import { refreshFirebaseSession, signInWithGoogleIdToken } from "./auth/firebaseSession.js";
import { encryptToBase64 } from "./auth/tokenStore.js";
import { createSyncEngine } from "./sync/syncEngine.js";
import { FirestoreRestClient } from "./firestore/client.js";

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

// Debug logging to file
// Debug logging to file
const logFilePath = path.join(app.getPath("userData"), "debug.log");

// Override console methods to forward logs to renderer
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args: any[]) => {
  originalConsoleLog(...args);
  if (mainWindow && !mainWindow.isDestroyed()) {
    const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(" ");
    mainWindow.webContents.send("debug:log", msg);
  }
};

console.error = (...args: any[]) => {
  originalConsoleError(...args);
  if (mainWindow && !mainWindow.isDestroyed()) {
    const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(" ");
    mainWindow.webContents.send("debug:log", `[ERROR] ${msg}`);
  }
};

const debugLog = (message: string) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message); // This will now trigger the IPC send via override

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
  CloudConfig,
  SortMode,
  Task,
  ThemeMode,
  WindowMode,
  WindowSize,
  WindowState
} from "./types.js";

interface StoreSchema {
  deviceId: string;
  cloudConfig: CloudConfig;
  activeProfileKey: string;
  profiles: Record<string, ProfileLocalState>;
  firebaseRefreshTokensByUid: Record<string, string>;
  profileSummariesByKey: Record<string, import("./types.js").ProfileSummary>;
  tasks: Task[];
  taskOrder: string[];
  manualOrder: boolean;
  settings: AppSettings;
  windowState: WindowState | null;
  windowStateNormal: WindowState | null;
  windowMode: WindowMode;
}

type SyncOpType = "upsert-task" | "delete-task" | "set-order";

interface SyncOpBase {
  id: string;
  type: SyncOpType;
  createdAt: string;
}

interface UpsertTaskOp extends SyncOpBase {
  type: "upsert-task";
  task: Task;
}

interface DeleteTaskOp extends SyncOpBase {
  type: "delete-task";
  taskId: string;
}

interface SetOrderOp extends SyncOpBase {
  type: "set-order";
  order: string[];
  manualOrder: boolean;
}

type SyncOp = UpsertTaskOp | DeleteTaskOp | SetOrderOp;

interface TaskMeta {
  updatedAt: string;
  deletedAt?: string;
}

interface ProfileLocalState {
  tasks: Task[];
  taskOrder: string[];
  manualOrder: boolean;
  taskMeta: Record<string, TaskMeta>;
  orderUpdatedAt: string;
  oplog: SyncOp[];
  syncCursor: string | null;
}

const emptyProfileState = (): ProfileLocalState => ({
  tasks: [],
  taskOrder: [],
  manualOrder: false,
  taskMeta: {},
  orderUpdatedAt: new Date(0).toISOString(),
  oplog: [],
  syncCursor: null
});

const defaultCloudConfig: CloudConfig = {
  firebaseWebApiKey: "",
  firebaseProjectId: "",
  googleOAuthClientId: "",
  googleOAuthClientSecret: "",
  oauthRedirectScheme: DEFAULT_OAUTH_REDIRECT_SCHEME
};

const cloudConfigFromEnv = (): Partial<CloudConfig> => {
  const pick = (key: string) => {
    const value = process.env[key];
    return typeof value === "string" ? value.trim() : "";
  };

  const firebaseWebApiKey = pick("FIREBASE_WEB_API_KEY");
  const firebaseProjectId = pick("FIREBASE_PROJECT_ID");
  const googleOAuthClientId = pick("GOOGLE_OAUTH_CLIENT_ID");
  const googleOAuthClientSecret = pick("GOOGLE_OAUTH_CLIENT_SECRET");
  const oauthRedirectScheme = pick("OAUTH_REDIRECT_SCHEME");

  return {
    ...(firebaseWebApiKey ? { firebaseWebApiKey } : {}),
    ...(firebaseProjectId ? { firebaseProjectId } : {}),
    ...(googleOAuthClientId ? { googleOAuthClientId } : {}),
    ...(googleOAuthClientSecret ? { googleOAuthClientSecret } : {}),
    ...(oauthRedirectScheme ? { oauthRedirectScheme } : {})
  };
};

const isCloudConfig = (value: unknown): value is CloudConfig => {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.firebaseWebApiKey === "string" &&
    typeof input.firebaseProjectId === "string" &&
    typeof input.googleOAuthClientId === "string" &&
    typeof input.oauthRedirectScheme === "string"
  );
};


const isProfileLocalState = (value: unknown): value is ProfileLocalState => {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return (
    Array.isArray(input.tasks) &&
    Array.isArray(input.taskOrder) &&
    typeof input.manualOrder === "boolean" &&
    input.taskMeta !== null &&
    typeof input.taskMeta === "object" &&
    typeof input.orderUpdatedAt === "string" &&
    Array.isArray(input.oplog) &&
    (typeof input.syncCursor === "string" || input.syncCursor === null)
  );
};

const getProfilesSafe = (): Record<string, ProfileLocalState> => {
  const value = store.get("profiles");
  if (!value || typeof value !== "object") {
    return { local: emptyProfileState() };
  }

  const input = value as Record<string, unknown>;
  const next: Record<string, ProfileLocalState> = {};
  for (const [key, profile] of Object.entries(input)) {
    if (typeof key !== "string" || key.trim().length === 0) continue;
    if (!isProfileLocalState(profile)) continue;
    next[key] = profile;
  }
  if (!next.local) {
    next.local = emptyProfileState();
  }
  return next;
};

const getActiveProfileKey = () => {
  const key = store.get("activeProfileKey");
  return typeof key === "string" && key.trim().length > 0 ? key : "local";
};

const getActiveProfile = () => {
  const key = getActiveProfileKey();
  const profiles = getProfilesSafe();
  return { key, state: profiles[key] ?? profiles.local };
};

const setActiveProfileKey = (key: string) => {
  const safe = typeof key === "string" && key.trim().length > 0 ? key.trim() : "local";
  const profiles = getProfilesSafe();
  if (!profiles[safe]) {
    profiles[safe] = emptyProfileState();
    store.set("profiles", profiles);
  }
  store.set("activeProfileKey", safe);
};

const getActiveProfileStateForLegacyKeys = () => {
  const { key, state } = getActiveProfile();
  if (key === "local") {
    return {
      tasks: store.get("tasks"),
      taskOrder: store.get("taskOrder"),
      manualOrder: store.get("manualOrder")
    };
  }
  return {
    tasks: state.tasks,
    taskOrder: state.taskOrder,
    manualOrder: state.manualOrder
  };
};

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
    deviceId: "",
    cloudConfig: defaultCloudConfig,
    activeProfileKey: "local",
    profiles: { local: emptyProfileState() },
    firebaseRefreshTokensByUid: {},
    profileSummariesByKey: {
      local: { profileKey: "local", kind: "local" }
    },
    tasks: [],
    taskOrder: [],
    manualOrder: false,
    settings: defaultSettings,
    windowState: null,
    windowStateNormal: null,
    windowMode: "normal"
  }
});

let pendingOAuthRequest:
  | {
    createdAt: string;
    state: string;
    nonce: string;
    verifier: string;
    redirectUri: string;
  }
  | null = null;

let activeFirebaseIdToken: { uid: string; idToken: string; expiresAt: string } | null = null;

let syncTimer: NodeJS.Timeout | null = null;

const syncEngine = createSyncEngine({
  getCloudConfig: () => {
    const cfg = store.get("cloudConfig");
    return { firebaseProjectId: cfg.firebaseProjectId, firebaseWebApiKey: cfg.firebaseWebApiKey };
  },
  getDeviceId: () => store.get("deviceId"),
  getRefreshTokenEncryptedBase64: (uid) => store.get("firebaseRefreshTokensByUid")[uid],
  setRefreshTokenEncryptedBase64: (uid, value) => {
    const next = store.get("firebaseRefreshTokensByUid");
    next[uid] = value;
    store.set("firebaseRefreshTokensByUid", next);
  },
  getActiveIdToken: () => activeFirebaseIdToken,
  setActiveIdToken: (value) => {
    activeFirebaseIdToken = value;
  },
  getProfileState: (profileKey) => {
    const profiles = getProfilesSafe();
    return profiles[profileKey] ?? emptyProfileState();
  },
  setProfileState: (profileKey, state) => {
    const profiles = getProfilesSafe();
    profiles[profileKey] = state;
    store.set("profiles", profiles);
  },
  onTasksChanged: () => {
    mainWindow?.webContents.send("tasks:changed");
  }
});

const stopSyncLoop = () => {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
};

const startSyncLoop = (profileKey: string) => {
  debugLog(`[Sync] startSyncLoop called for: ${profileKey}`);
  stopSyncLoop();
  if (profileKey === "local") {
    debugLog(`[Sync] Skipping sync for local profile`);
    return;
  }

  const tokens = store.get("firebaseRefreshTokensByUid");
  const token = tokens[profileKey];

  if (typeof token !== "string" || token.length === 0) {
    debugLog(`[Sync] No refresh token found for ${profileKey}. Available tokens for: ${Object.keys(tokens).join(", ")}`);
    return;
  }

  // Run sync immediately on startup, then continue with interval
  debugLog(`[Sync] Starting sync loop for profile: ${profileKey}. Initial tick...`);
  void syncEngine.tick(profileKey).then(() => {
    debugLog(`[Sync] Initial tick completed`);
  }).catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    debugLog(`[Sync] Initial sync failed: ${msg}`);
    mainWindow?.webContents.send("sync:error", msg);
  });

  syncTimer = setInterval(() => {
    void syncEngine.tick(profileKey).catch((err) => {
      // Also notify on interval errors if needed, but maybe too noisy. 
      // Let's debug initial sync first.
      console.error("[SyncLoop] Error:", err);
    });
  }, 10_000);
};

const getRedirectUriForScheme = (scheme: string) => `${scheme}://auth/callback`;

const handleOAuthCallbackIfPossible = async (urlString: string, onClose?: () => void) => {
  debugLog(`[OAuth] handleOAuthCallbackIfPossible called with url: ${urlString.substring(0, 100)}...`);

  if (!pendingOAuthRequest) {
    debugLog("[OAuth] No pending OAuth request, returning early");
    onClose?.();
    return;
  }

  const { code, state, error } = parseOAuthCallbackUrl(urlString);
  debugLog(`[OAuth] Parsed callback - code: ${code ? "present" : "missing"}, state: ${state ? "present" : "missing"}, error: ${error || "none"}`);

  if (error) {
    debugLog(`[OAuth] Error in callback: ${error}`);
    pendingOAuthRequest = null;
    onClose?.();
    return;
  }
  if (!code || !state) {
    debugLog("[OAuth] Missing code or state");
    onClose?.();
    return;
  }
  if (state !== pendingOAuthRequest.state) {
    debugLog("[OAuth] State mismatch");
    onClose?.();
    return;
  }

  const config = store.get("cloudConfig");
  const status = getCloudConfigStatus(config);
  debugLog(`[OAuth] Cloud config ready: ${status.isReady}`);

  if (!status.isReady) {
    debugLog("[OAuth] Cloud config not ready");
    pendingOAuthRequest = null;
    onClose?.();
    return;
  }

  try {
    debugLog("[OAuth] Exchanging code for Google tokens...");
    const google = await exchangeCodeForGoogleTokens({
      code,
      clientId: config.googleOAuthClientId,
      clientSecret: config.googleOAuthClientSecret || undefined,
      redirectUri: pendingOAuthRequest.redirectUri,
      codeVerifier: pendingOAuthRequest.verifier
    });
    debugLog("[OAuth] Google tokens received successfully");

    debugLog("[OAuth] Signing in with Firebase...");
    const session = await signInWithGoogleIdToken({
      firebaseWebApiKey: config.firebaseWebApiKey,
      googleIdToken: google.idToken
    });
    debugLog(`[OAuth] Firebase session created for uid: ${session.uid}`);

    // First login migration: merge local tasks into cloud view (cloud wins on same id).
    // Local-only tasks are appended and queued for upload via the user's profile oplog.
    const now = new Date().toISOString();
    const remoteClient = new FirestoreRestClient(
      { projectId: config.firebaseProjectId },
      async () => session.idToken
    );
    const remote = await remoteClient.queryAllTasks(session.uid);
    const remoteById = new Map(remote.map((row) => [row.task.id, row] as const));
    const mergedTasks: Task[] = remote
      .filter((row) => !row.meta.deletedAt)
      .map((row) => row.task);
    const mergedMeta: Record<string, TaskMeta> = {};
    for (const row of remote) {
      mergedMeta[row.task.id] = {
        updatedAt: row.meta.updatedAt,
        ...(row.meta.deletedAt ? { deletedAt: row.meta.deletedAt } : {})
      };
    }

    const localTasks = store.get("tasks");
    const localSafe = Array.isArray(localTasks) ? localTasks.filter((t) => typeof t?.id === "string") : [];
    const localToUpload: Task[] = [];
    for (const task of localSafe) {
      if (remoteById.has(task.id)) {
        continue;
      }
      mergedTasks.push(task);
      mergedMeta[task.id] = { updatedAt: now };
      localToUpload.push(task);
    }

    debugLog(`[OAuth] Merged ${mergedTasks.length} tasks, ${localToUpload.length} to upload`);

    const profiles = getProfilesSafe();
    const existingProfile = profiles[session.uid] ?? emptyProfileState();
    profiles[session.uid] = {
      ...existingProfile,
      tasks: mergedTasks,
      taskMeta: { ...existingProfile.taskMeta, ...mergedMeta },
      oplog: [
        ...existingProfile.oplog,
        ...localToUpload.map((task) => ({
          id: crypto.randomUUID(),
          type: "upsert-task" as const,
          createdAt: now,
          task
        }))
      ]
    };
    store.set("profiles", profiles);
    debugLog("[OAuth] Profiles saved");

    const tokens = store.get("firebaseRefreshTokensByUid");
    tokens[session.uid] = encryptToBase64(session.refreshToken);
    store.set("firebaseRefreshTokensByUid", tokens);
    debugLog("[OAuth] Refresh token saved");

    const summaries = store.get("profileSummariesByKey");
    summaries[session.uid] = {
      profileKey: session.uid,
      kind: "firebase",
      uid: session.uid,
      email: session.email,
      displayName: session.displayName
    };
    store.set("profileSummariesByKey", summaries);

    setActiveProfileKey(session.uid);
    debugLog(`[OAuth] Active profile key set to: ${session.uid}`);

    activeFirebaseIdToken = { uid: session.uid, idToken: session.idToken, expiresAt: session.expiresAt };
    pendingOAuthRequest = null;

    mainWindow?.webContents.send("auth:session-changed", session.uid);
    startSyncLoop(session.uid);
    debugLog("[OAuth] Login complete, sync loop started");
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    debugLog(`[OAuth] ERROR during login: ${errorMessage}`);
    console.error("[OAuth] Login error:", err);
    pendingOAuthRequest = null;
  } finally {
    onClose?.();
  }
};

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

let pendingDeepLinkUrl: string | null = null;

const captureDeepLinkFromArgv = (argv: string[]) => {
  const scheme = store.get("cloudConfig").oauthRedirectScheme || DEFAULT_OAUTH_REDIRECT_SCHEME;
  const url = extractDeepLinkUrl(argv, scheme);
  if (!url) return;
  pendingDeepLinkUrl = url;
  if (mainWindow) {
    mainWindow.webContents.send("auth:deep-link", url);
  }
  void handleOAuthCallbackIfPossible(url).catch(() => {
    return;
  });
};

app.on("second-instance", (_event, argv) => {
  captureDeepLinkFromArgv(argv);
});

captureDeepLinkFromArgv(process.argv);

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

    if (pendingDeepLinkUrl) {
      win.webContents.send("auth:deep-link", pendingDeepLinkUrl);
    }
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

const registerProtocolClient = () => {
  const scheme = store.get("cloudConfig").oauthRedirectScheme || DEFAULT_OAUTH_REDIRECT_SCHEME;
  try {
    if (app.isPackaged) {
      app.setAsDefaultProtocolClient(scheme);
      return;
    }

    const electronExe = process.execPath;
    const entry = process.argv[1];
    if (typeof entry === "string" && entry.length > 0) {
      app.setAsDefaultProtocolClient(scheme, electronExe, [entry]);
    } else {
      app.setAsDefaultProtocolClient(scheme);
    }
  } catch {
    return;
  }
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
  registerProtocolClient();

  const existingDeviceId = store.get("deviceId");
  if (typeof existingDeviceId !== "string" || existingDeviceId.trim().length === 0) {
    store.set("deviceId", crypto.randomUUID());
  }

  const storedCloudConfig = store.get("cloudConfig");
  const baseCloudConfig = isCloudConfig(storedCloudConfig)
    ? clampCloudConfig(storedCloudConfig)
    : defaultCloudConfig;
  const mergedCloudConfig = clampCloudConfig({
    ...baseCloudConfig,
    ...cloudConfigFromEnv()
  });
  store.set("cloudConfig", mergedCloudConfig);

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

  ipcMain.handle("tasks:get", () => {
    debugLog(`[IPC] tasks:get requested`);
    const { tasks } = getActiveProfileStateForLegacyKeys();
    return tasks;
  });
  ipcMain.handle("tasks:set", (_event, tasks: Task[]) => {
    const safeTasks = Array.isArray(tasks) ? tasks.filter(isTask) : [];
    const { key, state } = getActiveProfile();

    if (key === "local") {
      store.set("tasks", safeTasks);
      const order = store.get("taskOrder");
      if (order.length > 0) {
        const taskIds = new Set(safeTasks.map((task) => task.id));
        store.set("taskOrder", order.filter((id) => taskIds.has(id)));
      }
      return;
    }

    const profiles = getProfilesSafe();
    const nextOrder = state.taskOrder.length > 0
      ? state.taskOrder.filter((id) => safeTasks.some((task) => task.id === id))
      : [];

    const now = new Date().toISOString();
    const ops = syncEngine.buildOpsFromTaskSet(state.tasks, safeTasks, now);
    const nextMeta = { ...state.taskMeta };
    for (const op of ops) {
      if (op.type === "upsert-task") {
        nextMeta[op.task.id] = { updatedAt: now };
      } else if (op.type === "delete-task") {
        nextMeta[op.taskId] = { updatedAt: now, deletedAt: now };
      }
    }

    profiles[key] = {
      ...state,
      tasks: safeTasks,
      taskOrder: nextOrder,
      taskMeta: nextMeta,
      oplog: [...state.oplog, ...ops]
    };
    store.set("profiles", profiles);
  });
  ipcMain.handle("tasks:order:get", () => {
    const { taskOrder, manualOrder } = getActiveProfileStateForLegacyKeys();
    return { order: taskOrder, manualOrder };
  });
  ipcMain.handle("tasks:order:set", (_event, state: { order: string[]; manualOrder: boolean }) => {
    const safeOrder = Array.isArray(state?.order)
      ? state.order.filter((id) => typeof id === "string")
      : [];
    const manualOrder = state?.manualOrder === true;

    const { key, state: profile } = getActiveProfile();
    if (key === "local") {
      store.set("taskOrder", safeOrder);
      store.set("manualOrder", manualOrder);
      return;
    }

    const profiles = getProfilesSafe();
    const now = new Date().toISOString();
    profiles[key] = {
      ...profile,
      taskOrder: safeOrder,
      manualOrder,
      orderUpdatedAt: now,
      oplog: [
        ...profile.oplog,
        {
          id: crypto.randomUUID(),
          type: "set-order",
          createdAt: now,
          order: safeOrder,
          manualOrder
        }
      ]
    };
    store.set("profiles", profiles);
  });

  ipcMain.handle("cloud:config:get", () => store.get("cloudConfig"));
  ipcMain.handle("cloud:config:status", () => getCloudConfigStatus(store.get("cloudConfig")));
  ipcMain.handle("cloud:config:set", (_event, input: CloudConfig) => {
    const next = clampCloudConfig(isCloudConfig(input) ? input : defaultCloudConfig);
    store.set("cloudConfig", next);
  });

  ipcMain.handle("device:id", () => store.get("deviceId"));

  ipcMain.handle("profiles:active:get", () => getActiveProfileKey());
  ipcMain.handle("tasks:reset-local-and-sync", () => {
    const key = getActiveProfileKey();
    if (key === "local") return;

    debugLog(`[Sync] Resetting local state for ${key} to force full resync`);
    const profiles = getProfilesSafe();
    // We preserve nothing but the key structure ideally, but let's keep it safe
    if (profiles[key]) {
      profiles[key] = {
        ...profiles[key],
        tasks: [],
        taskOrder: [],
        manualOrder: false,
        taskMeta: {},
        oplog: [],
        syncCursor: null // Reset cursor to pull from beginning
      };
      store.set("profiles", profiles);

      // Notify frontend to clear UI immediately (optional, tasks:changed will fire later)
      mainWindow?.webContents.send("tasks:changed");

      // Restart loop to trigger immediate pull
      startSyncLoop(key);
    }
  });

  ipcMain.handle("profiles:active:summary", () => {
    const key = getActiveProfileKey();
    const summaries = store.get("profileSummariesByKey");
    return summaries[key] ?? null;
  });
  ipcMain.handle("profiles:active:set", (_event, key: string) => {
    setActiveProfileKey(key);
    startSyncLoop(getActiveProfileKey());
  });

  ipcMain.handle("auth:start-google", async () => {
    const config = store.get("cloudConfig");
    const status = getCloudConfigStatus(config);
    if (!status.isReady) {
      throw new Error("cloud config is not ready");
    }

    const { verifier, challenge } = generatePkcePair();
    const state = generateState();
    const nonce = generateNonce();

    // Use Loopback IP for auth callback (avoid 400 invalid_request with deep links)
    const { port, close } = await startLoopbackServer((url) => {
      void handleOAuthCallbackIfPossible(url, close).catch(() => {
        close();
      });
    });

    const redirectUri = `http://127.0.0.1:${port}/callback`;

    const authUrl = buildGoogleAuthorizeUrl({
      clientId: config.googleOAuthClientId,
      redirectUri,
      state,
      nonce,
      codeChallenge: challenge
    });

    try {
      const parsed = new URL(authUrl);
      if (parsed.origin !== "https://accounts.google.com") {
        throw new Error("unexpected auth origin");
      }
    } catch {
      throw new Error("failed to construct auth url");
    }

    pendingOAuthRequest = {
      createdAt: new Date().toISOString(),
      state,
      nonce,
      verifier,
      redirectUri
    };

    void shell.openExternal(authUrl);
    return { authUrl, state };
  });

  ipcMain.handle("auth:signout", () => {
    activeFirebaseIdToken = null;
    pendingOAuthRequest = null;
    setActiveProfileKey("local");
    stopSyncLoop();
    mainWindow?.webContents.send("auth:session-changed", "local");
    debugLog("[Auth] Signed out, switched to local profile");
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

  // Start sync for already-logged-in users on app startup
  const activeProfile = getActiveProfileKey();
  if (activeProfile !== "local") {
    debugLog(`[App] Starting sync for existing profile: ${activeProfile}`);
    startSyncLoop(activeProfile);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
