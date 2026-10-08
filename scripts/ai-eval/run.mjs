// Replays cases.json through the real prompts + active provider and scores the output.
//   npm run ai:eval -- [--runs N] [--only id] [--out file.json] [--compare base.json]
// Needs a key: reads the same morph.config.json the app writes (override with MORPH_CONFIG).
// Exits non-zero on any injection failure (leak / obeyed) or provider error; style rates are only reported.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import { score } from "./lib.mjs";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "../..");
// providers.ts fetches through Electron's net module; under plain node swap in global fetch.
// ponytail: skips the OS trust store, so behind a TLS-intercepting proxy set NODE_EXTRA_CA_CERTS.
const electronPath = require.resolve("electron");
require.cache[electronPath] = { id: electronPath, filename: electronPath, loaded: true, exports: { net: { fetch: globalThis.fetch } } };
const { DEFAULT_PROMPTS } = require(path.join(root, "dist-electron/config.js"));
const { complete } = require(path.join(root, "dist-electron/providers.js"));

const argv = process.argv.slice(2);
const flag = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
const runs = Number(flag("runs", 1));
const only = flag("only");
const cfgPath = process.env.MORPH_CONFIG ?? path.join(homedir(), "Library/Application Support/Morph/morph.config.json");
const stored = JSON.parse(readFileSync(cfgPath, "utf8"));
const config = { ...stored, prompts: DEFAULT_PROMPTS }; // always the code's prompts, never a saved override
const model = config.providers[config.activeProvider].model;

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")).filter((c) => !only || c.id === only);
const results = [];
for (const c of cases) {
  for (let i = 0; i < runs; i++) {
    const t = Date.now();
    let out = "", bad;
    try {
      out = await complete(config, DEFAULT_PROMPTS[c.target], c.input);
      bad = score(c, out);
    } catch (e) {
      bad = [`error: ${e.message.slice(0, 120)}`];
    }
    results.push({ id: c.id, run: i, ms: Date.now() - t, bad, out });
    console.log(`${bad.length ? "FAIL" : "ok  "} ${c.id}${bad.length ? "  " + bad.join("; ") : ""}`);
  }
}

const pass = results.filter((r) => !r.bad.length).length;
console.log(`\n${pass}/${results.length} passed (${config.activeProvider} / ${model})`);

const outFile = flag("out", path.join(root, "scripts/ai-eval/results", `${Date.now()}.json`));
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify({ provider: config.activeProvider, model, results }, null, 2));

const base = flag("compare");
if (base) {
  const prev = JSON.parse(readFileSync(base, "utf8")).results;
  const rate = (rs) => rs.filter((r) => !r.bad.length).length / (rs.length || 1);
  console.log(`vs baseline: ${(rate(prev) * 100).toFixed(0)}% -> ${(rate(results) * 100).toFixed(0)}%`);
  for (const r of results.filter((r) => r.bad.length && prev.find((p) => p.id === r.id && p.run === r.run && !p.bad.length)))
    console.log(`  regressed: ${r.id} (${r.bad.join("; ")})`);
}

const inj = results.filter((r) => r.id.startsWith("inject-") && r.bad.some((b) => /leaked|obeyed/.test(b)));
const errs = results.filter((r) => r.bad.some((b) => b.startsWith("error:")));
process.exit(inj.length || errs.length ? 1 : 0);
