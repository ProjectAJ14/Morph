# Morph

AI-powered text rewriter using Groq API. Electron + Vite + React 19 + TypeScript.

## Quick Start
```bash
npm install
npm run electron:dev   # Dev mode (Vite + Electron)
npm run electron:build # Production build
```

## Architecture
- **electron/** — Main process (Node.js): window management, IPC, Groq API, SQLite database
- **src/** — Renderer (React): UI components, Zustand store
- API key stays in main process (never exposed to renderer)
- Database: better-sqlite3 in `app.getPath("userData")/morph.db`
- Config: JSON file in `app.getPath("userData")/morph.config.json`

## Key Commands
- `npm run dev` — Vite dev server only
- `npm run electron:dev` — Full dev (Vite + Electron)
- `npm run electron:compile` — Compile electron/ TypeScript
- `npm run electron:build` — Full production build

## Release
- Tag `v*.*.*` → GitHub Actions builds macOS (arm64+x64) + Windows (x64) → GitHub Release
