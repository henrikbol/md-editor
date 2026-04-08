import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

type FileOpenCallback = (path: string, content: string) => void;

let fileListEl: HTMLElement | null = null;
let onFileOpen: FileOpenCallback | null = null;
let currentDir: string | null = null;
let activePath: string | null = null;

export function initSidebar(listEl: HTMLElement, openFolderBtn: HTMLElement, callback: FileOpenCallback) {
  fileListEl = listEl;
  onFileOpen = callback;

  openFolderBtn.addEventListener("click", openFolder);
}

async function openFolder() {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Open Folder",
  });

  if (selected && typeof selected === "string") {
    currentDir = selected;
    await refreshFileList();
  }
}

async function refreshFileList() {
  if (!fileListEl || !currentDir) return;

  try {
    const files = await invoke<FileEntry[]>("list_markdown_files", { dir: currentDir });
    renderFileList(files);
  } catch (e) {
    console.error("Failed to list files:", e);
  }
}

function renderFileList(files: FileEntry[]) {
  if (!fileListEl) return;
  fileListEl.innerHTML = "";

  for (const file of files) {
    const li = document.createElement("li");
    li.textContent = file.name;
    li.className = file.is_dir ? "directory" : "file";
    li.title = file.path;

    if (file.path === activePath) {
      li.classList.add("active");
    }

    if (file.is_dir) {
      li.addEventListener("click", async () => {
        currentDir = file.path;
        await refreshFileList();
      });
    } else {
      li.addEventListener("click", async () => {
        await openFile(file.path);
      });
    }

    fileListEl.appendChild(li);
  }

  // Add a ".." entry if we're not at the root
  if (currentDir && currentDir.includes("/")) {
    const parentPath = currentDir.substring(0, currentDir.lastIndexOf("/")) || "/";
    const li = document.createElement("li");
    li.textContent = "..";
    li.className = "directory";
    li.title = "Go up";
    li.addEventListener("click", async () => {
      currentDir = parentPath;
      await refreshFileList();
    });
    fileListEl.insertBefore(li, fileListEl.firstChild);
  }
}

async function openFile(path: string) {
  try {
    const content = await invoke<string>("read_file", { path });
    activePath = path;
    if (currentDir) await refreshFileList();
    onFileOpen?.(path, content);
  } catch (e) {
    console.error("Failed to open file:", e);
  }
}

export async function openFileDialog(): Promise<{ path: string; content: string } | null> {
  const selected = await open({
    multiple: false,
    title: "Open File",
    filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
  });

  if (selected && typeof selected === "string") {
    try {
      const content = await invoke<string>("read_file", { path: selected });
      activePath = selected;

      // Set sidebar to file's directory
      const dir = selected.substring(0, selected.lastIndexOf("/"));
      if (dir) {
        currentDir = dir;
        await refreshFileList();
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

export function setActivePath(path: string) {
  activePath = path;
}
