import { EditorState, Compartment, Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching } from "@codemirror/language";
import { atmosphericTheme } from "./atmospheric-theme";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { showEditorContextMenu } from "./editor-context-menu";

export type ChangeCallback = (content: string) => void;
export type CursorCallback = (line: number, col: number) => void;

let view: EditorView | null = null;

export function getEditorView(): EditorView | null {
  return view;
}
let changeCallback: ChangeCallback | null = null;
let cursorCallback: CursorCallback | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const DEBOUNCE_MS = 150;

const fontSizeCompartment = new Compartment();
const lineNumbersCompartment = new Compartment();
const lineWrappingCompartment = new Compartment();
const tabSizeCompartment = new Compartment();
const fontFamilyCompartment = new Compartment();

function fontSizeTheme(size: number) {
  return EditorView.theme({
    ".cm-content": { fontSize: size + "px" },
    ".cm-gutters": { fontSize: size + "px" },
  });
}

function fontFamilyTheme(family: string) {
  return EditorView.theme({
    ".cm-content": { fontFamily: family },
    ".cm-gutters": { fontFamily: family },
  });
}

function getStoredFontFamily(): string {
  return localStorage.getItem("settings.fontFamily") || "Inter, system-ui, -apple-system, sans-serif";
}

function getStoredLineNumbers(): boolean {
  const stored = localStorage.getItem("settings.lineNumbers");
  return stored === null ? true : stored === "true";
}

function getStoredWordWrap(): boolean {
  return localStorage.getItem("settings.wordWrap") === "true";
}

function getStoredTabSize(): number {
  return parseInt(localStorage.getItem("settings.tabSize") || "4", 10) || 4;
}

function buildExtensions() {
  const storedFontSize = parseInt(localStorage.getItem("editorFontSize") || "14", 10) || 14;

  return [
    lineNumbersCompartment.of(getStoredLineNumbers() ? lineNumbers() : []),
    highlightActiveLine(),
    drawSelection(),
    bracketMatching(),
    closeBrackets(),
    history(),
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    ...atmosphericTheme,
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap.filter(
        (binding) => binding.key !== "Mod-z" && binding.key !== "Mod-y"
      ),
      ...closeBracketsKeymap,
    ]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        debouncedChange(update.state.doc.toString());
      }
      if (update.selectionSet) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        cursorCallback?.(line.number, pos - line.from + 1);
      }
    }),
    EditorView.domEventHandlers({
      contextmenu(event, view) {
        event.preventDefault();
        showEditorContextMenu(event.clientX, event.clientY);
        return true;
      }
    }),
    fontSizeCompartment.of(fontSizeTheme(storedFontSize)),
    fontFamilyCompartment.of(fontFamilyTheme(getStoredFontFamily())),
    lineWrappingCompartment.of(getStoredWordWrap() ? EditorView.lineWrapping : []),
    tabSizeCompartment.of(EditorState.tabSize.of(getStoredTabSize())),
    EditorView.theme({
      "&": { height: "100%" },
      ".cm-scroller": { overflow: "auto" },
    }),
  ];
}

export function initEditor(container: HTMLElement, onChange: ChangeCallback): EditorView {
  changeCallback = onChange;

  const state = EditorState.create({
    doc: "",
    extensions: buildExtensions(),
  });

  view = new EditorView({ state, parent: container });
  return view;
}

function debouncedChange(content: string) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    changeCallback?.(content);
  }, DEBOUNCE_MS);
}

export function setContent(content: string) {
  if (!view) return;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: content },
  });
}

export function getContent(): string {
  return view?.state.doc.toString() ?? "";
}

export function onCursorChange(callback: CursorCallback): void {
  cursorCallback = callback;
}

export function setFontSize(size: number): void {
  if (!view) return;
  view.dispatch({
    effects: fontSizeCompartment.reconfigure(fontSizeTheme(size)),
  });
}

export function onEditorScroll(callback: (topLine: number) => void): void {
  if (!view) return;
  view.scrollDOM.addEventListener("scroll", () => {
    if (!view) return;
    const block = view.lineBlockAtHeight(view.scrollDOM.scrollTop);
    const line = view.state.doc.lineAt(block.from);
    callback(line.number);
  });
}

export function createEditorState(content: string): EditorState {
  return EditorState.create({
    doc: content,
    extensions: buildExtensions(),
  });
}

export function getEditorState(): EditorState | null {
  return view ? view.state : null;
}

export function setEditorState(state: EditorState): void {
  if (!view) return;
  view.setState(state);
}

export function getScrollDOM(): HTMLElement | null {
  return view ? view.scrollDOM : null;
}

export function wrapSelection(before: string, after: string) {
  const view = getEditorView();
  if (!view) return;
  const { from, to } = view.state.selection.main;
  if (from === to) {
    // No selection: insert markers and place cursor between them
    const insert = before + after;
    view.dispatch({
      changes: { from, insert },
      selection: { anchor: from + before.length }
    });
  } else {
    // Wrap selection
    const text = view.state.sliceDoc(from, to);
    view.dispatch({
      changes: { from, to, insert: before + text + after }
    });
  }
  view.focus();
}

export function insertAtCursor(text: string) {
  const view = getEditorView();
  if (!view) return;
  const { from } = view.state.selection.main;
  view.dispatch({ changes: { from, insert: text } });
  view.focus();
}

export function scrollToLine(line: number): void {
  if (!view) return;
  const lineCount = view.state.doc.lines;
  const clampedLine = Math.max(1, Math.min(line, lineCount));
  const lineInfo = view.state.doc.line(clampedLine);
  view.dispatch({
    selection: { anchor: lineInfo.from },
    effects: EditorView.scrollIntoView(lineInfo.from, { y: "center" }),
  });
  view.focus();
}

export function setLineNumbersVisible(enabled: boolean): void {
  if (!view) return;
  view.dispatch({
    effects: lineNumbersCompartment.reconfigure(enabled ? lineNumbers() : []),
  });
}

export function setLineWrapping(enabled: boolean): void {
  if (!view) return;
  view.dispatch({
    effects: lineWrappingCompartment.reconfigure(enabled ? EditorView.lineWrapping : []),
  });
}

export function setTabSize(size: number): void {
  if (!view) return;
  view.dispatch({
    effects: tabSizeCompartment.reconfigure(EditorState.tabSize.of(size)),
  });
}

export function setEditorFontFamily(family: string): void {
  if (!view) return;
  view.dispatch({
    effects: fontFamilyCompartment.reconfigure(fontFamilyTheme(family)),
  });
}
