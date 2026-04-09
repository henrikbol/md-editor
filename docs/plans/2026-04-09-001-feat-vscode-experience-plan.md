---
title: "feat: VSCode-like editor experience"
type: feat
status: active
date: 2026-04-09
origin: docs/brainstorms/vscode-experience-requirements.md
---

# feat: VSCode-like editor experience

## Overview

Transform MD Editor from a basic markdown tool into a polished, VSCode-familiar editing experience. The work spans three phases: visual polish (theme, zoom, status bar), core navigation (file tree, tabs, icons), and power features (search, context menu, activity bar). Each phase is independently shippable.

## Problem Frame

MD Editor is functional but feels like a basic tool. Users accustomed to VSCode expect One Dark Pro theming, navigable file trees, tabbed editing, status information, and standard keyboard shortcuts. The current app has 6 source files, a single-file editing model, and a flat directory sidebar. (see origin: `docs/brainstorms/vscode-experience-requirements.md`)

## Requirements Trace

**Phase 1 — Visual Polish**
- R1. One Dark Pro color palette across entire UI
- R2. Syntax-aware preview colors matching One Dark Pro
- R3. Cmd+=/- CSS font-size zoom, app-wide, native zoom intercepted
- R4. View menu with Zoom In / Zoom Out / Reset Zoom
- R5. Both panes zoom simultaneously. 1px step, 8–32px range, 14px default
- R6. Persist font size across restarts
- R17. Status bar: cursor position, word count (prominent), file type. Empty state when no file open

**Phase 2 — Core Navigation**
- R7. File-type SVG icons replacing emoji
- R8. Hierarchical tree replacing flat list (sidebar.ts rewrite, new Rust backend)
- R9. Expand/collapse with arrows + ARIA keyboard nav
- R10. All files shown, non-markdown muted and inert (left-click only). Eligible for Phase 3 context menu
- R11. Tree state persisted within session
- R12. Indent guides, .gitignore respect via Rust `ignore` crate
- R13. Tabs with horizontal scroll overflow (fade gradients)
- R14. Unsaved dot indicator
- R15. Tab switching restores EditorState. Save/Don't Save/Cancel on close
- R16. Cmd+W close tab. Empty state when all closed

**Phase 3 — Power Features**
- R18. Activity bar: File Explorer + Search icons
- R19. Panel switching, sidebar toggle (instant snap), editor expands
- R20. Find-in-files via Rust backend, on Enter, .gitignore-aware, loading state
- R21. Results grouped by file, 1 line context, reuse existing tabs
- R22–R25. Context menu with keyboard trigger (Shift+F10, F2), inline rename, delete confirmation

## Scope Boundaries

- No command palette, breadcrumbs, minimap, git gutter, split panes, extensions, light theme, Settings panel
- Non-markdown files shown but not left-clickable (Phase 3 adds right-click)
- Font-size zoom only (not viewport zoom) — sidebar/tabs/status bar stay fixed size

## Context & Research

### Relevant Code and Patterns

**Module pattern (all TS files):** Module-private state variables, exported `init*` functions accepting DOM elements and callbacks, getter/setter functions, IPC via `invoke<T>()`. No classes, no reactive system, no event emitter.

**Current CSS architecture:** 11 CSS custom properties in `:root` (Catppuccin Mocha palette). Two hardcoded `rgba(137, 180, 250, ...)` values in `.active` and `blockquote` backgrounds. All colors flow through variables — swapping to One Dark Pro is primarily a `:root` update plus fixing the hardcoded values.

**Current editor.ts:** Single `EditorView` with `oneDark` theme already applied. Extensions: lineNumbers, highlightActiveLine, drawSelection, bracketMatching, closeBrackets, history, markdown language, syntaxHighlighting, oneDark. Change listener debounced at 150ms. Exports: `initEditor`, `setContent`, `getContent`, `onEditorScroll`.

**Current sidebar.ts:** Navigate-into-directory model. Clicking a folder replaces the list. ".." entry navigates up. Exports: `initSidebar`, `openFileDialog`, `getActivePath`, `setActivePath`. Uses `list_markdown_files` IPC which returns flat `Vec<FileEntry>` (name, path, is_dir) filtered to .md only.

**Current main.ts:** Single-file state (`currentFilePath`, `isDirty`). Keyboard shortcuts: Cmd+O, Cmd+S, Cmd+Shift+S. Divider drag for pane resizing. Welcome text on startup.

**Rust backend:** Commands use `std::fs` directly (not Tauri fs plugin). `list_markdown_files` is non-recursive, single-level, filtered. `markdown.rs` uses syntect `base16-ocean.dark` theme for code highlighting.

**index.html layout:** `#app` horizontal flexbox → `#sidebar` (220px fixed) | `#editor-pane` (flex:1) | `#divider` (3px) | `#preview-pane` (flex:1). No tab bar, status bar, or activity bar DOM elements exist.

### Institutional Learnings

None — new project with no `docs/solutions/` directory.

### External References

- CodeMirror 6 `EditorView.setState()` for multi-buffer swapping
- Tauri v2 `Menu` / `Submenu` / `MenuItem` API for native menus
- Rust `ignore` crate (ripgrep ecosystem) for .gitignore-aware directory walking
- `localStorage` for lightweight client-side persistence in Tauri webview

## Key Technical Decisions

