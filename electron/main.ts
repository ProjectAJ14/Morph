import {
  app,
  BrowserWindow,
  clipboard,
  globalShortcut,
  ipcMain,
  Menu,
  screen,
  shell,
} from "electron";
import * as path from "path";
import { readConfig, writeConfig, saveWindowBounds, DEFAULT_PROMPTS, MorphConfig, Target } from "./config";
import { getDb, insertRewrite, getHistory, deleteRewrite, clearHistory, closeDb } from "./database";
import { complete, PROVIDER_MODELS, PROVIDER_LABELS } from "./providers";
import { writeFormatted } from "./clipboard-format";

process.on("uncaughtException", (err) => console.error("[Morph] Uncaught exception:", err));
process.on("unhandledRejection", (reason) => console.error("[Morph] Unhandled rejection:", reason));

const APP_NAME = "Morph";
app.setName(APP_NAME);
app.setAboutPanelOptions({
  applicationName: APP_NAME,
  applicationVersion: require("../package.json").version,
  copyright: "Copy. Click. Paste.",
  iconPath: path.join(__dirname, "..", "resources", "icon.png"),
});

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

// Enforce single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log("[Morph] Another instance is already running, quitting");
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function registerGlobalShortcut(shortcut: string): boolean {
  globalShortcut.unregisterAll();
  try {
    return globalShortcut.register(shortcut, () => {
      if (!mainWindow) return;
      if (mainWindow.isVisible() && mainWindow.isFocused()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.error("[Morph] Failed to register global shortcut:", err);
    return false;
  }
}

async function createWindow(): Promise<void> {
  const config = readConfig();

  // Validate saved window bounds against connected displays
  if (config.window.x !== undefined && config.window.y !== undefined) {
    const isOnScreen = screen.getAllDisplays().some((display) => {
      const { x, y, width, height } = display.bounds;
      return (
        config.window.x! >= x - 100 &&
        config.window.x! < x + width &&
        config.window.y! >= y - 100 &&
        config.window.y! < y + height
      );
    });
    if (!isOnScreen) {
      delete config.window.x;
      delete config.window.y;
    }
  }

  const iconPath = isDev
    ? path.join(__dirname, "..", "resources", "icon.png")
    : path.join(process.resourcesPath, "icon.png");

  mainWindow = new BrowserWindow({
    width: config.window.width,
    height: config.window.height,
    x: config.window.x,
    y: config.window.y,
    minWidth: 500,
    minHeight: 400,
    icon: iconPath,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    // The ink ground's --bg (src/styles/tokens.css). Only the first paint
    // uses it; the renderer pushes the live value via window:set-background.
    backgroundColor: "#17171a",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Application menu
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: APP_NAME,
      submenu: [
        { role: "about", label: `About ${APP_NAME}` },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide", label: `Hide ${APP_NAME}` },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { label: `Quit ${APP_NAME}`, accelerator: "CmdOrCtrl+Q", role: "quit" },
      ],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  // Show window when ready
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Save window bounds on close — macOS: closing hides, Cmd+Q quits
  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
      return;
    }
    if (mainWindow) {
      try {
        saveWindowBounds(mainWindow.getBounds());
      } catch (err) {
        console.error("[Morph] Failed to save window bounds:", err);
      }
    }
  });

  mainWindow.on("hide", () => {
    if (mainWindow) {
      try {
        saveWindowBounds(mainWindow.getBounds());
      } catch (err) {
        console.error("[Morph] Failed to save window bounds:", err);
      }
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Load the app
  if (isDev) {
    await mainWindow.loadURL("http://localhost:5173");
  } else {
    await mainWindow.loadFile(path.join(__dirname, "..", "dist-renderer", "index.html"));
  }
}

// Deep links the desktop clients register — opening one launches or focuses the app.
// Generic has no app to bring up.
const TARGET_URLS: Partial<Record<Target, string>> = {
  slack: "slack://open",
  teams: "msteams://",
};

/** Bring the target chat app to the front so the formatted text can go straight in. */
function activateTarget(target: Target): void {
  const url = TARGET_URLS[target];
  if (!url) return;
  shell.openExternal(url).catch((err) =>
    console.warn(`[Morph] Could not open ${target}:`, err)
  );
}

function maskKey(key: string): string {
  return key ? "\u2022\u2022\u2022\u2022" + key.slice(-4) : "";
}

function setupIpcHandlers(): void {
  // Clipboard in -> formatted for the target -> clipboard out
  ipcMain.handle("format:run", async (_event, target: Target) => {
    const config = readConfig();
    const input = clipboard.readText();
    if (!input.trim()) {
      throw new Error("Clipboard is empty. Copy the message you want to format first.");
    }
    const systemPrompt = config.prompts[target];
    const output = await complete(config, systemPrompt, input);
    writeFormatted(output, target);
    insertRewrite(input, output, systemPrompt, config.providers[config.activeProvider].model, target);
    activateTarget(target);
    return output;
  });

  // Hide the window once the renderer has shown its confirmation
  ipcMain.handle("window:hide", () => mainWindow?.hide());
  // Keeps the native frame (corners, resize repaint) on the active ground.
  ipcMain.handle("window:set-background", (_e, color: string) => {
    if (/^#[0-9a-fA-F]{3,8}$/.test(color)) mainWindow?.setBackgroundColor(color);
  });

  // Re-copy a past result, formatted for its original target
  ipcMain.handle("clipboard:write-formatted", (_event, markdown: string, target: Target) =>
    writeFormatted(markdown, target)
  );

  // Database
  ipcMain.handle("db:get-history", (_event, limit?: number, offset?: number) =>
    getHistory(limit ?? 50, offset ?? 0)
  );
  ipcMain.handle("db:delete-history", (_event, id: number) => deleteRewrite(id));
  ipcMain.handle("db:clear-history", () => clearHistory());

  // Config — API keys are masked on the way out, never sent to the renderer in full
  ipcMain.handle("config:get", () => {
    const config = readConfig();
    return {
      ...config,
      providers: Object.fromEntries(
        Object.entries(config.providers).map(([id, p]) => [
          id,
          { model: p.model, apiKey: maskKey(p.apiKey), apiKeySet: !!p.apiKey },
        ])
      ),
      defaultPrompts: DEFAULT_PROMPTS,
      providerModels: PROVIDER_MODELS,
      providerLabels: PROVIDER_LABELS,
    };
  });

  ipcMain.handle("config:set", (_event, partial: Partial<MorphConfig>) => {
    const config = readConfig();

    // Nested maps need merging, not replacing — the renderer sends only what changed.
    const providers = { ...config.providers };
    for (const [id, incoming] of Object.entries(partial.providers ?? {})) {
      const current = providers[id as keyof typeof providers];
      providers[id as keyof typeof providers] = {
        model: incoming.model ?? current.model,
        // An empty apiKey means "leave it alone" — the renderer only ever sees a mask.
        apiKey: incoming.apiKey ? incoming.apiKey : current.apiKey,
      };
    }

    const updated: MorphConfig = {
      ...config,
      ...partial,
      providers,
      prompts: { ...config.prompts, ...partial.prompts },
    };

    if (partial.globalShortcut && partial.globalShortcut !== config.globalShortcut) {
      if (!registerGlobalShortcut(partial.globalShortcut)) {
        registerGlobalShortcut(config.globalShortcut);
        throw new Error(`Failed to register shortcut: ${partial.globalShortcut}`);
      }
    }

    writeConfig(updated);
  });
}

async function startApp(): Promise<void> {
  console.log(`[Morph] v${require("../package.json").version} starting`);

  // Initialize database
  getDb();

  // Setup IPC handlers
  setupIpcHandlers();

  // Create window
  await createWindow();

  // Register global shortcut
  const config = readConfig();
  const registered = registerGlobalShortcut(config.globalShortcut);
  if (!registered) {
    console.warn(`[Morph] Failed to register shortcut: ${config.globalShortcut}`);
  }
}

// macOS lifecycle
app.on("before-quit", () => {
  isQuitting = true;
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  closeDb();
});

app.on("window-all-closed", () => {
  // macOS: keep app alive when window closed
});

app.on("activate", () => {
  if (mainWindow) {
    mainWindow.show();
  }
});

app.whenReady().then(startApp).catch((err) => {
  console.error("[Morph] Failed to start app:", err);
  app.quit();
});
