import { setFontSize, setLineNumbersVisible, setLineWrapping, setTabSize, setEditorFontFamily } from "./editor";

let settingsContainer: HTMLElement | null = null;
let settingsVisible = false;

const FONT_FAMILIES: Record<string, string> = {
  "Inter": "Inter, system-ui, -apple-system, sans-serif",
  "JetBrains Mono": "'JetBrains Mono', 'Fira Code', monospace",
  "System Default": "system-ui, -apple-system, sans-serif",
};

type Category = "editor" | "appearance" | "file";

let activeCategory: Category = "editor";

function readSetting<T>(key: string, fallback: T): T {
  const val = localStorage.getItem(key);
  if (val === null) return fallback;
  if (typeof fallback === "boolean") return (val === "true") as unknown as T;
  if (typeof fallback === "number") return (parseInt(val, 10) || fallback) as unknown as T;
  return val as unknown as T;
}

function buildSidebar(): HTMLElement {
  const sidebar = document.createElement("div");
  sidebar.className = "settings-sidebar";

  const categories: { id: Category; label: string }[] = [
    { id: "editor", label: "Editor" },
    { id: "appearance", label: "Appearance" },
    { id: "file", label: "File" },
  ];

  for (const cat of categories) {
    const btn = document.createElement("button");
    btn.className = "settings-category" + (cat.id === activeCategory ? " active" : "");
    btn.textContent = cat.label;
    btn.dataset.category = cat.id;
    btn.addEventListener("click", () => {
      activeCategory = cat.id;
      sidebar.querySelectorAll(".settings-category").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderContent();
    });
    sidebar.appendChild(btn);
  }

  return sidebar;
}

let contentEl: HTMLElement | null = null;

function renderContent(): void {
  if (!contentEl) return;
  contentEl.innerHTML = "";

  switch (activeCategory) {
    case "editor":
      renderEditorSettings(contentEl);
      break;
    case "appearance":
      renderAppearanceSettings(contentEl);
      break;
    case "file":
      renderFileSettings(contentEl);
      break;
  }
}

function renderEditorSettings(container: HTMLElement): void {
  const h2 = document.createElement("h2");
  h2.textContent = "Editor";
  container.appendChild(h2);

  // Font size
  {
    const group = document.createElement("div");
    group.className = "setting-group";
    const label = document.createElement("label");
    label.textContent = "Font Size";
    group.appendChild(label);
    const input = document.createElement("input");
    input.type = "number";
    input.min = "8";
    input.max = "32";
    input.value = readSetting("editorFontSize", 14).toString();
    input.addEventListener("change", () => {
      const size = Math.max(8, Math.min(32, parseInt(input.value, 10) || 14));
      input.value = size.toString();
      localStorage.setItem("editorFontSize", size.toString());
      document.documentElement.style.setProperty("--editor-font-size", size + "px");
      setFontSize(size);
    });
    group.appendChild(input);
    container.appendChild(group);
  }

  // Font family
  {
    const group = document.createElement("div");
    group.className = "setting-group";
    const label = document.createElement("label");
    label.textContent = "Font Family";
    group.appendChild(label);
    const select = document.createElement("select");
    const currentFamily = localStorage.getItem("settings.fontFamily") || "Inter, system-ui, -apple-system, sans-serif";
    for (const [name, value] of Object.entries(FONT_FAMILIES)) {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = name;
      if (value === currentFamily) opt.selected = true;
      select.appendChild(opt);
    }
    select.addEventListener("change", () => {
      localStorage.setItem("settings.fontFamily", select.value);
      setEditorFontFamily(select.value);
    });
    group.appendChild(select);
    container.appendChild(group);
  }

  // Line numbers
  {
    const group = document.createElement("div");
    group.className = "setting-group";
    const toggle = document.createElement("div");
    toggle.className = "setting-toggle";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = "setting-line-numbers";
    input.checked = readSetting("settings.lineNumbers", true);
    const label = document.createElement("label");
    label.htmlFor = "setting-line-numbers";
    label.textContent = "Line Numbers";
    input.addEventListener("change", () => {
      localStorage.setItem("settings.lineNumbers", input.checked.toString());
      setLineNumbersVisible(input.checked);
    });
    toggle.appendChild(input);
    toggle.appendChild(label);
    group.appendChild(toggle);
    container.appendChild(group);
  }

  // Word wrap
  {
    const group = document.createElement("div");
    group.className = "setting-group";
    const toggle = document.createElement("div");
    toggle.className = "setting-toggle";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = "setting-word-wrap";
    input.checked = readSetting("settings.wordWrap", false);
    const label = document.createElement("label");
    label.htmlFor = "setting-word-wrap";
    label.textContent = "Word Wrap";
    input.addEventListener("change", () => {
      localStorage.setItem("settings.wordWrap", input.checked.toString());
      setLineWrapping(input.checked);
    });
    toggle.appendChild(input);
    toggle.appendChild(label);
    group.appendChild(toggle);
    container.appendChild(group);
  }

  // Tab size
  {
    const group = document.createElement("div");
    group.className = "setting-group";
    const label = document.createElement("label");
    label.textContent = "Tab Size";
    group.appendChild(label);
    const select = document.createElement("select");
    const currentTabSize = readSetting("settings.tabSize", 4);
    for (const size of [2, 4, 8]) {
      const opt = document.createElement("option");
      opt.value = size.toString();
      opt.textContent = size.toString();
      if (size === currentTabSize) opt.selected = true;
      select.appendChild(opt);
    }
    select.addEventListener("change", () => {
      const size = parseInt(select.value, 10);
      localStorage.setItem("settings.tabSize", size.toString());
      setTabSize(size);
    });
    group.appendChild(select);
    container.appendChild(group);
  }
}

