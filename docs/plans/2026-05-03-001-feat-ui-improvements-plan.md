---
title: "feat: File tree toolbar, Mermaid support, editor panel toggle"
type: feat
status: active
date: 2026-05-03
origin: docs/brainstorms/2026-05-03-ui-improvements-requirements.md
---

# feat: File Tree Toolbar, Mermaid Support, Editor Panel Toggle

## Summary

Three UI improvements implemented across six source files with no backend changes: a VSCode-style toolbar above the file tree (surfacing existing private CRUD functions), Mermaid diagram rendering in the preview via mermaid.js post-processing, and an editor pane toggle for full-width reading mode.

---

## Problem Frame

File creation and refresh require a right-click context menu; Mermaid diagram source renders as raw code; the editor pane cannot be hidden when the user only wants to read. All three pain points stem from missing UI surface over already-working underlying logic. (See origin document for full problem narrative.)

---

## Requirements

**File Tree Toolbar**

- R1. Sidebar header shows New File, New Folder, Refresh icon buttons (replaces single Open Folder button)
- R2. Activity bar gains an "Open Project" button
- R3. New File creates at root (or selected dir) and immediately starts inline rename
- R4. New Folder follows same placement logic and starts inline rename
- R5. Refresh reloads the root tree, preserving expanded folders

**Mermaid Diagram Support**

- R6. Preview renders Mermaid fenced code blocks as diagrams
- R7. Mermaid diagrams re-render on every live preview update

**Editor Panel Toggle**

- R8. A toggle button shows/hides the editor pane
- R9. When editor is hidden, preview expands to full width; divider hides
- R10. Re-showing the editor restores the previous split ratio
- R11. Cmd+\\ (Mac) / Ctrl+\\ (Win/Linux) toggles the editor panel

**Origin acceptance examples:** AE1 (covers R9, R10), AE2 (covers R3, R5)

---

## Scope Boundaries

- No read-only enforcement — toggling hides the panel only, does not prevent saves
- Mermaid rendering in preview only; no effect on saved/exported files
- No Mermaid theme or configuration UI
- Activity bar's existing explorer toggle (show/hide sidebar) is unchanged

### Deferred to Follow-Up Work

- Lazy/dynamic import of mermaid.js: mermaid is a large package; a dynamic `import()` would reduce initial bundle size but adds async complexity. Acceptable tradeoff for now; worth revisiting if app startup slows noticeably.

---

## Context & Research

### Relevant Code and Patterns

- `index.html:11–29` — activity bar button HTML; every button uses `class="activity-icon"` + `data-panel`
- `index.html:30–41` — `#sidebar-header` with existing `#open-folder-btn` (16×16 SVG, `title` attr)
- `index.html:42–58` — `#content-row`, `#editor-pane`, `#divider`, `#preview-pane` (all `flex: 1`)
- `src/styles.css:124–162` — `.activity-icon` / `.activity-icon.active` CSS (40×40 px, border-radius 6px)
- `src/styles.css:189–218` — `#sidebar-header` and `#open-folder-btn` CSS — template for new toolbar buttons
- `src/styles.css:402–448` — editor/preview pane and divider CSS
- `src/activity-bar.ts:1` — `PanelName` union type (`'explorer' | 'search' | 'settings'`)
- `src/activity-bar.ts:12–31` — `initActivityBar` uses `querySelectorAll('.activity-icon')` loop; new HTML buttons are picked up automatically
- `src/activity-bar.ts:20–24` — `settings` branch as pattern for non-panel actions dispatched via callback
- `src/file-tree.ts:48–68` — `initFileTree(container, openFolderBtn, callback, ...)` — `openFolderBtn` param to remove
- `src/file-tree.ts:71–84` — `openFolder` (private async function, needs export)
- `src/file-tree.ts:451–504` — `handleNewFile`, `handleNewFolder` (private, need export)
- `src/file-tree.ts:621–647` — `refreshDirectory(dirPath)` (private, needs export)
- `src/file-tree.ts:649–659` — existing exports: `getActivePath`, `setActivePath`, `getWorkspaceRoot`
- `src/preview.ts:11–23` — `updatePreview` sets `previewEl.innerHTML` after `invoke("parse_markdown")`
- `src/main.ts:292–325` — `setupDivider` manipulates `editorPane.style.flex` and `previewPane.style.flex`
- `src/main.ts:342–360` — `setupKeyboardShortcuts` single `keydown` listener, `mod = e.metaKey || e.ctrlKey`
- `src-tauri/src/markdown.rs:85–142` — `extract_language` + `try_highlight`: mermaid blocks fall through to raw `<pre><code class="language-mermaid">` because syntect has no mermaid syntax