- **CSS font-size zoom, not viewport zoom**: Avoids CodeMirror coordinate-system conflicts with scroll sync. Apply to `.cm-editor` and `#preview-content` only. Sidebar, tabs, status bar stay fixed. (see origin: Key Decisions)
- **Lazy tree loading (expand-on-demand)**: New Rust command returns one directory level at a time. Keeps initial load fast, works well with .gitignore filtering, avoids memory issues on large repos. Frontend makes per-folder IPC calls on expand.
- **Single EditorView with state swapping**: Use `view.setState(savedState)` for tab switching rather than multiple hidden EditorViews. Lower memory cost, simpler DOM. Requires explicit scroll position save/restore since `setState` resets the scroller.
- **Inline SVG icons**: Embed a minimal set of SVG icon strings in a TypeScript module. Avoids external icon font dependencies and bundling complexity. Cover markdown, folder (open/closed), and generic file at minimum; extend coverage based on a chosen open-source icon set (Codicons is MIT-licensed).
- **localStorage for font size persistence**: Simple, no additional Tauri plugins needed. The webview's localStorage persists across app restarts.
- **Rust `ignore` crate for .gitignore**: Handles nested .gitignore, negation patterns, .git/info/exclude. Used by both tree listing (R12) and find-in-files (R20).
- **Rust backend for find-in-files**: Required to meet 2-second performance target. The `ignore` crate's directory walker + Rust string search is orders of magnitude faster than IPC per-file from frontend.
- **New Rust commands use `std::fs` directly**: Follows existing pattern in `files.rs`. Custom Tauri commands bypass the fs plugin scope — no `fs:allow-*` capability changes needed for Phases 1-2. Phase 3 file mutations also use custom commands (not the fs plugin), so the capability doc note about `fs:allow-remove` etc. is moot.

## Open Questions

### Resolved During Planning

- **Icon set**: Use inline SVG strings in a `src/icons.ts` module. Start with a minimal hand-crafted set (markdown, folder-open, folder-closed, generic-file). Extend with icons adapted from an MIT-licensed set (e.g., Codicons, Seti) for JSON, YAML, JS/TS, etc. during implementation.
- **Tree loading strategy**: Lazy (expand-on-demand). One Rust command per directory level.
- **Font size persistence**: `localStorage` in the webview.
- **Find-in-files backend**: Rust with `ignore` crate.
- **Tauri capabilities for Phase 3**: Since we use custom Rust commands with `std::fs` (not the Tauri fs plugin), no additional `fs:allow-*` capabilities are needed. The custom commands already have full filesystem access.
- **Syntect theme for preview code blocks**: Change from `base16-ocean.dark` to a One Dark-aligned theme in `markdown.rs`. Syntect doesn't ship a One Dark theme, so either embed a custom `.tmTheme` or use `base16-onedark` if available in the theme set.

### Deferred to Implementation

- **Exact One Dark Pro hex values**: Derive from the published VSCode One Dark Pro extension color palette during R1 implementation.
- **CodeMirror `view.setState()` scroll restoration**: Need to test whether `view.scrollDOM.scrollTop` save/restore is sufficient or if `requestMeasure()` is needed after state swap.
- **Preview HTML styling specifics for R2**: The preview HTML is generated server-side by comrak+syntect. CSS selectors for markdown elements are already in `styles.css` (lines 170–286) — updating their colors is straightforward but exact values depend on R1's palette.
- **Tauri Menu API for R4**: Whether to use `Menu::with_items` in Rust or the JS menu API. The Rust approach is more conventional for Tauri v2.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

### Layout Evolution

```
Phase 1 (current + status bar):
┌─────────┬──────────────┬───┬──────────────┐
│ Sidebar │  Editor Pane │ ÷ │ Preview Pane │
│  220px  │   flex: 1    │   │   flex: 1    │
│         │              │   │              │
└─────────┴──────────────┴───┴──────────────┘
│                 Status Bar                  │
└─────────────────────────────────────────────┘

Phase 2 (+ tab bar):
┌─────────┬──────────────────────────────────┐
│ Sidebar │  Tab Bar                         │
│  tree   ├──────────────┬───┬──────────────┤
│  view   │  Editor Pane │ ÷ │ Preview Pane │
│         │              │   │              │
└─────────┴──────────────┴───┴──────────────┘
│                 Status Bar                  │
└─────────────────────────────────────────────┘

Phase 3 (+ activity bar):
┌──┬─────────┬──────────────────────────────────┐
│AB│ Sidebar │  Tab Bar                         │
│  │  tree/  ├──────────────┬───┬──────────────┤
│  │ search  │  Editor Pane │ ÷ │ Preview Pane │
│  │         │              │   │              │
└──┴─────────┴──────────────┴───┴──────────────┘
│                   Status Bar                    │
└─────────────────────────────────────────────────┘
```

### Multi-Buffer State Model (Phase 2)

```
BufferMap: Map<filePath, {
  editorState: EditorState,   // preserves undo history, cursor, selection
  scrollTop: number,          // saved before setState, restored after
  isDirty: boolean,
  fileName: string
}>

Tab switch flow:
1. Save current buffer: scrollTop = view.scrollDOM.scrollTop, editorState = view.state
2. Load target buffer: view.setState(target.editorState)
3. Restore scroll: view.scrollDOM.scrollTop = target.scrollTop
4. Update tab bar active state
5. Update status bar (cursor, word count, file type)
```

### Lazy Tree Loading (Phase 2)

```
Frontend tree state: Map<dirPath, {
  entries: FileEntry[],     // from Rust IPC
  expanded: boolean,
  loaded: boolean           // false until first expand
}>

Expand flow:
1. User clicks folder disclosure arrow (or presses Right key)
2. If not loaded: invoke("list_directory", { path }) → entries
3. Store entries, set loaded=true, expanded=true
4. Re-render subtree

Rust command returns: Vec<FileEntry> where FileEntry = { name, path, is_dir, extension }
Filtering: Rust `ignore` crate walker respects .gitignore; also skip dotfiles
```

