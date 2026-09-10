<div align="center">

# Morph

**Copy. Click. Paste.**

[![Download](https://img.shields.io/badge/Download-Landing_Page-blue?style=for-the-badge&logo=github)](https://projectaj14.github.io/Morph/)
[![Release](https://img.shields.io/github/v/release/ProjectAJ14/Morph?style=for-the-badge&logo=electron&label=Latest)](https://github.com/ProjectAJ14/Morph/releases/latest)
[![License](https://img.shields.io/github/license/ProjectAJ14/Morph?style=for-the-badge)](LICENSE)

<br />

*Turns a rough message into a properly formatted Slack or Teams message. Copy your text, press one shortcut, pick where it's going — the formatted version is already on your clipboard.*

**Copy → Shortcut → Slack / Teams / Generic → Paste. Done.**

[Download the App](https://projectaj14.github.io/Morph/) · [View Releases](https://github.com/ProjectAJ14/Morph/releases) · [Report Issue](https://github.com/ProjectAJ14/Morph/issues)

> Built by [Ajay Kumar](https://github.com/ProjectAJ14)

</div>

---

## How It Works

```
    Copy            Trigger          Pick a target        Paste
  ─────────── ──▶ ─────────────── ──▶ ─────────────── ──▶ ───────────────
  Copy your        Press the global    Slack, Teams or     Your clipboard
  rough message    shortcut            Generic — one       already holds the
  (⌘C)                                 click               formatted version
```

1. **Copy** — Copy the message you scribbled, however messy
2. **Trigger** — Press `⌘+Shift+M` from anywhere
3. **Pick a target** — Slack, Teams, or Generic Markdown. Morph reformats and replaces your
   clipboard, then hides itself
4. **Paste** — `⌘V` into the chat box. Bold, lists, code blocks and tables land as real formatting

### Why three buttons?

Neither Slack nor Teams parses Markdown on paste, and they don't support the same things. Morph
writes the clipboard differently for each:

| | Teams | Slack | Generic |
|:--|:--|:--|:--|
| Tables | real tables | not supported → aligned code block | real tables |
| Headings | not supported → bold line | not supported → bold line | real headings |
| Plain-text fallback | standard Markdown | mrkdwn (`*bold*`) | standard Markdown |

---

## Setup Guide

Download and install Morph from the [landing page](https://projectaj14.github.io/Morph/) or [releases](https://github.com/ProjectAJ14/Morph/releases/latest), then follow the steps below.

### Step 1 — Get an API Key

Morph works with either provider — pick one:

- **Anthropic** (default) — [console.anthropic.com](https://console.anthropic.com/) → API Keys → new key (`sk-ant-...`)
- **Groq** — [console.groq.com](https://console.groq.com/) → API Keys → new key (`gsk_...`)

### Step 2 — Configure Morph

1. Open Morph
2. Click the **gear icon** (⚙️) to open Settings
3. On the **Providers** tab, paste your key and pick a model. The provider marked active is the one
   used for formatting — switch it any time; both keys are kept
4. (Optional) On the **Prompts** tab, tune the Slack / Teams / Generic prompts
5. (Optional) On the **General** tab, change the **Global Shortcut** (default: `⌘+Shift+M`)
6. Click **Save Changes**

---

## Daily Usage

1. **Copy** your rough message (⌘+C)
2. **Press** `⌘+Shift+M` — Morph appears
3. **Click** Slack, Teams, or Generic
4. **Paste** into the chat box (⌘+V)

> Morph hides itself as soon as the clipboard is replaced. Press the shortcut again to bring it back.
> Past formats live under the clock icon — clicking one puts it back on your clipboard.

---

## Features

| Feature | Description |
|:--------|:------------|
| **Three targets** | Slack, Teams, and Generic Markdown — each formatted for what that app actually renders |
| **Clipboard in, clipboard out** | No text box. Copy, click, paste |
| **Rich paste** | Writes `text/html` and `text/plain`, so bold, lists, code blocks and tables survive the paste |
| **Global Shortcut** | Trigger from any app without switching windows (`⌘+Shift+M`) |
| **Swappable providers** | Anthropic or Groq, each with its own key and model. Switch in Settings |
| **Editable prompts** | Per-target prompts you can tune to your own voice |
| **Local History** | Every format is saved locally in SQLite; click one to re-copy it |
| **Fully Local** | No accounts, no cloud storage — your keys and history stay on your machine |

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
npm run check            # Compile + run the mrkdwn self-check
npm run electron:dev     # Dev mode (Vite + Electron)
npm run electron:build   # Production build + package
```

### Architecture

```
electron/               Main process (Node.js)
├── main.ts             Window management, IPC, global shortcut, single-instance lock
├── preload.ts          Secure contextBridge IPC exposure
├── config.ts           JSON config persistence, default prompts, v1→v2 migration
├── providers.ts        Anthropic + Groq adapters (API keys stay in main process)
├── clipboard-format.ts Writes both clipboard flavors per target
├── mrkdwn.ts           Markdown → Slack mrkdwn, with an assert self-check
└── database.ts         SQLite setup and CRUD (better-sqlite3)

src/                    Renderer (React)
├── App.tsx             Root component
├── components/         FormatView, SettingsDialog, HistoryPanel, Sidebar
├── stores/             Zustand state management
└── types/              TypeScript declarations
```

### Key Design Decisions

- **API keys in main process** — The renderer only ever receives a masked key (`••••1a2b`)
- **Two clipboard flavors** — `text/html` is what Slack and Teams read on ⌘V, and the only route to
  real tables in Teams; `text/plain` is the ⌘⇧V fallback
- **Platform quirks live in the prompts** — Slack's "no tables, no headings" is a prompt rule, not a
  post-processing step
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

Built with Electron, React, and Claude.

*Copy. Click. Paste.*

</div>
