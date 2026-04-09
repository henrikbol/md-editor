---
date: 2026-04-09
topic: vscode-experience
---

# VSCode-Like Editor Experience

## Problem Frame

MD Editor is a functional markdown editor but feels like a basic tool rather than a polished IDE. Users accustomed to VSCode expect a familiar visual language: a dark pro theme, navigable file tree, tabbed editing, status information, and standard keyboard shortcuts. Closing this gap makes the app feel professional and immediately comfortable to VSCode users.

This is a significant scope — the current app has 6 source files and a single-file editing model. The work is organized into three independently deliverable phases to manage risk and ensure each phase ships complete.

## Phases

- **Phase 1 — Visual Polish:** Theme, font size controls, status bar (R1–R6, R17). Low structural risk, high visual impact.
- **Phase 2 — Core Navigation:** Folder tree, file type icons, tabbed editing (R7–R16). Requires backend changes and a frontend state model refactor. Highest-risk phase.
- **Phase 3 — Power Features:** Find in files, context menu, activity bar (R18–R25). Builds on Phase 2's tree and multi-file model.

Each phase delivers standalone value. Phase 1 is fully independent. Phase 3 depends on Phase 2's file tree and multi-document model.

## Requirements

### Phase 1 — Visual Polish

**Theme & Visual Identity**

- R1. Apply a One Dark Pro color palette across the entire UI — sidebar, editor chrome, preview pane, and all interactive elements. The editor already uses CodeMirror's `oneDark`; the surrounding UI (currently Catppuccin-inspired CSS variables) must match.
- R2. Style markdown elements in the preview with syntax-aware colors from the One Dark Pro palette — distinct colors for headings (by level), inline code, code blocks, links, blockquotes, bold, italic, lists, and tables.

**Font Size Controls**

- R3. Support Cmd+= to increase and Cmd+- to decrease font size. Cmd+0 resets to default. These must work app-wide (not just when the editor is focused). This is CSS font-size scaling on the editor and preview panes — sidebar, tabs, and status bar remain at their default sizes. The native webview zoom (which Cmd+/- may trigger) must be intercepted and suppressed.
- R4. Provide a View menu (or equivalent UI) with Zoom In / Zoom Out / Reset Zoom options.
- R5. Font size changes apply to both the editor and the preview pane simultaneously. Step size: 1px per keypress. Range: 8px minimum, 32px maximum. Default: 14px.
- R6. Persist the user's font size preference across app restarts.

**Status Bar**

- R17. Add a bottom status bar showing: current cursor position (line:column), word count (prominent — this is a writing tool), and file type indicator (e.g., "Markdown"). When no file is open (all tabs closed), hide the cursor position, show "—" for word count, and remove the file type indicator. Phase 1 note: `editor.ts` needs a new cursor-position API (e.g., `onCursorChange` callback) to feed the status bar.

**Phase 1 Success Criteria:**
- The app looks and feels like a One Dark Pro-themed editor on every surface.
- Cmd+/- font size changes work smoothly with visible feedback.
- Status bar updates responsively as the user types and moves the cursor.

### Phase 2 — Core Navigation

**File Type Icons**

- R7. Replace emoji icons (📁📄) with illustrative file-type icons. Icons should visually distinguish at minimum: markdown files, folders (open/closed states), and a generic fallback for other file types. Additional type-specific icons (JSON, YAML, JS/TS, etc.) depend on the chosen icon set's coverage.

**Folder Tree**

