import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("morph", {
  isElectron: true,

  // Clipboard in -> formatted -> clipboard out
  format: (target: string): Promise<string> => ipcRenderer.invoke("format:run", target),
  hideWindow: (): Promise<void> => ipcRenderer.invoke("window:hide"),
  /** Opens a GitHub issue prefilled from the last failed run. */
  reportIssue: (): Promise<void> => ipcRenderer.invoke("report:open"),
  /** The native frame can't read CSS — the renderer hands it the resolved --bg. */
  setWindowBackground: (color: string): Promise<void> =>
    ipcRenderer.invoke("window:set-background", color),

  // Clipboard
  writeClipboardFormatted: (markdown: string, target: string): Promise<void> =>
    ipcRenderer.invoke("clipboard:write-formatted", markdown, target),

  // History
  getHistory: (limit?: number, offset?: number): Promise<unknown[]> =>
    ipcRenderer.invoke("db:get-history", limit, offset),
  deleteHistoryItem: (id: number): Promise<void> =>
    ipcRenderer.invoke("db:delete-history", id),
  clearHistory: (): Promise<void> => ipcRenderer.invoke("db:clear-history"),

  // Config
  getConfig: (): Promise<unknown> => ipcRenderer.invoke("config:get"),
  setConfig: (config: Record<string, unknown>): Promise<void> =>
    ipcRenderer.invoke("config:set", config),
});
