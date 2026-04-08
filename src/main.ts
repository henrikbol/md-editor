import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { initEditor, setContent, getContent } from "./editor";
import { initPreview, updatePreview } from "./preview";
import { initSidebar, openFileDialog, getActivePath, setActivePath } from "./sidebar";
import { initScrollSync, resyncScroll } from "./scroll-sync";

let currentFilePath: string | null = null;
let isDirty = false;

function updateTitle() {
  const fileName = currentFilePath
    ? currentFilePath.split("/").pop() ?? "Untitled"
    : "Untitled";
  const dirtyMark = isDirty ? " *" : "";
  document.title = `${fileName}${dirtyMark} - MD Editor`;
}

async function handleEditorChange(content: string) {
  isDirty = true;
  updateTitle();
  await updatePreview(content);
}

function handleFileOpen(path: string, content: string) {
  currentFilePath = path;
  setActivePath(path);
  setContent(content);
  isDirty = false;
  updateTitle();
  updatePreview(content);
}

async function saveFile() {
  const content = getContent();

  if (!currentFilePath) {
    return saveFileAs();
  }

  try {
    await invoke("write_file", { path: currentFilePath, content });
    isDirty = false;
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
      currentFilePath = path;
      setActivePath(path);
      isDirty = false;
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

    const sidebar = document.getElementById("sidebar")!;
    const containerLeft = sidebar.offsetWidth;
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
  const fileList = document.getElementById("file-list")!;
  const openFolderBtn = document.getElementById("open-folder-btn")!;

  const previewPane = document.getElementById("preview-pane")!;
  initPreview(previewContent, resyncScroll);
  initEditor(editorPane, handleEditorChange);
  initScrollSync(previewPane);
  initSidebar(fileList, openFolderBtn, handleFileOpen);
  setupDivider();
  setupKeyboardShortcuts();

  // Load welcome content
  setContent(WELCOME_TEXT);
  updatePreview(WELCOME_TEXT);
  updateTitle();
});