### Institutional Learnings

- No `docs/solutions/` directory in this repo; patterns are inferred from existing code.
- Activity bar's sidebar toggle (save width → `display:none` → restore) is the established hide/show pattern — mirror for editor toggle.
- Duplicate keydown handlers for shortcuts with native menu accelerators were intentionally removed in the atmospheric redesign. Cmd+\\ has no native menu item, so a JS-only handler in `setupKeyboardShortcuts` is correct.

### External References

- mermaid.js v11 API: `mermaid.initialize({ startOnLoad: false })` once; `mermaid.run({ nodes })` after each render.

---

## Key Technical Decisions

- **Export private file-tree functions rather than adding more init params:** `openFolder`, `handleNewFile`, `handleNewFolder`, `refreshDirectory` become named exports. The `initFileTree` `openFolderBtn` parameter is removed. Cross-module wiring happens in `main.ts`, consistent with how all other modules are already wired.
- **Activity bar Open Project via callback:** `initActivityBar` accepts an `onOpenProject?: () => void` callback, mirroring the existing `setSettingsToggleCallback` pattern. Keeps `activity-bar.ts` decoupled from `file-tree.ts`.
- **Shared CSS class for toolbar buttons:** A new `.sidebar-icon-btn` class replaces the single-use `#open-folder-btn` ID rule, DRYing up the three new buttons.
- **Mermaid post-processing in `preview.ts`:** Unwrap `<pre><code class="language-mermaid">` → `<div class="mermaid">` after each `previewEl.innerHTML` assignment, then call `mermaid.run()`. Keeps all preview rendering logic in one module.
- **Editor toggle state in `main.ts`:** A module-level boolean tracks toggle state. Flex ratio (editor + preview `style.flex`) is saved before hiding and restored on re-show, mirroring the sidebar width-save pattern in `activity-bar.ts`.
- **Toggle button right-aligned inside `#tab-bar`:** Append once after `initTabBar`; `margin-left: auto; flex-shrink: 0` pins it to the right without restructuring the tab-bar DOM.

---

## Open Questions

### Resolved During Planning

- **What class does comrak emit for mermaid blocks?** Confirmed `<pre data-sourcepos="..."><code class="language-mermaid">...</code></pre>` — syntect returns `None` for unknown language, so the raw comrak output is preserved.
- **Does `#tab-bar` support a right-aligned non-tab button?** Yes — it is a flex row; `margin-left: auto` on a `flex-shrink: 0` button works without touching `tab-bar.ts`.

### Deferred to Implementation

- **Exact `mermaid.run()` call shape:** The v11 API accepts either `{ nodes: HTMLElement[] }` or `{ querySelector }`. Implementer should confirm which resolves correctly against the unwrapped `<div class="mermaid">` elements; both approaches are viable.
- **`e.key` value for backslash on non-US keyboards:** `e.key === "\\"` is correct for US layouts; `e.code === "Backslash"` is locale-safe. Implementer should pick one — `e.code` is recommended for a fixed physical-key binding.

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

**Mermaid post-processing flow (per preview update):**

```
updatePreview(markdownText)
  → invoke("parse_markdown") → html string
  → previewEl.innerHTML = html
     (DOM now contains <pre><code class="language-mermaid">…</code></pre>)
  → for each code.language-mermaid:
       text = element.textContent          // browser decodes HTML entities
       div  = <div class="mermaid">text</div>
       pre.replaceWith(div)
  → mermaid.run({ nodes: [div, …] })
  → onUpdateCallback?.()                  // scroll sync
```

**Editor toggle state machine:**