## Implementation Units

### Phase 1 — Visual Polish

- [ ] **Unit 1: One Dark Pro theme + preview styling**

**Goal:** Replace the Catppuccin Mocha palette with One Dark Pro across the entire UI, including preview markdown element colors and syntect code highlighting theme.

**Requirements:** R1, R2

**Dependencies:** None

**Files:**
- Modify: `src/styles.css`
- Modify: `src-tauri/src/markdown.rs`
- Test: `src-tauri/src/markdown.rs` (existing tests)

**Approach:**
- Replace all 11 CSS custom properties in `:root` with One Dark Pro equivalents (derive from the published One Dark Pro VSCode extension palette)
- Fix the two hardcoded `rgba(137, 180, 250, ...)` values (sidebar `.active` background and blockquote border)
- Update preview markdown element styles (headings h1-h6, links, code, blockquotes, tables, bold/italic) to use distinct One Dark Pro syntax colors
- In `markdown.rs`, evaluate syntect's available themes for One Dark alignment. If no suitable built-in theme exists, the `base16-onedark` variant may work. Otherwise, defer custom `.tmTheme` embedding to a follow-up
- The CodeMirror editor already uses `@codemirror/theme-one-dark` — no change needed there

**Patterns to follow:**
- Current CSS variable architecture in `src/styles.css` lines 1–14
- Current preview styling in `src/styles.css` lines 170–286

**Test scenarios:**
- Happy path: All UI surfaces (sidebar, editor chrome, preview, scrollbar) render in One Dark Pro colors — no Catppuccin blues visible
- Happy path: Preview headings (h1–h6) each render in their designated One Dark Pro color
- Happy path: Preview code blocks render with One Dark-aligned syntax highlighting
- Edge case: Preview with inline code, blockquotes, tables, task lists, and links all show distinct appropriate colors
- Integration: Existing markdown rendering tests in `markdown.rs` still pass after theme change

**Verification:**
- Visual inspection: no Catppuccin colors remain anywhere in the UI
- Rust tests pass: `cargo test` in `src-tauri/`

---

- [ ] **Unit 2: Font size zoom + persistence**

**Goal:** Implement CSS font-size scaling on editor and preview panes via Cmd+/- shortcuts and persist the preference.

**Requirements:** R3, R5, R6

**Dependencies:** None (can be done in parallel with Unit 1)

**Files:**
- Modify: `src/main.ts`
- Modify: `src/styles.css`
- Modify: `src/editor.ts`

**Approach:**
- Add a `fontSize` module-level variable in `main.ts` (default 14, min 8, max 32, step 1)
- In `setupKeyboardShortcuts()`, intercept `Cmd+=`, `Cmd+-`, `Cmd+0` with `e.preventDefault()` to suppress native webview zoom
- On zoom change, update CSS custom property `--editor-font-size` on `:root` and reconfigure CodeMirror's theme extension with the new size
- Apply `--editor-font-size` to `.cm-content`, `.cm-gutters` (in editor) and `#preview-content` (in preview) via CSS `var()`
- Save to `localStorage` on change, read on startup
- In `editor.ts`, import `Compartment` from `@codemirror/state`. Create a `fontSizeCompartment = new Compartment()` and wrap the font-size theme in it during `EditorState.create()`. Export a `setFontSize(px: number)` function that dispatches `fontSizeCompartment.reconfigure(...)` to update the editor font size dynamically

**Patterns to follow:**
- Existing keyboard shortcut setup in `src/main.ts` `setupKeyboardShortcuts()`
- Existing CSS custom property usage in `src/styles.css`

**Test scenarios:**
- Happy path: Pressing Cmd+= increases font size by 1px in both editor and preview
- Happy path: Pressing Cmd+- decreases font size by 1px in both editor and preview
- Happy path: Pressing Cmd+0 resets to 14px default
- Edge case: Font size does not go below 8px or above 32px
- Edge case: Native webview zoom is suppressed — only font size changes, not the entire viewport
- Happy path: Font size persists after app restart (reload webview)
- Edge case: If localStorage has invalid value, fall back to 14px default
- Integration: Scroll sync still works correctly after font size change (positions recalculate)

**Verification:**
- Cmd+/- changes font size visually in both panes
- Sidebar, status bar, tab bar (future) do not change size
- Value persists across page reload

---

- [ ] **Unit 3: View menu with zoom controls**

**Goal:** Add a native macOS View menu with Zoom In / Zoom Out / Reset Zoom items.

**Requirements:** R4

