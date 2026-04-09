// Module-private state
let tabBarEl: HTMLElement | null = null;
let onTabClick: ((path: string) => void) | null = null;
let onTabClose: ((path: string) => void) | null = null;

export function initTabBar(
  container: HTMLElement,
  clickCallback: (path: string) => void,
  closeCallback: (path: string) => void
): void {
  tabBarEl = container;
  onTabClick = clickCallback;
  onTabClose = closeCallback;
}

export function addTab(path: string, fileName: string): void {
  if (!tabBarEl) return;

  // Don't add duplicate tabs
  if (tabBarEl.querySelector(`.tab[data-path="${CSS.escape(path)}"]`)) return;

  const tab = document.createElement("div");
  tab.className = "tab";
  tab.dataset.path = path;

  const nameSpan = document.createElement("span");
  nameSpan.className = "tab-name";
  nameSpan.textContent = fileName;

  const dirtySpan = document.createElement("span");
  dirtySpan.className = "tab-dirty";
  dirtySpan.textContent = "\u25CF"; // ●

  const closeBtn = document.createElement("button");
  closeBtn.className = "tab-close";
  closeBtn.textContent = "\u00D7"; // ×
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (onTabClose) onTabClose(path);
  });

  tab.appendChild(nameSpan);
  tab.appendChild(dirtySpan);
  tab.appendChild(closeBtn);

  tab.addEventListener("click", () => {
    if (onTabClick) onTabClick(path);
  });

  tabBarEl.appendChild(tab);
}

export function removeTab(path: string): void {
  if (!tabBarEl) return;
  const tab = tabBarEl.querySelector(`.tab[data-path="${CSS.escape(path)}"]`);
  if (tab) tab.remove();
}

export function setActiveTab(path: string): void {
  if (!tabBarEl) return;

  // Remove .active from all tabs
  tabBarEl.querySelectorAll(".tab.active").forEach((el) => {
    el.classList.remove("active");
  });

  // Add .active to matching tab
  const tab = tabBarEl.querySelector(`.tab[data-path="${CSS.escape(path)}"]`);
  if (tab) {
    tab.classList.add("active");
    // Scroll the active tab into view if needed
    tab.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
}

export function setTabDirty(path: string, isDirty: boolean): void {
  if (!tabBarEl) return;
  const tab = tabBarEl.querySelector(`.tab[data-path="${CSS.escape(path)}"]`);
  if (!tab) return;
  const dot = tab.querySelector(".tab-dirty");
  if (dot) {
    if (isDirty) {
      dot.classList.add("visible");
    } else {
      dot.classList.remove("visible");
    }
  }
}

export function updateTabPath(oldPath: string, newPath: string, newFileName: string): void {
  if (!tabBarEl) return;
  const tab = tabBarEl.querySelector(`.tab[data-path="${CSS.escape(oldPath)}"]`) as HTMLElement | null;
  if (!tab) return;
  tab.dataset.path = newPath;
  const nameSpan = tab.querySelector(".tab-name");
  if (nameSpan) nameSpan.textContent = newFileName;
}