```
editorVisible = true (initial)

toggle():
  if editorVisible:
    savedEditorFlex  = editorPane.style.flex   // e.g. "0.5"
    savedPreviewFlex = previewPane.style.flex  // e.g. "0.5"
    editorPane.style.display  = "none"
    divider.style.display     = "none"
    previewPane.style.flex    = "1"
    editorVisible = false
  else:
    editorPane.style.display  = ""
    divider.style.display     = ""
    editorPane.style.flex     = savedEditorFlex
    previewPane.style.flex    = savedPreviewFlex
    editorVisible = true
```

---

## Implementation Units

- U1. **Sidebar toolbar HTML + CSS**

**Goal:** Add the three toolbar buttons and the activity bar Open Project button to the DOM; establish their shared style.

**Requirements:** R1, R2

**Dependencies:** None

**Files:**
- Modify: `index.html`
- Modify: `src/styles.css`

**Approach:**
- Inside `#sidebar-header`, replace `<button id="open-folder-btn">` with three `<button>` elements using `data-action="new-file"`, `data-action="new-folder"`, `data-action="refresh"` and appropriate 16×16 SVG icons and `title` attributes.
- Add a new `<button class="activity-icon" data-panel="open-project">` to the activity bar HTML (the `initActivityBar` querySelectorAll loop picks it up automatically).
- Add a `.sidebar-icon-btn` CSS class matching the `#open-folder-btn` pattern (background: none, border: none, padding 4px, border-radius 4px, text-secondary color, hover accent). Remove the now-unused `#open-folder-btn` ID rule.
- The three toolbar buttons sit in a flex row on the right side of `#sidebar-header`; use a wrapping `<div class="sidebar-actions">` with `display: flex; gap: 2px` to group them.

**Patterns to follow:**
- Existing `#open-folder-btn` rule in `src/styles.css:205–218` — template for `.sidebar-icon-btn`
- Existing `.activity-icon` button in `index.html:12–28` — template for Open Project button

**Test scenarios:**
- Happy path: sidebar header renders three icon buttons and no `#open-folder-btn`
- Happy path: activity bar contains an Open Project button with `data-panel="open-project"`
- Edge case: buttons are visible and correctly sized at minimum sidebar width (220 px)

**Verification:**
- `index.html` contains no `id="open-folder-btn"`; contains three `data-action` buttons and one `data-panel="open-project"` button; app renders without layout overflow at default sidebar width

---

- U2. **Export file-tree CRUD functions and update initFileTree**

**Goal:** Expose `openFolder`, `handleNewFile`, `handleNewFolder`, `refreshDirectory` as named exports; remove the now-unused `openFolderBtn` parameter from `initFileTree`.

**Requirements:** R1–R5

**Dependencies:** None (can run in parallel with U1)

**Files:**
- Modify: `src/file-tree.ts`

**Approach:**
- Add `export` to `openFolder`, `handleNewFile`, `handleNewFolder`, `refreshDirectory`.
- Remove the `openFolderBtn: HTMLElement` second parameter from `initFileTree` and delete the `openFolderBtn.addEventListener("click", openFolder)` line inside it.
- No other signature or behavioural changes; all logic remains identical.

**Patterns to follow:**
- Existing export block at `src/file-tree.ts:649–659` (`getActivePath`, `setActivePath`, `getWorkspaceRoot`)

**Test scenarios:**
- Happy path: `handleNewFile(rootDir, true)` creates an untitled file in the root directory and triggers inline rename
- Happy path: `handleNewFolder(rootDir, true)` creates an untitled folder and triggers inline rename
- Happy path: `refreshDirectory(rootDir)` reloads tree data and re-renders without losing expanded state
- Edge case: `handleNewFile` called when `rootDir` is null — function returns early without error (existing guard in CRUD handlers)
- Edge case: `handleNewFile` when "untitled" already exists — falls through to "untitled-1", "untitled-2", … (existing retry loop)

**Verification:**
- TypeScript compilation passes (`tsc --noEmit`); all four functions are importable from `src/file-tree.ts`; `initFileTree` signature no longer includes `openFolderBtn`

---

