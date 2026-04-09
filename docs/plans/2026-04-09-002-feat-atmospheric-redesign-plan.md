---
title: "feat: Atmospheric Redesign & Feature Additions"
type: feat
status: completed
date: 2026-04-09
origin: docs/brainstorms/atmospheric-redesign-requirements.md
---

# feat: Atmospheric Redesign & Feature Additions

## Overview

Replace the current One Dark color scheme with the "Atmospheric Precision" design system (deep slate palette, teal accent, zero-border hierarchy) and add four feature areas: formatting toolbar, native macOS menus, settings panel, and a flat app icon. The existing desktop layout (sidebar + split-pane editor/preview) is preserved unchanged.

## Problem Frame

The markdown editor uses a generic One Dark color scheme and lacks standard editor features: native menus (File, Edit, Help), text formatting tools, and a settings/preferences panel. The user has a specific "Atmospheric Precision" design direction that should replace the current theme while adding these features. (see origin: docs/brainstorms/atmospheric-redesign-requirements.md)

## Requirements Trace

- R1. Replace color scheme (CSS vars + CodeMirror theme) with Atmospheric palette
- R2. Zero-border structural hierarchy with tonal shifts; accent-based interactive states
- R3. Bundle Manrope (headings) and Inter (body) fonts with fallback chains
- R4. Corner radius 0.75rem for panels/sidebar
- R5. Flat SVG app icon with Ionized Teal + markdown motif
- R6. Merged bottom bar: format buttons left, status info right
- R7. Formatting wraps selection or inserts markers at cursor when no selection
- R8. Right-click context menu on editor text with formatting actions
- R9. Floating URL popover near cursor for Link/Image actions
- R10. File menu: New File, Save, Save As (native accelerators replace JS handlers)
- R11. Edit menu: Undo/Redo routed to CodeMirror history, clipboard via PredefinedMenuItem
- R12. Help menu: About + Keyboard Shortcuts modal
- R13. Keep existing View menu
- R14. Settings panel via Cmd+, and activity bar gear icon
- R15. Editor preferences: font size, font family, line numbers, word wrap, tab size
- R16. No theme infrastructure — ship Atmospheric only
- R17. File behavior: auto-save toggle, default save location
- R18. Settings: sidebar + content layout, apply-on-change
- R19. Settings persist via localStorage

## Scope Boundaries

- **In scope:** Theme (CSS + CodeMirror + preview), formatting toolbar, native menus, settings panel, app icon
- **Out of scope:** Light theme, theme switching UI, plugin system, export features, hamburger menu, floating action button, 3D icon
- **Out of scope:** Layout structure changes (sidebar + split-pane stays)

## Context & Research

### Relevant Code and Patterns

- `src/styles.css:1-15` — CSS variables in `:root`, 16 `var(--border)` declarations, 13+ hard-coded preview colors
- `src/editor.ts:5,39` — `oneDark` import and usage in `buildExtensions()`; font size uses `Compartment` pattern
- `src/editor.ts:38` — `syntaxHighlighting(defaultHighlightStyle)` should be removed when custom theme added
- `src-tauri/src/lib.rs:26-61` — Native View menu construction and event bridge pattern
- `src/main.ts:339-372` — JS keydown shortcuts (Cmd+S, Cmd+O, zoom, etc.)
- `src/main.ts:482-494` — Zoom event listener pattern (`listen<string>("zoom-action", ...)`)
- `src/statusbar.ts` — 36-line status bar module with `initStatusBar`, `updateCursorPosition`, `updateWordCount`
- `src/file-tree.ts:385-438` — Context menu pattern: DOM creation, positioning, dismissal
- `src/activity-bar.ts` — `PanelName` type, panel toggle/switch logic
- `src/icons.ts` — Hard-coded One Dark SVG colors that need updating
- `src-tauri/src/markdown.rs:132` — Syntect `base16-ocean.dark` theme for code blocks (inline styles)
- `index.html:45-48` — Empty state pattern (hides `#content-row`, shows centered message)

### Institutional Learnings

No `docs/solutions/` directory exists yet. No prior lessons documented for this codebase.

## Key Technical Decisions

