---
date: 2026-04-08
topic: scroll-sync
---

# Editor-Preview Scroll Synchronization

## Problem Frame

Users editing markdown in the split-pane editor cannot easily correlate their cursor position with the rendered preview. The editor and preview panes scroll independently, forcing users to manually scroll the preview to find the section they're editing. This breaks flow, especially with longer documents.

## Requirements

**Scroll Behavior**
- R1. When the user scrolls the editor, the preview pane scrolls to show the corresponding rendered content.
- R2. Sync is based on source-line mapping: the renderer emits line-number metadata on block-level HTML elements, and the frontend uses these to find the correct scroll target.
- R3. Scrolling is visually smooth (not jumpy). CSS `scroll-behavior: smooth` should be evaluated first; a custom JS interpolation loop is only warranted if CSS proves insufficient.

**Rendering Integration**
- R4. The markdown renderer emits source-position metadata on block-level output elements. Comrak's built-in `options.render.sourcepos = true` (which adds `data-sourcepos` attributes) should be used rather than inventing a custom attribute scheme.
- R5. Adding source-position attributes does not degrade rendering performance or change the visual output of the preview.
- R6. Source-position metadata must survive the `highlight_code_blocks` post-processing step, which currently replaces `<pre><code>` blocks with `<div class="highlighted-code">` wrappers and strips any attributes on the original elements. The highlighting pass must propagate the `data-sourcepos` attribute onto its output wrapper.

**Edge Cases**
- R7. Scroll sync handles content where editor and preview heights diverge significantly (e.g., images, large code blocks, tables) by interpolating between nearest mapped elements rather than using raw percentage.
- R8. When the editor is scrolled to the very top or bottom, the preview snaps to its own top or bottom respectively.
- R9. Scroll sync gracefully handles innerHTML replacement during debounced re-renders: after the preview DOM is replaced, the scroll position is re-applied based on the current editor scroll state.

## Success Criteria

- Scrolling the editor keeps the preview aligned to the corresponding content, accurate to within ~1 block element.
- Preview scroll updates within ~50ms of editor scroll events on documents up to ~1000 lines.
- No regressions in existing preview rendering or editor behavior.

## Scope Boundaries

- **Not bidirectional:** Scrolling the preview does not scroll the editor.
- **No click-to-scroll:** Clicking a preview element does not jump the editor cursor.
- **No inline element mapping:** Only block-level elements (headings, paragraphs, code blocks, lists, tables, blockquotes) are mapped.
- **Frontend-only sync:** Scroll sync reads pre-rendered DOM attributes and does not trigger IPC or re-rendering.

## Key Decisions

- **Source-map over proportional sync:** Proportional (percentage-based) sync is simpler but inaccurate when editor and preview content heights differ. Source-map approach handles mixed content (images, code blocks, tables) much better.
- **Unidirectional (editor -> preview):** Avoids feedback loops and implementation complexity. Users primarily navigate from the editor.
- **Use Comrak's built-in `sourcepos` option:** Avoids custom attribute injection. The `data-sourcepos` format (`start_line:start_col-end_line:end_col`) is parsed on the frontend to extract the start line.

## Dependencies / Assumptions

- Comrak 0.52's `options.render.sourcepos = true` emits `data-sourcepos` on block-level elements (verified capability).
- CodeMirror 6 exposes scroll position and viewport line information via `EditorView` APIs (`viewport`, `lineBlockAtHeight`, etc.).

## Outstanding Questions

### Deferred to Planning
- [Affects R6][Technical] How should `highlight_code_blocks` propagate `data-sourcepos` to its `<div class="highlighted-code">` wrapper? Regex extraction from the `<pre>` tag, or switch to AST-based highlighting?
- [Affects R1][Technical] What is the best integration point for reading editor scroll state -- a CodeMirror `scrollHandler` extension inside `editor.ts`, or an external scroll listener on `.cm-scroller`?
- [Affects R9][Technical] Should scroll position be re-applied synchronously after innerHTML replacement, or via a MutationObserver / requestAnimationFrame callback?

## Next Steps

-> `/ce:plan` for structured implementation planning
