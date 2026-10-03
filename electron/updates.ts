import { app, dialog } from "electron";
import { autoUpdater } from "electron-updater";

let checking = false;
let downloaded = false;
let initialized = false;

function supported(): boolean {
  return app.isPackaged && !process.mas && ["darwin", "win32"].includes(process.platform);
}

async function offerRestart(): Promise<void> {
  const { response } = await dialog.showMessageBox({
    type: "info",
    title: "Morph update ready",
    message: "A new version of Morph is ready to install.",
    detail: "Restart Morph to finish updating. Your settings and history will be preserved.",
    buttons: ["Restart and Install", "Later"],
    defaultId: 1,
    cancelId: 1,
  });
  if (response === 0) autoUpdater.quitAndInstall();
}

export async function checkForUpdates(manual = false): Promise<void> {
  if (!supported()) {
    if (manual) await dialog.showMessageBox({ message: "Updates are available in installed direct-download versions of Morph for macOS and Windows." });
    return;
  }
  if (downloaded) {
    if (manual) await offerRestart();
    return;
  }
  if (checking) {
    if (manual) await dialog.showMessageBox({ message: "Morph is already checking for or downloading an update." });
    return;
  }
  checking = true;
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result?.downloadPromise) {
      await result.downloadPromise;
    } else if (manual) {
      await dialog.showMessageBox({ message: "Morph is up to date." });
    }
  } catch (error) {
    console.warn("[Morph] Update check failed:", error);
    if (manual) await dialog.showMessageBox({ type: "warning", message: "Morph could not check for updates.", detail: "Check your internet connection and try again later." });
  } finally {
    checking = false;
  }
}

export function startUpdates(): void {
  if (initialized || !supported()) return;
  initialized = true;
  autoUpdater.autoDownload = true;
  // Installation always follows an explicit restart choice.
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.on("error", (error) => console.warn("[Morph] Updater:", error));
  autoUpdater.on("update-downloaded", () => {
    downloaded = true;
    void offerRestart().catch((error) => console.warn("[Morph] Update prompt:", error));
  });
  void checkForUpdates();
  const timer = setInterval(() => { void checkForUpdates(); }, 6 * 60 * 60 * 1000);
  timer.unref();
  app.once("will-quit", () => clearInterval(timer));
}
