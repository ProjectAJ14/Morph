import { app } from "electron";
import * as fs from "fs";
import * as path from "path";

export interface MorphConfig {
  version: number;
  groqApiKey: string;
  systemPrompt: string;
  model: string;
  globalShortcut: string;
  autoClipboard: boolean;
  window: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  };
}

const DEFAULT_CONFIG: MorphConfig = {
  version: 1,
  groqApiKey: "",
  systemPrompt: "You are a professional rewriter. Rewrite the given text to be clearer, more concise, and more professional while preserving the original meaning.",
  model: "llama-3.3-70b-versatile",
  globalShortcut: "CommandOrControl+Shift+M",
  autoClipboard: true,
  window: {
    width: 680,
    height: 620,
  },
};

function getConfigPath(): string {
  return path.join(app.getPath("userData"), "morph.config.json");
}

export function readConfig(): MorphConfig {
  const configPath = getConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, "utf-8");
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    console.warn("[Morph] Failed to read config, using defaults");
  }
  return { ...DEFAULT_CONFIG };
}

export function writeConfig(config: MorphConfig): void {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

export function saveWindowBounds(bounds: { x: number; y: number; width: number; height: number }): void {
  const config = readConfig();
  config.window = bounds;
  writeConfig(config);
}
