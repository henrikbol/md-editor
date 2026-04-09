import { getEditorView, wrapSelection, insertAtCursor } from "./editor";

let popoverEl: HTMLDivElement | null = null;

export function showUrlPopover(type: "link" | "image"): void {
  const view = getEditorView();
  if (!view) return;

  if (!popoverEl) {
    popoverEl = document.createElement("div");
    popoverEl.className = "url-popover";
    document.body.appendChild(popoverEl);
  }

  popoverEl.innerHTML = "";

  const label = document.createElement("label");
  label.textContent = "Enter URL:";
  popoverEl.appendChild(label);

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "https://...";
  popoverEl.appendChild(input);

  // Position near the text cursor
  const pos = view.state.selection.main.head;
  const coords = view.coordsAtPos(pos);
  let x = 100;
  let y = 100;
  if (coords) {
    x = coords.left;
    y = coords.bottom + 4;
  }

  // Boundary clamping
  x = Math.min(x, window.innerWidth - 300);
  y = Math.min(y, window.innerHeight - 60);
  x = Math.max(4, x);
  y = Math.max(4, y);

  popoverEl.style.left = x + "px";
  popoverEl.style.top = y + "px";
  popoverEl.style.display = "block";

  requestAnimationFrame(() => input.focus());

  function confirm() {
    const url = input.value.trim();
    if (url) {
      if (type === "link") {
        wrapSelection("[", "](" + url + ")");
      } else {
        insertAtCursor("![alt](" + url + ")");
      }
    }
    hide();
  }

  function hide() {
    if (popoverEl) popoverEl.style.display = "none";
    document.removeEventListener("mousedown", onClickOutside);
    document.removeEventListener("keydown", onKeyDown);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      confirm();
    } else if (e.key === "Escape") {
      e.preventDefault();
      hide();
      view!.focus();
    }
  }

  function onClickOutside(e: MouseEvent) {
    if (popoverEl && !popoverEl.contains(e.target as Node)) {
      hide();
    }
  }

  // Defer listeners to avoid immediate dismissal
  requestAnimationFrame(() => {
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
  });
}
