import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("morph", {
  isElectron: true,

  // Groq
  rewrite: (text: string, systemPrompt?: string): Promise<string> =>
    ipcRenderer.invoke("groq:rewrite", text, systemPrompt),
  onStreamChunk: (cb: (chunk: string) => void) => {
    const handler = (_: unknown, chunk: string) => cb(chunk);
    ipcRenderer.on("groq:stream-chunk", handler);
    return () => ipcRenderer.removeListener("groq:stream-chunk", handler);
  },
  onStreamDone: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on("groq:stream-done", handler);
    return () => ipcRenderer.removeListener("groq:stream-done", handler);
  },
  onStreamError: (cb: (error: string) => void) => {
    const handler = (_: unknown, error: string) => cb(error);
    ipcRenderer.on("groq:stream-error", handler);
    return () => ipcRenderer.removeListener("groq:stream-error", handler);
  },

  // Clipboard
  onClipboardPaste: (cb: (text: string) => void) => {
    const handler = (_: unknown, text: string) => cb(text);
    ipcRenderer.on("clipboard:paste", handler);
    return () => ipcRenderer.removeListener("clipboard:paste", handler);
  },
  readClipboard: (): Promise<string> => ipcRenderer.invoke("clipboard:read"),
  writeClipboard: (text: string): Promise<void> => ipcRenderer.invoke("clipboard:write", text),

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