- U3. **Wire toolbar buttons and activity bar Open Project**

**Goal:** Connect the new HTML buttons to their backing functions; update `activity-bar.ts` to support the Open Project action; remove the stale `openFolderBtn` argument from the `initFileTree` call.

**Requirements:** R1–R5

**Dependencies:** U1, U2

**Files:**
- Modify: `src/activity-bar.ts`
- Modify: `src/main.ts`

**Approach:**
- In `activity-bar.ts`: add `'open-project'` to the `PanelName` union type; add an `onOpenProject?: () => void` parameter to `initActivityBar` (alongside the existing `settingsToggleCallback` pattern); in the click handler, add a branch for `panel === 'open-project'` that calls `onOpenProject?.()`.
- In `main.ts` `DOMContentLoaded`:
  - Update `initFileTree` call: remove the second argument (`openFolderBtn`).
  - Pass `onOpenProject: openFolder` to `initActivityBar` (import `openFolder` from `./file-tree`).
  - Query the three sidebar toolbar buttons by `data-action` and attach click listeners: `new-file` → `handleNewFile(getWorkspaceRoot() ?? '', true)`, `new-folder` → `handleNewFolder(getWorkspaceRoot() ?? '', true)`, `refresh` → `{ const root = getWorkspaceRoot(); if (root) refreshDirectory(root); }`.
  - Import the four new exports from `./file-tree`.

**Patterns to follow:**
- `setSettingsToggleCallback` / `settingsToggleCallback` pattern in `src/activity-bar.ts` — exact model for `onOpenProject`
- `initFileTree` call at `src/main.ts:415–458` for the updated call site

**Test scenarios:**
- Happy path: clicking New File button with an open project creates an untitled file at root and enters inline rename
- Happy path: clicking New Folder does the same for a directory
- Happy path: clicking Refresh reloads the tree; a file added externally appears after refresh
- Happy path: clicking Open Project triggers the folder picker dialog
- Happy path: Covers AE2 — no tree item selected, project open, New File clicked → file at root, inline rename active; Refresh after rename → final name appears in tree
- Edge case: New File / New Folder clicked when no project is open (`getWorkspaceRoot()` returns null) — buttons do nothing (guard added in click handler)

**Verification:**
- All three toolbar buttons perform their actions; Open Project opens the folder picker; TypeScript compilation passes with `PanelName` union extended to include `'open-project'`

---

- U4. **Mermaid diagram rendering**

**Goal:** Install mermaid.js and render Mermaid fenced code blocks as diagrams in the preview pane.

**Requirements:** R6, R7

**Dependencies:** None (independent of U1–U3)

**Files:**
- Modify: `package.json` (+ `package-lock.json` after `npm install mermaid`)
- Modify: `src/preview.ts`

**Approach:**
- Run `npm install mermaid` to add the dependency.
- In `preview.ts`: import mermaid at the top; call `mermaid.initialize({ startOnLoad: false, theme: 'dark' })` once at module load (outside any function).
- In `updatePreview`, after `previewEl.innerHTML = html` (and before `onUpdateCallback?.()`):
  - Query all `code.language-mermaid` inside `previewEl`.
  - For each: read `element.textContent` (browser-decoded), create `<div class="mermaid">text</div>`, replace the parent `<pre>` with the new div, collect the div.
  - If any divs were created, call `await mermaid.run({ nodes: collectedDivs })`. Collect the full array before calling — do not invoke `mermaid.run()` per-iteration; pass all nodes in a single call so mermaid can batch its rendering.
- The empty-content early-return branch (placeholder text) is unaffected — no mermaid elements exist there.

**Patterns to follow:**
- `updatePreview` structure in `src/preview.ts:11–23`

