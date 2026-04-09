import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ask, save } from "@tauri-apps/plugin-dialog";
import { EditorState } from "@codemirror/state";
import { initEditor, setContent, getContent, onCursorChange, setFontSize, createEditorState, getEditorState, setEditorState, getScrollDOM } from "./editor";
import { initPreview, updatePreview } from "./preview";
import { initFileTree, openFileDialog, setActivePath } from "./file-tree";
import { initScrollSync, resyncScroll, resetScrollSync } from "./scroll-sync";
import { initStatusBar, updateCursorPosition, updateWordCount, updateFileType, clearStatusBar } from "./statusbar";
import { initTabBar, addTab, removeTab, setActiveTab, setTabDirty } from "./tab-bar";
import { initActivityBar } from "./activity-bar";

interface BufferEntry {
  editorState: EditorState;
  scrollTop: number;
  isDirty: boolean;
  fileName: string;
}

let buffers: Map<string, BufferEntry> = new Map();
let activeBufferPath: string | null = null;

const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 32;
let currentFontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE,
  parseInt(localStorage.getItem("editorFontSize") || String(DEFAULT_FONT_SIZE), 10) || DEFAULT_FONT_SIZE
));

function applyFontSize(size: number) {
  currentFontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, size));
  setFontSize(currentFontSize);
  document.documentElement.style.setProperty("--editor-font-size", currentFontSize + "px");
  localStorage.setItem("editorFontSize", String(currentFontSize));
}

function extractFileName(path: string): string {
  return path.split("/").pop() ?? "Untitled";
}

function showEmptyState() {
  const emptyState = document.getElementById("empty-state");
  const contentRow = document.getElementById("content-row");
  if (emptyState) emptyState.style.display = "flex";
  if (contentRow) contentRow.style.display = "none";
}

function showContentArea() {
  const emptyState = document.getElementById("empty-state");
  const contentRow = document.getElementById("content-row");
  if (emptyState) emptyState.style.display = "none";
  if (contentRow) contentRow.style.display = "flex";
}

