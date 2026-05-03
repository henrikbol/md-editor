import { invoke } from "@tauri-apps/api/core";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "dark" });

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

  const mermaidCodeEls = previewEl.querySelectorAll<HTMLElement>("code.language-mermaid");
  const mermaidDivs: HTMLElement[] = [];

  mermaidCodeEls.forEach((codeEl) => {
    const text = codeEl.textContent ?? "";
    const div = document.createElement("div");
    div.className = "mermaid";
    div.textContent = text;
    const pre = codeEl.parentElement;
    if (pre) {
      pre.replaceWith(div);
    }
    mermaidDivs.push(div);
  });

  if (mermaidDivs.length > 0) {
    try {
      await mermaid.run({ nodes: mermaidDivs });
    } catch (err) {
      console.error("Mermaid render error:", err);
    }
  }

  onUpdateCallback?.();
}