**Test scenarios:**
- Happy path: a markdown file containing a ` ```mermaid ` block renders a diagram (SVG) in the preview, not raw code
- Happy path: Covers R7 — editing the mermaid source live updates the diagram on the next preview refresh
- Happy path: a file with no mermaid blocks renders normally (no mermaid.run call; no regression)
- Edge case: a mermaid block with invalid syntax — mermaid.js renders an error message in place of the diagram; no JS exception propagates to crash the preview
- Edge case: multiple mermaid blocks in one file — all render independently
- Edge case: switching between files — diagrams from a previous file do not bleed into the next

**Verification:**
- Opening a `.md` file with a valid mermaid diagram shows an SVG in the preview; editing it live re-renders; opening a file without mermaid blocks shows no regression

---

- U5. **Editor panel toggle**

**Goal:** Add a toggle button and keyboard shortcut to show/hide the editor pane for full-width reading.

**Requirements:** R8–R11

**Dependencies:** None — the toggle button is created dynamically in `main.ts` (no `index.html` change needed for U5); `#tab-bar` already exists in the current HTML

**Files:**
- Modify: `src/main.ts`
- Modify: `src/styles.css`

**Approach:**
- In `main.ts` `DOMContentLoaded`, after `initTabBar`: create a `<button id="editor-toggle-btn" title="Toggle editor">` with a 16×16 SVG icon; append it to `#tab-bar` (or set `tabBar.appendChild(btn)`).
- Add a `toggleEditorPane()` function (module-level) that implements the state machine from the High-Level Technical Design section above: saves `editorPane.style.flex` + `previewPane.style.flex`, toggles `display: none` on both `#editor-pane` and `#divider`, sets `previewPane.style.flex = "1"` when hidden, restores saved flex values when re-shown. Tracks state in a `let editorVisible = true` module-level boolean.
- No additional guard in `setupDivider()` is needed: the toggle sets `divider.style.display = "none"`, which makes the divider non-interactive and prevents the `mousedown` that initiates drag — `isResizing` cannot become true while the divider is hidden, so `document.mousemove` is already a no-op.
- In `setupKeyboardShortcuts`, add: `else if (mod && e.code === "Backslash") { e.preventDefault(); toggleEditorPane(); }` (use `e.code` for locale safety).
- Wire `editor-toggle-btn` click to `toggleEditorPane()`.
- In `src/styles.css`, add `#editor-toggle-btn` rule: `margin-left: auto; flex-shrink: 0` positioning; size and hover style matching `.format-btn` or `#open-folder-btn` pattern.

**Patterns to follow:**
- `activity-bar.ts` sidebar hide/show with width preservation — exact model for flex-ratio save/restore
- `setupKeyboardShortcuts` in `src/main.ts:342–360` — add as another `else if` branch
- `setupDivider` in `src/main.ts:292–325` — add guard at top of `mousemove` handler

**Test scenarios:**
- Happy path: Covers AE1 — editor and preview at 50/50; click toggle → editor and divider hidden, preview full width; click toggle again → editor and divider reappear, split restored
- Happy path: Cmd+\\ (Mac) and Ctrl+\\ (Win/Linux) trigger the toggle
- Happy path: toggle while a file is open — buffer contents, dirty state, and cursor position are unaffected
- Edge case: dragging the divider while editor is hidden — no layout change occurs (divider is `display: none`, non-interactive)
- Edge case: toggling on a file with active mermaid diagrams — diagrams re-render correctly when editor is re-shown (mermaid.run fires on the next content update)
- Edge case: toggling before any file is opened (empty state visible) — no crash; toggle button is present but inert or updates correctly

**Verification:**
- Covers AE1: toggle hides editor and expands preview; second toggle restores exact split ratio; Cmd+\\ keyboard shortcut works on Mac; divider drag while hidden does not change layout

---

## System-Wide Impact

