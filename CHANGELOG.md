# Changelog

All notable changes to Morph will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
