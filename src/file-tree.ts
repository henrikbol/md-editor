import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
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
let rootDir: string | null = null;
let activePath: string | null = null;

// Tree state
let treeData: TreeNode[] = [];

// Session state: remember which folders were expanded
let expandedPaths: Set<string> = new Set();

// Keyboard navigation
let focusedIndex = -1;

function isMarkdown(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".md") || lower.endsWith(".markdown");
}

export function initFileTree(
  container: HTMLElement,
  openFolderBtn: HTMLElement,
  callback: FileOpenCallback,
): void {
  fileTreeEl = container;
  onFileOpen = callback;

  openFolderBtn.addEventListener("click", openFolder);
  container.addEventListener("keydown", handleKeyDown);
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

export function getActivePath(): string | null {
  return activePath;
}

export function setActivePath(path: string): void {
  activePath = path;
}