- **Interaction graph:** `setupDivider()` in `main.ts` reads `editorPane.style.flex`/`previewPane.style.flex` — the new toggle must save and restore these values, otherwise a subsequent drag will use stale ratios. When the editor is hidden, `divider.style.display = "none"` makes the drag handle non-interactive, so no mousemove-based flex calculation can fire.
- **Error propagation:** Mermaid rendering errors (invalid diagram syntax) are caught and rendered by mermaid.js itself as in-diagram error messages; they must not throw uncaught exceptions into `updatePreview`.
- **State lifecycle risks:** Mermaid SVGs are injected into `previewEl.innerHTML` on each update — since `previewEl.innerHTML` is replaced wholesale each time, there is no risk of duplicate diagram IDs accumulating.
- **Unchanged invariants:** The tab-bar tab list, scroll-sync, buffer management, and all existing keyboard shortcuts are unchanged. The activity bar's explorer/search/settings toggle behavior is unchanged.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| mermaid.js bundle size (~1 MB minified) increases app load time | Acceptable for now; dynamic import deferred to follow-up if startup becomes noticeable |
| `mermaid.run()` on invalid syntax throws an unhandled promise rejection | Wrap the `mermaid.run()` call in a `try/catch` that logs and swallows errors |
| Flex ratio restore after toggle doesn't match original if user dragged the divider in between | Saved ratio is from the last pre-hide state; this is correct expected behaviour — document in toggle tooltip |
| `e.code === "Backslash"` may conflict with a future native menu shortcut | Check `src-tauri/tauri.conf.json` menu config before finalising; no current conflict found |

---

## Deferred / Open Questions

### From 2026-05-03 review

- **handleNewFile / handleNewFolder require a targetPath the toolbar cannot supply** — U2 (Export functions) (P0, feasibility, confidence 75)

  Both functions take a `targetPath: string` parameter identifying where the new item goes. Toolbar buttons have no selection context — clicking New File when no tree item is selected gives the handler no path to use. The U3 approach passes `getWorkspaceRoot() ?? ''` as a fallback, but this doesn't address the case when a subdirectory is selected and the user expects the new item inside that dir. Decide how the toolbar resolves the target path from current tree selection state.

  <!-- dedup-key: section="u2 export functions" title="handleneefile  handleneefolder require a targetpath the toolbar cannot supply" evidence="Both functions take a targetPath string parameter identifying where the new item goes" -->

- **Inline rename missing cancel, confirm, collision, and empty-name states** — U2 (Export functions) (P0, design-lens, confidence 75)

  The plan specifies that new files/folders immediately enter inline rename but defines no terminal states: pressing Escape (cancel and delete the placeholder?), pressing Enter (confirm), entering a name that already exists (collision handling), or blurring with an empty name. Without these, implementers will invent inconsistent behaviors for each case.

  <!-- dedup-key: section="u2 export functions" title="inline rename missing cancel confirm collision and emptyname states" evidence="The plan specifies that new filesfolders immediately enter inline rename but defines no terminal states" -->

- **New File/Folder selected-directory resolution logic undefined** — U2/U3 (P1, design-lens, adversarial, confidence 100)

  R3 and R4 say new items are created "inside the selected directory when one is," but the plan does not define what counts as "selected": if a file is selected (not a dir), is the parent dir used, or does the new item go to root? The ambiguity will produce inconsistent behavior between New File and New Folder, and between clicking a file vs. a dir in the tree.

  <!-- dedup-key: section="u2u3" title="new filefolder selecteddirectory resolution logic undefined" evidence="R3 and R4 say new items are created inside the selected directory when one is but the plan does not define what" -->

- **Editor toggle in empty state leaves editor permanently hidden on first file open** — U5 (Editor toggle) (P1, feasibility, confidence 75)

  `showEmptyState()` sets `#content-row` to `display: none`; the toggle sets `editorPane.style.display = "none"` independently. If the user hides the editor while the empty state is active and then opens a file, `showContentArea()` restores `#content-row` but does not know to restore `editorPane` — it stays hidden because the toggle set it, not the empty-state logic.

  <!-- dedup-key: section="u5 editor toggle" title="editor toggle in empty state leaves editor permanently hidden on first file open" evidence="showEmptyState sets contentrow to display none the toggle sets editorPane.style.display to none independently" -->

- **Mermaid error state content and placement unspecified** — U4 (Mermaid) (P1, design-lens, confidence 75)

  U4 test scenarios include "mermaid.js renders an error message in place of the diagram" but the plan provides no spec for that UI — where the error appears, what it says, or how it's styled against the preview background. Without a spec, the rendered error may be invisible or confusing.

  <!-- dedup-key: section="u4 mermaid" title="mermaid error state content and placement unspecified" evidence="U4 test scenarios include mermaid.js renders an error message in place of the diagram but the plan provides no spec" -->

