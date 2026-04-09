---
date: 2026-04-09
topic: atmospheric-redesign
---

# Atmospheric Redesign & Feature Additions

## Problem Frame

The markdown editor currently uses a generic One Dark color scheme and lacks several standard editor features: native menus (File, Edit, Help), text formatting tools, and a settings panel. The user has a specific "Atmospheric Precision" design direction — a Nord-inspired metallic slate palette with zero-border hierarchy — that should replace the current theme while preserving the existing desktop layout (sidebar + split-pane editor/preview).

## Requirements

**Theme & Visual Identity**

- R1. Replace the current color scheme with the Atmospheric palette, including both CSS variables and the CodeMirror editor theme (currently hard-wired as `oneDark` in `src/editor.ts`):
  - Surface Primary: Deep Slate `#0d131e`
  - Accent: Ionized Teal `#97cfe0`
  - Glass surfaces: `rgba(22, 28, 39, 0.8)` with `backdrop-filter: blur(20px)`
  - Border style: `1px solid rgba(61, 73, 73, 0.15)` (subtle, near-invisible)
  - Box shadow: `0 24px 40px rgba(0, 0, 0, 0.2)` for elevated surfaces
  - All CSS variables in `:root` must be updated to match
  - A custom CodeMirror theme must replace the imported `oneDark` extension
- R2. Apply zero-border structural hierarchy — use tonal background shifts to define regions (sidebar, editor, preview, formatting bar) instead of hard `1px solid` borders. Interactive states (hover, focus, active, selected) use the accent color `#97cfe0` or lightened tonal shifts to maintain keyboard navigation affordance.
- R3. Typography: bundle Manrope for headings/UI labels and Inter for body/editor text as local assets (both are Google Fonts, freely available). Fallback chain: `Manrope, system-ui, -apple-system, sans-serif` for headings; `Inter, system-ui, -apple-system, sans-serif` for body/editor
- R4. Corner radius: `0.75rem` for panels and sidebar elements
- R5. Create a flat SVG app icon using the Ionized Teal accent with a markdown/document motif, suitable for macOS .icns generation

**Formatting Toolbar**

- R6. Merge the formatting bar and status bar into a single bottom bar: format buttons (Bold, Italic, Link, Image) on the left, status info (line, column, word count) on the right
- R7. Each action wraps the current editor selection with the appropriate markdown syntax (e.g., `**selection**` for bold, `*selection*` for italic, `[selection](url)` for link, `![alt](url)` for image). When no text is selected, insert the markers around the cursor position (e.g., `**|**`) so the user types between them.
- R8. Add a right-click context menu on selected text in the editor with the same four formatting actions (Bold, Italic, Link, Image). This suppresses the default browser context menu in the editor area. The existing file-tree context menu is unaffected.
- R9. Link and Image actions show a small floating popover near the text cursor with a URL input field and Enter to confirm.

**Native macOS Menus**

- R10. Add a **File** menu with: New File (`Cmd+N`), Save (`Cmd+S`), Save As (`Cmd+Shift+S`). Note: `Cmd+S` and `Cmd+Shift+S` already have JS keydown handlers in `src/main.ts` — native menu accelerators must replace (not duplicate) these.
- R11. Add an **Edit** menu with: Undo (`Cmd+Z`), Redo (`Cmd+Shift+Z`), Cut (`Cmd+X`), Copy (`Cmd+C`), Paste (`Cmd+V`), Select All (`Cmd+A`). Note: macOS provides standard clipboard operations natively via the WebView responder chain; Undo/Redo must route to CodeMirror's history, not native undo.
- R12. Add a **Help** menu with: About (shows app name and version), Keyboard Shortcuts (shows a shortcut reference — the single canonical entry point for viewing shortcuts)
- R13. Keep the existing **View** menu (Zoom In/Out/Reset) — confirmed present in `src-tauri/src/lib.rs`

**Settings Panel**

- R14. Add a Settings panel accessible from the native menu (Preferences, `Cmd+,`) and an activity bar gear icon. Opens as a panel in the main content area (not a modal).
- R15. Editor preferences: font size, font family, line numbers on/off, word wrap on/off, tab size
- R16. Appearance preferences: Atmospheric theme is the single shipped theme. No theme selection UI or theme infrastructure — add this when a second theme is created.
- R17. File behavior preferences: auto-save toggle, default save location
- R18. Settings panel uses a sidebar + content area layout: category list on the left (Editor, Appearance, File), content on the right. Settings apply immediately on change (no save/cancel buttons).
- R19. Settings persist across sessions (localStorage or Tauri store)

## Success Criteria

- The app visually matches the Atmospheric Precision palette — deep slate backgrounds, teal accents, no hard borders between regions
- All four formatting actions work from both the merged bottom bar and the right-click context menu
- Formatting works with and without text selected
- File > New and File > Save work correctly via native menu and keyboard shortcuts
- Settings changes take effect immediately and persist after restart
- Existing features (sidebar, split-pane, tabs, search, scroll sync) continue to work unchanged

## Scope Boundaries

- **In scope:** Theme application (CSS + CodeMirror), formatting tools, native menus, settings panel, flat app icon
- **Out of scope:** Light theme (future), theme switching infrastructure, plugin system, export features, hamburger menu UI, floating action button, the 3D metallic icon from the Stitch design
- **Out of scope:** Changing the desktop layout structure (sidebar + split-pane stays)

## Key Decisions

- **Theme only, not layout redesign**: The Stitch design is mobile-first; the existing desktop layout (sidebar + split-pane) is preserved. Only colors, typography, borders, and visual style change.
- **Native macOS menus**: Standard menu bar rather than in-app hamburger menu — feels native and works with expected keyboard shortcuts.
- **Both bottom bar + context menu for formatting**: Merged bar (format + status) provides discoverability; context menu provides speed for power users.
- **Flat SVG app icon**: Achievable within the project (no external 3D rendering needed).
- **No text selected = wrap cursor**: Formatting actions insert markers around the cursor position when no text is selected.
- **URL prompt = floating popover**: Link and Image actions show a compact popover near the cursor, not a modal dialog.
- **Settings = sidebar + content layout**: Category list on left, preferences on right, apply-on-change.
- **No theme infrastructure**: Ship only Atmospheric; defer theme switching until a second theme exists.
- **Keyboard shortcuts in Help menu only**: Removed from Settings panel to avoid duplication.

## Dependencies / Assumptions

- Manrope and Inter fonts are bundled as local assets in the Tauri app for offline use
- The flat SVG icon will need conversion to .icns for macOS (can use `iconutil` or similar)
- CodeMirror's `oneDark` import in `src/editor.ts` must be replaced with a custom theme extension

## Outstanding Questions

### Deferred to Planning
- [Affects R19][Technical] Should settings use localStorage or Tauri's plugin-store for persistence?
- [Affects R5][Technical] Exact icon design — what markdown motif works best at small sizes (16x16 to 512x512)?
- [Affects R12][Technical] How to display the keyboard shortcuts reference — modal dialog or panel?
- [Affects R11][Technical] How to route Edit > Undo/Redo to CodeMirror's history from native menu events?
- [Affects R10][Technical] How to coordinate native menu accelerators with existing JS keydown handlers in `src/main.ts`?

## Next Steps

-> `/ce:plan` for structured implementation planning
