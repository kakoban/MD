import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { FontFamily } from '../types';

export interface EditorHandle {
  insertMarkdown: (prefix: string, suffix?: string, defaultText?: string) => void;
  insertHighlight: (color: string) => void;
  insertTable: (rows: number, cols: number) => void;
  insertCallout: (type: string) => void;
  scrollToLine: (line: number) => void;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    insertMarkdown(prefix: string, suffix: string = '', defaultText: string = '') {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = value.substring(start, end);
      const textToWrap = selected || defaultText;
      const replacement = `${prefix}${textToWrap}${suffix}`;

      const newValue = value.substring(0, start) + replacement + value.substring(end);
      onChange(newValue);

      // Re-focus and set selection
      setTimeout(() => {
        textarea.focus();
        if (selected) {
          textarea.setSelectionRange(start + prefix.length, start + prefix.length + textToWrap.length);
        } else {
          const cursorPos = start + prefix.length + textToWrap.length;
          textarea.setSelectionRange(cursorPos, cursorPos);
        }
      }, 0);
    },

    insertHighlight(color: string) {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = value.substring(start, end);
      const textToWrap = selected || 'متن هایلایت';
      const prefix = color === 'yellow' ? '==' : `==${color}:`;
      const suffix = '==';
      const replacement = `${prefix}${textToWrap}${suffix}`;

      const newValue = value.substring(0, start) + replacement + value.substring(end);
      onChange(newValue);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + textToWrap.length);
      }, 0);
    },

    insertTable(rows: number, cols: number) {
      const textarea = textareaRef.current;
      if (!textarea) return;

      let tableMd = '\n\n';
      // Header
      tableMd += '| ' + Array.from({ length: cols }, (_, i) => `ستون ${i + 1}`).join(' | ') + ' |\n';
      // Separator
      tableMd += '| ' + Array.from({ length: cols }, () => ':---').join(' | ') + ' |\n';
      // Rows
      for (let r = 0; r < rows; r++) {
        tableMd += '| ' + Array.from({ length: cols }, (_, c) => `داده ${r + 1}-${c + 1}`).join(' | ') + ' |\n';
      }
      tableMd += '\n';

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + tableMd + value.substring(end);
      onChange(newValue);

      setTimeout(() => {
        textarea.focus();
        const newPos = start + tableMd.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    },

    insertCallout(type: string) {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = value.substring(start, end);
      const content = selected ? selected.split('\n').map(l => `> ${l}`).join('\n') : '> متن یادداشت خود را اینجا بنویسید.';
      const calloutMd = `\n> [!${type}]\n${content}\n\n`;

      const newValue = value.substring(0, start) + calloutMd + value.substring(end);
      onChange(newValue);

      setTimeout(() => {
        textarea.focus();
      }, 0);
    },

    scrollToLine(line: number) {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const lines = value.split('\n');
      const targetLine = Math.min(line, lines.length);
      const charIndex = lines.slice(0, targetLine - 1).reduce((acc, l) => acc + l.length + 1, 0);

      textarea.focus();
      textarea.setSelectionRange(charIndex, charIndex);
      // approximate scroll
      const lineHeight = 24;
      textarea.scrollTop = (targetLine - 3) * lineHeight;
    },

    focus() {
      textareaRef.current?.focus();
    },

    getTextarea() {
      return textareaRef.current;
    }
  }));

  // Handle Tab, Auto-closing, and Shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Shortcuts:
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        wrapSelection('**', '**', 'متن پررنگ');
        return;
      }
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        wrapSelection('*', '*', 'متن مورب');
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        wrapSelection('==', '==', 'متن هایلایت');
        return;
      }
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        wrapSelection('[', '](https://example.com)', 'عنوان پیوند');
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (onOpenSearch) onOpenSearch();
        return;
      }
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (onSave) onSave();
        return;
      }
    }

    // Tab key indent/outdent
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (!e.shiftKey) {
        // Indent 2 spaces
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        onChange(newValue);
        setTimeout(() => {
          textarea.setSelectionRange(start + 2, start + 2);
        }, 0);
      } else {
        // Outdent if at line start
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        if (value.substring(lineStart, lineStart + 2) === '  ') {
          const newValue = value.substring(0, lineStart) + value.substring(lineStart + 2);
          onChange(newValue);
          setTimeout(() => {
            textarea.setSelectionRange(Math.max(lineStart, start - 2), Math.max(lineStart, end - 2));
          }, 0);
        }
      }
      return;
    }

    // Auto-close pairs: (), [], {}, "", '', ``
    const pairs: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
      '`': '`',
      '"': '"',
    };

    if (pairs[e.key]) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const closing = pairs[e.key];

      // If text is selected, wrap it
      if (start !== end) {
        e.preventDefault();
        const selected = value.substring(start, end);
        const newValue = value.substring(0, start) + e.key + selected + closing + value.substring(end);
        onChange(newValue);
        setTimeout(() => {
          textarea.setSelectionRange(start + 1, end + 1);
        }, 0);
      }
    }
  };

  const wrapSelection = (prefix: string, suffix: string, defaultText: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;
    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);
    setTimeout(() => {
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  // Sync scroll with line numbers
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Track cursor position and selection
  const handleSelectOrKeyUp = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Line & col
    if (onCursorChange) {
      const textBefore = value.substring(0, start);
      const lines = textBefore.split('\n');
      const line = lines.length;
      const col = lines[lines.length - 1].length + 1;
      onCursorChange(line, col);
    }

    // Selection stats
    if (onSelectionChange) {
      if (start !== end) {
        const selected = value.substring(start, end);
        const words = (selected.trim().match(/[\w\u0600-\u06FF-]+/g) || []).length;
        onSelectionChange({ chars: selected.length, words });
      } else {
        onSelectionChange(null);
      }
    }
  };

  const lines = value.split('\n');
  const lineCount = lines.length;

  const fontClass =
    fontFamily === 'mono'
      ? 'font-mono'
      : fontFamily === 'serif'
      ? 'font-serif'
      : fontFamily === 'sans'
      ? 'font-sans'
      : 'font-sans'; // default vazirmatn

  return (
    <div className="editor-pane relative flex-1 flex h-full overflow-hidden bg-[var(--bg-secondary)]">
      {/* Line Numbers Gutter */}
      {showLineNumbers && (
        <div
          ref={lineNumbersRef}
          aria-hidden="true"
          className="select-none py-5 px-2.5 w-14 text-end font-mono text-xs text-[var(--gutter-text)] bg-[var(--gutter-bg)] border-e border-[var(--border-color)] overflow-hidden shrink-0"
        >
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i} className="leading-7 h-7">
              {i + 1}
            </div>
          ))}
        </div>
      )}

      {/* Main Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        onKeyUp={handleSelectOrKeyUp}
        onClick={handleSelectOrKeyUp}
        dir={direction}
        spellCheck="false"
        placeholder="اینجا متن مارک‌دان خود را بنویسید یا یک فایل .md را در این قسمت بکشید و رها کنید..."
        className={`w-full h-full p-5 resize-none bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none text-sm md:text-base leading-7 tracking-wide ${fontClass}`}
        style={{
          tabSize: 2,
        }}
      />
    </div>
  );
});

Editor.displayName = 'Editor';
