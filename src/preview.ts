import { invoke } from "@tauri-apps/api/core";

let previewEl: HTMLElement | null = null;
let onUpdateCallback: (() => void) | null = null;

export function initPreview(container: HTMLElement, onUpdate?: () => void) {
  previewEl = container;
  onUpdateCallback = onUpdate ?? null;
}

export async function updatePreview(markdownText: string) {
  if (!previewEl) return;

  if (!markdownText.trim()) {
    previewEl.innerHTML = '<p style="color: var(--text-muted); font-style: italic;">Start typing to see preview...</p>';
    onUpdateCallback?.();
    return;
  }

  const html = await invoke<string>("parse_markdown", { text: markdownText });
  previewEl.innerHTML = html;
  onUpdateCallback?.();
}
