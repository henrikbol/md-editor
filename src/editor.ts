import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";

export type ChangeCallback = (content: string) => void;
export type CursorCallback = (line: number, col: number) => void;

let view: EditorView | null = null;
let changeCallback: ChangeCallback | null = null;
let cursorCallback: CursorCallback | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const DEBOUNCE_MS = 150;

const fontSizeCompartment = new Compartment();

function fontSizeTheme(size: number) {
  return EditorView.theme({
    ".cm-content": { fontSize: size + "px" },
    ".cm-gutters": { fontSize: size + "px" },
  });
}

function buildExtensions() {
  return [
    lineNumbers(),
    highlightActiveLine(),
    drawSelection(),
    bracketMatching(),
    closeBrackets(),
    history(),
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    syntaxHighlighting(defaultHighlightStyle),
    oneDark,
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
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
    fontSizeCompartment.of(fontSizeTheme(14)),
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