- **localStorage for settings (R19):** Already the pattern for `editorFontSize`. No new Tauri plugin needed. Simple, synchronous, frontend-only.
- **Custom CodeMirror theme:** Replace `oneDark` with `EditorView.theme()` + `syntaxHighlighting(HighlightStyle.define([...]))`. Remove the `defaultHighlightStyle` import (line 38) and absorb its token styles into the custom theme.
- **Edit menu Undo/Redo:** Custom `MenuItem::with_id` for undo/redo (not `PredefinedMenuItem::undo()` which routes to native undo). Emit events to frontend, which dispatches CodeMirror's `undo()`/`redo()` commands. Clipboard operations (cut/copy/paste/select-all) use `PredefinedMenuItem` variants which work natively with the WebView.
- **JS keydown deduplication:** Remove JS keydown handlers for Cmd+S, Cmd+Shift+S, and zoom from `main.ts:339-372`. Native menu accelerators become the sole handler. Keep Cmd+O (no native menu item), Cmd+Shift+F, and Cmd+W as JS-only.
- **Preview code blocks:** Keep syntect inline styles for now. Switching to class-based HTML (`ClassedHTMLGenerator`) is a larger backend change deferred to future work. The `base16-ocean.dark` theme is close enough to the Atmospheric palette.
- **Settings panel replaces content area:** Same pattern as `#empty-state` — hides `#content-row` and `#tab-bar`, shows `#settings-panel`. Activity bar gear icon at the bottom (separated with `margin-top: auto`).
- **Formatting toolbar accesses EditorView:** Add `getEditorView()`, `wrapSelection(before, after)`, and `insertAtCursor(text)` exports to `editor.ts`. The formatting bar and context menu both call these.
- **Keyboard shortcuts modal:** A simple fixed-position modal overlay with a table of all shortcuts, dismissible by Escape or clicking outside. No framework needed.
- **Border removal strategy:** Update `--border` CSS variable to `rgba(61, 73, 73, 0.15)`. For structural borders that should disappear entirely (sidebar, activity bar, status bar, tab bar), replace `border-*: 1px solid var(--border)` with `border: none` and rely on tonal background shifts. Keep subtle borders on interactive components (search input, context menu, code blocks, tables).

## Open Questions

### Resolved During Planning

- **Settings persistence:** localStorage — already used for font size, no new dependency
- **Shortcuts display format:** Modal dialog with shortcut table
- **Undo/Redo routing:** Custom MenuItem → emit event → JS dispatches CodeMirror undo/redo
- **Menu/JS coordination:** Remove duplicate JS keydown handlers for menu-accelerated shortcuts
- **Zero-border scope:** Structural borders (sidebar, activity bar, status bar, tab bar) → removed. Component borders (search input, context menu, code blocks, tables) → kept with subtle `rgba(61, 73, 73, 0.15)` style

### Deferred to Implementation

- **Exact Atmospheric tonal values for each region:** The Surface Primary is `#0d131e`, but sidebar, editor, preview, and tab bar each need a slightly different shade for the tonal hierarchy. Exact values to be tuned during implementation.
- **Syntect theme alignment:** `base16-ocean.dark` may need swapping for a closer match. Evaluate at implementation time.
- **Icon motif details:** The SVG icon needs a markdown motif (likely a stylized "M" or hash symbol) that reads well at 16x16 through 512x512. Exact design during implementation.

## Implementation Units

- [ ] **Unit 1: Bundle Fonts**

**Goal:** Add Manrope and Inter as local font assets with `@font-face` declarations.

**Requirements:** R3

**Dependencies:** None

**Files:**
- Create: `src/fonts/` directory with Manrope and Inter `.woff2` files
- Modify: `src/styles.css` — add `@font-face` declarations, update `font-family` throughout
- Modify: `src/editor.ts` — update `fontSizeTheme()` font-family for editor content

