# Changelog

All notable changes to Morph will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-09-10

### Features
- Reimagined home screen — three target buttons (Slack, Teams, Generic) replace the text editor
  entirely. Copy a message, click a target, and the formatted version replaces your clipboard
- Per-platform formatting: Slack gets mrkdwn with aligned code blocks instead of tables, Teams gets
  real tables, Generic gets standard Markdown
- Rich clipboard writes — both `text/html` and `text/plain` flavors, so bold, lists, code blocks and
  tables survive the paste into Slack and Teams
- Anthropic provider support (Claude Opus 5, Sonnet 5, Haiku 4.5) alongside Groq. Each provider keeps
  its own key and model; pick the active one in Settings
- Settings reorganized into Providers / Prompts / General tabs, with editable per-target prompts
- Window auto-hides once the clipboard is replaced

### UI/UX
- Pressed button glows and pulses in its brand color while formatting, with a sweeping highlight and
  a green settle on success — the button stays in place, so no layout shift
- Fixed-width status slot keeps buttons from reflowing when the spinner appears
- Honors `prefers-reduced-motion`
- History rows show their target and confirm re-copies inline; clicking one puts it back on the
  clipboard in its original target format

### Breaking Changes
- The rewrite editor, streaming output, and auto-paste toggle are gone
- Config migrates automatically: v1's `groqApiKey` / `model` / `systemPrompt` fold into the new
  providers map, and the active provider becomes Anthropic. Your Groq key is preserved but inactive

### Internal
- `electron/providers.ts` — Anthropic + Groq adapters behind one `complete()` call
- `electron/clipboard-format.ts` + `electron/mrkdwn.ts` — clipboard flavors and Markdown → mrkdwn,
  with an assert-based self-check (`npm run check`)
- Removed streaming IPC, `electron/groq.ts`, `RewriteView.tsx`, and dead clipboard bridge methods
- `rewrites` table gains a `target` column via in-place migration
- Swapped `marked` for `markdown-it` (CommonJS, works in the Electron main process)

## [0.2.1] - 2026-04-06

### Bug Fixes
- Fixed sidebar logo not displaying (broken image path in dev and production)

## [0.2.0] - 2026-04-06

### Features
- Icon-only sidebar replacing top toolbar (New, History, Settings)
- New Chat button to start a fresh session
- Auto-clipboard toggle — configurable paste-on-shortcut behavior in Settings
- App logo displayed in sidebar, About panel, and favicon

### UI/UX
- Dynamic landing page download buttons fetched from GitHub Releases API
- OS detection highlights the matching download button (macOS/Windows)
- Install instructions modal after download (macOS xattr, Windows SmartScreen)
- Landing page now uses the real Morph logo in nav, hero, and favicon

### Documentation
- Comprehensive README with setup guide, features, architecture, and CI/CD docs

### Configuration
- GitHub Pages configured to deploy from docs/ folder on main branch
- App icons generated: .icns (macOS), .ico (Windows), .png (source)
- electron-builder extraResources includes icon for About panel

## [0.1.0] - 2026-04-06

### Features
- Initial release of Morph — AI-powered text rewriter
- Global keyboard shortcut (Cmd+Shift+M) to trigger from any app
- Auto-read clipboard content on activation
- Streaming text rewrite via Groq API (Llama 3.3 70B default)
- One-click copy of rewritten output
- Local chat history saved in SQLite
- Settings: API key, custom system prompt, model selection, shortcut configuration
- History panel with browse and delete functionality

### Electron
- macOS native title bar with traffic light positioning
- Single instance lock
- Window bounds persistence across sessions
- Auto-updater checking GitHub Releases

### Build & Release
- electron-builder for macOS (DMG/ZIP arm64+x64) and Windows (EXE)
- GitHub Actions release workflow triggered by version tags
- GitHub Pages landing page
