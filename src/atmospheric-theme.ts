import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

const theme = EditorView.theme(
  {
    "&": { background: "#0d131e", color: "#c8d6e5" },
    ".cm-content": { caretColor: "#97cfe0" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#97cfe0" },
    ".cm-selectionBackground, .cm-content ::selection": {
      background: "rgba(151, 207, 224, 0.15)",
    },
    "&.cm-focused .cm-selectionBackground": {
      background: "rgba(151, 207, 224, 0.2)",
    },
    ".cm-activeLine": { background: "rgba(151, 207, 224, 0.05)" },
    ".cm-gutters": {
      background: "#0d131e",
      color: "#4a5568",
      border: "none",
    },
    ".cm-activeLineGutter": { background: "rgba(151, 207, 224, 0.05)" },
    ".cm-matchingBracket": {
      background: "rgba(151, 207, 224, 0.25)",
      outline: "none",
    },
    ".cm-selectionMatch": { background: "rgba(151, 207, 224, 0.1)" },
    ".cm-searchMatch": { background: "rgba(151, 207, 224, 0.2)" },
  },
  { dark: true }
);

const highlighting = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.heading1, color: "#97cfe0", fontWeight: "bold" },
    { tag: tags.heading2, color: "#7eb8cc", fontWeight: "bold" },
    { tag: tags.heading3, color: "#a8c7d4", fontWeight: "bold" },
    {
      tag: [tags.heading4, tags.heading5, tags.heading6],
      color: "#8baab8",
    },
    { tag: tags.emphasis, color: "#b8dfe9", fontStyle: "italic" },
    { tag: tags.strong, color: "#c8d6e5", fontWeight: "bold" },
    { tag: tags.link, color: "#97cfe0", textDecoration: "underline" },
    { tag: tags.url, color: "#6e8d9c" },
    {
      tag: tags.monospace,
      color: "#97cfe0",
      background: "rgba(22, 28, 39, 0.5)",
    },
    { tag: tags.meta, color: "#4a5568" },
    { tag: tags.quote, color: "#7f8c9b", fontStyle: "italic" },
    { tag: tags.list, color: "#8baab8" },
    { tag: tags.comment, color: "#4a5568" },
    { tag: tags.string, color: "#a8c7d4" },
    { tag: tags.keyword, color: "#97cfe0" },
    { tag: tags.number, color: "#7eb8cc" },
    { tag: tags.operator, color: "#7f8c9b" },
    { tag: tags.definition(tags.variableName), color: "#b8dfe9" },
    { tag: tags.typeName, color: "#97cfe0" },
  ])
);

export const atmosphericTheme = [theme, highlighting];
