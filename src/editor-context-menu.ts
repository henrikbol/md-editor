import { wrapSelection } from "./editor";
import { showUrlPopover } from "./url-popover";

let menuEl: HTMLDivElement | null = null;

export function showEditorContextMenu(x: number, y: number): void {
  if (!menuEl) {
    menuEl = document.createElement("div");
    menuEl.id = "editor-context-menu";
    document.body.appendChild(menuEl);
  }

  menuEl.innerHTML = "";

  const items = [
    { label: "Bold", action: () => wrapSelection("**", "**") },
    { label: "Italic", action: () => wrapSelection("*", "*") },
    { label: "Link", action: () => showUrlPopover("link") },
    { label: "Image", action: () => showUrlPopover("image") },
  ];

  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "context-menu-item";

    const labelSpan = document.createElement("span");
    labelSpan.textContent = item.label;
    el.appendChild(labelSpan);

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      hide();
      item.action();
    });
    menuEl!.appendChild(el);
  });

  // Boundary clamping
  const clampedX = Math.min(x, window.innerWidth - 160);
  const clampedY = Math.min(y, window.innerHeight - 160);

  menuEl.style.display = "block";
  menuEl.style.left = clampedX + "px";
  menuEl.style.top = clampedY + "px";

  // Defer listeners to avoid immediate dismissal
  requestAnimationFrame(() => {
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("scroll", hide, true);
  });
}

function hide(): void {
  if (menuEl) menuEl.style.display = "none";
  document.removeEventListener("mousedown", onClickOutside);
  document.removeEventListener("keydown", onKeyDown);
  document.removeEventListener("scroll", hide, true);
}

function onClickOutside(e: MouseEvent): void {
  if (menuEl && !menuEl.contains(e.target as Node)) {
    hide();
  }
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === "Escape") {
    e.preventDefault();
    hide();
  }
}