- **Refresh behavior with unsaved editor buffer undefined** — U3/U5 (P1, design-lens, confidence 75)

  Clicking Refresh reloads the file tree from disk. If the editor has unsaved changes to the currently-open file, the plan does not define whether Refresh should leave the buffer untouched, warn the user, or discard the changes. An implementer will make an arbitrary choice.

  <!-- dedup-key: section="u3u5" title="refresh behavior with unsaved editor buffer undefined" evidence="Clicking Refresh reloads the file tree from disk. If the editor has unsaved changes" -->

- **Editor toggle button active/inactive visual state unspecified** — U5 (Editor toggle) (P1, design-lens, confidence 75)

  U5 adds `#editor-toggle-btn` with styling that matches `.format-btn` or `#open-folder-btn`, but neither pattern includes an "active" (editor-hidden) state. Without a visual state spec the button looks the same whether the editor is visible or not, giving users no affordance that its state has changed.

  <!-- dedup-key: section="u5 editor toggle" title="editor toggle button activeinactive visual state unspecified" evidence="U5 adds editortogglebutton with styling that matches formatbtn or openfolderbtn but neither pattern includes an active state" -->

- **`refreshDirectory` expansion-preservation assumption unverified against current code** — U1/U3 (P2, adversarial, confidence 75)

  R5 says Refresh preserves expanded folders. The plan states this as an existing capability of `refreshDirectory` without verifying that the current implementation actually tracks and restores expanded state. If it does not, R5 will silently fail and the plan will need an additional implementation step.

  <!-- dedup-key: section="u1u3" title="refreshdirectory expansionpreservation assumption unverified against current code" evidence="R5 says Refresh preserves expanded folders. The plan states this as an existing capability" -->

- **Repeated `mermaid.run()` without state reset may fail silently in mermaid v10+** — U4 (Mermaid) (P2, adversarial, confidence 75)

  mermaid v10+ attaches render state to diagram elements. Calling `mermaid.run()` repeatedly on freshly-replaced DOM nodes (the `innerHTML` replacement pattern) may conflict with cached state from prior renders, producing diagrams that fail silently without throwing. Confirm whether `mermaid.initialize()` needs to be re-called between renders or whether fresh DOM nodes passed to `mermaid.run()` are safe.

  <!-- dedup-key: section="u4 mermaid" title="repeated mermaidrun without state reset may fail silently in mermaid v10" evidence="mermaid v10 attaches render state to diagram elements. Calling mermaid.run repeatedly on freshlyreplaced DOM nodes" -->

- **Toolbar button behavior when no project is open not specified** — U2 (Export functions) (P2, feasibility, confidence 75)

  R3/R4 define placement relative to "project root" but say nothing about the case where no project is open. The U3 click handler passes `getWorkspaceRoot() ?? ''` which silently no-ops, but it is unspecified whether New File/Folder buttons should be visually disabled, trigger an Open Folder prompt, or simply do nothing. An implementer will pick one arbitrarily.

  <!-- dedup-key: section="u2 export functions" title="toolbar button behavior when no project is open not specified" evidence="R3R4 define placement relative to project root but say nothing about the case where no project is open" -->

- **Cmd+\\ shortcut collision with existing shortcuts not checked** — U5 (Editor toggle) (P2, design-lens, confidence 75)

  The plan notes "no current conflict found" against the Tauri menu config but does not document a check of the existing `setupKeyboardShortcuts` listener branches. If another `else if` branch already intercepts `mod + Backslash`, the toggle shortcut will silently not fire. Verify against `src/main.ts:342–360` before finalizing.

  <!-- dedup-key: section="u5 editor toggle" title="cmd\\ shortcut collision with existing shortcuts not checked" evidence="The plan notes no current conflict found against the Tauri menu config but does not document a check" -->

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-03-ui-improvements-requirements.md](docs/brainstorms/2026-05-03-ui-improvements-requirements.md)
- Related code: `src/file-tree.ts`, `src/activity-bar.ts`, `src/preview.ts`, `src/main.ts`
- mermaid.js docs: https://mermaid.js.org/config/usage.html