function updateTitle() {
  let fileName = "Untitled";
  let dirty = false;
  if (activeBufferPath) {
    const buf = buffers.get(activeBufferPath);
    if (buf) {
      fileName = buf.fileName;
      dirty = buf.isDirty;
    }
  }
  const dirtyMark = dirty ? " *" : "";
  document.title = `${fileName}${dirtyMark} - MD Editor`;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

async function handleEditorChange(content: string) {
  if (activeBufferPath) {
    const buf = buffers.get(activeBufferPath);
    if (buf) buf.isDirty = true;
    setTabDirty(activeBufferPath, true);
  }
  updateTitle();
  updateWordCount(countWords(content));
  await updatePreview(content);
}

function handleFileOpen(path: string, content: string) {
  // If this file is already open, just switch to it
  if (buffers.has(path)) {
    switchToBuffer(path);
    return;
  }

  // Save current buffer state before opening new one
  saveCurrentBufferState();

  // Create a fresh EditorState for the new file
  const newState = createEditorState(content);
  setEditorState(newState);

  // Reset scroll sync since setState replaces the scroller DOM
  resetScrollSync();

  // Store the new buffer
  const fileName = extractFileName(path);
  buffers.set(path, {
    editorState: newState,
    scrollTop: 0,
    isDirty: false,
    fileName,
  });

  // Show content area if this is the first buffer
  if (buffers.size === 1) {
    showContentArea();
  }

  addTab(path, fileName);
  activeBufferPath = path;
  setActiveTab(path);
  setActivePath(path);
  updateTitle();
  updateWordCount(countWords(content));
  updateFileType("Markdown");
  updatePreview(content);
}

function saveCurrentBufferState() {
  if (!activeBufferPath) return;
  const buf = buffers.get(activeBufferPath);
  if (!buf) return;
  const state = getEditorState();
  if (state) buf.editorState = state;
  const scrollDOM = getScrollDOM();
  if (scrollDOM) buf.scrollTop = scrollDOM.scrollTop;
}

function switchToBuffer(path: string) {
  if (path === activeBufferPath) return;

  const target = buffers.get(path);
  if (!target) return;

  // Save current buffer state
  saveCurrentBufferState();

  // Load target buffer state
  setEditorState(target.editorState);

  // Reset scroll sync since setState replaces the scroller DOM
  resetScrollSync();

  // Restore scroll position after the DOM settles
  requestAnimationFrame(() => {
    const scrollDOM = getScrollDOM();
    if (scrollDOM) scrollDOM.scrollTop = target.scrollTop;
  });

  activeBufferPath = path;
  setActiveTab(path);
  setActivePath(path);

  const content = getContent();
  updateTitle();
  updateWordCount(countWords(content));
  updateFileType("Markdown");
  updatePreview(content);
}

async function closeBuffer(path: string) {
  const buf = buffers.get(path);
  if (!buf) return;

  // Prompt to save if dirty
  if (buf.isDirty) {
    const shouldSave = await ask(`Save changes to ${buf.fileName}?`, {
      title: "Unsaved Changes",
      kind: "warning",
      okLabel: "Save",
      cancelLabel: "Don't Save",
    });
    if (shouldSave) {
      await saveFile();
    }
  }

  // Remove from buffers and tab bar
  buffers.delete(path);
  removeTab(path);

  if (activeBufferPath === path) {
    // Switch to another buffer if available
    const remaining = Array.from(buffers.keys());
    if (remaining.length > 0) {
      activeBufferPath = null; // Clear so switchToBuffer doesn't try to save the closed buffer
      switchToBuffer(remaining[remaining.length - 1]);
    } else {
      // No buffers left — clear everything
      activeBufferPath = null;
      const emptyState = createEditorState("");
      setEditorState(emptyState);
      resetScrollSync();
      setActivePath("");
      updatePreview("");
      clearStatusBar();
      document.title = "MD Editor";
      showEmptyState();
    }
  }
}

async function saveFile() {
  const content = getContent();

  if (!activeBufferPath) {
    return saveFileAs();
  }

  try {
    await invoke("write_file", { path: activeBufferPath, content });
    const buf = buffers.get(activeBufferPath);
    if (buf) buf.isDirty = false;
    setTabDirty(activeBufferPath, false);
    updateTitle();
  } catch (e) {
    console.error("Failed to save:", e);
  }
}

async function saveFileAs() {
  const content = getContent();
  const path = await save({
    title: "Save File",
    filters: [{ name: "Markdown", extensions: ["md"] }],
  });

  if (path) {
    try {
      await invoke("write_file", { path, content });

      // If we had an active buffer, remove it under the old path
      if (activeBufferPath && activeBufferPath !== path) {
        const oldBuf = buffers.get(activeBufferPath);
        if (oldBuf) {
          buffers.delete(activeBufferPath);
          oldBuf.fileName = extractFileName(path);
          oldBuf.isDirty = false;
          const state = getEditorState();
          if (state) oldBuf.editorState = state;
          buffers.set(path, oldBuf);
          removeTab(activeBufferPath);
          addTab(path, oldBuf.fileName);
        }
      } else if (!activeBufferPath) {
        // No active buffer (e.g. welcome state) — create one
        const newFileName = extractFileName(path);
        const state = getEditorState();
        buffers.set(path, {
          editorState: state!,
          scrollTop: 0,
          isDirty: false,
          fileName: newFileName,
        });
        if (buffers.size === 1) showContentArea();
        addTab(path, newFileName);
      } else {
        // Same path
        const buf = buffers.get(path);
        if (buf) buf.isDirty = false;
      }

      activeBufferPath = path;
      setActiveTab(path);
      setTabDirty(path, false);
      setActivePath(path);
      updateTitle();
    } catch (e) {
      console.error("Failed to save:", e);
    }
  }
}

async function openFile() {
  const result = await openFileDialog();
  if (result) {
    handleFileOpen(result.path, result.content);
  }
}

function setupDivider() {
  const divider = document.getElementById("divider")!;
  const editorPane = document.getElementById("editor-pane")!;
  const previewPane = document.getElementById("preview-pane")!;

  let isDragging = false;

  divider.addEventListener("mousedown", (e) => {
    isDragging = true;
    divider.classList.add("dragging");
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const sidebarEl = document.getElementById("sidebar")!;
    const activityBarEl = document.getElementById("activity-bar")!;
    const containerLeft = activityBarEl.offsetWidth + sidebarEl.offsetWidth;
    const containerWidth = window.innerWidth - containerLeft;
    const relativeX = e.clientX - containerLeft;
    const ratio = Math.max(0.2, Math.min(0.8, relativeX / containerWidth));

    editorPane.style.flex = `${ratio}`;
    previewPane.style.flex = `${1 - ratio}`;
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      divider.classList.remove("dragging");
    }
  });
}

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", async (e) => {
    const mod = e.metaKey || e.ctrlKey;

    if (mod && e.key === "o") {
      e.preventDefault();
      await openFile();
    } else if (mod && e.shiftKey && e.key === "s") {
      e.preventDefault();
      await saveFileAs();
    } else if (mod && e.key === "s") {
      e.preventDefault();
      await saveFile();
    } else if (e.metaKey && (e.key === "=" || e.key === "+")) {
      e.preventDefault();
      applyFontSize(currentFontSize + 1);
    } else if (e.metaKey && e.key === "-") {
      e.preventDefault();
      applyFontSize(currentFontSize - 1);
    } else if (e.metaKey && e.key === "0") {
      e.preventDefault();
      applyFontSize(DEFAULT_FONT_SIZE);
    } else if ((e.metaKey || e.ctrlKey) && e.key === "w") {
      e.preventDefault();
      if (activeBufferPath) closeBuffer(activeBufferPath);
    }
  });
}

