import { app } from "electron";
import * as fs from "fs";
import * as path from "path";

export type ProviderId = "anthropic" | "groq" | "azure";
export type Target = "slack" | "teams" | "generic";

export interface ProviderConfig {
  apiKey: string;
  /** Azure routes on the deployment name, so for "azure" this holds that, not a catalog model id. */
  model: string;
  /** Azure only: resource base URL, e.g. https://xxx.cognitiveservices.azure.com/ */
  endpoint?: string;
  /** Azure only: pins ?api-version= when the resource rejects the built-in default. */
  apiVersion?: string;
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

// Shared tone rules. Ported from the "signs of AI writing" checklist
// (github.com/blader/humanizer) - the point is output nobody clocks as a bot.
const TONE = `Rules:
- Keep the meaning exactly the same. Do not add facts, opinions, greetings or sign-offs that were not in the original.
- Plain, direct English. Say the thing instead of staging it. Shorten and restructure freely.
- Never write "not just X, but Y", "it's not X, it's Y", or any variant. State the point once.
- No closing flourish. End on the last real fact, not a summary line or a punchy fragment.
- No throat-clearing. The first sentence carries content, never "Here's a quick update on...".
- Do not force groups of three. Use exactly as many items as the content has.
- Never use an em dash or an en dash, and never "--". Not as a connector, not for an aside, not anywhere. Use a comma, a colon, a period, or brackets.
- Straight quotes and apostrophes only. No curly quotes, no ellipsis character.
- Banned words: delve, leverage, robust, seamless, elevate, testament, landscape, realm, showcase, unlock, empower, crucial, pivotal, foster, underscore, holistic, cutting-edge, transformative, game-changer. Prefer "use" over "utilize", "make sure" over "ensure", "about" over "regarding".
- No inflated significance ("this marks a major step", "highlights the importance of") and no sales language.
- One qualifier at most, and only if the original hedged. Drop "may potentially", "could possibly help to".
- Use is/are/has directly. Not "serves as", "acts as", "plays a key role in".
- Active voice with the real actor named, whenever the original names one.
- Bold is for labels that earn it, not decoration. No emoji unless the original had them.
- Contractions are fine. It should read like a competent colleague typed it quickly, not like a press release.
- Output ONLY the rewritten message. No preamble, no explanation, no code fence around the whole reply.`;

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
- Teams supports real tables: use a Markdown table when the content is genuinely tabular.
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
    azure: { apiKey: "", model: "", endpoint: "", apiVersion: "" },
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
      azure: { ...DEFAULT_CONFIG.providers.azure },
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
  // Persist only prompts the user actually changed, so later default updates still reach them.
  const prompts = Object.fromEntries(
    Object.entries(config.prompts).filter(([target, text]) => text !== DEFAULT_PROMPTS[target as Target])
  );
  fs.writeFileSync(getConfigPath(), JSON.stringify({ ...config, prompts }, null, 2), "utf-8");
}

export function saveWindowBounds(bounds: { x: number; y: number; width: number; height: number }): void {
  const config = readConfig();
  config.window = bounds;
  writeConfig(config);
}
