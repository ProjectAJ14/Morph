import { app, BrowserWindow, dialog, MessageBoxOptions } from "electron";
import { autoUpdater } from "electron-updater";

let checking = false;
let readyVersion: string | null = null;
let installing = false;
let initialized = false;
let hooks: UpdateHooks = {};

export interface UpdateHooks {
  /** Light (version) or clear (null) the rail's update tile. */
  onReady?: (version: string | null) => void;
  /** quitAndInstall closes windows before before-quit fires; main must let them close. */
  onBeforeRestart?: () => void;
  onRestartAborted?: () => void;
}

function supported(): boolean {
  return app.isPackaged && !process.mas && ["darwin", "win32"].includes(process.platform);
}

// Parent to the focused window so the box opens on the screen the user is looking at.
function show(options: MessageBoxOptions) {
  const win = BrowserWindow.getFocusedWindow();
  return win ? dialog.showMessageBox(win, options) : dialog.showMessageBox(options);
}

/** Version downloaded and waiting to install, or null. */
export function getReadyVersion(): string | null {
  return readyVersion;
}

/** The rail tile: restart and install the downloaded update. */
export function installUpdate(): void {
  if (!readyVersion || installing) return;
  installing = true;
  hooks.onBeforeRestart?.();
  try {
    autoUpdater.quitAndInstall(false, true);
  } catch (error) {
    abortInstall(error);
  }
}

// The install never happened: keep the app alive and drop the tile that can no longer install.
function abortInstall(error: unknown): void {
  console.warn("[Morph] Update install failed:", error);
  installing = false;
  readyVersion = null;
  hooks.onRestartAborted?.();
  hooks.onReady?.(null);
  void show({ type: "warning", message: "Morph could not install the update.", detail: "It will try again on the next check." });
}

export async function checkForUpdates(manual = false): Promise<void> {
  if (!supported()) {
    if (manual) await show({ message: "Updates are available in installed direct-download versions of Morph for macOS and Windows." });
    return;
  }
  if (readyVersion) {
    // The rail tile is the one place to install from (or Quit installs it).
    if (manual) await show({
      type: "info",
      message: `Morph ${readyVersion} is ready to install.`,
      detail: "Click the download icon in the sidebar to restart now, or it installs when you quit Morph.",
    });
    return;
  }
  if (checking) {
    if (manual) await show({ message: "Morph is already checking for or downloading an update." });
    return;
  }
  checking = true;
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result?.downloadPromise) {
      await result.downloadPromise;
    } else if (manual) {
      await show({ message: "Morph is up to date." });
    }
  } catch (error) {
    console.warn("[Morph] Update check failed:", error);
    if (manual) await show({ type: "warning", message: "Morph could not check for updates.", detail: "Check your internet connection and try again later." });
  } finally {
    checking = false;
  }
}

export function startUpdates(opts: UpdateHooks = {}): void {
  hooks = opts;
  if (initialized || !supported()) return;
  initialized = true;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true; // a downloaded update also installs on a normal Quit
  autoUpdater.on("error", (error) => {
    if (installing) abortInstall(error);
    else console.warn("[Morph] Updater:", error);
  });
  autoUpdater.on("update-downloaded", (info) => {
    // No dialog: the rail tile installs on click.
    readyVersion = info.version;
    hooks.onReady?.(info.version);
  });
  void checkForUpdates();
  const timer = setInterval(() => { void checkForUpdates(); }, 6 * 60 * 60 * 1000);
  timer.unref();
  app.once("will-quit", () => clearInterval(timer));
}