**Approach:**
- Download Manrope (variable weight) and Inter (variable weight) in `.woff2` format from Google Fonts
- Add `@font-face` declarations at the top of `styles.css` before `:root`, using relative paths: `url('./fonts/Manrope[wght].woff2')` and `url('./fonts/Inter[wght].woff2')` — Vite's CSS processor resolves these relative to `styles.css`
- Update `html, body` font-family to `Inter, system-ui, -apple-system, sans-serif`
- Update heading elements (`#sidebar-header h2`, etc.) to `Manrope, system-ui, -apple-system, sans-serif`
- Update `fontSizeTheme()` in `editor.ts` to use `Inter` instead of `JetBrains Mono` for the editor content font
- Keep a monospace fallback option for the editor — users may prefer monospace; this can be a settings choice later

**Patterns to follow:**
- Vite handles static assets in `src/` automatically — no build config changes needed

**Test expectation:** none — pure asset/styling change, visual verification only

**Verification:**
- App renders text in Manrope (headings) and Inter (body) with no FOUT
- Fonts load correctly when offline (bundled, not CDN)

---

- [ ] **Unit 2: CSS Variable & Border Overhaul**

**Goal:** Update all CSS variables to the Atmospheric palette, remove structural borders, and apply tonal background hierarchy.

**Requirements:** R1 (CSS portion), R2, R4

**Dependencies:** Unit 1 (fonts should be in place)

**Files:**
- Modify: `src/styles.css` — `:root` variables, all border declarations, border-radius, background colors
- Modify: `src/icons.ts` — update hard-coded SVG colors from One Dark to Atmospheric palette

**Approach:**
- Replace `:root` variables:
  - `--bg-primary` → `#0d131e` (Surface Primary / Deep Slate)
  - `--bg-secondary` → `#111827` (slightly lighter for tab bar, merged bottom bar)
  - `--bg-surface` → `#0a1018` (slightly darker for activity bar, sidebar)
  - `--text-primary` → `#c8d6e5` (lighter for better contrast on deep slate)
  - `--text-secondary` → `#7f8c9b`
  - `--text-muted` → `#4a5568`
  - `--accent` → `#97cfe0` (Ionized Teal)
  - `--accent-hover` → `#b8dfe9`
  - `--border` → `rgba(61, 73, 73, 0.15)` (for components that keep borders)
  - `--preview-bg` → `#0d131e`
  - `--scrollbar-thumb` → `#2a3a4a`
- Remove structural borders: set `border: none` on `#status-bar`, `#activity-bar`, `#sidebar`, `#sidebar-header`, `#tab-bar`, `.tab`, `#preview-pane`, `.cm-gutters`
- Keep subtle borders on: `#search-input`, `#context-menu`, `#preview-content pre`, `#preview-content th/td`, `.rename-input`
- Active tab indicator: keep `border-bottom: 2px solid var(--accent)` on `.tab.active`
- Apply `border-radius: 0.75rem` to sidebar, context menu, and settings panel elements
- Add glass surface styles for elevated components (context menu, popovers): `background: rgba(22, 28, 39, 0.8); backdrop-filter: blur(20px); box-shadow: 0 24px 40px rgba(0, 0, 0, 0.2)`
- Update interactive states: hover/focus/active use `rgba(151, 207, 224, 0.1)` (teal at 10% opacity) instead of `rgba(97, 175, 239, 0.1)` (old blue)
- Update `icons.ts` SVG colors to use teal accent and Atmospheric-appropriate secondary colors

**Patterns to follow:**
- Existing variable-based theming pattern in `styles.css`

**Test expectation:** none — pure styling change, visual verification only

**Verification:**
- All regions distinguishable by background tone without hard borders
- No visible `1px solid` lines between sidebar, editor, preview, tab bar, status bar
- Context menu and search input retain subtle borders
- Hover/focus states visible on all interactive elements
- No broken layouts or missing contrast

---

- [ ] **Unit 3: Preview Pane Color Update**

**Goal:** Update hard-coded One Dark preview colors to Atmospheric palette.

**Requirements:** R1 (preview portion)

**Dependencies:** Unit 2 (CSS variables must be updated first)

**Files:**
- Modify: `src/styles.css` — lines 411-535, all hard-coded hex colors in `#preview-content` rules

**Approach:**
- Replace heading colors with Atmospheric teal hierarchy:
  - h1: `#97cfe0` (accent teal)
  - h2: `#7eb8cc` (slightly muted teal)
  - h3: `#a8c7d4` (light slate)
  - h4-h6: progressively muted tones
