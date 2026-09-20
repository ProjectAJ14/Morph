/**
 * A failed format run -> a prefilled GitHub issue.
 *
 * No LLM in the loop, on purpose. The cause chain captured at the throw site
 * already names the fault exactly ("fetch failed" is useless, its cause
 * `ENOTFOUND r.openai.azure.com` is the whole answer), and the provider that
 * would be asked to summarise it is usually the thing that just broke.
 *
 * Issues are public, so everything here goes through `redact` first.
 */

const REPO = "ProjectAJ14/Morph";
/** GitHub answers 414 past ~8k. Leave room for the fixed part of the URL. */
const MAX_URL = 6000;

export interface Failure {
  /** Error chain from `errorChain`, already redacted. */
  detail: string;
  target: string;
  provider: string;
  model: string;
  /** Characters on the clipboard. The text itself is private and never sent. */
  inputLength: number;
  version: string;
  platform: string;
  electron: string;
}

/** Secrets and private hosts, out. Home paths shortened so stacks stay readable. */
export function redact(text: string): string {
  return text
    .replace(/\b(sk-[A-Za-z0-9_-]{8,}|gsk_[A-Za-z0-9]{8,}|xox[bapsr]-[A-Za-z0-9-]{8,})/g, "[redacted-key]")
    .replace(/((?:api[-_]?key|authorization|bearer|token)["'\s:=]+)[A-Za-z0-9._-]{8,}/gi, "$1[redacted-key]")
    // A resource name is the customer's, and knowing it helps nobody read the bug.
    .replace(/\b[A-Za-z0-9-]+\.(openai\.azure\.com|cognitiveservices\.azure\.com)/g, "<resource>.$1")
    .replace(/\/Users\/[^/\s"')]+/g, "~")
    .replace(/[A-Za-z]:\\Users\\[^\\\s"')]+/g, "~");
}

/** `name: message` for the error and every `cause` under it, plus a short stack. */
export function errorChain(err: unknown): string {
  const lines: string[] = [];
  let cur: any = err;
  for (let depth = 0; cur && depth < 5; depth++) {
    const text = cur instanceof Error ? `${cur.name}: ${cur.message}` : String(cur);
    lines.push(depth ? `  caused by: ${text}` : text);
    cur = cur?.cause;
  }
  const stack = err instanceof Error && err.stack ? err.stack.split("\n").slice(1, 6) : [];
  if (stack.length) lines.push("", ...stack.map((l) => l.trim()));
  return redact(lines.join("\n"));
}

/** Deepest cause is the real fault, so that is what the title says. */
function title(f: Failure): string {
  const lines = f.detail.split("\n").filter((l) => l.trim());
  const causes = lines.filter((l) => l.includes("caused by:"));
  const fault = (causes[causes.length - 1] ?? lines[0] ?? "").replace("caused by:", "").trim();
  return `Format failed (${f.provider}/${f.target}): ${fault}`.slice(0, 120);
}

function body(f: Failure): string {
  return [
    "### What happened",
    "",
    "A format run failed. Reported from the app, so the detail below is captured, not retyped.",
    "",
    "```",
    f.detail,
    "```",
    "",
    "### Context",
    "",
    `| | |`,
    `|---|---|`,
    `| Target | ${f.target} |`,
    `| Provider | ${f.provider} |`,
    `| Model | ${f.model} |`,
    `| Clipboard | ${f.inputLength} chars |`,
    `| Morph | ${f.version} |`,
    `| Platform | ${f.platform} |`,
    `| Electron | ${f.electron} |`,
    "",
    "### Steps",
    "",
    "1. Copied text, clicked the target above.",
    "",
  ].join("\n");
}

export function issueUrl(f: Failure): string {
  const build = (b: string) =>
    `https://github.com/${REPO}/issues/new?${new URLSearchParams({ title: title(f), body: b, labels: "bug" })}`;

  const full = build(body(f));
  if (full.length <= MAX_URL) return full;
  // One clamp, not a shrink ladder: the detail block is the only part that can run long.
  const over = full.length - MAX_URL;
  const clipped = { ...f, detail: f.detail.slice(0, Math.max(200, f.detail.length - over - 60)) + "\n[truncated]" };
  return build(body(clipped));
}

if (require.main === module) {
  const assert: typeof import("assert") = require("assert");

  // Secrets never reach a public issue.
  assert.match(redact("key sk-ant-api03-AbCdEf012345 here"), /\[redacted-key\]/);
  assert.match(redact('"api-key": "9f8e7d6c5b4a3210"'), /\[redacted-key\]/);
  assert.match(redact("Authorization: Bearer gsk_ABCdef0123456789"), /\[redacted-key\]/);
  assert.strictEqual(redact("https://acme-prod.openai.azure.com/openai"), "https://<resource>.openai.azure.com/openai");
  assert.strictEqual(redact("at f (/Users/ajay/Workspace/Morph/a.js:1:1)"), "at f (~/Workspace/Morph/a.js:1:1)");
  assert.strictEqual(redact("plain 404 not found"), "plain 404 not found");

  // The cause chain is the point: the outer message alone says nothing.
  const outer = new TypeError("fetch failed", { cause: new Error("getaddrinfo ENOTFOUND acme.openai.azure.com") });
  const chain = errorChain(outer);
  assert.match(chain, /TypeError: fetch failed/);
  assert.match(chain, /caused by: Error: getaddrinfo ENOTFOUND/);
  assert.strictEqual(errorChain("just a string").split("\n")[0], "just a string");

  const fail: Failure = {
    detail: chain, target: "teams", provider: "Azure OpenAI", model: "gpt-5-5-2",
    inputLength: 812, version: "0.3.0", platform: "darwin 27.0.0 arm64", electron: "33.0.0",
  };
  const url = issueUrl(fail);
  assert.ok(url.startsWith(`https://github.com/${REPO}/issues/new?`));
  const q = new URL(url).searchParams;
  assert.match(q.get("title")!, /^Format failed \(Azure OpenAI\/teams\): Error: getaddrinfo ENOTFOUND/);
  assert.ok(q.get("title")!.length <= 120);
  assert.match(q.get("body")!, /\| Clipboard \| 812 chars \|/);
  assert.ok(!q.get("body")!.includes("acme.openai.azure.com"));

  // No cause chain (a precondition Morph raised itself): the message is the fault.
  const plain = issueUrl({ ...fail, detail: errorChain(new Error("Clipboard is empty. Copy first.")) });
  assert.match(new URL(plain).searchParams.get("title")!, /^Format failed \(Azure OpenAI\/teams\): Error: Clipboard is empty\./);

  // A runaway stack still produces a usable URL.
  const long = issueUrl({ ...fail, detail: "x".repeat(20_000) });
  assert.ok(long.length <= MAX_URL, `url ${long.length} > ${MAX_URL}`);
  assert.match(new URL(long).searchParams.get("body")!, /\[truncated\]/);

  console.log("report: all assertions passed");
}
