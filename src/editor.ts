import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";

export type ChangeCallback = (content: string) => void;

let view: EditorView | null = null;
let changeCallback: ChangeCallback | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const DEBOUNCE_MS = 150;

export function initEditor(container: HTMLElement, onChange: ChangeCallback): EditorView {
  changeCallback = onChange;

  const state = EditorState.create({
    doc: "",
    extensions: [
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
      }),
      EditorView.theme({
        "&": { height: "100%" },
        ".cm-scroller": { overflow: "auto" },
      }),
    ],
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