- Inline code: background `rgba(22, 28, 39, 0.8)`, color `#97cfe0`
- Code blocks (`pre`): background `rgba(22, 28, 39, 0.8)`, border per updated `--border`
- Blockquote: left border `4px solid #97cfe0`, background `rgba(151, 207, 224, 0.05)`
- Table header: background `rgba(22, 28, 39, 0.6)`
- Strong: color `#c8d6e5` (text-primary, not yellow)

**Patterns to follow:**
- Existing preview styling structure in `styles.css`

**Test expectation:** none — pure styling change, visual verification only

**Verification:**
- Preview renders markdown elements in cohesive Atmospheric teal tones
- Code blocks, blockquotes, tables, and headings are all readable against the deep slate background

---

- [ ] **Unit 4: Custom CodeMirror Theme**

**Goal:** Replace the `oneDark` CodeMirror extension with a custom Atmospheric theme.

**Requirements:** R1 (editor portion)

**Dependencies:** Unit 2 (palette values established)

**Files:**
- Create: `src/atmospheric-theme.ts` — custom CodeMirror theme + syntax highlighting
- Modify: `src/editor.ts` — replace `oneDark` import with custom theme, remove `defaultHighlightStyle`

**Approach:**
- Create a new module exporting two CodeMirror extensions:
  1. `EditorView.theme({...})` — editor chrome: background, gutter, selection, cursor, active line, matching brackets
  2. `syntaxHighlighting(HighlightStyle.define([...]))` — markdown token colors (headings, emphasis, links, code, etc.)
- Editor chrome colors: background `#0d131e`, gutter background same as editor, cursor `#97cfe0`, selection `rgba(151, 207, 224, 0.15)`, active line `rgba(151, 207, 224, 0.05)`
- Syntax highlight tokens: headings in teal, emphasis in lighter tones, links in accent, code in muted tone
- In `editor.ts`, replace line 5 import and line 39 usage. Remove `defaultHighlightStyle` import from line 38
- Export a single `atmosphericTheme` array that includes both the theme and the highlight style

**Patterns to follow:**
- CodeMirror 6 theme API: `EditorView.theme()` for chrome, `HighlightStyle.define()` for syntax
- Existing `fontSizeTheme()` pattern in `editor.ts` for `EditorView.theme()` usage

**Test scenarios:**
- Happy path: Editor renders with deep slate background, teal cursor, and teal-tinted syntax highlighting for headings, bold, italic, links, code spans
- Edge case: Nested markdown (bold inside heading, code in list) renders with distinguishable colors

**Verification:**
- Editor pane matches the Atmospheric palette with no trace of One Dark blue/purple/red
- Syntax tokens are readable and distinguishable against deep slate

---

- [ ] **Unit 5: Native macOS Menus**

**Goal:** Add File, Edit, and Help menus to the native menu bar. Deduplicate JS keydown handlers.

**Requirements:** R10, R11, R12, R13

**Dependencies:** None (can run in parallel with Units 1-4)

**Files:**
- Modify: `src-tauri/src/lib.rs` — add File, Edit, Help submenus alongside existing View
- Modify: `src/main.ts` — add event listeners for new menu actions, remove duplicated keydown handlers
- Create: `src/shortcuts-modal.ts` — keyboard shortcuts modal UI

**Approach:**
- **lib.rs — File menu:**
  - `MenuItem::with_id(app, "new-file", "New File", true, Some("CmdOrCtrl+N"))`
  - `MenuItem::with_id(app, "save", "Save", true, Some("CmdOrCtrl+S"))`
  - `MenuItem::with_id(app, "save-as", "Save As…", true, Some("CmdOrCtrl+Shift+S"))`
- **lib.rs — Edit menu:**
  - `MenuItem::with_id(app, "undo", "Undo", true, Some("CmdOrCtrl+Z"))` — custom, not PredefinedMenuItem
  - `MenuItem::with_id(app, "redo", "Redo", true, Some("CmdOrCtrl+Shift+Z"))` — custom, not PredefinedMenuItem
  - `PredefinedMenuItem::separator()`
  - `PredefinedMenuItem::cut(app, None)?`
  - `PredefinedMenuItem::copy(app, None)?`
  - `PredefinedMenuItem::paste(app, None)?`
  - `PredefinedMenuItem::select_all(app, None)?`
