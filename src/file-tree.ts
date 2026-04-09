import { invoke } from "@tauri-apps/api/core";
import { open, ask } from "@tauri-apps/plugin-dialog";
import { getFileIcon } from "./icons";

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  extension: string | null;
}

type FileOpenCallback = (path: string, content: string) => void;

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  extension: string | null;
  children?: TreeNode[];
  loaded?: boolean;
  expanded?: boolean;
}

let fileTreeEl: HTMLElement | null = null;
let onFileOpen: FileOpenCallback | null = null;
let onFileDelete: ((path: string) => void) | null = null;
let onFileRename: ((oldPath: string, newPath: string, newName: string) => void) | null = null;
let rootDir: string | null = null;
let activePath: string | null = null;

// Tree state
let treeData: TreeNode[] = [];

// Session state: remember which folders were expanded
let expandedPaths: Set<string> = new Set();

// Keyboard navigation
let focusedIndex = -1;

// Context menu
let contextMenuEl: HTMLElement | null = null;

function isMarkdown(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".md") || lower.endsWith(".markdown");
}

export function initFileTree(
  container: HTMLElement,
  openFolderBtn: HTMLElement,
  callback: FileOpenCallback,
  onFileDeleteCb?: (path: string) => void,
  onFileRenameCb?: (oldPath: string, newPath: string, newName: string) => void,
): void {
  fileTreeEl = container;
  onFileOpen = callback;
  onFileDelete = onFileDeleteCb || null;
  onFileRename = onFileRenameCb || null;

  openFolderBtn.addEventListener("click", openFolder);
  container.addEventListener("keydown", handleKeyDown);
  container.addEventListener("contextmenu", handleContextMenu);

  // Dismiss context menu on click outside or Escape
  document.addEventListener("click", () => hideContextMenu());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideContextMenu();
  });
}

async function openFolder(): Promise<void> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Open Folder",
  });

  if (selected && typeof selected === "string") {
    rootDir = selected;
    expandedPaths.clear();
    treeData = await loadDirectory(selected);
    renderTree(treeData, fileTreeEl!, 0);
  }
}

async function loadDirectory(dirPath: string): Promise<TreeNode[]> {
  try {
    const entries = await invoke<FileEntry[]>("list_directory", { dir: dirPath });
    return entries.map((e) => {
      const node: TreeNode = {
        name: e.name,
        path: e.path,
        isDir: e.is_dir,
        extension: e.extension,
      };
      if (e.is_dir) {
        node.loaded = false;
        node.expanded = expandedPaths.has(e.path);
        node.children = [];
      }
      return node;
    });
  } catch (e) {
    console.error("Failed to list directory:", e);
    return [];
  }
}

function getVisibleItems(): HTMLElement[] {
  if (!fileTreeEl) return [];
  return Array.from(fileTreeEl.querySelectorAll<HTMLElement>(".tree-item"));
}

function setFocused(index: number): void {
  const items = getVisibleItems();
  if (items.length === 0) return;

  // Remove old focus
  items.forEach((el) => el.classList.remove("focused"));

  focusedIndex = Math.max(0, Math.min(index, items.length - 1));
  const el = items[focusedIndex];
  if (el) {
    el.classList.add("focused");
    el.scrollIntoView({ block: "nearest" });
  }
}