**Dependencies:** Unit 2 (zoom logic must exist)

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml` (if `tauri-plugin-menu` or menu feature needed)
- Modify: `src/main.ts` (listen for menu events)

**Approach:**
- Use Tauri v2's `Menu` API in Rust (`lib.rs`) to construct a menu bar with a View submenu containing Zoom In, Zoom Out, Reset Zoom items
- In `lib.rs`, use `app.on_menu_event(|app, event| { ... })` to handle menu item clicks. For each zoom action, emit a custom event to the frontend via `app.emit("zoom-in", ())` (or similar). The frontend listens via `listen("zoom-in", handler)` from `@tauri-apps/api/event`
- Frontend event handlers call the same zoom functions from Unit 2

**Patterns to follow:**
- Tauri v2 menu construction in `lib.rs` builder chain
- Existing event listener pattern in `src/main.ts`

**Test scenarios:**
- Happy path: View > Zoom In increases font size (same as Cmd+=)
- Happy path: View > Zoom Out decreases font size (same as Cmd+-)
- Happy path: View > Reset Zoom resets to 14px (same as Cmd+0)
- Happy path: Edit menu items (Cut, Copy, Paste) work via menu and keyboard

**Verification:**
- Menu bar appears with View submenu on macOS
- Menu items trigger the same zoom behavior as keyboard shortcuts

---

- [ ] **Unit 4: Status bar**

**Goal:** Add a bottom status bar showing cursor position, word count, and file type indicator with proper empty state.

**Requirements:** R17

**Dependencies:** None (can parallel with Units 1-3)

**Files:**
- Modify: `index.html`
- Modify: `src/styles.css`
- Modify: `src/editor.ts`
- Create: `src/statusbar.ts`
- Modify: `src/main.ts`

**Approach:**
- Add `<div id="status-bar">` to `index.html` below `#app` (or restructure layout: wrap `#app` content in a main area, add status bar as a sibling at the bottom of the page flex container)
- Create `src/statusbar.ts` with `initStatusBar(container)`, `updateCursorPosition(line, col)`, `updateWordCount(count)`, `updateFileType(type)`, `clearStatusBar()` exports
- Add cursor position API to `editor.ts`: new `EditorView.updateListener` that fires on selection changes, calling a registered callback with `{ line, col }`. Export `onCursorChange(callback)` alongside existing `onEditorScroll`
- Word count: calculate from `view.state.doc.toString()` — can share the debounced change callback
- In `main.ts`, wire up: cursor changes → `updateCursorPosition`, content changes → `updateWordCount`, file open → `updateFileType("Markdown")`, all tabs closed → `clearStatusBar()`
- Style with One Dark Pro colors, subtle top border, small fixed height (~24px)

**Patterns to follow:**
- Module pattern from `src/preview.ts` (init + update functions)
- `onEditorScroll` callback pattern in `src/editor.ts`

**Test scenarios:**
- Happy path: Status bar shows "Ln 1, Col 1" on file open
- Happy path: Moving cursor updates line:col in real-time
- Happy path: Typing updates word count
- Happy path: File type shows "Markdown" when a .md file is open
- Edge case: Empty document shows word count 0
- Edge case: When no file is open (all tabs closed in Phase 2), status bar shows "—" for word count and hides cursor/file type
- Integration: Cursor position callback fires on both keyboard navigation and mouse clicks in the editor

**Verification:**
- Status bar visible at bottom of window
- All three indicators update responsively
- Proper empty state when no file is active

---

### Phase 2 — Core Navigation

- [ ] **Unit 5: Rust directory listing backend**

**Goal:** Create a new Rust command for lazy directory listing that returns all file types and respects .gitignore.

**Requirements:** R8, R10, R12

**Dependencies:** None (backend work, can start anytime)

**Files:**
- Modify: `src-tauri/src/commands/files.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs` (register new command)
- Modify: `src-tauri/Cargo.toml` (add `ignore` crate)
- Test: `src-tauri/src/commands/files.rs`

**Approach:**
- Add `ignore` crate to `Cargo.toml`
- Create `list_directory(dir: String) -> Result<Vec<FileEntry>, String>` command
- Extend `FileEntry` struct with `extension: Option<String>` field for icon mapping
- Use `ignore::WalkBuilder` configured for single-level traversal (max_depth=1) to respect .gitignore at each level. Note: `max_depth(1)` returns the root directory itself as the first entry — skip entries where `entry.depth() == 0`
- Sort: directories first, then files, case-insensitive alphabetical
- Register `list_directory` in `lib.rs` command handler

**Patterns to follow:**
- Existing `list_markdown_files` in `src-tauri/src/commands/files.rs`
- Existing `FileEntry` struct and serialization

**Test scenarios:**
- Happy path: Returns all files and directories in a given path with correct `is_dir` and `extension` fields
- Happy path: Directories sorted before files, both alphabetically
- Happy path: Hidden files (dotfiles) excluded
- Happy path: Files matching .gitignore patterns excluded
- Edge case: Empty directory returns empty vec
- Edge case: Path does not exist returns descriptive error
- Edge case: Permission denied on directory returns error (not panic)
- Edge case: Symlinks — follow symlinks but handle cycles gracefully (ignore crate handles this)

**Verification:**
- `cargo test` passes with new test cases
- Invoke from frontend returns expected file entries for a test directory

---

- [ ] **Unit 6: File tree component**

**Goal:** Replace the flat sidebar file list with a hierarchical, expandable/collapsible tree with keyboard navigation and indent guides.

**Requirements:** R8, R9, R10, R11, R12

**Dependencies:** Unit 5 (directory listing backend)

**Files:**
- Rewrite: `src/sidebar.ts` → `src/file-tree.ts` (delete `sidebar.ts`)
- Modify: `index.html` (sidebar structure)
- Modify: `src/styles.css` (tree styles)
- Modify: `src/main.ts` (init wiring)
- Modify: `src-tauri/src/commands/files.rs` (remove `list_markdown_files` — now dead code)
- Modify: `src-tauri/src/lib.rs` (deregister `list_markdown_files`)