const WELCOME_TEXT = `# Welcome to MD Editor

Start typing your markdown here, and see the **live preview** on the right.

## Features

- **Live preview** with GitHub Flavored Markdown
- **Syntax highlighting** for code blocks
- **File management** - open and save files
- **Split pane** with resizable divider

## Example

Here's some code:

\`\`\`javascript
function hello(name) {
  console.log(\`Hello, \${name}!\`);
}
\`\`\`

> Tip: Use **Cmd+O** to open a file, **Cmd+S** to save.

| Feature | Status |
|---------|--------|
| Live Preview | Done |
| File Open/Save | Done |
| Syntax Highlighting | Done |
| Keyboard Shortcuts | Done |
`;

document.addEventListener("DOMContentLoaded", () => {
  const editorPane = document.getElementById("editor-pane")!;
  const previewContent = document.getElementById("preview-content")!;
  const fileTree = document.getElementById("file-tree")!;
  const openFolderBtn = document.getElementById("open-folder-btn")!;

  const previewPane = document.getElementById("preview-pane")!;
  const statusBar = document.getElementById("status-bar")!;

  const tabBar = document.getElementById("tab-bar")!;
  initTabBar(
    tabBar,
    (path) => switchToBuffer(path),
    (path) => closeBuffer(path)
  );

  initStatusBar(statusBar);
  initPreview(previewContent, resyncScroll);
  onCursorChange((line, col) => updateCursorPosition(line, col));
  initEditor(editorPane, handleEditorChange);
  applyFontSize(currentFontSize);
  initScrollSync(previewPane);
  initFileTree(fileTree, openFolderBtn, handleFileOpen);

  const activityBar = document.getElementById('activity-bar')!;
  const sidebar = document.getElementById('sidebar')!;
  initActivityBar(activityBar, sidebar);

  setupDivider();
  setupKeyboardShortcuts();

  listen<string>("zoom-action", (event) => {
    switch (event.payload) {
      case "zoom-in":
        applyFontSize(currentFontSize + 1);
        break;
      case "zoom-out":
        applyFontSize(currentFontSize - 1);
        break;
      case "reset-zoom":
        applyFontSize(DEFAULT_FONT_SIZE);
        break;
    }
  });

  // Load welcome content
  setContent(WELCOME_TEXT);
  updateWordCount(countWords(WELCOME_TEXT));
  updatePreview(WELCOME_TEXT);
  updateTitle();
});
