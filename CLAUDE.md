# Morph

Clipboard formatter for Slack / Teams / plain Markdown. Electron + Vite + React 19 + TypeScript.
Copy a rough message → click a target → the formatted version replaces your clipboard.

## Quick Start
```bash
npm install
npm run electron:dev   # Dev mode (Vite + Electron)
npm run electron:build # Production build
```

## Architecture
- **electron/** — Main process (Node.js): window management, IPC, provider calls, SQLite database
  - `providers.ts` — Anthropic + Groq adapters; the active one is chosen in settings
  - `clipboard-format.ts` — writes both clipboard flavors (`text/html` + `text/plain`)
  - `mrkdwn.ts` — Markdown → Slack mrkdwn, with an assert self-check (`npm run check`)
- **src/** — Renderer (React): UI components, Zustand store
  - `styles/tokens.css` — **the design system**; see below
  - `globals.css` — base + component classes, built entirely on those tokens
- API keys stay in main process — the renderer only ever receives a masked key
- Database: better-sqlite3 in `app.getPath("userData")/morph.db`
- Config: JSON file in `app.getPath("userData")/morph.config.json` (v1 → v2 migration in `config.ts`)

## Design system — change the theme in one file
The look is ported from [Eklavya](https://eklavya-run.web.app/): warm dark ground, one
verdigris accent, square chrome, Archivo/Inter/JetBrains Mono, hairline rules instead of
cards. Two layers, and the order matters:

1. **`src/styles/tokens.css`** — a fixed SCALE (accent ramp, type, spacing, radii, motion)
   plus two GROUNDS, `ink` (default) and `paper`, each redefining the same ROLE tokens.
2. **`src/globals.css` + components** — name a role (`--ink`, `--dim`, `--line`, `--spot`)
   and never a scale step or a raw hex.

Retheming is editing tokens.css and nothing else. `data-mode` on `<html>` picks the ground;
custom properties inherit, so flipping that one attribute re-resolves the whole tree. The
attribute is set by an inline script in `index.html` (before first paint, so no flash) and
owned by `src/lib/ground.ts` thereafter. The native window frame can't read CSS, so
`ground.ts` pushes the *resolved* `--bg` to main over `window:set-background`.

Rules that keep this true — all three are asserted by `npm run check`:
- Every role is defined on **both** grounds. One-sided roles render ink text on paper.
- No raw hex or `--vd-*` step in `globals.css` or any component.
- Every text role clears WCAG AA on every surface it lands on (`--bg`, `--panel`, `--mass`).

Colour is spent sparingly: `--spot` marks working/done/active and nothing else. Format
targets deliberately carry **no** per-brand hue — the mark and label identify the app, so a
second hue there would read as state.

## Clipboard formats — why they differ
Neither Slack nor Teams parses Markdown on paste, so Morph writes **two** clipboard flavors and lets
the target app pick:
- `text/html` — what both apps actually read on ⌘V. Only route to real tables in Teams.
- `text/plain` — the ⌘⇧V fallback. Slack gets mrkdwn (`*bold*`, single asterisk); Teams and Generic
  get standard Markdown.

Slack supports no tables and no headings, so its prompt forbids them (tabular data → aligned code
block). Teams supports tables but not headings.

## Key Commands
- `npm run dev` — Vite dev server only
- `npm run check` — Design-token self-check + compile electron/ + mrkdwn/clipboard self-checks
- `npm run electron:dev` — Full dev (Vite + Electron)
- `npm run electron:compile` — Compile electron/ TypeScript
- `npm run electron:build` — Full production build

## Release
- Every push to `main` releases. The workflow reads the conventional-commit subjects since the
  last tag, bumps semver (`feat:` → minor, `!:`/`BREAKING CHANGE:` → major, anything else → patch),
  stamps that version into the build, and cuts the tag + GitHub Release. No manual version bump.
- `package.json`'s version is a dev placeholder only — git tags are the source of truth. CI stamps
  the real version at build time and never commits it back.
- Pull requests run `npm run check` + `npm run build` only. No installers, no tag.
