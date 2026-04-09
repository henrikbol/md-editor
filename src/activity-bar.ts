type PanelName = 'explorer' | 'search';

let activePanel: PanelName | null = 'explorer';
let sidebarEl: HTMLElement | null = null;
let sidebarWidth: number = 220;

export function initActivityBar(
  activityBarEl: HTMLElement,
  sidebar: HTMLElement
): void {
  sidebarEl = sidebar;

  activityBarEl.querySelectorAll('.activity-icon').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.getAttribute('data-panel') as PanelName;
      if (panel === activePanel) {
        toggleSidebar();
      } else {
        switchPanel(panel);
      }
    });
  });
}

function toggleSidebar(): void {
  if (!sidebarEl) return;

  if (sidebarEl.style.display === 'none') {
    sidebarEl.style.display = '';
    sidebarEl.style.width = sidebarWidth + 'px';
    setActiveIcon(activePanel);
  } else {
    sidebarWidth = sidebarEl.offsetWidth;
    sidebarEl.style.display = 'none';
    clearActiveIcons();
  }
}

function switchPanel(panel: PanelName): void {
  if (!sidebarEl) return;

  if (sidebarEl.style.display === 'none') {
    sidebarEl.style.display = '';
    sidebarEl.style.width = sidebarWidth + 'px';
  }

  document.getElementById('sidebar-panel-explorer')!.style.display = panel === 'explorer' ? '' : 'none';
  document.getElementById('sidebar-panel-search')!.style.display = panel === 'search' ? '' : 'none';

  activePanel = panel;
  setActiveIcon(panel);
}

function setActiveIcon(panel: PanelName | null): void {
  document.querySelectorAll('.activity-icon').forEach(btn => {
    const btnPanel = btn.getAttribute('data-panel');
    btn.classList.toggle('active', btnPanel === panel);
  });
}

function clearActiveIcons(): void {
  document.querySelectorAll('.activity-icon').forEach(btn => {
    btn.classList.remove('active');
  });
}

export function getActivePanel(): PanelName | null {
  return activePanel;
}
