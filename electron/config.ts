import { app } from "electron";
import * as fs from "fs";
import * as path from "path";

export type ProviderId = "anthropic" | "groq";
export type Target = "slack" | "teams" | "generic";

export interface ProviderConfig {
  apiKey: string;
  model: string;
}

export interface MorphConfig {
  version: number;
  activeProvider: ProviderId;
  providers: Record<ProviderId, ProviderConfig>;
  prompts: Record<Target, string>;
  globalShortcut: string;
  window: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  };
}

// Shared tone rules — the part the user cares most about.
const TONE = `Rules:
- Use simple, natural English. Keep the meaning exactly the same.
- Keep it short and clear. Restructure if that makes it clearer.
- Do not add details, opinions, or greetings that were not in the original.
- Do not make it sound AI-generated or overly polished. It should read like a normal person wrote it.
- Output ONLY the rewritten message. No preamble, no explanation, no code fences around the whole reply.`;

export const DEFAULT_PROMPTS: Record<Target, string> = {
  slack: `Rewrite the user's message as a Slack message, formatted in Markdown.

${TONE}

Slack formatting constraints:
- Slack has NO tables and NO headings. Never output a Markdown table or a # heading.
- For tabular data, use a fenced code block with columns padded by spaces so they line up.
- Use **bold** for emphasis and labels, - for bullets, 1. for numbered steps.
- Use \`inline code\` for identifiers/paths and fenced code blocks for code.
- Keep paragraphs short. A blank line between blocks.`,

  teams: `Rewrite the user's message as a Microsoft Teams message, formatted in Markdown.

${TONE}

Teams formatting constraints:
- Teams supports real tables — use a Markdown table when the content is genuinely tabular.
- Teams has no headings in chat. Use a short **bold** line instead of a # heading.
- Use - for bullets, 1. for numbered steps, **bold** for emphasis and labels.
- Use \`inline code\` for identifiers/paths and fenced code blocks for code.
- Keep paragraphs short. A blank line between blocks.`,

  generic: `Rewrite the user's message in clean, standard Markdown.

${TONE}

Formatting:
- Use headings, tables, bullets, numbered lists and fenced code blocks wherever they make the message easier to read.
- Keep paragraphs short.`,
};

const DEFAULT_CONFIG: MorphConfig = {
  version: 2,
  activeProvider: "anthropic",
  providers: {
    anthropic: { apiKey: "", model: "claude-sonnet-5" },
    groq: { apiKey: "", model: "llama-3.3-70b-versatile" },
  },
  prompts: DEFAULT_PROMPTS,
  globalShortcut: "CommandOrControl+Shift+M",
  window: {
    width: 520,
    height: 480,
  },
};

function getConfigPath(): string {
  return path.join(app.getPath("userData"), "morph.config.json");
}

/** v1 config was flat: { groqApiKey, model, systemPrompt }. Fold it into providers. */
function migrate(raw: any): MorphConfig {
  if (!raw || raw.version >= 2) return raw;
  return {
    ...DEFAULT_CONFIG,
    globalShortcut: raw.globalShortcut ?? DEFAULT_CONFIG.globalShortcut,
    // v1 bounds were sized for the old editor UI — the button panel wants a small window.
    window: { ...DEFAULT_CONFIG.window },
    activeProvider: "anthropic",
    providers: {
      anthropic: { ...DEFAULT_CONFIG.providers.anthropic },
      groq: {
        apiKey: raw.groqApiKey ?? "",
        model: raw.model ?? DEFAULT_CONFIG.providers.groq.model,
      },
    },
  };
}

export function readConfig(): MorphConfig {
  const configPath = getConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      const stored = migrate(JSON.parse(fs.readFileSync(configPath, "utf-8")));
      return {
        ...DEFAULT_CONFIG,
        ...stored,
        providers: { ...DEFAULT_CONFIG.providers, ...stored.providers },
        prompts: { ...DEFAULT_PROMPTS, ...stored.prompts },
        window: { ...DEFAULT_CONFIG.window, ...stored.window },
      };
    }
  } catch {
    console.warn("[Morph] Failed to read config, using defaults");
  }
  return { ...DEFAULT_CONFIG };
}

export function writeConfig(config: MorphConfig): void {
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), "utf-8");
}

export function saveWindowBounds(bounds: { x: number; y: number; width: number; height: number }): void {
  const config = readConfig();
  config.window = bounds;
  writeConfig(config);
}
