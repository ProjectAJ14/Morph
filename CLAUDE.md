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
- API keys stay in main process — the renderer only ever receives a masked key
- Database: better-sqlite3 in `app.getPath("userData")/morph.db`
- Config: JSON file in `app.getPath("userData")/morph.config.json` (v1 → v2 migration in `config.ts`)

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
- `npm run check` — Compile electron/ + run the mrkdwn self-check
- `npm run electron:dev` — Full dev (Vite + Electron)
- `npm run electron:compile` — Compile electron/ TypeScript
- `npm run electron:build` — Full production build

## Release
- Push to `main` → GitHub Actions reads `package.json` version; if `v<version>` isn't already a tag,
  it builds macOS (arm64+x64) + Windows (x64) and cuts the tag + GitHub Release. Same version = no-op.
- So releasing = bump the version (`npm version patch`) and land it on `main`.
