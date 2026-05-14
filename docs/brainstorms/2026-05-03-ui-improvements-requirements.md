---
date: 2026-05-03
topic: ui-improvements
---

# UI Improvements: File Tree Toolbar, Mermaid Support, Editor Toggle

## Summary

Three focused UI improvements: a VSCode-style toolbar above the file tree (New File, New Folder, Refresh) with Open Folder promoted to the activity bar; Mermaid diagram rendering in the preview pane; and a toggle to hide the editor pane for full-width reading.

---

## Problem Frame

The file tree currently exposes file creation and folder creation only through the context menu — there is no at-a-glance toolbar for these frequent actions. The single "Open Folder" button in the sidebar header occupies the only available toolbar slot, leaving no room for the additional actions.

The preview pane renders standard GitHub Flavored Markdown but silently drops Mermaid fenced code blocks — a common format for architecture diagrams, flowcharts, and sequence diagrams in technical notes.

The editor pane is always visible alongside the preview. When reading a file rather than writing, the editor occupies half the screen with no way to reclaim that space.

---

## Requirements

**File tree toolbar**

- R1. The sidebar header above the file tree displays three icon buttons: New File, New Folder, and Refresh — replacing the current single Open Folder button in that slot.
- R2. An "Open Project" button is added to the activity bar, exposing the Open Folder action there instead.
- R3. The New File toolbar button creates an untitled file at the project root when no tree item is selected, or inside the selected directory when one is, then immediately starts inline rename.
- R4. The New Folder toolbar button follows the same placement logic as R3 and immediately starts inline rename.
- R5. The Refresh toolbar button reloads the root directory tree from disk, preserving currently expanded folders.

**Mermaid diagram support**

- R6. The preview pane renders Mermaid fenced code blocks (` ```mermaid `) as diagrams rather than as raw code.
- R7. Mermaid diagrams re-render on each live preview update, so edits to a diagram source reflect immediately.

**Editor panel toggle**

- R8. A toggle button in the header area above the editor/preview content shows and hides the editor pane.
- R9. When the editor is hidden, the preview pane expands to fill the full content width and the divider hides.
- R10. When the editor is shown again, the layout returns to the previous split ratio.
- R11. The keyboard shortcut Cmd+\\ (Mac) / Ctrl+\\ (Win/Linux) toggles the editor panel.

---

## Acceptance Examples

- AE1. **Covers R9, R10.** Given the editor and preview are both visible at a 50/50 split, when the user clicks the toggle button, the editor and divider disappear and the preview fills 100% of the content area. When the user clicks the toggle button again, the editor and divider reappear and the split returns to 50/50.
- AE2. **Covers R3, R5.** Given no tree item is selected and a project root is open, when the user clicks New File, an untitled file appears at the root level in an inline rename state. After renaming, clicking Refresh reloads the tree from disk and the new file appears with its final name.

---

## Success Criteria

- Common file actions (new file, new folder, refresh) are reachable without a right-click in every normal working session.
- Mermaid diagrams in Markdown files render visually in the preview pane without any extra user steps.
- The user can switch to a full-width reading view and back without closing or re-opening any files.

---

## Scope Boundaries

- No read-only enforcement — hiding the editor does not lock files against editing; it only reclaims screen space.
- Mermaid rendering in the preview only — no rendering in exported or saved files.
- No custom Mermaid themes or configuration UI.
- The Open Project action in the activity bar is additive; the activity bar's existing explorer toggle (which shows/hides the sidebar) is unchanged.

---

## Key Decisions

- **Mermaid rendered client-side:** The Rust backend (comrak) already emits `<code class="language-mermaid">` blocks; mermaid.js post-processes these in the browser after each preview update. No backend changes needed.
- **Open Project in activity bar:** Rather than a redundant second folder icon in the sidebar header, Open Project moves to the activity bar so the sidebar header slot is fully available for the three toolbar actions.
