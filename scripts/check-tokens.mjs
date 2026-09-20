/**
 * Design-system self-check.
 *
 * Three invariants keep "retheme by editing tokens.css alone" true. All three
 * fail silently and slowly, which is exactly why they are asserted here:
 *
 *   1. Every ROLE is defined on BOTH grounds. A role present in only one
 *      renders one ground's text on the other's surface.
 *   2. globals.css and the components name roles ONLY — no raw hex, no scale
 *      step. Either one pins a component to a single ground.
 *   3. Text roles clear WCAG AA on every surface they are used on. The
 *      comments in tokens.css state these ratios; this proves them.
 *
 * Run: node scripts/check-tokens.mjs   (part of `npm run check`)
 */

import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
// Comments carry role names and ratios in prose; drop them before parsing.
const tokens = readFileSync(path.join(root, "src/styles/tokens.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  ""
);

/* ------------------------------------------------------------------ parse */

const RULES = [...tokens.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
  selector: m[1].trim(),
  body: m[2],
}));

/** Declarations of the one rule whose selector list satisfies `match`. */
function block(label, match) {
  const hit = RULES.filter((r) => match(r.selector));
  assert.equal(hit.length, 1, `tokens.css should have exactly one ${label} block, found ${hit.length}`);
  return Object.fromEntries(
    [...hit[0].body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()])
  );
}

const scale = block("scale", (s) => s === ":root");
const inkRoles = block("ink ground", (s) => s.includes('[data-mode="ink"]'));
const paperRoles = block("paper ground", (s) => s.includes('[data-mode="paper"]'));
const ink = { ...scale, ...inkRoles };
const paper = { ...scale, ...paperRoles };

/** Resolve var(--x) chains down to a literal. */
function resolve(vars, value, depth = 0) {
  assert.ok(depth < 10, `var() cycle at ${value}`);
  const m = /^var\((--[\w-]+)\)$/.exec(value.trim());
  return m ? resolve(vars, vars[m[1]] ?? "", depth + 1) : value.trim();
}

function rgb(vars, name) {
  const hex = resolve(vars, vars[name] ?? "");
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  assert.ok(m, `${name} resolves to "${hex}", which is not a 6-digit hex`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* ------------------------------------------------- 1. role parity */

const ROLES = Object.keys(inkRoles);
const PAPER = Object.keys(paperRoles);

for (const role of ROLES) {
  assert.ok(PAPER.includes(role), `ground parity: ${role} is on ink but missing from paper`);
}
for (const role of PAPER) {
  assert.ok(ROLES.includes(role), `ground parity: ${role} is on paper but missing from ink`);
}

/* ------------------------------------------------- 2. no hex outside tokens */

const componentFiles = [
  "src/globals.css",
  ...readdirSync(path.join(root, "src/components")).map((f) => `src/components/${f}`),
  "src/App.tsx",
];

for (const rel of componentFiles) {
  const src = readFileSync(path.join(root, rel), "utf8")
    // the Teams brand glyph is SVG path data, not colour
    .replace(/<path d="[^"]*"/g, "");
  const hexes = src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
  assert.equal(
    hexes.length,
    0,
    `${rel} names raw colour(s) ${hexes.join(", ")} — use a role from tokens.css instead`
  );
  const steps = src.match(/--vd-\d+/g) ?? [];
  assert.equal(
    steps.length,
    0,
    `${rel} names accent scale step(s) ${steps.join(", ")} — use --spot instead`
  );
}

/* ------------------------------------------------- 3. contrast */

const lin = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

function ratio(vars, fg, bg) {
  const a = lum(rgb(vars, fg));
  const b = lum(rgb(vars, bg));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Every text role, on every surface the components actually place it on.
const SURFACES = ["--bg", "--panel", "--mass"];
const TEXT = ["--ink", "--dim", "--faint", "--spot"];
const AA = 4.5;

const report = [];
for (const [groundName, vars] of [["ink", ink], ["paper", paper]]) {
  for (const fg of TEXT) {
    for (const bg of SURFACES) {
      const r = ratio(vars, fg, bg);
      report.push(`  ${groundName.padEnd(5)} ${fg.padEnd(8)} on ${bg.padEnd(8)} ${r.toFixed(2)}:1`);
      assert.ok(r >= AA, `${groundName}: ${fg} on ${bg} is ${r.toFixed(2)}:1, below AA ${AA}:1`);
    }
  }
  // --error is text in .link-btn--danger and an icon in .history-item__del,
  // which turns it on a --mass hover — so it must clear every surface too.
  for (const bg of SURFACES) {
    const r = ratio(vars, "--error", bg);
    report.push(`  ${groundName.padEnd(5)} --error  on ${bg.padEnd(8)} ${r.toFixed(2)}:1`);
    assert.ok(r >= AA, `${groundName}: --error on ${bg} is ${r.toFixed(2)}:1, below AA ${AA}:1`);
  }
  // text ON the accent fill — the primary button
  const onSpot = ratio(vars, "--spot-ink", "--spot");
  report.push(`  ${groundName.padEnd(5)} --spot-ink on --spot ${onSpot.toFixed(2)}:1`);
  assert.ok(onSpot >= AA, `${groundName}: --spot-ink on --spot is ${onSpot.toFixed(2)}:1`);
}

console.log("design tokens OK\n" + report.join("\n"));
console.log(`\n  ${ROLES.length} roles, both grounds; no raw colour outside tokens.css`);