- R8. Replace the flat file list with a hierarchical tree showing the full directory structure of the opened folder. This requires replacing the current `sidebar.ts` navigation model (which navigates INTO directories) with a persistent tree that expands/collapses in place. The current Rust command `list_markdown_files` must be extended or replaced with a command that returns all file types and supports the tree's loading strategy (decided during planning).
- R9. Folders are expandable/collapsible with disclosure arrows. Clicking a folder toggles its state (not navigates into it as currently). Keyboard navigation follows the ARIA treeview pattern: Up/Down to move focus between visible items, Right to expand a collapsed folder, Left to collapse an expanded folder (or move to parent), Enter to open a markdown file.
- R10. Show all files in the tree (not just .md files). Non-markdown files are visually muted (reduced opacity or dimmed text) with a default cursor (not pointer) — left-clicking them does nothing. Only markdown files are openable and editable. Non-markdown files remain eligible for context menu operations added in Phase 3.
- R11. Persist expand/collapse state within the app session (lost on quit — simpler than cross-restart persistence; tree state is less critical than font size preference). Reopening the same folder within a session restores the tree state.
- R12. Indent nested items to visually communicate hierarchy, with subtle vertical indent guide lines. Respect `.gitignore` patterns and exclude hidden files/directories (e.g., `node_modules`, `.git`) from the tree to prevent performance issues on large repos.

**Tab Bar**

Tabbed editing requires refactoring the core file state model from single-file to multi-buffer. The current app tracks one `currentFilePath` and one `isDirty` flag in `main.ts`. This must become a map of open files, each with its own EditorState, dirty flag, and scroll position. The `editor.ts` module must also be refactored to support EditorState swapping — maintaining a `Map<filePath, EditorState>` and using `view.setState()` on tab switch, with explicit scroll position save/restore since `setState` resets the scroller.

- R13. Display open files as tabs above the editor. Each tab shows the file name and a close button. When tabs exceed the available width, they scroll horizontally (mouse-wheel or click-drag) with fade gradients at the edges indicating overflow.
- R14. Indicate unsaved changes with a dot inline with the tab label (the close button remains visible).
- R15. Clicking a tab switches to that file, restoring its editor state (cursor, scroll, undo history). Closing a tab with unsaved changes shows a dialog with Save / Don't Save / Cancel options (Save is the default button on macOS).
- R16. Support Cmd+W to close the active tab. When all tabs are closed, show an empty state with a prompt to open a file.

**Phase 2 Success Criteria:**
- The file tree shows the full directory hierarchy and expands/collapses smoothly.
- Multiple files can be open simultaneously with independent undo history and unsaved-changes tracking (indicated by tab dot).
- Switching tabs feels instant — no visible re-rendering or flicker.

### Phase 3 — Power Features

**Activity Bar**

- R18. Add a narrow vertical icon strip on the far left with icons for File Explorer (default active) and Search.
- R19. Clicking an activity bar icon switches the sidebar panel. Clicking the active icon toggles sidebar visibility (instant snap, no animation). The activity bar itself remains visible when the sidebar panel is hidden. When the sidebar is hidden, the editor area expands to fill the space. Sidebar width is preserved when re-shown.

**Find in Files**

Search is performed in the Rust backend for performance — searching 10k files over IPC from the frontend would not meet the 2-second target.

- R20. Provide a search panel (activated from the activity bar or Cmd+Shift+F) that searches across all non-binary files in the opened folder. Search is triggered on Enter (not on each keystroke). Respect `.gitignore` patterns and skip binary files (e.g., images, PDFs) and files larger than 1MB. Show a loading indicator after Enter while results are being fetched. Show an error state if the search fails.
- R21. Display results grouped by file with 1 line of match context. Clicking a result opens the file at the match location (switching to an existing tab if the file is already open). Show a message when no folder is open, and "No results" when the search returns empty. The search input retains the query after results are shown.

**File Explorer Context Menu**

- R22. Right-clicking a file or folder in the tree shows a context menu with: New File, New Folder, Rename, and Delete. These operations apply to all files, not just markdown. The context menu is also accessible via keyboard: Shift+F10 or the Menu key when a tree item is focused.
- R23. New File and New Folder create items in the right-clicked directory (or the root if right-clicking empty space). New File opens an inline rename input in the tree.
- R24. Rename triggers inline label editing in the tree: pre-selects the filename without extension, Escape cancels, Enter confirms. Validates against empty names, duplicate names, and invalid characters. F2 triggers rename on the focused tree item (matching VSCode).
- R25. Delete prompts for confirmation before removing. Focus returns to the next sibling or parent after deletion.

