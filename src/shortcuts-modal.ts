const SHORTCUTS: [string, string][] = [
  ["Cmd+N", "New File"],
  ["Cmd+O", "Open File"],
  ["Cmd+S", "Save"],
  ["Cmd+Shift+S", "Save As"],
  ["Cmd+W", "Close Tab"],
  ["Cmd+Z", "Undo"],
  ["Cmd+Shift+Z", "Redo"],
  ["Cmd+=", "Zoom In"],
  ["Cmd+-", "Zoom Out"],
  ["Cmd+0", "Reset Zoom"],
  ["Cmd+Shift+F", "Find in Files"],
];

let overlay: HTMLElement | null = null;

export function showShortcutsModal(): void {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    z-index: 9999;
  `;

  const card = document.createElement("div");
  card.style.cssText = `
    background: #1e1e2e; color: #cdd6f4;
    border-radius: 8px; padding: 24px 32px;
    min-width: 340px; max-width: 440px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    font-family: Inter, system-ui, -apple-system, sans-serif;
  `;

  const title = document.createElement("h2");
  title.textContent = "Keyboard Shortcuts";
  title.style.cssText = "margin: 0 0 16px; font-size: 16px; font-weight: 600;";
  card.appendChild(title);

  const table = document.createElement("table");
  table.style.cssText = "width: 100%; border-collapse: collapse;";

  for (const [key, desc] of SHORTCUTS) {
    const row = document.createElement("tr");
    row.style.cssText = "border-bottom: 1px solid #313244;";

    const tdDesc = document.createElement("td");
    tdDesc.textContent = desc;
    tdDesc.style.cssText = "padding: 6px 8px 6px 0; font-size: 13px;";

    const tdKey = document.createElement("td");
    tdKey.style.cssText = "padding: 6px 0; text-align: right;";

    const kbd = document.createElement("kbd");
    kbd.textContent = key;
    kbd.style.cssText = `
      background: #313244; border-radius: 4px;
      padding: 2px 8px; font-size: 12px;
      font-family: ui-monospace, monospace;
    `;
    tdKey.appendChild(kbd);

    row.appendChild(tdDesc);
    row.appendChild(tdKey);
    table.appendChild(row);
  }

  card.appendChild(table);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const dismiss = () => {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    document.removeEventListener("keydown", onKey);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      dismiss();
    }
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) dismiss();
  });

  document.addEventListener("keydown", onKey);
}