**Approach:**
- Create `src/file-tree.ts` replacing `sidebar.ts`. Preserve the exported API shape: `initFileTree(container, openFolderBtn, onFileOpen)`, `openFileDialog()`, `getActivePath()`, `setActivePath(path)`
- Internal state: `treeState: Map<dirPath, { entries, expanded, loaded }>` for lazy loading, plus `sessionTreeState: Map<dirPath, Set<expandedPaths>>` for session persistence
- Rendering: recursive function that builds nested `<ul>/<li>` elements with disclosure arrows, indent guides (thin vertical lines via CSS `border-left`), and proper ARIA `role="tree"` / `role="treeitem"` attributes
- Keyboard navigation: single Tab stop on the tree container, arrow keys for navigation (Up/Down move focus, Right expand, Left collapse/parent), Enter opens markdown file
- Non-markdown files: render with `opacity: 0.5`, `cursor: default`, no click handler. Add `aria-disabled="true"`
- Expand/collapse: click disclosure arrow or Right/Left key → if not loaded, invoke `list_directory` IPC, then toggle expanded state
- Session state: store expanded paths in module-level Map. On re-expand of a previously opened root, restore expanded state
- Remove `list_markdown_files` import — use `list_directory` exclusively
- Update `main.ts` to import from `file-tree.ts` instead of `sidebar.ts`

**Patterns to follow:**
- Module pattern from existing `src/sidebar.ts`
- ARIA treeview widget pattern

**Test scenarios:**
- Happy path: Opening a folder shows root-level files and directories with disclosure arrows
- Happy path: Clicking a folder arrow expands it, showing children indented with guides
- Happy path: Clicking an expanded folder arrow collapses it, hiding children
- Happy path: Clicking a .md file opens it in the editor
- Happy path: Non-markdown files appear muted and do nothing on click
- Happy path: Arrow key navigation (Up/Down/Left/Right) works as specified
- Happy path: Enter on a focused .md file opens it
- Edge case: Deeply nested folders (5+ levels) render correctly with cumulative indentation
- Edge case: Folder with many files (100+) loads and renders without visible delay
- Edge case: Re-opening the same root folder restores previously expanded paths
- Edge case: .gitignore-excluded files do not appear
- Integration: Opening a file from the tree triggers the editor content change and preview update

**Verification:**
- Tree displays hierarchical directory structure
- Expand/collapse works via click and keyboard
- Non-markdown files are visually distinct and non-interactive
- Session state persists within app session

---

- [ ] **Unit 7: File type icons**

**Goal:** Replace emoji file icons with SVG file-type icons.

**Requirements:** R7

**Dependencies:** Unit 6 (tree component renders icons)

**Files:**
- Create: `src/icons.ts`
- Modify: `src/file-tree.ts` (use icons)
- Modify: `src/styles.css` (remove emoji `::before` rules, add icon styles)

**Approach:**
- Create `src/icons.ts` exporting a `getFileIcon(fileName, isDir, isExpanded): string` function that returns an inline SVG string
- Icon mapping: folder-closed, folder-open, markdown (.md), generic file as the base set. Extend with: json, yaml/yml, toml, js/ts/jsx/tsx, html, css, image (png/jpg/gif/svg), and a few more common types
- Source icons: hand-craft minimal SVGs or adapt from an MIT-licensed icon set (Codicons, Seti). Each icon should be ~16x16px, single-color (using `currentColor` for theme compatibility)
- In `file-tree.ts`, prepend icon SVG to each tree item label
- Remove CSS `::before` emoji rules from `styles.css`
- Style icons with `width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;` and One Dark Pro-appropriate colors per type

**Patterns to follow:**
- Current emoji icon approach in `src/styles.css` (lines ~95-105) — replacement, not addition

**Test scenarios:**
- Happy path: Markdown files show markdown icon, folders show folder icon, JSON files show JSON icon
- Happy path: Folder icon changes between open and closed states when expanding/collapsing
- Happy path: Unknown file types show generic file icon
- Edge case: Files with no extension show generic file icon
- Edge case: Icons render correctly at different tree depths (no misalignment)

**Verification:**
- No emoji icons visible anywhere in the file tree
- Each supported file type shows a visually distinct icon
- Icons use theme-appropriate colors

---

- [ ] **Unit 8: Multi-buffer state model + tab switching**

**Goal:** Refactor the single-file editing model to support multiple open files with independent EditorState, dirty tracking, and tab switching.

**Requirements:** R14 (dirty tracking per buffer), R15 (EditorState restoration on switch)

**Dependencies:** Unit 4 (status bar, for updates on tab switch), Unit 6 (file tree, for opening files). Note: Phase 2 starts after all Phase 1 units are complete.

**Files:**
- Modify: `src/editor.ts`
- Modify: `src/main.ts`
- Modify: `src/scroll-sync.ts` (export `resetScrollSync()` for tab switch re-binding)

