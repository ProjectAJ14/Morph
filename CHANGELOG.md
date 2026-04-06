# Changelog

All notable changes to Morph will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
