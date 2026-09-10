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
  return out;
}
