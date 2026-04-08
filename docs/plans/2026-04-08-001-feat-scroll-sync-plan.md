---
title: "feat: Add editor-preview scroll synchronization"
type: feat
status: active
date: 2026-04-08
origin: docs/brainstorms/scroll-sync-requirements.md
---

# feat: Add editor-preview scroll synchronization

## Overview

Add unidirectional scroll synchronization from the CodeMirror editor to the markdown preview pane. When the user scrolls the editor, the preview automatically scrolls to show the corresponding rendered content. Uses Comrak's built-in `data-sourcepos` attribute to map editor line numbers to preview DOM elements.

## Problem Frame

Users editing markdown in the split-pane editor cannot correlate their cursor position with the rendered preview. The two panes scroll independently, breaking flow on longer documents. (see origin: `docs/brainstorms/scroll-sync-requirements.md`)

## Requirements Trace

- R1. Editor scroll drives preview scroll to corresponding content
- R2. Sync uses source-line mapping via `data-sourcepos` attributes
- R3. Smooth scrolling (CSS `scroll-behavior: smooth` first)
- R4. Comrak emits `data-sourcepos` via `options.render.sourcepos = true`
- R5. No rendering performance degradation or visual change
- R6. `data-sourcepos` survives `highlight_code_blocks` post-processing
- R7. Interpolation between mapped elements for divergent heights
- R8. Snap to top/bottom at extremes
- R9. Scroll position re-applied after innerHTML replacement

## Scope Boundaries

- Not bidirectional — preview scroll does not affect editor
- No click-to-scroll from preview to editor
- No inline element mapping — block-level only
- Frontend-only sync — no IPC on scroll events

## Context & Research

### Relevant Code and Patterns

- `src-tauri/src/markdown.rs` — Comrak rendering + `highlight_code_blocks` post-processing. Uses string manipulation, not an HTML parser. `highlight_code_blocks` searches for `<pre><code` and replaces matches with `<div class="highlighted-code">` wrappers.
- `src/editor.ts` — CodeMirror 6 setup. `EditorView` stored as module-private `view`. Exports `initEditor`, `setContent`, `getContent`. Change listener debounced at 150ms.
- `src/preview.ts` — 19 lines. `updatePreview` does full `innerHTML` replacement on `#preview-content` after each IPC call.
- `src/main.ts` — Orchestration. Wires editor changes to `updatePreview`. Sets up divider, keyboard shortcuts.
- `index.html` — `#preview-pane` (scrollable container, `overflow-y: auto`) contains `#preview-content` (innerHTML target).
- `src/styles.css` — No `scroll-behavior` set anywhere. `.cm-scroller` has `overflow: auto` and `line-height: 1.6`.

### Institutional Learnings

No `docs/solutions/` directory exists. This is greenfield work.

## Key Technical Decisions

- **Use `options.render.sourcepos = true`**: One-line Rust change. Comrak adds `data-sourcepos="start_line:start_col-end_line:end_col"` on block elements. Parse `start_line` on the frontend. Avoids AST walk or custom formatter. (see origin)
- **New `src/scroll-sync.ts` module**: Follows the codebase convention of one concern per file. Keeps scroll logic isolated from editor and preview modules.
- **Export scroll subscription from `editor.ts`**: Add `onEditorScroll(callback)` that registers a listener on `view.scrollDOM` and returns the visible top line via CodeMirror's viewport API. Follows the existing pattern of exporting functions, not the raw `EditorView`.
- **`requestAnimationFrame` for scroll timing**: After `innerHTML` replacement, use rAF to ensure the browser has laid out new content before querying element positions. Scroll events themselves use rAF throttling (not setTimeout debounce) since scroll fires at high frequency.
- **Regex extraction for sourcepos in `highlight_code_blocks`**: The function already does string-level HTML surgery. Extract `data-sourcepos="..."` from the `<pre>` tag and inject it onto the `<div class="highlighted-code">` wrapper. Consistent with existing pattern. Note: `extract_code_content` must also be updated since it uses `find('>')` to skip tags — attributes on `<pre>` shift these positions.
- **`getBoundingClientRect` for position measurement**: Use `element.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop` to compute element positions relative to the scroll container, rather than relying on `offsetTop` (which may be relative to a different offset parent).
- **Two scroll contexts — smooth vs. instant**: User-initiated scroll sync (editor scrolling) uses `scrollTo({ behavior: 'smooth' })`. Re-render re-sync (after innerHTML replacement) uses instant `scrollTop` assignment to avoid a visible "chasing" effect during typing. Do not use CSS `scroll-behavior: smooth` globally on `#preview-pane` — it would make re-render re-sync animate instead of snapping.