- **lib.rs — Help menu:**
  - `PredefinedMenuItem::about(app, None)?` — uses native macOS About dialog with app name/version from tauri.conf.json
  - `MenuItem::with_id(app, "keyboard-shortcuts", "Keyboard Shortcuts", true, None)`
- **lib.rs — Menu bar order:** File, Edit, View (existing), Help
- **lib.rs — Event handler:** Extend `on_menu_event` match to emit events for new-file, save, save-as, undo, redo, about, keyboard-shortcuts
- **main.ts — Event listeners:** Add `listen` calls for each new menu event. Route:
  - `new-file` → create new untitled buffer
  - `save` → existing `handleSave()` function
  - `save-as` → existing `handleSaveAs()` function
  - `undo` → call `undo(editorView)` from `@codemirror/commands`
  - `redo` → call `redo(editorView)` from `@codemirror/commands`
  - `keyboard-shortcuts` → show shortcuts modal
  - About is handled natively by `PredefinedMenuItem::about` — no JS handler needed
- **main.ts — Remove duplicated keydown handlers:** Remove Cmd+S, Cmd+Shift+S, Cmd+=, Cmd+-, Cmd+0 from `setupKeyboardShortcuts()`. Keep Cmd+O, Cmd+Shift+F, Cmd+W (no menu equivalents).
- **shortcuts-modal.ts:** Create a fixed overlay with a table of all shortcuts, styled with glass surface. Dismiss on Escape or click outside.
- **Undo/Redo routing:** `editor.ts` must export access to the EditorView. Add `getEditorView(): EditorView | null` export.

**Patterns to follow:**
- Existing `MenuItem::with_id` + `Submenu::with_items` + `on_menu_event` + `emit` pattern in `lib.rs:26-61`
- Existing `listen<string>()` pattern in `main.ts:482-494`

**Test scenarios:**
- Happy path: File > New creates a new untitled buffer, File > Save saves the current file, File > Save As shows save dialog
- Happy path: Edit > Undo reverses last editor change, Edit > Redo re-applies it
- Happy path: Help > About shows app name/version, Help > Keyboard Shortcuts opens modal
- Edge case: File > Save when no file is open (empty state) — should no-op or show save dialog
- Edge case: Edit > Undo when editor has no history — no-op gracefully
- Integration: Cmd+S triggers save via native menu (not JS keydown), verified by removing JS handler

**Verification:**
- All menu items appear in the correct order in the macOS menu bar
- Keyboard accelerators work (Cmd+N, Cmd+S, Cmd+Shift+S, Cmd+Z, Cmd+Shift+Z)
- No double-fire on any shortcut
- Cut/Copy/Paste/Select All work in the editor via Edit menu

---

- [ ] **Unit 6: Merged Formatting + Status Bottom Bar**

**Goal:** Merge the formatting toolbar and status bar into a single bottom bar with format buttons left and status info right.

**Requirements:** R6, R7

**Dependencies:** Unit 4 (custom theme in place), Unit 5 (EditorView export available)

**Files:**
- Modify: `src/statusbar.ts` → rename/refactor to `src/bottom-bar.ts` — combined formatting + status
- Modify: `src/styles.css` — new bottom bar styles
- Modify: `src/editor.ts` — add `wrapSelection(before, after)` and `insertAtCursor(text)` exports
- Modify: `src/main.ts` — update import path from `'./statusbar'` to `'./bottom-bar'` (line 9 imports `initStatusBar, updateCursorPosition, updateWordCount, updateFileType, clearStatusBar`), update initialization calls
- Modify: `index.html` — update `#status-bar` to `#bottom-bar`

**Approach:**
- **editor.ts — New exports:**
  - `getEditorView()` — returns the active EditorView instance (or null)
  - `wrapSelection(before: string, after: string)` — if selection exists, wrap it; if not, insert `before + after` and place cursor between them
  - `insertAtCursor(text: string)` — insert text at cursor position
