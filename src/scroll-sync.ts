import { onEditorScroll } from "./editor";

let previewPane: HTMLElement | null = null;
let pendingRaf: number | null = null;
let lastTopLine = 1;

export function initScrollSync(pane: HTMLElement): void {
  previewPane = pane;

  onEditorScroll((topLine) => {
    lastTopLine = topLine;
    if (pendingRaf !== null) return;
    pendingRaf = requestAnimationFrame(() => {
      pendingRaf = null;
      syncPreviewToLine(lastTopLine, true);
    });
  });
}

export function resyncScroll(): void {
  if (!previewPane) return;
  requestAnimationFrame(() => {
    syncPreviewToLine(lastTopLine, false);
  });
}

function syncPreviewToLine(topLine: number, smooth: boolean): void {
  if (!previewPane) return;

  // Snap to top
  if (topLine <= 1) {
    if (smooth) {
      previewPane.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      previewPane.scrollTop = 0;
    }
    return;
  }

  const elements = previewPane.querySelectorAll("[data-sourcepos]");
  if (elements.length === 0) return;

  // Parse sourcepos and find bracketing elements
  let before: { el: Element; line: number } | null = null;
  let after: { el: Element; line: number } | null = null;

  for (const el of elements) {
    const sp = el.getAttribute("data-sourcepos");
    if (!sp) continue;
    const line = parseSourceposLine(sp);
    if (line <= 0) continue;

    if (line <= topLine) {
      before = { el, line };
    } else if (!after) {
      after = { el, line };
      break;
    }
  }

  // Snap to bottom if no element is after the current line
  if (before && !after) {
    const scrollMax = previewPane.scrollHeight - previewPane.clientHeight;
    if (smooth) {
      previewPane.scrollTo({ top: scrollMax, behavior: "smooth" });
    } else {
      previewPane.scrollTop = scrollMax;
    }
    return;
  }

  if (!before) {
    // All elements are after topLine — scroll to top
    if (smooth) {
      previewPane.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      previewPane.scrollTop = 0;
    }
    return;
  }

  // Interpolate between before and after elements
  const beforePos = elementScrollTop(before.el, previewPane);
  const afterPos = after ? elementScrollTop(after.el, previewPane) : previewPane.scrollHeight;
  const lineRange = after ? after.line - before.line : 1;
  const fraction = lineRange > 0 ? (topLine - before.line) / lineRange : 0;
  const targetTop = beforePos + fraction * (afterPos - beforePos);

  if (smooth) {
    previewPane.scrollTo({ top: targetTop, behavior: "smooth" });
  } else {
    previewPane.scrollTop = targetTop;
  }
}

function elementScrollTop(el: Element, container: HTMLElement): number {
  return el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
}

function parseSourceposLine(sp: string): number {
  // Format: "startLine:startCol-endLine:endCol"
  const colon = sp.indexOf(":");
  if (colon <= 0) return 0;
  return parseInt(sp.substring(0, colon), 10) || 0;
}
