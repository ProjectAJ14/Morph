export interface RewriteRecord {
  id: number;
  input_text: string;
  output_text: string;
  system_prompt: string;
  model: string;
  created_at: string;
}

export interface MorphConfig {
  version: number;
  groqApiKey: string;
  groqApiKeySet: boolean;
  systemPrompt: string;
  model: string;
  globalShortcut: string;
  window: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  };
}

export interface MorphBridge {
  isElectron: true;
  rewrite: (text: string, systemPrompt?: string) => Promise<string>;
  onStreamChunk: (cb: (chunk: string) => void) => () => void;
  onStreamDone: (cb: () => void) => () => void;
  onStreamError: (cb: (error: string) => void) => () => void;
  onClipboardPaste: (cb: (text: string) => void) => () => void;
  readClipboard: () => Promise<string>;
  writeClipboard: (text: string) => Promise<void>;
  getHistory: (limit?: number, offset?: number) => Promise<RewriteRecord[]>;
  deleteHistoryItem: (id: number) => Promise<void>;
  clearHistory: () => Promise<void>;
  getConfig: () => Promise<MorphConfig>;
  setConfig: (config: Record<string, unknown>) => Promise<void>;
}

declare global {
  interface Window {
    morph: MorphBridge;
  }
}