- **bottom-bar.ts:**
  - Left side: four icon buttons — Bold (B), Italic (I), Link (chain SVG), Image (mountain SVG)
  - Right side: cursor position, word count (same as current status bar)
  - Bold click → `wrapSelection("**", "**")`
  - Italic click → `wrapSelection("*", "*")`
  - Link click → trigger URL popover (Unit 8), then `wrapSelection("[", "](url)")`
  - Image click → trigger URL popover (Unit 8), then `insertAtCursor("![alt](url)")`
  - Export the same `updateCursorPosition`, `updateWordCount`, `updateFileType` functions for compatibility
- **Styling:** `justify-content: space-between`, format buttons use icon style matching activity bar icons, Atmospheric teal on hover/active

**Patterns to follow:**
- Existing `statusbar.ts` initialization pattern
- Existing activity bar icon button styling

**Test scenarios:**
- Happy path: Click Bold with text selected → text wrapped in `**...**`
- Happy path: Click Italic with no selection → `*` inserted at cursor, cursor between them
- Happy path: Status info (line, col, word count) displays correctly alongside format buttons
- Edge case: Click Bold when editor is not focused → should focus editor first, then apply
- Edge case: Multiple format actions on same selection (bold then italic) → `***text***`

**Verification:**
- Bottom bar shows format buttons on left, status on right
- All four format buttons work with and without text selection
- Status info continues to update on cursor move and text changes

---

- [ ] **Unit 7: Editor Context Menu**

**Goal:** Add a right-click context menu on editor text with Bold, Italic, Link, Image actions.

**Requirements:** R8

**Dependencies:** Unit 5 (EditorView export), Unit 6 (formatting action exports)

**Files:**
- Create: `src/editor-context-menu.ts` — context menu for CodeMirror editor
- Modify: `src/editor.ts` — add `EditorView.domEventHandlers` extension for contextmenu
- Modify: `src/styles.css` — editor context menu styles (reuse existing context menu pattern)

**Approach:**
- Add `EditorView.domEventHandlers({ contextmenu: handler })` to the extension list in `buildExtensions()`
- The handler calls `e.preventDefault()` to suppress the browser default context menu
- Reuse the DOM construction pattern from `file-tree.ts:385-438` — create a positioned `#editor-context-menu` div
- Menu items: Bold, Italic, Link, Image — each calls the same `wrapSelection`/`insertAtCursor` functions from `editor.ts`
- Position the menu at the mouse coordinates with boundary clamping
- Dismiss on click outside, Escape, or scroll
- The existing file-tree context menu (`#context-menu`) is unaffected — different DOM element, different trigger area

**Patterns to follow:**
- `file-tree.ts:385-438` context menu construction, positioning, and dismissal
- `styles.css:632-663` context menu CSS (glass surface with Atmospheric palette)

**Test scenarios:**
- Happy path: Right-click with text selected in editor → context menu with 4 formatting options
- Happy path: Click Bold in context menu → selection wrapped in `**...**`, menu dismissed
- Edge case: Right-click with no selection → context menu still appears (actions will insert at cursor)
- Edge case: Right-click in file tree → file-tree context menu appears (not editor menu)
- Edge case: Right-click in preview pane → no custom context menu (browser default)

**Verification:**
- Right-click in editor shows formatting context menu
- All four actions work correctly
- Browser default context menu is suppressed only in the editor area
- File tree context menu still works independently

---

- [ ] **Unit 8: URL Popover for Link/Image**

**Goal:** Show a floating popover near the text cursor for Link and Image URL input.

**Requirements:** R9

**Dependencies:** Unit 6 (formatting actions), Unit 7 (context menu triggers)

**Files:**
- Create: `src/url-popover.ts` — floating URL input popover
- Modify: `src/styles.css` — popover styles (glass surface)
- Modify: `src/bottom-bar.ts` — Link/Image buttons invoke popover
- Modify: `src/editor-context-menu.ts` — Link/Image menu items invoke popover

**Approach:**
- Create a small fixed-position popover with: URL text input, Enter to confirm, Escape to cancel
- Position near the CodeMirror cursor coordinates (use `editorView.coordsAtPos()` to get pixel position)
- On confirm:
  - If Link: call `wrapSelection("[", "](" + url + ")")` or `insertAtCursor("[link text](" + url + ")")`
  - If Image: call `insertAtCursor("![alt](" + url + ")")`