**Approach:**
- Add buffer map directly in `main.ts`: `Map<filePath, { editorState: EditorState, scrollTop: number, isDirty: boolean, fileName: string }>`. Keep it in the orchestrator module where all consumers already live — no separate buffer-manager module needed since only main.ts consumes the state
- In `editor.ts`: add `getEditorState(): EditorState` and `setEditorState(state: EditorState)` exports. The `setEditorState` function calls `view.setState(state)` then restores scroll position via `requestAnimationFrame` (since `setState` resets the scroller DOM — synchronous scrollTop assignment is overwritten by CodeMirror's layout pass)
- In `main.ts`: replace `currentFilePath` and `isDirty` with buffer map usage. `handleFileOpen` checks if file is already in a buffer (switch to it) or creates a new buffer. Save operates on active buffer. Cmd+W closes active buffer with save prompt if dirty
- On tab switch: save current scroll position and EditorState, call `setEditorState()` with target buffer's state, update preview via `updatePreview()`, then call `resetScrollSync()` and `resyncScroll()` after preview re-renders to re-establish scroll sync for the new file
- In `scroll-sync.ts`: export `resetScrollSync()` that resets `lastTopLine = 1` and re-attaches the scroll listener to the current `view.scrollDOM` (since `setState` may invalidate the previous DOM reference)
- Save/Don't Save/Cancel dialog: Tauri v2's `ask()` only supports 2 buttons (Yes/No). Build a custom in-app HTML modal with three buttons (Save / Don't Save / Cancel) matching VSCode behavior, or use a two-step flow: `ask("Save changes?")` → Yes saves then closes, No closes without saving. Cancel is handled by dismissing the dialog

**Patterns to follow:**
- Existing module pattern (module-private state, exported functions)
- Existing `handleFileOpen` flow in `src/main.ts`

**Test scenarios:**
- Happy path: Opening a file creates a buffer and displays its content
- Happy path: Opening a second file creates another buffer; first file's state is preserved
- Happy path: Switching between buffers restores content, cursor position, scroll position, and undo history
- Happy path: Editing a buffer marks it dirty; saving marks it clean
- Edge case: Opening an already-open file switches to its buffer instead of creating a duplicate
- Edge case: Closing the last buffer shows empty state
- Error path: Closing a dirty buffer shows Save/Don't Save/Cancel dialog; Cancel keeps buffer open
- Integration: Status bar updates (cursor, word count, file type) on buffer switch
- Integration: Preview updates to show the switched-to file's rendered content
- Integration: Scroll sync re-syncs after tab switch — lastTopLine resets, preview scrolls to match the new file's editor position, not the previous file's

**Verification:**
- Multiple files can be open simultaneously
- Undo history is independent per buffer
- Scroll position restores on tab switch
- Dirty indicator tracks correctly per buffer

---

- [ ] **Unit 9: Tab bar UI**

**Goal:** Add a visual tab bar above the editor showing open files with close buttons, dirty indicators, horizontal scroll overflow, and keyboard support.

**Requirements:** R13 (tab bar UI with overflow), R16 (Cmd+W close, empty state)

**Dependencies:** Unit 8 (buffer state and switching logic)

**Files:**
- Create: `src/tab-bar.ts`
- Modify: `index.html` (add tab bar container)
- Modify: `src/styles.css` (tab bar styles)
- Modify: `src/main.ts` (wire up tab bar)

**Approach:**
- Add `<div id="tab-bar">` to `index.html` inside a new wrapper that contains tab bar + content row (editor + divider + preview). This restructures the layout so tab bar sits above the editor area but not above the sidebar
- Create `src/tab-bar.ts` with `initTabBar(container)`, `addTab(path, fileName)`, `removeTab(path)`, `setActiveTab(path)`, `setTabDirty(path, isDirty)`, `onTabClick(callback)`, `onTabClose(callback)`
- Tab rendering: `<div class="tab">` with file name text, dirty dot (inline, before close button), and close (×) button
- Overflow: tab container has `overflow-x: auto`, `white-space: nowrap`. Fade gradients via CSS `mask-image` or pseudo-elements on left/right edges when overflow is detected
- Active tab: highlighted background. Inactive tabs: subtle background
- Dirty indicator: small dot (●) inline with tab label, visible only when dirty
- Close button: × on each tab, triggers save prompt via buffer manager if dirty
- Cmd+W: handled in main.ts, calls close on active tab
- Save prompt: Tauri `ask()` dialog → Save / Don't Save / Cancel. Save = save file + close tab. Don't Save = discard + close tab. Cancel = abort close
- Style with One Dark Pro tab colors (active/inactive/hover states)

**Patterns to follow:**
- Module pattern from `src/statusbar.ts` (Unit 4)
- Tab styling inspired by VSCode's One Dark Pro tab appearance

**Test scenarios:**
- Happy path: Opening a file adds a tab; tab shows file name
- Happy path: Clicking a tab switches to that file
- Happy path: Close button removes the tab and its buffer
- Happy path: Dirty dot appears when file is modified, disappears on save
- Happy path: Cmd+W closes the active tab
- Edge case: Opening many files causes tab bar to scroll horizontally with fade indicators
- Edge case: Closing all tabs shows empty state with "Open a file" prompt
- Error path: Closing a dirty tab shows Save/Don't Save/Cancel; Cancel keeps tab open
- Edge case: Tab shows just filename, not full path (disambiguate duplicate names by showing parent folder in tooltip)

**Verification:**
- Tab bar renders above editor area
- Tabs scroll horizontally when overflowing
- Dirty indicator and close buttons work correctly
- Save prompt appears for unsaved files on close

---

### Phase 3 — Power Features

- [ ] **Unit 10: Activity bar + sidebar panel switching**

**Goal:** Add a narrow activity bar on the far left with File Explorer and Search icons, enabling sidebar panel switching.

**Requirements:** R18, R19

**Dependencies:** Unit 6 (file tree as the default panel)

**Files:**
- Create: `src/activity-bar.ts`
- Modify: `index.html` (add activity bar, restructure sidebar wrapper)
- Modify: `src/styles.css` (activity bar styles, sidebar toggle)
- Modify: `src/main.ts` (wire up)

**Approach:**
- Add `<div id="activity-bar">` as the leftmost element in `#app` flex layout
- Activity bar: narrow vertical strip (~48px) with two icon buttons (File Explorer, Search). Styled with One Dark Pro colors
- Panel switching: clicking an icon shows the corresponding sidebar panel (file tree or search panel). Clicking the active icon hides the sidebar entirely (instant snap — no animation). The activity bar itself remains visible
- When sidebar is hidden, the editor area expands. Sidebar width is preserved for re-show
- Internal state: `activePanel: 'explorer' | 'search' | null` (null = sidebar hidden)
- CSS: sidebar toggle via `display: none` on the sidebar container, with the activity bar remaining visible

**Patterns to follow:**
- Module pattern from other TS modules
- VSCode activity bar visual language

**Test scenarios:**
- Happy path: Activity bar renders on the far left with two icons
- Happy path: File Explorer icon is active by default, showing file tree
- Happy path: Clicking Search icon switches sidebar to search panel
- Happy path: Clicking active icon hides sidebar; editor expands
- Happy path: Clicking icon again shows sidebar with preserved width
- Edge case: Activity bar remains visible when sidebar is hidden

**Verification:**
- Two icons visible in activity bar
- Panel switching is instant and smooth
- Sidebar width is preserved across hide/show cycles

---

- [ ] **Unit 11: Find-in-files backend + search panel UI**

**Goal:** Implement cross-file text search via Rust backend and a search results panel in the sidebar.

**Requirements:** R20, R21

**Dependencies:** Unit 5 (ignore crate already added), Unit 10 (search panel slot in sidebar)

**Files:**
- Modify: `src-tauri/src/commands/files.rs` (add search command)
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs` (register command)
- Create: `src/search-panel.ts`
- Modify: `src/styles.css`
- Modify: `src/main.ts`
- Test: `src-tauri/src/commands/files.rs`

**Approach:**
- **Backend**: Create `search_in_files(dir: String, query: String) -> Result<Vec<SearchResult>, String>` command. Uses `ignore::WalkBuilder` for .gitignore-aware recursive file walking. For each text file under 1MB, search for the query string (case-insensitive). Return matches as `Vec<SearchResult>` where `SearchResult = { file_path, file_name, line_number, line_content, match_start, match_end }`
- **Frontend**: Create `src/search-panel.ts` with search input field, results container, and state management. Input submits on Enter. Shows loading spinner during search. Results rendered grouped by file, each match showing 1 line of context with the match highlighted. Clicking a result opens the file (via buffer manager) and scrolls to the match line. Empty states: "No folder open", "No results", "Type to search across files" (initial)
- Wire into activity bar panel switching from Unit 10

**Patterns to follow:**
- Existing `list_directory` command pattern for the Rust backend
- Module pattern for `src/search-panel.ts`

**Test scenarios:**
- Happy path: Searching "hello" returns all files containing "hello" with line numbers and context
- Happy path: Results are grouped by file with match count
- Happy path: Clicking a result opens the file at the match line
- Happy path: Clicking a result for an already-open file switches to that tab
- Edge case: Search in empty folder returns "No results"
- Edge case: No folder open shows "No folder open" message
- Edge case: Query with no matches shows "No results"
- Edge case: Binary files and files >1MB are skipped
- Edge case: .gitignore-excluded files are not searched
- Error path: Search while results are loading replaces previous search
- Happy path: Loading indicator shown during search, disappears when complete

**Verification:**
- Search returns results within 2 seconds for a project with <10k files
- Results are navigable and open files at the correct line
- .gitignore patterns are respected

---

- [ ] **Unit 12: File CRUD backend**

**Goal:** Add Rust commands for file and directory creation, renaming, and deletion.

**Requirements:** R22–R25 (Rust backend — commands exist and return correct results)

**Dependencies:** None (backend work)

**Files:**
- Modify: `src-tauri/src/commands/files.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/src/commands/files.rs`

**Approach:**
- Add four new commands following existing `std::fs` pattern:
  - `create_file(path: String) -> Result<(), String>` — creates empty file
  - `create_directory(path: String) -> Result<(), String>` — `fs::create_dir`
  - `rename_entry(old_path: String, new_path: String) -> Result<(), String>` — `fs::rename`
  - `delete_entry(path: String, workspace_root: String) -> Result<(), String>` — `fs::remove_file` or `fs::remove_dir_all` based on path type. Validates that path is a descendant of workspace_root — rejects deletion of the root itself or any ancestor
- Validate inputs: non-empty names, no path traversal (`..`), target doesn't already exist (for create/rename), delete path must be inside workspace root
- Register all new commands in `lib.rs`

**Patterns to follow:**
- Existing `read_file` / `write_file` pattern in `src-tauri/src/commands/files.rs`

**Test scenarios:**
- Happy path: Create file creates an empty file at the specified path
- Happy path: Create directory creates a new empty directory
- Happy path: Rename moves a file to the new name in the same directory
- Happy path: Delete removes a file; delete on directory removes it recursively
- Error path: Create file when file already exists returns error
- Error path: Rename to an existing name returns error
- Error path: Delete non-existent path returns error
- Error path: Invalid path (containing `..`) returns error
- Edge case: Rename file that is currently open in a tab — tab should update (handled by frontend in Unit 13)

**Verification:**
- `cargo test` passes with all new test cases
- Commands accessible via IPC from frontend

---

- [ ] **Unit 13: Context menu + inline rename/delete**

**Goal:** Add right-click context menu to the file tree with New File, New Folder, Rename, Delete operations and keyboard shortcuts.

**Requirements:** R22–R25 (Frontend UI — context menu, inline rename, validation, confirmation)

**Dependencies:** Unit 6 (file tree), Unit 8 (buffer state for rename/delete of open files), Unit 12 (CRUD backend)

**Files:**
- Create: `src/context-menu.ts`
- Modify: `src/file-tree.ts` (integrate context menu, inline rename)
- Modify: `src/styles.css` (context menu styles, inline rename input)
- Modify: `src/main.ts` (wire up)

**Approach:**
- Create `src/context-menu.ts` with `showContextMenu(x, y, items)` and `hideContextMenu()`. Renders a positioned `<div>` overlay with menu items. Closes on click outside, Escape, or item selection
- Trigger: `contextmenu` event on tree items + Shift+F10 / Menu key when tree item is focused
- Menu items: New File, New Folder, Rename (also F2), Delete
- **New File/Folder**: invoke `create_file` / `create_directory` IPC, then re-expand the parent folder in the tree. New File immediately enters inline rename mode
- **Inline rename**: replace tree item text with an `<input>` element. Pre-select filename without extension. Enter confirms (invoke `rename_entry` IPC), Escape cancels. Validate: non-empty, no duplicates, no invalid characters (`/`, `\0`)
- **Delete**: show Tauri `ask()` confirmation dialog. On confirm, invoke `delete_entry` IPC. If the deleted file is open in a tab, close the tab (discard buffer). Focus returns to next sibling or parent in tree
- **Rename of open file**: if the renamed file is open in a tab, update the buffer path and tab label
- **F2 shortcut**: when a tree item is focused, trigger inline rename directly (no context menu)

**Patterns to follow:**
- Tauri `ask()` dialog usage (already used in save prompts)
- Existing tree item rendering in `src/file-tree.ts`

**Test scenarios:**
- Happy path: Right-click on a file shows context menu with all 4 items
- Happy path: Shift+F10 on focused tree item shows same context menu
- Happy path: "New File" creates file and enters inline rename
- Happy path: "New Folder" creates folder and enters inline rename
- Happy path: "Rename" enters inline rename with filename pre-selected (without extension)
- Happy path: Enter confirms rename, Escape cancels
- Happy path: F2 triggers rename on focused item
- Happy path: "Delete" shows confirmation dialog; confirming removes file/folder and updates tree
- Edge case: Renaming to an empty string is rejected (input stays active)
- Edge case: Renaming to a duplicate name shows validation error
- Edge case: Deleting a file that's open in a tab closes the tab without save prompt
- Edge case: Renaming a file that's open in a tab updates tab label and buffer path
- Edge case: Context menu positions correctly near window edges (doesn't overflow)
- Edge case: Focus returns to next sibling after delete; to parent if last child

**Verification:**
- Context menu appears on right-click and keyboard trigger
- All CRUD operations work and tree updates immediately
- Inline rename validates input and handles edge cases
- Open tabs are properly updated on rename/delete

## System-Wide Impact

- **Interaction graph:** The tab bar, file tree, buffer manager, status bar, and activity bar all interact through `main.ts` as the orchestrator. File tree opens files → buffer manager creates buffers → tab bar adds tabs → status bar updates. Search results → buffer manager → tab bar → editor. Context menu → CRUD backend → file tree refresh.
- **Error propagation:** Rust command errors surface as rejected promises in the frontend. Currently logged to `console.error` with no user-facing UI. Phase 3's CRUD operations should show errors in the context menu area or as brief notifications.
- **State lifecycle risks:** EditorState swapping in Phase 2 is the highest risk. If `view.setState()` doesn't properly clean up extensions or if scroll restoration fails, users will see jumpy behavior. Mitigate by testing with multiple files of different lengths and scroll positions.
- **Scroll sync interaction:** `scroll-sync.ts` uses `view.scrollDOM` for scroll events and `[data-sourcepos]` elements in the preview. After tab switch, scroll sync needs to re-bind or the `lastTopLine` state needs resetting. Preview also needs re-rendering for the new file's content.
- **Unchanged invariants:** The markdown rendering pipeline (comrak + syntect in Rust) is unchanged except for the syntect theme. The scroll-sync algorithm is unchanged. The divider drag behavior is unchanged. The Cmd+O / Cmd+S / Cmd+Shift+S shortcuts are preserved (Cmd+S now operates on the active buffer).

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| CodeMirror `view.setState()` may lose extension state or produce flicker | Test early in Unit 8. If problematic, fall back to hidden EditorView per buffer (higher memory but stable) |
| Scroll sync breaks after tab switch | Reset `lastTopLine` in scroll-sync on buffer switch. Call `resyncScroll()` after preview re-render |
| Native webview zoom (Cmd+/-) fights with custom font-size zoom | Use `e.preventDefault()` on the keyboard event. Test that this actually suppresses webview zoom on macOS Tauri v2 |
| Large directories (>10k files) slow down tree rendering | Lazy loading limits each expansion to one directory. The `ignore` crate efficiently filters. Add a loading indicator per folder during expand |
| Syntect has no built-in One Dark theme | Use `base16-onedark` variant or embed a custom `.tmTheme` file. Evaluate during Unit 1 implementation |
| `localStorage` may be cleared by webview updates | Low risk for a desktop Tauri app. If needed, migrate to `tauri-plugin-store` later |

## Documentation / Operational Notes

- No external documentation or API changes — this is a desktop app with no users yet
- Consider creating a `CLAUDE.md` with project conventions after Phase 1 ships

## Sources & References

- **Origin document:** [docs/brainstorms/vscode-experience-requirements.md](docs/brainstorms/vscode-experience-requirements.md)
- Related plan: [docs/plans/2026-04-08-001-feat-scroll-sync-plan.md](docs/plans/2026-04-08-001-feat-scroll-sync-plan.md) (completed, similar plan structure)
- CodeMirror 6 state management: `@codemirror/state` EditorState, `@codemirror/view` EditorView.setState()
- Tauri v2 Menu API: `tauri::menu::Menu`, `Submenu`, `MenuItem`
- Rust `ignore` crate: gitignore-aware directory walking