function handleKeyDown(e: KeyboardEvent): void {
  const items = getVisibleItems();
  if (items.length === 0) return;

  switch (e.key) {
    case "ArrowDown": {
      e.preventDefault();
      setFocused(focusedIndex + 1);
      break;
    }
    case "ArrowUp": {
      e.preventDefault();
      setFocused(focusedIndex - 1);
      break;
    }
    case "ArrowRight": {
      e.preventDefault();
      const item = items[focusedIndex];
      if (!item) break;
      const nodePath = item.dataset.path!;
      const node = findNode(treeData, nodePath);
      if (node && node.isDir) {
        if (!node.expanded) {
          toggleExpand(node, item);
        } else {
          // Move to first child
          setFocused(focusedIndex + 1);
        }
      }
      break;
    }
    case "ArrowLeft": {
      e.preventDefault();
      const item = items[focusedIndex];
      if (!item) break;
      const nodePath = item.dataset.path!;
      const node = findNode(treeData, nodePath);
      if (node && node.isDir && node.expanded) {
        toggleExpand(node, item);
      } else {
        // Move to parent
        const depth = parseInt(item.dataset.depth || "0", 10);
        if (depth > 0) {
          // Find parent: walk backwards for first item with depth - 1
          for (let i = focusedIndex - 1; i >= 0; i--) {
            const d = parseInt(items[i].dataset.depth || "0", 10);
            if (d === depth - 1) {
              setFocused(i);
              break;
            }
          }
        }
      }
      break;
    }
    case "Enter": {
      e.preventDefault();
      const item = items[focusedIndex];
      if (!item) break;
      const nodePath = item.dataset.path!;
      const node = findNode(treeData, nodePath);
      if (node) {
        if (node.isDir) {
          toggleExpand(node, item);
        } else if (isMarkdown(node.name)) {
          openFile(node.path);
        }
      }
      break;
    }
    case "F2": {
      e.preventDefault();
      const item = items[focusedIndex];
      if (item) handleRename(item.dataset.path!);
      break;
    }
    case "Delete":
    case "Backspace": {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        const item = items[focusedIndex];
        if (item) handleDelete(item.dataset.path!);
      }
      break;
    }
    case "F10": {
      if (e.shiftKey) {
        e.preventDefault();
        const item = items[focusedIndex];
        if (item) {
          const rect = item.getBoundingClientRect();
          const nodePath = item.dataset.path!;
          const node = findNode(treeData, nodePath);
          showContextMenu(rect.left + 20, rect.top + rect.height, nodePath, node?.isDir ?? false);
        }
      }
      break;
    }
  }
}