- Style with glass surface effect: `background: rgba(22, 28, 39, 0.8); backdrop-filter: blur(20px)`
- Dismiss on Escape, click outside, or Enter (confirm)
- Both bottom-bar and context-menu Link/Image actions call the same popover function

**Patterns to follow:**
- Existing context menu positioning and dismissal patterns
- Glass surface CSS from requirements

**Test scenarios:**
- Happy path: Click Link button → popover appears near cursor → type URL → press Enter → link markdown inserted
- Happy path: Click Image from context menu → popover appears → type URL → press Enter → image markdown inserted
- Edge case: Press Escape → popover closes, no text inserted
- Edge case: Click outside popover → closes, no text inserted
- Edge case: Popover near window edge → repositioned to stay visible

**Verification:**
- Popover appears at correct position near the editor cursor
- URL is correctly inserted into the markdown syntax
- Popover dismisses cleanly without residual state

---

- [ ] **Unit 9: Settings Panel**

**Goal:** Add a settings panel with sidebar + content layout, accessible from Cmd+, and activity bar gear icon.

**Requirements:** R14, R15, R16, R17, R18, R19

**Dependencies:** Unit 2 (Atmospheric styles), Unit 5 (menu infrastructure for Preferences item)

**Files:**
- Create: `src/settings-panel.ts` — settings UI with sidebar + content layout
- Modify: `src/styles.css` — settings panel styles
- Modify: `index.html` — add `#settings-panel` container (hidden by default)
- Modify: `src/activity-bar.ts` — add gear icon, extend `PanelName` type
- Modify: `src-tauri/src/lib.rs` — add Preferences menu item under app menu (macOS convention)
- Modify: `src/main.ts` — handle settings toggle, wire Cmd+, event

**Approach:**
- **HTML structure:** Add `<div id="settings-panel" style="display:none;">` in `#main-area` after `#content-row`
- **Show/hide:** Same pattern as `#empty-state` — when settings is active, hide `#content-row` and `#tab-bar`, show `#settings-panel`. Toggling back restores the editor.
- **Layout:** `#settings-panel` is a flex row:
  - Left sidebar (200px): category list — Editor, Appearance, File
  - Right content area: settings for the selected category
- **Editor preferences (R15):**
  - Font size: number input, updates `--editor-font-size` CSS var + CodeMirror compartment + localStorage
  - Font family: dropdown (Inter, JetBrains Mono, system default)
  - Line numbers: toggle, reconfigures CodeMirror `lineNumbers()` extension
  - Word wrap: toggle, reconfigures CodeMirror `EditorView.lineWrapping`
  - Tab size: number input (2, 4, 8)
- **Appearance preferences (R16):**
  - Display current theme name (Atmospheric) — read-only, no switcher
- **File preferences (R17):**
  - Auto-save: toggle (when enabled, saves on a debounced timer after changes)
  - Default save location: text input or folder picker
- **Persistence (R19):** All settings read/write to `localStorage` with key prefix `"settings."`. On app startup, `main.ts` reads settings and applies them.
- **Apply-on-change (R18):** Each setting control has an `input`/`change` event listener that immediately updates the relevant system (CSS var, CodeMirror config, localStorage).
- **Activity bar gear icon:** Add a button at the bottom of `#activity-bar` (separated by `margin-top: auto`) with a gear SVG icon. Click toggles settings panel.
- **Preferences menu item:** On macOS, Preferences is conventionally under the app name menu. Add `MenuItem::with_id(app, "preferences", "Preferences", true, Some("CmdOrCtrl+,"))` and emit event.

**Patterns to follow:**
- `#empty-state` show/hide pattern in `main.ts`
- `fontSizeCompartment` reconfiguration pattern in `editor.ts` for dynamic editor settings
- `localStorage` get/set pattern already used for `editorFontSize`

