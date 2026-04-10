# MD Editor

A lightweight desktop markdown editor for macOS built with Rust and Tauri v2. Features a split-pane interface with a CodeMirror 6 code editor on the left and a live-rendered HTML preview on the right.

## Features

- **Live preview** — real-time GitHub Flavored Markdown rendering (tables, task lists, strikethrough, autolinks)
- **Syntax highlighting** — code blocks in the preview are highlighted via syntect
- **File management** — open/save files with native macOS dialogs, browse folders in the sidebar
- **Keyboard shortcuts** — `Cmd+O` open, `Cmd+S` save, `Cmd+Shift+S` save as
- **Resizable split pane** — drag the divider to adjust editor/preview ratio
- **Dark theme** — Catppuccin-inspired color scheme

## Prerequisites

- **Rust** (1.70+) — install via [rustup](https://rustup.rs):
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```
- **Node.js** (18+) — install via [nvm](https://github.com/nvm-sh/nvm) or [nodejs.org](https://nodejs.org)
- **Xcode Command Line Tools**:
  ```bash
  xcode-select --install
  ```

## Install & Run (Development)

```bash
# Clone the repo
git clone https://github.com/henrikbol/md-editor.git
cd md-editor

# Install frontend dependencies
npm install

# Run in development mode (opens the app with hot-reload)
npm run tauri dev
```

## Build for macOS

```bash
# Build a production .dmg / .app bundle
npm run tauri build -- --bundles app,dmg
```

The output will be in `src-tauri/target/release/bundle/`:
- `dmg/MD Editor_0.1.0_aarch64.dmg` — drag-to-install disk image
- `macos/MD Editor.app` — the application bundle

Double-click the `.dmg` to mount it, then drag **MD Editor** into your Applications folder.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| App framework | Tauri v2 |
| Backend | Rust |
| Frontend | TypeScript + Vite |
| Code editor | CodeMirror 6 |
| Markdown parser | comrak (GFM) |
| Code highlighting | syntect |
| File dialogs | tauri-plugin-dialog |
