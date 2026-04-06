<div align="center">

# Morph

**Rewrite anything, instantly.**

[![Download](https://img.shields.io/badge/Download-Landing_Page-blue?style=for-the-badge&logo=github)](https://projectaj14.github.io/Morph/)
[![Release](https://img.shields.io/github/v/release/ProjectAJ14/Morph?style=for-the-badge&logo=electron&label=Latest)](https://github.com/ProjectAJ14/Morph/releases/latest)
[![License](https://img.shields.io/github/license/ProjectAJ14/Morph?style=for-the-badge)](LICENSE)

<br />

*AI-powered text rewriter that lives in your menu bar. One global shortcut to transform any text on your clipboard. Powered by [Groq](https://groq.com) for lightning-fast results.*

**Shortcut → Clipboard → Rewrite → Copy. Done.**

[Download the App](https://projectaj14.github.io/Morph/) · [View Releases](https://github.com/ProjectAJ14/Morph/releases) · [Report Issue](https://github.com/ProjectAJ14/Morph/issues)

> Built by [Ajay Kumar](https://github.com/ProjectAJ14)

</div>

---

## How It Works

```
   Trigger          Read Clipboard       AI Rewrite          Copy
  ─────────── ──▶ ─────────────── ──▶ ─────────────── ──▶ ───────────────
  Press global      Morph reads your     Groq rewrites       One click to
  shortcut from     clipboard content    with your custom     copy the result
  any app           automatically        system prompt        back to clipboard
```

1. **Trigger** — Press `⌘+Shift+M` from anywhere on your system
2. **Rewrite** — Morph reads your clipboard, sends it to Groq with your custom system prompt
3. **Copy** — One click copies the rewritten text back to your clipboard

---

## Setup Guide

Download and install Morph from the [landing page](https://projectaj14.github.io/Morph/) or [releases](https://github.com/ProjectAJ14/Morph/releases/latest), then follow the steps below.

### Step 1 — Get a Groq API Key

1. Go to [console.groq.com](https://console.groq.com/) and create an account
2. Navigate to **API Keys** and create a new key (starts with `gsk_...`)
3. Copy the API key

### Step 2 — Configure Morph

1. Open Morph
2. Click the **gear icon** (⚙️) to open Settings
3. Paste your Groq API key
4. (Optional) Customize your **System Prompt** — this controls how text is rewritten
5. (Optional) Change the **Model** (default: Llama 3.3 70B)
6. (Optional) Change the **Global Shortcut** (default: `⌘+Shift+M`)
7. Click **Save Changes**

---

## Daily Usage

1. **Copy** any text to your clipboard (⌘+C)
2. **Press** `⌘+Shift+M` — Morph appears with your text
3. **Click** Rewrite (or press `⌘+Enter`)
4. **Click** Copy to grab the result
5. **Paste** wherever you need it (⌘+V)

> Morph automatically hides when you press the shortcut again, or you can close it normally.

---

## Features

| Feature | Description |
|:--------|:------------|
| **Global Shortcut** | Trigger from any app without switching windows (`⌘+Shift+M`) |
| **Clipboard Auto-Read** | Automatically reads clipboard content when activated |
| **Streaming Responses** | Text streams in as the AI writes — no waiting for the full response |
| **Custom System Prompt** | Set your own instructions for how text should be rewritten |
| **Multiple Models** | Choose from Llama 3.3 70B, Llama 3.1 8B, Mixtral 8x7B, Gemma 2 9B |
| **Local History** | Every rewrite is saved in a local SQLite database |
| **One-Click Copy** | Copy the rewritten text back to clipboard instantly |
| **Fully Local** | No accounts, no cloud storage — your API key and history stay on your machine |

---

## Developer Setup

For contributors working from the source repo.

### Prerequisites

- Node.js 20+
- npm

### Quick Start

```bash
npm install
npm run electron:dev     # Start Electron + Vite in dev mode
```

### Scripts

```bash
npm run dev              # Vite dev server only
npm run build            # Production build (renderer)
npm run electron:compile # Compile Electron TypeScript
npm run electron:dev     # Dev mode (Vite + Electron)
npm run electron:build   # Production build + package
```

### Architecture

```
electron/          Main process (Node.js)
├── main.ts        Window management, IPC, global shortcut, single-instance lock
├── preload.ts     Secure contextBridge IPC exposure
├── config.ts      JSON config persistence in userData
├── database.ts    SQLite setup and CRUD (better-sqlite3)
└── groq.ts        Groq API streaming calls (API key stays in main process)

src/               Renderer (React)
├── App.tsx        Root component, IPC listeners
├── components/    RewriteView, SettingsDialog, HistoryPanel
├── stores/        Zustand state management
└── types/         TypeScript declarations
```

### Key Design Decisions

- **API key in main process** — Never exposed to the renderer (browser context)
- **No embedded HTTP server** — Vite produces static files loaded via `file://` in production
- **better-sqlite3** — Synchronous, fast, runs in main process, results passed via IPC
- **Single instance lock** — Prevents duplicate app windows

---

## CI/CD

### Release Workflow

Pushing a version tag triggers the release pipeline automatically:

```bash
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin v0.2.0
```

The GitHub Actions workflow builds for:
- **macOS** — Apple Silicon (arm64) + Intel (x64) → DMG + ZIP
- **Windows** — x64 → EXE installer

Artifacts are published to [GitHub Releases](https://github.com/ProjectAJ14/Morph/releases).

### GitHub Pages

The landing page (`docs/index.html`) is auto-deployed to GitHub Pages on pushes to `main` that modify the `docs/` directory.

---

<div align="center">

Built with Electron, React, and Groq.

*Rewrite anything, instantly.*

</div>
