export type ProviderId = "anthropic" | "groq" | "azure";
export type Target = "slack" | "teams" | "generic";

export interface RewriteRecord {
  id: number;
  input_text: string;
  output_text: string;
  system_prompt: string;
  model: string;
  target: string;
  created_at: string;
}

export interface ProviderView {
  /** Masked, e.g. "••••1a2b". Never the real key. */
  apiKey: string;
  apiKeySet: boolean;
  /** For "azure" this is the deployment name, not a catalog model id. */
  model: string;
  /** Azure only. Not a secret, so it arrives unmasked. */
  endpoint: string;
  apiVersion: string;
}

export interface MorphConfig {
  version: number;
  activeProvider: ProviderId;
  providers: Record<ProviderId, ProviderView>;
  providerModels: Record<ProviderId, { id: string; label: string }[]>;
  providerLabels: Record<ProviderId, string>;
  prompts: Record<Target, string>;
  defaultPrompts: Record<Target, string>;
  globalShortcut: string;
  window: { width: number; height: number; x?: number; y?: number };
}

export interface MorphBridge {
  isElectron: true;
  format: (target: Target) => Promise<string>;
  hideWindow: () => Promise<void>;
  setWindowBackground: (color: string) => Promise<void>;
  writeClipboardFormatted: (markdown: string, target: Target) => Promise<void>;
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

// -webkit-app-region isn't in React's CSSProperties
declare module "react" {
  interface CSSProperties {
    WebkitAppRegion?: "drag" | "no-drag";
  }
}
