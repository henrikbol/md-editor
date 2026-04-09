// Module-private state
let statusBarEl: HTMLElement | null = null;

export function initStatusBar(container: HTMLElement): void {
  statusBarEl = container;
  container.innerHTML = `
    <span class="status-item" id="status-cursor">Ln 1, Col 1</span>
    <span class="status-item word-count" id="status-words">0 words</span>
    <span class="status-item" id="status-filetype"></span>
  `;
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

export function clearStatusBar(): void {
  const cursor = document.getElementById("status-cursor");
  const words = document.getElementById("status-words");
  const filetype = document.getElementById("status-filetype");
  if (cursor) cursor.textContent = "";
  if (words) words.textContent = "\u2014";
  if (filetype) filetype.textContent = "";
}