function findNode(nodes: TreeNode[], path: string): TreeNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findNode(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

function renderTree(
  nodes: TreeNode[],
  container: HTMLElement,
  depth: number = 0,
): void {
  if (depth === 0) {
    container.innerHTML = "";
    focusedIndex = -1;
  }

  for (const node of nodes) {
    const itemEl = document.createElement("div");
    itemEl.className = "tree-item";
    itemEl.dataset.path = node.path;
    itemEl.dataset.depth = String(depth);
    itemEl.setAttribute("role", "treeitem");
    itemEl.style.paddingLeft = `${depth * 20 + 8}px`;

    // Indent guides
    if (depth > 0) {
      for (let i = 1; i <= depth; i++) {
        const guide = document.createElement("span");
        guide.className = "indent-guide";
        guide.style.left = `${i * 20 - 4}px`;
        itemEl.appendChild(guide);
      }
    }

    // Arrow for directories
    const arrow = document.createElement("span");
    arrow.className = "tree-arrow";
    if (node.isDir) {
      arrow.textContent = node.expanded ? "\u25BC" : "\u25B6";
    } else {
      arrow.classList.add("empty");
    }
    itemEl.appendChild(arrow);

    // Icon
    const iconSpan = document.createElement("span");
    iconSpan.className = "file-icon";
    iconSpan.innerHTML = getFileIcon(node.name, node.isDir, !!node.expanded);
    itemEl.appendChild(iconSpan);

    // Name
    const nameSpan = document.createElement("span");
    nameSpan.className = "tree-name";
    nameSpan.textContent = node.name;
    itemEl.appendChild(nameSpan);

    // Active highlight
    if (node.path === activePath) {
      itemEl.classList.add("active");
    }

    // Mute non-markdown files
    if (!node.isDir && !isMarkdown(node.name)) {
      itemEl.classList.add("muted");
    }

    // Click handlers
    if (node.isDir) {
      itemEl.addEventListener("click", () => {
        toggleExpand(node, itemEl);
      });
    } else if (isMarkdown(node.name)) {
      itemEl.addEventListener("click", () => {
        openFile(node.path);
      });
    }

    container.appendChild(itemEl);

    // Render expanded children
    if (node.isDir && node.expanded && node.children && node.children.length > 0) {
      renderTree(node.children, container, depth + 1);
    }
  }
}

async function toggleExpand(node: TreeNode, _itemEl: HTMLElement): Promise<void> {
  if (!node.isDir) return;

  if (!node.loaded) {
    node.children = await loadDirectory(node.path);
    node.loaded = true;
  }

  node.expanded = !node.expanded;

  if (node.expanded) {
    expandedPaths.add(node.path);
  } else {
    expandedPaths.delete(node.path);
  }

  // Re-render the full tree (simplest approach that handles all cases)
  renderTree(treeData, fileTreeEl!, 0);
}

async function openFile(path: string): Promise<void> {
  try {
    const content = await invoke<string>("read_file", { path });
    activePath = path;
    // Re-render to update active highlight
    renderTree(treeData, fileTreeEl!, 0);
    onFileOpen?.(path, content);
  } catch (e) {
    console.error("Failed to open file:", e);
  }
}

export async function openFileDialog(): Promise<{
  path: string;
  content: string;
} | null> {
  const selected = await open({
    multiple: false,
    title: "Open File",
    filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
  });

  if (selected && typeof selected === "string") {
    try {
      const content = await invoke<string>("read_file", { path: selected });
      activePath = selected;

      // Set tree to file's directory
      const dir = selected.substring(0, selected.lastIndexOf("/"));
      if (dir) {
        rootDir = dir;
        expandedPaths.clear();
        treeData = await loadDirectory(dir);
        renderTree(treeData, fileTreeEl!, 0);
      }

      return { path: selected, content };
    } catch (e) {
      console.error("Failed to read file:", e);
    }
  }
  return null;
}

// ── Context menu ──

function handleContextMenu(e: MouseEvent): void {
  e.preventDefault();
  const target = (e.target as HTMLElement).closest(".tree-item") as HTMLElement | null;
  if (!target) return;
  const path = target.dataset.path!;
  const node = findNode(treeData, path);
  showContextMenu(e.clientX, e.clientY, path, node?.isDir ?? false);
}

function showContextMenu(x: number, y: number, targetPath: string, isDir: boolean): void {
  if (!contextMenuEl) {
    contextMenuEl = document.createElement("div");
    contextMenuEl.id = "context-menu";
    document.body.appendChild(contextMenuEl);
  }

  contextMenuEl.innerHTML = "";

  const items = [
    { label: "New File", action: () => handleNewFile(targetPath, isDir) },
    { label: "New Folder", action: () => handleNewFolder(targetPath, isDir) },
    { label: "Rename", shortcut: "F2", action: () => handleRename(targetPath) },
    { label: "Delete", action: () => handleDelete(targetPath) },
  ];

  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "context-menu-item";

    const labelSpan = document.createElement("span");
    labelSpan.textContent = item.label;
    el.appendChild(labelSpan);

    if (item.shortcut) {
      const shortcutSpan = document.createElement("span");
      shortcutSpan.className = "context-menu-shortcut";
      shortcutSpan.textContent = item.shortcut;
      el.appendChild(shortcutSpan);
    }

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      hideContextMenu();
      item.action();
    });
    contextMenuEl!.appendChild(el);
  });

  contextMenuEl.style.display = "block";
  contextMenuEl.style.left = Math.min(x, window.innerWidth - 160) + "px";
  contextMenuEl.style.top = Math.min(y, window.innerHeight - 160) + "px";
}

function hideContextMenu(): void {
  if (contextMenuEl) contextMenuEl.style.display = "none";
}

// ── CRUD handlers ──

function getParentDir(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx > 0 ? path.substring(0, idx) : path;
}

async function handleNewFile(targetPath: string, isDir: boolean): Promise<void> {
  const parentDir = isDir ? targetPath : getParentDir(targetPath);
  const newPath = parentDir + "/untitled";

  try {
    await invoke("create_file", { path: newPath });
  } catch (err) {
    // If "untitled" already exists, try with a suffix
    let created = false;
    for (let i = 1; i <= 99; i++) {
      try {
        await invoke("create_file", { path: parentDir + "/untitled-" + i });
        await refreshDirectory(parentDir);
        startInlineRename(parentDir + "/untitled-" + i);
        created = true;
        break;
      } catch {
        continue;
      }
    }
    if (!created) console.error("Failed to create new file:", err);
    return;
  }

  await refreshDirectory(parentDir);
  startInlineRename(newPath);
}

