import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// CSS variables update in place when brightness or palette changes, preserving
// the current document, selection and undo history in every code block.
export const editorPalette = [
  EditorView.theme({
    '&': { backgroundColor: 'var(--site-code)', color: 'var(--site-text)' },
    '.cm-content': { caretColor: 'var(--site-accent)' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--site-accent)' },
    '.cm-gutters': { backgroundColor: 'var(--site-code)', color: 'var(--site-muted)', border: 'none' },
    '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'color-mix(in srgb, var(--site-accent) 8%, transparent)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'color-mix(in srgb, var(--site-accent) 24%, transparent)' },
  }),
  syntaxHighlighting(HighlightStyle.define([
    { tag: tags.comment, color: 'var(--site-comment)', fontStyle: 'italic' },
    { tag: [tags.keyword, tags.operator, tags.modifier], color: 'var(--site-keyword)' },
    { tag: [tags.string, tags.regexp], color: 'var(--site-string)' },
    { tag: [tags.number, tags.bool, tags.null, tags.atom], color: 'var(--site-number)' },
    { tag: [tags.function(tags.variableName), tags.typeName, tags.className, tags.tagName], color: 'var(--site-function)' },
    { tag: [tags.variableName, tags.propertyName, tags.punctuation], color: 'var(--site-text)' },
  ])),
];
