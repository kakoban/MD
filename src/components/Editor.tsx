import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { EditorView, lineNumbers, highlightActiveLineGutter, highlightActiveLine, keymap } from '@codemirror/view';
import { EditorState, Compartment, EditorSelection } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { bracketMatching, defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { closeBrackets } from '@codemirror/autocomplete';
import { FontFamily } from '../types';

export interface EditorHandle {
  insertMarkdown: (prefix: string, suffix?: string, defaultText?: string) => void;
  insertHighlight: (color: string) => void;
  insertTable: (rows: number, cols: number) => void;
  insertCallout: (type: string) => void;
  scrollToLine: (line: number) => void;
  selectRange: (from: number, to: number) => void;
  focus: () => void;
  getTextarea: () => HTMLTextAreaElement | null;
}

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  fontFamily: FontFamily;
  direction: 'rtl' | 'ltr';
  showLineNumbers?: boolean;
  onCursorChange?: (line: number, col: number) => void;
  onSelectionChange?: (stats: { chars: number; words: number } | null) => void;
  onOpenSearch?: () => void;
  onSave?: () => void;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(({
  value,
  onChange,
  fontFamily,
  direction,
  showLineNumbers = true,
  onCursorChange,
  onSelectionChange,
  onOpenSearch,
  onSave,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isInternalChange = useRef(false);

  const onOpenSearchRef = useRef(onOpenSearch);
  onOpenSearchRef.current = onOpenSearch;

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onCursorChangeRef = useRef(onCursorChange);
  onCursorChangeRef.current = onCursorChange;

  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  const lineNumbersComp = useRef(new Compartment());
  const directionComp = useRef(new Compartment());

  // Helper to wrap selection with prefix and suffix
  const wrapSelection = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const view = viewRef.current;
    if (!view) return;

    const { state, dispatch } = view;
    const changes = state.changeByRange((range) => {
      const selected = state.sliceDoc(range.from, range.to);
      const text = selected || defaultText;
      const insert = `${prefix}${text}${suffix}`;
      return {
        changes: [{ from: range.from, to: range.to, insert }],
        range: EditorSelection.range(
          range.from + prefix.length,
          range.from + prefix.length + text.length
        ),
      };
    });

    dispatch(changes);
    view.focus();
  };

  useImperativeHandle(ref, () => ({
    insertMarkdown(prefix: string, suffix: string = '', defaultText: string = '') {
      wrapSelection(prefix, suffix, defaultText);
    },

    insertHighlight(color: string) {
      const prefix = color === 'yellow' ? '==' : `==${color}:`;
      const suffix = '==';
      wrapSelection(prefix, suffix, 'متن هایلایت');
    },

    insertTable(rows: number, cols: number) {
      const view = viewRef.current;
      if (!view) return;

      let tableMd = '\n\n';
      tableMd += '| ' + Array.from({ length: cols }, (_, i) => `ستون ${i + 1}`).join(' | ') + ' |\n';
      tableMd += '| ' + Array.from({ length: cols }, () => ':---').join(' | ') + ' |\n';
      for (let r = 0; r < rows; r++) {
        tableMd += '| ' + Array.from({ length: cols }, (_, c) => `داده ${r + 1}-${c + 1}`).join(' | ') + ' |\n';
      }
      tableMd += '\n';

      const main = view.state.selection.main;
      view.dispatch({
        changes: { from: main.from, to: main.to, insert: tableMd },
        selection: { anchor: main.from + tableMd.length },
      });
      view.focus();
    },

    insertCallout(type: string) {
      const view = viewRef.current;
      if (!view) return;

      const { state } = view;
      const main = state.selection.main;
      const selected = state.sliceDoc(main.from, main.to);
      const content = selected ? selected.split('\n').map(l => `> ${l}`).join('\n') : '> متن یادداشت خود را اینجا بنویسید.';
      const calloutMd = `\n> [!${type}]\n${content}\n\n`;

      view.dispatch({
        changes: { from: main.from, to: main.to, insert: calloutMd },
        selection: { anchor: main.from + calloutMd.length },
      });
      view.focus();
    },

    scrollToLine(line: number) {
      const view = viewRef.current;
      if (!view) return;
      const doc = view.state.doc;
      const targetLine = Math.min(Math.max(1, line), doc.lines);
      const lineInfo = doc.line(targetLine);
      view.dispatch({
        selection: { anchor: lineInfo.from },
        effects: EditorView.scrollIntoView(lineInfo.from, { y: 'center' }),
      });
      view.focus();
    },

    selectRange(from: number, to: number) {
      const view = viewRef.current;
      if (!view) return;
      const docLength = view.state.doc.length;
      const safeFrom = Math.min(Math.max(0, from), docLength);
      const safeTo = Math.min(Math.max(safeFrom, to), docLength);
      view.dispatch({
        selection: { anchor: safeFrom, head: safeTo },
        effects: EditorView.scrollIntoView(safeFrom, { y: 'center' }),
      });
      view.focus();
    },

    focus() {
      viewRef.current?.focus();
    },

    getTextarea() {
      return null;
    },
  }));

  // Initialize CodeMirror 6 View
  useEffect(() => {
    if (!containerRef.current) return;

    const editorTheme = EditorView.theme({
      '&': {
        height: '100%',
        backgroundColor: 'transparent',
        color: 'var(--text-primary)',
        fontSize: '15px',
      },
      '.cm-scroller': {
        overflow: 'auto',
        fontFamily: 'inherit',
        lineHeight: '1.75',
      },
      '.cm-content': {
        padding: '20px',
        caretColor: 'var(--text-primary)',
      },
      '&.cm-focused .cm-cursor': {
        borderLeftColor: 'var(--text-primary)',
        borderLeftWidth: '2px',
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
        backgroundColor: 'rgba(59, 130, 246, 0.28) !important',
      },
      '.cm-gutters': {
        backgroundColor: 'var(--gutter-bg)',
        color: 'var(--gutter-text)',
        borderRight: '1px solid var(--border-color)',
        padding: '0 6px',
        userSelect: 'none',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'transparent',
        color: 'var(--text-primary)',
        fontWeight: 'bold',
      },
      '.cm-activeLine': {
        backgroundColor: 'rgba(150, 150, 150, 0.05)',
      },
    });

    const customShortcuts = keymap.of([
      {
        key: 'Mod-b',
        run: () => {
          wrapSelection('**', '**', 'متن پررنگ');
          return true;
        },
      },
      {
        key: 'Mod-i',
        run: () => {
          wrapSelection('*', '*', 'متن مورب');
          return true;
        },
      },
      {
        key: 'Mod-h',
        run: () => {
          wrapSelection('==', '==', 'متن هایلایت');
          return true;
        },
      },
      {
        key: 'Mod-k',
        run: () => {
          wrapSelection('[', '](https://)', 'عنوان پیوند');
          return true;
        },
      },
      {
        key: 'Mod-f',
        run: () => {
          onOpenSearchRef.current?.();
          return true;
        },
      },
      {
        key: 'Mod-s',
        run: () => {
          onSaveRef.current?.();
          return true;
        },
      },
      indentWithTab,
    ]);

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbersComp.current.of(showLineNumbers ? lineNumbers() : []),
        directionComp.current.of(EditorView.editorAttributes.of({ dir: direction })),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        bracketMatching(),
        closeBrackets(),
        markdown(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        editorTheme,
        customShortcuts,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            isInternalChange.current = true;
            const newDoc = update.state.doc.toString();
            onChangeRef.current(newDoc);
          }

          if (update.selectionSet || update.docChanged) {
            const main = update.state.selection.main;
            const line = update.state.doc.lineAt(main.head);
            onCursorChangeRef.current?.(line.number, main.head - line.from + 1);

            if (!main.empty) {
              const selected = update.state.sliceDoc(main.from, main.to);
              const words = (selected.trim().match(/[\w؀-ۿ-]+/g) || []).length;
              onSelectionChangeRef.current?.({ chars: selected.length, words });
            } else {
              onSelectionChangeRef.current?.(null);
            }
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
    }
  }, [value]);

  // Sync direction
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: directionComp.current.reconfigure(EditorView.editorAttributes.of({ dir: direction })),
    });
  }, [direction]);

  // Sync line numbers toggle
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: lineNumbersComp.current.reconfigure(showLineNumbers ? lineNumbers() : []),
    });
  }, [showLineNumbers]);

  const fontClass =
    fontFamily === 'mono'
      ? 'font-mono'
      : fontFamily === 'serif'
      ? 'font-serif'
      : fontFamily === 'sans'
      ? 'font-sans'
      : 'font-sans';

  return (
    <div className={`editor-pane relative flex-1 h-full w-full overflow-hidden bg-[var(--bg-secondary)] ${fontClass}`}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
});

Editor.displayName = 'Editor';