**Phase 3 Success Criteria:**
- Find-in-files returns results within 2 seconds for a typical project (<10k files, <50MB text content).
- Context menu operations work reliably and the tree updates immediately after mutations.
- Activity bar switching between File Explorer and Search is smooth.

## Scope Boundaries

- No command palette (Cmd+Shift+P) in this iteration.
- No breadcrumbs — the file tree already communicates file location.
- No minimap, git gutter indicators, or drag-and-drop file reordering.
- No split editor panes or multiple editor groups.
- No extension/plugin system.
- No light theme or theme switching — One Dark Pro only.
- Non-markdown files are shown in the tree for context but are not left-clickable. Phase 3 adds right-click context menu operations to all files.
- No Settings panel — deferred to a future iteration.

## Key Decisions

- **Show all files, not just markdown**: The tree shows the full directory contents for context, but only markdown files are openable. This matches VSCode's explorer behavior and makes file-type icons meaningful.
- **One Dark Pro everywhere**: Rather than keeping separate themes for different UI regions, unify on One Dark Pro for visual coherence.
- **CSS font-size zoom, not viewport zoom**: Cmd+/- adjusts font size on the editor and preview panes only. Sidebar, tabs, and status bar stay at default size. This avoids CodeMirror coordinate-system conflicts that viewport-level scaling would cause with scroll sync.
- **Non-markdown files are visually muted**: Left-clicking them does nothing (default cursor, no pointer). They remain eligible for Phase 3 context menu operations.
- **Three phases with clear dependencies**: Phase 1 is independent. Phase 3 depends on Phase 2. Each phase delivers standalone value.
- **Find-in-files uses Rust backend**: Required to meet the 2-second performance target on projects with up to 10k files.

## Dependencies / Assumptions

- An SVG icon set is needed for file type icons. The specific category coverage depends on the chosen set.
- The Rust backend `list_markdown_files` command must be **extended or replaced** with a new directory listing command. The current command is non-recursive, returns a flat list, and filters to .md files only. The new command needs to return all file types and support the tree's loading strategy (lazy or eager — decided during planning).
- The `sidebar.ts` module must be **rewritten** for Phase 2. The current navigate-into-directory model is incompatible with a persistent expand/collapse tree. Its exported API (`initSidebar`, `openFileDialog`, `getActivePath`, `setActivePath`) must be preserved or migrated.
- The `editor.ts` module must be **refactored** for Phase 2 to support multi-buffer editing. The current single `EditorView` must support `EditorState` swapping with explicit scroll position save/restore. This is the highest technical risk in Phase 2.
- A `.gitignore` parsing library is needed for R12 (tree filtering) and R20 (find-in-files). The Rust `ignore` crate (from the ripgrep ecosystem) is the recommended choice — it handles nested `.gitignore` files, negation patterns, and `.git/info/exclude`.
- Phase 2 requires verifying that the current Tauri `fs:allow-read-dir` permission scope allows recursive subdirectory listing from user-selected folders. Scope configuration may need a dynamic grant after folder selection via the dialog plugin.
- Tauri capabilities must be extended with `fs:allow-remove`, `fs:allow-rename`, and `fs:allow-mkdir` for Phase 3's context menu operations. New Rust commands (`delete_file`, `rename_file`, `create_file`, `create_directory`) are also required.

## Outstanding Questions

### Deferred to Planning

- [Affects R7][Needs research] Which icon set best fits the One Dark Pro aesthetic and has appropriate licensing? Seti icons, Material File Icons, or custom SVGs? The supported file-type categories depend on the chosen set.
- [Affects R8, R12][Technical] Should the tree load lazily (expand-on-demand) or eagerly for the full directory? Lazy loading is better for large repos but requires a per-folder loading state. This decision determines the Rust command interface shape.
- [Affects R6][Technical] What persistence mechanism for font size? Tauri's local storage, a config file, or the OS preferences API?

## Next Steps

-> `/ce:plan` for structured implementation planning