**Test scenarios:**
- Happy path: Cmd+, opens settings panel, hides editor. Clicking gear icon again returns to editor.
- Happy path: Change font size in settings → editor font updates immediately
- Happy path: Toggle line numbers off → editor line numbers disappear immediately
- Happy path: Close and reopen app → settings persist from localStorage
- Edge case: Open settings with unsaved changes → no data loss (settings panel doesn't close buffers)
- Edge case: Toggle word wrap while viewing a long line → editor reflows immediately
- Integration: Auto-save enabled → editing triggers debounced save (file written to disk)

**Verification:**
- Settings panel opens from both Cmd+, and gear icon
- All setting controls work and apply immediately
- Settings survive app restart
- Returning from settings restores the previous editor state

---

- [ ] **Unit 10: App Icon**

**Goal:** Create a flat SVG app icon with Ionized Teal accent and markdown motif.

**Requirements:** R5

**Dependencies:** None (can run at any time)

**Files:**
- Create: `src-tauri/icons/icon.svg` — source SVG icon
- Modify: `src-tauri/icons/icon.icns` — generated macOS icon
- Modify: `src-tauri/icons/icon.png` — generated PNG fallback
- Modify: `src-tauri/icons/icon_1024.png` — 1024x1024 PNG

**Approach:**
- Design a flat SVG: rounded rectangle or circle in Deep Slate (`#0d131e`) with a stylized markdown symbol (e.g., "Md" text, hash `#` mark, or document outline) in Ionized Teal (`#97cfe0`)
- The icon must be recognizable at 16x16 — prefer simple geometric shapes over detailed illustrations
- Generate PNG at required sizes (32, 128, 256, 512, 1024) using `sips` or similar
- Generate `.icns` using `iconutil` (create an `.iconset` directory with all sizes, then `iconutil -c icns`)
- Update `tauri.conf.json` icon paths if they change

**Patterns to follow:**
- Existing icon files in `src-tauri/icons/`

**Test expectation:** none — visual asset, manual verification

**Verification:**
- Icon appears correctly in macOS dock, app switcher, and Finder
- Icon is recognizable at small sizes (16x16, 32x32)
- Icon uses Atmospheric palette colors

## System-Wide Impact

- **Interaction graph:** Menu events flow Rust → Tauri emit → JS listen → action handler. Formatting actions flow UI click → `editor.ts` exports → CodeMirror dispatch. Settings changes flow UI input → localStorage write + immediate CSS/CodeMirror update.
- **Error propagation:** Menu actions that fail (e.g., save with no file) should show user-facing dialogs (already handled by existing save logic). Formatting actions on null EditorView should no-op silently.
- **State lifecycle risks:** Settings panel show/hide must preserve all editor buffer state. Auto-save must not trigger during save-as dialog.
- **API surface parity:** No external API. The new `editor.ts` exports (`getEditorView`, `wrapSelection`, `insertAtCursor`) become internal API used by bottom-bar, context menu, and settings.
- **Unchanged invariants:** File tree, tab management, scroll sync, search panel, preview rendering pipeline — all unchanged. The split-pane layout structure is preserved.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| CodeMirror custom theme colors need tuning | Start with close approximations, iterate visually. Theme is in a separate module for easy adjustment. |
| Syntect code block colors may clash with Atmospheric palette | Accept `base16-ocean.dark` for now; swap to a closer theme if needed. Defer `ClassedHTMLGenerator` to future work. |
| Removing JS keydown handlers may break Cmd+O, Cmd+W | Only remove handlers for shortcuts that have native menu equivalents. Keep Cmd+O, Cmd+Shift+F, Cmd+W as JS-only. |
| Font bundling increases app size | Manrope + Inter woff2 are ~200KB total. Acceptable for a desktop app. |
| Settings panel may not restore editor state correctly | Follow the `#empty-state` pattern which already handles this. Hide/show, don't destroy. |

## Sources & References

- **Origin document:** [atmospheric-redesign-requirements.md](docs/brainstorms/atmospheric-redesign-requirements.md)
- Related plan: [vscode-experience-plan.md](docs/plans/2026-04-09-001-feat-vscode-experience-plan.md) (completed, established current patterns)
- CodeMirror 6 theme docs: https://codemirror.net/docs/ref/#view.EditorView%5Etheme
- Tauri v2 menu docs: https://v2.tauri.app/learn/window-menu/