## Open Questions

### Resolved During Planning

- **How does `highlight_code_blocks` propagate `data-sourcepos`?** With `sourcepos` enabled, `<pre>` becomes `<pre data-sourcepos="...">`. The function's search pattern `<pre><code` must be updated to handle attributes on `<pre>`. Extract the `data-sourcepos` value via regex and add it to the output `<div>`.
- **What is the scroll integration point?** Export `onEditorScroll(callback)` from `editor.ts`. Internally, attach a `scroll` event listener to `view.scrollDOM` (the `.cm-scroller` element). Use `view.lineBlockAtHeight(scrollTop)` to get the top visible line.
- **How is scroll re-applied after re-render?** `initPreview` accepts an `onUpdate` callback (same pattern as `initEditor`'s `onChange`). After `innerHTML` assignment, `updatePreview` calls the callback. The scroll-sync module's re-sync function uses `requestAnimationFrame` to query the new DOM and sets `scrollTop` directly (instant, not smooth) to avoid chasing during typing.

### Deferred to Implementation

- **Exact `data-sourcepos` regex pattern**: Depends on seeing actual Comrak output with sourcepos enabled. Implement and verify against real HTML.
- **Whether `scrollTo({ behavior: 'smooth' })` feels satisfactory for R3**: Try JS-based smooth scroll for user-initiated sync first. If it feels janky at large distances, consider easing or clamping. CSS `scroll-behavior: smooth` is intentionally not used (conflicts with instant re-render re-sync).

## Implementation Units

- [ ] **Unit 1: Enable `sourcepos` in Comrak renderer**

  **Goal:** Add `data-sourcepos` attributes to all block-level elements in rendered HTML.

  **Requirements:** R4, R5

  **Dependencies:** None

  **Files:**
  - Modify: `src-tauri/src/markdown.rs`

  **Approach:**
  - Add `options.render.sourcepos = true` to the `render()` function's options
  - This is a single-line change: `options.render.sourcepos = true;`
  - Verify the output HTML contains `data-sourcepos` on `<p>`, `<h1>`–`<h6>`, `<pre>`, `<table>`, `<blockquote>`, `<ul>`, `<ol>` elements

  **Patterns to follow:**
  - Existing options setup in `render()` (lines 11–17 of `src-tauri/src/markdown.rs`)

  **Test scenarios:**
  - Happy path: Render markdown with headings, paragraphs, and code blocks → output HTML contains `data-sourcepos` attributes on each block element with correct line numbers
  - Happy path: Render markdown with tables, blockquotes, and lists → `data-sourcepos` present on those elements too
  - Edge case: Empty input → no crash, returns empty or minimal HTML

  **Verification:**
  - `cargo build` succeeds. Preview renders identically to before (visually), but HTML source now contains `data-sourcepos` attributes.

- [ ] **Unit 2: Propagate `data-sourcepos` through `highlight_code_blocks`**

  **Goal:** Ensure code blocks retain their `data-sourcepos` attribute after syntax highlighting post-processing.

  **Requirements:** R6

  **Dependencies:** Unit 1

  **Files:**
  - Modify: `src-tauri/src/markdown.rs`

  **Approach:**
  - With sourcepos enabled, `<pre>` becomes `<pre data-sourcepos="...">`. The current search pattern `<pre><code` will no longer match because there are attributes between `<pre` and `>`.
  - Update `highlight_code_blocks` to search for `<pre` (without assuming `><code` immediately follows) and handle the `data-sourcepos` attribute between `<pre` and `>`.
  - Extract `data-sourcepos="..."` from the `<pre ...>` tag via string search.
  - Include it on the output: `<div class="highlighted-code" data-sourcepos="...">`.
  - Update `extract_code_content` — it currently uses `find('>')` twice to skip past `<pre>` and `<code>` tags. With attributes on `<pre>`, the first `>` is no longer immediately after `<pre`. The function must find the closing `>` of the full `<pre ...>` tag (which may contain `data-sourcepos` and other attributes) before looking for the `<code>` tag's `>`.
  - When highlighting fails (fallback path), preserve the original block unchanged — it already has the attribute.
  - Note: The `data-sourcepos` value format is `"line:col-line:col"` and never contains `>`, so `find('>')` remains safe for finding the end of the `<pre>` tag's attributes.

  **Patterns to follow:**
  - Existing string manipulation in `extract_language()` and `extract_code_content()` for attribute parsing

  **Test scenarios:**
  - Happy path: Code block with language → highlighted output `<div>` carries `data-sourcepos` from original `<pre>`
  - Happy path: Code block without language (no highlighting) → original `<pre>` block preserved with `data-sourcepos` intact
  - Edge case: Code block with both `data-sourcepos` and `class` attributes on `<pre>` → both parsed correctly, `data-sourcepos` propagated
  - Edge case: Multiple code blocks in one document → each `<div>` gets its own correct `data-sourcepos`

  **Verification:**
  - Render markdown containing fenced code blocks. Inspect the HTML output — each highlighted code block's `<div class="highlighted-code">` wrapper has the correct `data-sourcepos`.

- [ ] **Unit 3: Export editor scroll subscription**

  **Goal:** Expose a way for other modules to subscribe to editor scroll events and get the current top visible line.

  **Requirements:** R1, R2

  **Dependencies:** None (can be done in parallel with Units 1–2)

  **Files:**
  - Modify: `src/editor.ts`

  **Approach:**
  - Add an exported function `onEditorScroll(callback: (topLine: number) => void): void`
  - Inside, guard on `view` being null (return early if not initialized). Attach a `scroll` event listener to `view.scrollDOM`
  - Use `view.lineBlockAtHeight(view.scrollDOM.scrollTop)` to determine the top visible line block
  - Call `callback(lineBlock.from)` — where `from` is the document position, which can be converted to a 1-based line number via `view.state.doc.lineAt(from).number`
  - This function should be called after `initEditor` (the `view` is available after init)

  **Patterns to follow:**
  - Existing export pattern in `editor.ts`: module-private `view`, exported functions that operate on it

  **Test scenarios:**
  - Happy path: Scroll the editor → callback fires with the correct 1-based line number matching the top visible line
  - Edge case: Call `onEditorScroll` before `initEditor` → no crash (guard on `view` being null)
  - Edge case: Rapid scrolling → callback fires on each scroll event (no debounce here — throttling is the scroll-sync module's job)

  **Verification:**
  - Add a temporary `console.log` in the callback. Scroll the editor. Console shows correct line numbers updating as you scroll.

- [ ] **Unit 4: Create scroll-sync module**

  **Goal:** Implement the core scroll synchronization logic that maps editor line numbers to preview DOM positions.

  **Requirements:** R1, R2, R7, R8

  **Dependencies:** Unit 2 (sourcepos in HTML), Unit 3 (scroll subscription)

  **Files:**
  - Create: `src/scroll-sync.ts`

  **Approach:**
  - Export `initScrollSync(previewPane: HTMLElement): void`
  - On initialization, subscribe to editor scroll via `onEditorScroll`
  - Throttle with `requestAnimationFrame` — store pending rAF ID, cancel previous if still pending
  - On each scroll callback:
    1. If `topLine <= 1`, scroll preview to top (R8)
    2. Query all `[data-sourcepos]` elements in `previewPane`
    3. Parse `data-sourcepos` to extract `start_line` (first number before the colon)
    4. Find the two elements that bracket `topLine` (last element with `start_line <= topLine` and first with `start_line > topLine`)
    5. Interpolate: compute each element's position via `element.getBoundingClientRect().top - previewPane.getBoundingClientRect().top + previewPane.scrollTop`, then calculate the proportional scroll position between the two bracketing elements (R7)
    6. For user-initiated scroll: use `previewPane.scrollTo({ top, behavior: 'smooth' })`. For re-render re-sync: set `previewPane.scrollTop` directly (instant)
  - Handle bottom: if editor is scrolled to end, scroll preview to end (R8)

  **Patterns to follow:**
  - Module pattern from `preview.ts` and `sidebar.ts`: module-scoped state, exported init function
  - Debounce pattern from `editor.ts` (but use rAF instead of setTimeout)

  **Test scenarios:**
  - Happy path: Editor at line 1 → preview scrolled to top
  - Happy path: Editor at line 50 (middle of doc) → preview shows content corresponding to line 50
  - Happy path: Editor scrolled to bottom → preview scrolled to bottom
  - Edge case: Editor between two mapped elements (e.g., line 25, mapped elements at lines 20 and 30) → preview interpolates to proportional position between those elements
  - Edge case: Document with large code block (5 editor lines → tall highlighted block) → preview position tracks the code block's start, not a proportional offset
  - Edge case: Document with zero `data-sourcepos` elements (empty or placeholder) → no crash, no scroll action
  - Edge case: Very short document where preview doesn't scroll → no-op, no errors

  **Verification:**
  - Open a document with varied content (headings, paragraphs, code, tables). Scroll the editor. Preview tracks the same section of content. Verify interpolation by scrolling to a position between two headings — preview should be proportionally between those same headings.

- [ ] **Unit 5: Wire up scroll sync and add smooth scrolling**

  **Goal:** Connect the scroll-sync module to the app lifecycle and enable smooth scrolling. Handle re-render scroll restoration.

  **Requirements:** R3, R9

  **Dependencies:** Unit 4

  **Files:**
  - Modify: `src/main.ts`
  - Modify: `src/preview.ts`
  - Modify: `src/styles.css`

  **Approach:**
  - Do NOT add `scroll-behavior: smooth` to `#preview-pane` in CSS — it would make re-render re-sync animate instead of snapping instantly. Smooth scrolling is handled programmatically via `scrollTo({ behavior: 'smooth' })` only for user-initiated scroll sync.
  - In `src/main.ts`: Import and call `initScrollSync(previewPane)` during `DOMContentLoaded`, after `initPreview` and `initEditor`.
  - In `src/preview.ts`: Accept an optional `onUpdate` callback parameter in `initPreview(container, onUpdate?)`. After `previewEl.innerHTML = html`, call `onUpdate?.()`. This follows the same callback-parameter pattern as `initEditor(container, onChange)` — no pub/sub abstraction needed for a single consumer.
  - In `src/main.ts`: Pass the scroll-sync module's re-sync function as the `onUpdate` callback to `initPreview`. The re-sync uses `requestAnimationFrame` to defer until after layout, then sets `scrollTop` directly (instant, no smooth animation) to avoid the "chasing" effect during typing.

  **Patterns to follow:**
  - Initialization ordering in `main.ts` `DOMContentLoaded` handler
  - Callback pattern used in `initEditor(container, onChange)`

  **Test scenarios:**
  - Happy path: App starts, scroll sync is active from first load with welcome content
  - Happy path: Type in editor, preview re-renders → scroll position maintained (not jumping to top)
  - Happy path: Preview scroll animates smoothly (not instant jump) when editor is scrolled
  - Integration: Edit a line in the middle of the document → debounce fires → preview re-renders → rAF fires → scroll position re-applied to match editor's current scroll state
  - Edge case: Rapid typing while scrolled to middle of document → preview doesn't flicker or jump during re-renders
  - Edge case: Open a new file → preview and editor both start at top

  **Verification:**
  - Open a long markdown file. Scroll the editor — preview follows smoothly. Type a character — preview re-renders without losing scroll position. Open a different file — both panes reset to top.

## System-Wide Impact

- **Interaction graph:** Scroll sync adds a new data path: editor scroll events → scroll-sync module → preview pane `scrollTop`. The existing path (editor change → debounce → IPC → preview innerHTML) is modified to include a post-update hook that triggers scroll re-application.
- **Error propagation:** Scroll sync is purely additive UI behavior. If it fails, the editor and preview still work independently — the worst case is scroll sync stops working, not a crash.
- **State lifecycle risks:** The `innerHTML` replacement in `updatePreview` destroys all preview DOM state. The rAF-based re-sync after replacement handles this. No persistent state to corrupt.
- **Unchanged invariants:** File open/save, sidebar, keyboard shortcuts, and the rendering pipeline output (beyond adding `data-sourcepos` attributes) are not changed.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `highlight_code_blocks` search pattern breaks with sourcepos attributes on `<pre>` | Unit 2 explicitly updates the search pattern. Test with actual Comrak output. |
| `scrollTo({ behavior: 'smooth' })` feels laggy on large scroll jumps | Deferred to implementation — evaluate whether large-distance scrolls need easing or clamping. CSS `scroll-behavior: smooth` is not used (conflicts with instant re-render re-sync) |
| `requestAnimationFrame` timing after innerHTML may not be sufficient for layout | If rAF fires before layout completes, use double-rAF (`rAF(() => rAF(() => sync()))`) as a fallback |
| Comrak 0.52 `sourcepos` output format differs from expected | Verify actual output in Unit 1 before building the parser in Unit 4 |

## Sources & References

- **Origin document:** [scroll-sync-requirements.md](docs/brainstorms/scroll-sync-requirements.md)
- Related code: `src-tauri/src/markdown.rs`, `src/editor.ts`, `src/preview.ts`, `src/main.ts`
- Comrak `sourcepos` option: Comrak `RenderOptions::sourcepos` field
- CodeMirror scroll API: `EditorView.scrollDOM`, `lineBlockAtHeight`
