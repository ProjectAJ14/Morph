import Anthropic from "@anthropic-ai/sdk";
import Groq from "groq-sdk";
import type { MorphConfig, ProviderId } from "./config";

export interface ModelOption {
  id: string;
  label: string;
}

export const PROVIDER_MODELS: Record<ProviderId, ModelOption[]> = {
  anthropic: [
    { id: "claude-opus-5", label: "Claude Opus 5" },
    { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B" },
    { id: "gemma2-9b-it", label: "Gemma 2 9B" },
  ],
};

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: "Anthropic",
  groq: "Groq",
};

const MAX_TOKENS = 4096;

async function completeAnthropic(apiKey: string, model: string, system: string, text: string): Promise<string> {
  const res = await new Anthropic({ apiKey }).messages.create({
    model,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: "user", content: text }],
  });
  return res.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

async function completeGroq(apiKey: string, model: string, system: string, text: string): Promise<string> {
  const res = await new Groq({ apiKey }).chat.completions.create({
    model,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: "system", content: system },
      { role: "user", content: text },
    ],
  });
  return (res.choices[0]?.message?.content ?? "").trim();
}

// Models emit dashes as connectors no matter what the prompt says, so strip them after the fact.
// Code spans are left alone: "--flag" and friends are real there.
const CODE_SPAN = /(```[\s\S]*?```|`[^`\n]*`)/;

export function stripDashes(text: string): string {
  return text
    .split(CODE_SPAN)
    .map((part, i) => (i % 2 ? part : part.split("\n").map(fixLine).join("\n")))
    .join("");
}

// ponytail: fenced and inline code are protected, 4-space-indented code blocks are not.
// Both prompts mandate fences, so that path stays theoretical until it isn't.
function fixLine(line: string): string {
  if (/^\s*[-\u2013\u2014|]{2,}\s*$/.test(line)) return line; // horizontal rule / table divider
  return line
    .replace(/(\d)\s*(?:[\u2013\u2014]|--)\s*(?=\d)/g, "$1-") // ranges stay ranges
    .replace(/^(\s*)(?:[\u2013\u2014]|--)\s+/, "$1- ") // dash used as a bullet
    .replace(/\s*(?:[\u2013\u2014]|(?<!-)--(?!-))\s*$/, "") // dangling at end of line
    .replace(/^\s*(?:[\u2013\u2014]|(?<!-)--(?!-))\s*/, "") // ...or at the start
    .replace(/\s*(?:[\u2013\u2014]|(?<!-)--(?!-))\s*/g, ", ")
    .replace(/\s+,/g, ",")
    .replace(/([,;:.!?])\s*,\s+/g, "$1 ");
}

/** Runs the active provider. Throws with a readable message if it isn't configured. */
export async function complete(config: MorphConfig, system: string, text: string): Promise<string> {
  const id = config.activeProvider;
  const { apiKey, model } = config.providers[id];
  if (!apiKey) {
    throw new Error(`No ${PROVIDER_LABELS[id]} API key configured. Open settings to add one.`);
  }
  const out = id === "anthropic"
    ? await completeAnthropic(apiKey, model, system, text)
    : await completeGroq(apiKey, model, system, text);
  if (!out) throw new Error("The model returned an empty response.");
  return stripDashes(out);
}

if (require.main === module) {
  const assert: typeof import("assert") = require("assert");
  const eq = (input: string, want: string) => assert.strictEqual(stripDashes(input), want);

  eq("Checked it \u2014 not a duplicate ID.", "Checked it, not a duplicate ID.");
  eq("Checked it -- not a dup.", "Checked it, not a dup.");
  eq("word\u2014word", "word, word");
  eq("Apr 18\u201320 window", "Apr 18-20 window");
  eq("\u2014 first point", "- first point");
  eq("Run `npm run check -- --watch` now.", "Run `npm run check -- --watch` now.");
  eq("```\ngit log --oneline\n```", "```\ngit log --oneline\n```");
  eq("| a | b |\n|---|---|\n| 1 | 2 |", "| a | b |\n|---|---|\n| 1 | 2 |");
  eq("Separate \u2014 and unrelated.", "Separate, and unrelated.");
  eq("Done.\n\n---\n\nNext", "Done.\n\n---\n\nNext");
  eq("Blockers:\n- schema drift,\n- missing rows", "Blockers:\n- schema drift,\n- missing rows");
  eq("\u2014leading with no space", "leading with no space");
  eq("Trailing dash \u2014", "Trailing dash");
  assert.strictEqual(/[\u2013\u2014]|--/.test(stripDashes("a \u2014 b \u2013 c -- d")), false);

  console.log("providers: all assertions passed");
}