function renderAppearanceSettings(container: HTMLElement): void {
  const h2 = document.createElement("h2");
  h2.textContent = "Appearance";
  container.appendChild(h2);

  // Theme (read-only)
  {
    const group = document.createElement("div");
    group.className = "setting-group";
    const label = document.createElement("label");
    label.textContent = "Theme";
    group.appendChild(label);
    const text = document.createElement("div");
    text.className = "setting-readonly";
    text.textContent = "Atmospheric";
    group.appendChild(text);
    container.appendChild(group);
  }

  // Accent color swatch
  {
    const group = document.createElement("div");
    group.className = "setting-group";
    const label = document.createElement("label");
    label.textContent = "Accent Color";
    group.appendChild(label);
    const swatch = document.createElement("div");
    swatch.style.width = "24px";
    swatch.style.height = "24px";
    swatch.style.borderRadius = "4px";
    swatch.style.background = "var(--accent)";
    swatch.style.border = "1px solid var(--border)";
    group.appendChild(swatch);
    container.appendChild(group);
  }
}

function renderFileSettings(container: HTMLElement): void {
  const h2 = document.createElement("h2");
  h2.textContent = "File";
  container.appendChild(h2);

  // Auto-save toggle
  {
    const group = document.createElement("div");
    group.className = "setting-group";
    const toggle = document.createElement("div");
    toggle.className = "setting-toggle";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = "setting-auto-save";
    input.checked = readSetting("settings.autoSave", false);
    const label = document.createElement("label");
    label.htmlFor = "setting-auto-save";
    label.textContent = "Auto Save";
    input.addEventListener("change", () => {
      localStorage.setItem("settings.autoSave", input.checked.toString());
    });
    toggle.appendChild(input);
    toggle.appendChild(label);
    group.appendChild(toggle);
    container.appendChild(group);
  }

  // Default save location (read-only)
  {
    const group = document.createElement("div");
    group.className = "setting-group";
    const label = document.createElement("label");
    label.textContent = "Default Save Location";
    group.appendChild(label);
    const text = document.createElement("div");
    text.className = "setting-readonly";
    text.textContent = "System default";
    group.appendChild(text);
    container.appendChild(group);
  }
}

export function initSettingsPanel(container: HTMLElement): void {
  settingsContainer = container;

  const sidebar = buildSidebar();
  container.appendChild(sidebar);

  contentEl = document.createElement("div");
  contentEl.className = "settings-content";
  container.appendChild(contentEl);

  renderContent();
}

export function toggleSettings(): void {
  if (!settingsContainer) return;

  const tabBar = document.getElementById("tab-bar");
  const contentRow = document.getElementById("content-row");
  const emptyState = document.getElementById("empty-state");
  const settingsBtn = document.querySelector('.activity-icon[data-panel="settings"]');

  settingsVisible = !settingsVisible;

  if (settingsVisible) {
    // Show settings, hide editor content
    settingsContainer.style.display = "flex";
    if (tabBar) tabBar.style.display = "none";
    if (contentRow) contentRow.style.display = "none";
    if (emptyState) emptyState.style.display = "none";
    if (settingsBtn) settingsBtn.classList.add("active");
    // Re-render to pick up any external changes
    renderContent();
  } else {
    // Hide settings, restore editor content
    settingsContainer.style.display = "none";
    if (tabBar) tabBar.style.display = "";
    if (contentRow) contentRow.style.display = "";
    if (settingsBtn) settingsBtn.classList.remove("active");
  }
}

export function isSettingsVisible(): boolean {
  return settingsVisible;
}