async function handleNewFolder(targetPath: string, isDir: boolean): Promise<void> {
  const parentDir = isDir ? targetPath : getParentDir(targetPath);
  const newPath = parentDir + "/untitled-folder";

  try {
    await invoke("create_directory", { path: newPath });
  } catch (err) {
    let created = false;
    for (let i = 1; i <= 99; i++) {
      try {
        await invoke("create_directory", { path: parentDir + "/untitled-folder-" + i });
        await refreshDirectory(parentDir);
        startInlineRename(parentDir + "/untitled-folder-" + i);
        created = true;
        break;
      } catch {
        continue;
      }
    }
    if (!created) console.error("Failed to create new folder:", err);
    return;
  }

  await refreshDirectory(parentDir);
  startInlineRename(newPath);
}

function handleRename(targetPath: string): void {
  startInlineRename(targetPath);
}

async function handleDelete(targetPath: string): Promise<void> {
  if (!rootDir) return;
  const fileName = targetPath.split("/").pop() || targetPath;

  const confirmed = await ask(`Delete "${fileName}"?`, {
    title: "Confirm Delete",
    kind: "warning",
  });
  if (!confirmed) return;

  try {
    await invoke("delete_entry", { path: targetPath, workspaceRoot: rootDir });
  } catch (err) {
    console.error("Failed to delete:", err);
    return;
  }

  const parentDir = getParentDir(targetPath);
  await refreshDirectory(parentDir);

  if (onFileDelete) onFileDelete(targetPath);
}

// ── Inline rename ──

function findTreeItemByPath(path: string): HTMLElement | null {
  if (!fileTreeEl) return null;
  return fileTreeEl.querySelector(`.tree-item[data-path="${CSS.escape(path)}"]`);
}

function startInlineRename(targetPath: string): void {
  const itemEl = findTreeItemByPath(targetPath);
  if (!itemEl) return;

  const nameSpan = itemEl.querySelector(".tree-name");
  if (!nameSpan) return;

  const currentName = targetPath.split("/").pop() || "";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "rename-input";
  input.value = currentName;

  // Pre-select filename without extension
  const dotIndex = currentName.lastIndexOf(".");
  if (dotIndex > 0) {
    setTimeout(() => input.setSelectionRange(0, dotIndex), 0);
  } else {
    setTimeout(() => input.select(), 0);
  }

  nameSpan.replaceWith(input);
  input.focus();

  let committed = false;

  const confirmRename = async () => {
    if (committed) return;
    committed = true;

    const newName = input.value.trim();

    if (!newName || newName === currentName) {
      cancelRename();
      return;
    }
    if (newName.includes("/") || newName.includes("\0")) {
      input.style.borderColor = "#e06c75";
      committed = false;
      return;
    }

    const parentDir = getParentDir(targetPath);
    const newPath = parentDir + "/" + newName;

    try {
      await invoke("rename_entry", { oldPath: targetPath, newPath: newPath });
      await refreshDirectory(parentDir);
      if (onFileRename) onFileRename(targetPath, newPath, newName);
    } catch (err) {
      input.style.borderColor = "#e06c75";
      committed = false;
      console.error("Rename failed:", err);
    }
  };

  const cancelRename = () => {
    const parentDir = getParentDir(targetPath);
    refreshDirectory(parentDir);
  };

  input.addEventListener("keydown", (e) => {
    e.stopPropagation(); // Prevent tree keyboard nav while renaming
    if (e.key === "Enter") {
      e.preventDefault();
      confirmRename();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelRename();
    }
  });

  input.addEventListener("blur", () => {
    if (!committed) cancelRename();
  });
}

// ── Refresh directory ──

async function refreshDirectory(dirPath: string): Promise<void> {
  // Find the node for this directory in the tree and reload its children
  if (!fileTreeEl) return;

  // If this is the root, reload everything
  if (dirPath === rootDir) {
    treeData = await loadDirectory(dirPath);
    renderTree(treeData, fileTreeEl, 0);
    return;
  }

  const node = findNode(treeData, dirPath);
  if (node && node.isDir) {
    node.children = await loadDirectory(dirPath);
    node.loaded = true;
    // Keep it expanded so the user can see the result
    node.expanded = true;
    expandedPaths.add(dirPath);
    renderTree(treeData, fileTreeEl, 0);
  } else {
    // Fallback: reload root
    if (rootDir) {
      treeData = await loadDirectory(rootDir);
      renderTree(treeData, fileTreeEl, 0);
    }
  }
}

export function getActivePath(): string | null {
  return activePath;
}

export function setActivePath(path: string): void {
  activePath = path;
}

export function getWorkspaceRoot(): string | null {
  return rootDir;
}
