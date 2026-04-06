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
import { readConfig, writeConfig, saveWindowBounds, MorphConfig } from "./config";
import { getDb, insertRewrite, getHistory, deleteRewrite, clearHistory, closeDb } from "./database";
import { streamRewrite } from "./groq";

process.on("uncaughtException", (err) => console.error("[Morph] Uncaught exception:", err));
process.on("unhandledRejection", (reason) => console.error("[Morph] Unhandled rejection:", reason));

const APP_NAME = "Morph";
app.setName(APP_NAME);
app.setAboutPanelOptions({
  applicationName: APP_NAME,
  applicationVersion: require("../package.json").version,
  copyright: "Rewrite anything, instantly.",
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
        // Read clipboard and send to renderer (if auto-clipboard enabled)
        const cfg = readConfig();
        if (cfg.autoClipboard) {
          const text = clipboard.readText();
          if (text.trim()) {
            mainWindow.webContents.send("clipboard:paste", text);
          }
        }
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
    backgroundColor: "#09090b",
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

function setupIpcHandlers(): void {
  // Groq rewrite
  ipcMain.handle("groq:rewrite", async (_event, text: string, systemPromptOverride?: string) => {
    const config = readConfig();
    if (!config.groqApiKey) {
      mainWindow?.webContents.send("groq:stream-error", "No API key configured. Open settings to add your Groq API key.");
      throw new Error("No API key configured");
    }
    const systemPrompt = systemPromptOverride || config.systemPrompt;
    try {
      const fullResponse = await streamRewrite(config.groqApiKey, config.model, systemPrompt, text, mainWindow!);
      // Save to database
      insertRewrite(text, fullResponse, systemPrompt, config.model);
      return fullResponse;
    } catch (err: any) {
      const errorMsg = err?.message || "Unknown error during rewrite";
      mainWindow?.webContents.send("groq:stream-error", errorMsg);
      throw err;
    }
  });

  // Clipboard
  ipcMain.handle("clipboard:read", () => clipboard.readText());
  ipcMain.handle("clipboard:write", (_event, text: string) => clipboard.writeText(text));

  // Database
  ipcMain.handle("db:get-history", (_event, limit?: number, offset?: number) =>
    getHistory(limit ?? 50, offset ?? 0)
  );
  ipcMain.handle("db:delete-history", (_event, id: number) => deleteRewrite(id));
  ipcMain.handle("db:clear-history", () => clearHistory());

  // Config
  ipcMain.handle("config:get", () => {
    const config = readConfig();
    // Don't expose full API key to renderer — mask it
    return {
      ...config,
      groqApiKey: config.groqApiKey ? "••••" + config.groqApiKey.slice(-4) : "",
      groqApiKeySet: !!config.groqApiKey,
      autoClipboard: config.autoClipboard,
    };
  });

  ipcMain.handle("config:set", (_event, partial: Partial<MorphConfig>) => {
    const config = readConfig();
    const updated = { ...config, ...partial };

    // Re-register global shortcut if changed
    if (partial.globalShortcut && partial.globalShortcut !== config.globalShortcut) {
      const success = registerGlobalShortcut(partial.globalShortcut);
      if (!success) {
        // Revert to old shortcut
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
