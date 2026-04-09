import { wrapSelection, insertAtCursor } from "./editor";
import { showUrlPopover } from "./url-popover";

// Module-private state
let bottomBarEl: HTMLElement | null = null;

export function initBottomBar(container: HTMLElement): void {
  bottomBarEl = container;
  container.innerHTML = `
    <div class="format-buttons">
      <button class="format-btn" data-action="bold" title="Bold"><b>B</b></button>
      <button class="format-btn" data-action="italic" title="Italic"><i>I</i></button>
      <button class="format-btn" data-action="link" title="Link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      </button>
      <button class="format-btn" data-action="image" title="Image">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </button>
    </div>
    <div class="status-items">
      <span class="status-item" id="status-cursor">Ln 1, Col 1</span>
      <span class="status-item word-count" id="status-words">0 words</span>
      <span class="status-item" id="status-filetype"></span>
    </div>
  `;

  // Wire up format button clicks
  container.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest(".format-btn") as HTMLElement | null;
    if (!btn) return;
    const action = btn.dataset.action;
    switch (action) {
      case "bold":
        wrapSelection("**", "**");
        break;
      case "italic":
        wrapSelection("*", "*");
        break;
      case "link":
        showUrlPopover("link");
        break;
      case "image":
        showUrlPopover("image");
        break;
    }
  });
}

export function updateCursorPosition(line: number, col: number): void {
  const el = document.getElementById("status-cursor");
  if (el) el.textContent = `Ln ${line}, Col ${col}`;
}

export function updateWordCount(count: number): void {
  const el = document.getElementById("status-words");
  if (el) el.textContent = `${count} word${count !== 1 ? "s" : ""}`;
}

export function updateFileType(type: string): void {
  const el = document.getElementById("status-filetype");
  if (el) el.textContent = type;
}

export function clearBottomBar(): void {
  const cursor = document.getElementById("status-cursor");
  const words = document.getElementById("status-words");
  const filetype = document.getElementById("status-filetype");
  if (cursor) cursor.textContent = "";
  if (words) words.textContent = "\u2014";
  if (filetype) filetype.textContent = "";
}
