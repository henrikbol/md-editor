import { invoke } from "@tauri-apps/api/core";

let previewEl: HTMLElement | null = null;

export function initPreview(container: HTMLElement) {
  previewEl = container;
}

export async function updatePreview(markdownText: string) {
  if (!previewEl) return;

  if (!markdownText.trim()) {
    previewEl.innerHTML = '<p style="color: var(--text-muted); font-style: italic;">Start typing to see preview...</p>';
    return;
  }

  const html = await invoke<string>("parse_markdown", { text: markdownText });
  previewEl.innerHTML = html;
}
