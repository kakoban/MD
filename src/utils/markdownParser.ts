import { marked } from 'marked';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-yaml';
import katex from 'katex';
import { DocStats, HeadingItem } from '../types';

// Helper to escape HTML characters
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Generate slug for heading IDs
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Pre-process markdown for custom features before passing to marked
function preprocessMarkdown(md: string): { processed: string; mathBlocks: string[]; mathInlines: string[] } {
  const mathBlocks: string[] = [];
  const mathInlines: string[] = [];

  // 1. Extract and preserve Block Math $$...$$
  let processed = md.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    const idx = mathBlocks.length;
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      mathBlocks.push(`<div class="katex-display-wrapper">${rendered}</div>`);
    } catch {
      mathBlocks.push(`<div class="katex-error">$$\n${escapeHtml(math)}\n$$</div>`);
    }
    return `%%MATHBLOCK_${idx}%%`;
  });

  // 2. Extract and preserve Inline Math $...$ (avoiding currency $10)
  processed = processed.replace(/(?<!\$)\$([^\$\n\r]+?)\$(?!\$)/g, (match, math) => {
    if (/^\d+(\.\d+)?$/.test(math.trim())) {
      return match; // likely currency, leave as is
    }
    const idx = mathInlines.length;
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      mathInlines.push(rendered);
    } catch {
      mathInlines.push(`<span class="katex-error">$${escapeHtml(math)}$</span>`);
    }
    return `%%MATHINLINE_${idx}%%`;
  });

  // 3. Highlight syntax: ==color:text== or ==text==
  // Supports: yellow, green, blue, pink, purple, orange
  processed = processed.replace(/==(?:(yellow|green|blue|pink|purple|orange):)?([^=\n\r]+?)==/g, (_, color, text) => {
    const chosenColor = color || 'yellow';
    return `<mark class="md-highlight md-highlight-${chosenColor} cursor-pointer hover:ring-2 hover:ring-amber-500/50 transition-all" data-highlight-color="${chosenColor}" data-raw-text="${escapeHtml(text.trim())}">${text}</mark>`;
  });

  return { processed, mathBlocks, mathInlines };
}

// Post-process HTML to restore math placeholders, handle GitHub callouts and task checkboxes
function postprocessHtml(html: string, mathBlocks: string[], mathInlines: string[]): string {
  let result = html;

  // Restore math blocks
  result = result.replace(/%%MATHBLOCK_(\d+)%%/g, (_, id) => mathBlocks[Number(id)] || '');

  // Restore math inlines
  result = result.replace(/%%MATHINLINE_(\d+)%%/g, (_, id) => mathInlines[Number(id)] || '');

  // GitHub / Obsidian callouts / admonitions:
  // e.g. <blockquote><p>[!NOTE]<br>content</p></blockquote>
  const calloutRegex = /<blockquote>\s*<p>(?:\[\!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\])\s*(?:<br\s*\/?>)?([\s\S]*?)<\/p>\s*<\/blockquote>/gi;
  result = result.replace(calloutRegex, (_, type, content) => {
    const upperType = type.toUpperCase();
    const config: Record<string, { label: string; icon: string; border: string; bg: string; text: string }> = {
      NOTE: {
        label: 'نکته / Note',
        icon: 'ℹ️',
        border: 'border-blue-500',
        bg: 'bg-blue-500/10 text-blue-100',
        text: 'text-blue-400',
      },
      TIP: {
        label: 'ترفند / Tip',
        icon: '💡',
        border: 'border-emerald-500',
        bg: 'bg-emerald-500/10 text-emerald-100',
        text: 'text-emerald-400',
      },
      IMPORTANT: {
        label: 'مهم / Important',
        icon: '📌',
        border: 'border-purple-500',
        bg: 'bg-purple-500/10 text-purple-100',
        text: 'text-purple-400',
      },
      WARNING: {
        label: 'هشدار / Warning',
        icon: '⚠️',
        border: 'border-amber-500',
        bg: 'bg-amber-500/10 text-amber-100',
        text: 'text-amber-400',
      },
      CAUTION: {
        label: 'احتیاط / Danger',
        icon: '🛑',
        border: 'border-rose-500',
        bg: 'bg-rose-500/10 text-rose-100',
        text: 'text-rose-400',
      },
    };

    const cfg = config[upperType] || config.NOTE;

    return `
      <div class="admonition admonition-${upperType.toLowerCase()} my-4 rounded-xl border-l-4 ${cfg.border} ${cfg.bg} p-4 text-sm transition-all shadow-sm">
        <div class="flex items-center gap-2 font-semibold ${cfg.text} mb-2">
          <span>${cfg.icon}</span>
          <span>${cfg.label}</span>
        </div>
        <div class="leading-relaxed opacity-95">
          ${content}
        </div>
      </div>
    `;
  });

  // Enhance Task List items with custom checkbox and data attribute
  let taskIndex = 0;
  result = result.replace(/<li>\s*\[([ xX])\]\s*([\s\S]*?)<\/li>/gi, (_, checked, content) => {
    const isChecked = checked.toLowerCase() === 'x';
    const id = taskIndex++;
    return `
      <li class="task-list-item flex items-start gap-3 my-3 ${isChecked ? 'task-done text-[var(--text-muted)] line-through' : ''}">
        <input 
          type="checkbox" 
          data-task-index="${id}" 
          class="task-item-checkbox mt-1 h-4 w-4 rounded cursor-pointer accent-amber-500 text-amber-600 focus:ring-amber-500"
          ${isChecked ? 'checked' : ''} 
        />
        <span class="task-label flex-1 leading-relaxed">${content}</span>
      </li>
    `;
  });

  return result;
}

// Custom marked renderer for headings, code blocks, tables, links
function createCustomRenderer() {
  const renderer = new marked.Renderer();

  // Headings with anchor IDs
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const rawText = tokens.map((t) => ('text' in t ? t.text : '')).join('');
    const id = slugify(rawText || `heading-${depth}`);
    return `
      <h${depth} id="${id}" class="group scroll-mt-24 font-bold tracking-tight text-[var(--text-primary)] relative">
        <a href="#${id}" class="heading-anchor opacity-0 group-hover:opacity-100 transition-opacity text-amber-500 absolute -start-6 pe-1 text-sm font-normal select-none" title="پیوند به این بخش">#</a>
        ${text}
      </h${depth}>
    `;
  };

  // Code blocks with syntax highlighting and copy button
  renderer.code = function ({ text, lang }) {
    const validLang = lang && Prism.languages[lang] ? lang : null;
    let highlighted: string;

    if (validLang) {
      try {
        highlighted = Prism.highlight(text, Prism.languages[validLang], validLang);
      } catch {
        highlighted = escapeHtml(text);
      }
    } else if (lang === 'typescript' || lang === 'ts') {
      highlighted = Prism.highlight(text, Prism.languages.typescript || Prism.languages.javascript, 'typescript');
    } else {
      highlighted = escapeHtml(text);
    }

    const displayLang = lang || 'code';
    const lineCount = text.split('\n').length;

    return `
      <div class="code-block-container my-6 rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950/80 shadow-md">
        <div class="code-block-header flex items-center justify-between px-4 py-2 bg-neutral-900/90 border-b border-neutral-800/80 text-xs text-neutral-400 select-none">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-rose-500/70 inline-block"></span>
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500/70 inline-block"></span>
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500/70 inline-block"></span>
            <span class="font-mono text-neutral-300 font-medium ms-1 uppercase">${displayLang}</span>
            <span class="text-neutral-600">·</span>
            <span class="text-neutral-500">${lineCount} خط</span>
          </div>
          <button 
            type="button" 
            data-code="${encodeURIComponent(text)}" 
            class="code-copy-btn flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors text-xs cursor-pointer"
            title="کپی کد"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
            <span>کپی</span>
          </button>
        </div>
        <pre class="p-4 overflow-x-auto font-mono text-sm leading-relaxed text-neutral-200"><code class="language-${displayLang}">${highlighted}</code></pre>
      </div>
    `;
  };

  // High-quality responsive tables with precise cell alignment and styling
  renderer.table = function (token) {
    let headerCells = '';
    for (let j = 0; j < token.header.length; j++) {
      headerCells += this.tablecell(token.header[j]);
    }
    const thead = `<thead class="table-header"><tr>${headerCells}</tr></thead>`;

    let bodyRows = '';
    for (let i = 0; i < token.rows.length; i++) {
      let rowCells = '';
      for (let j = 0; j < token.rows[i].length; j++) {
        rowCells += this.tablecell(token.rows[i][j]);
      }
      bodyRows += `<tr class="table-row">${rowCells}</tr>`;
    }
    const tbody = `<tbody class="table-body">${bodyRows}</tbody>`;

    return `
      <div class="table-responsive-wrapper my-8 overflow-x-auto rounded-xl shadow-xs">
        <table class="custom-markdown-table w-full text-sm text-start border-collapse">
          ${thead}
          ${tbody}
        </table>
      </div>
    `;
  };

  renderer.tablecell = function (token) {
    const isHeader = 'header' in token ? Boolean(token.header) : false;
    const align = token.align;
    const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-end' : align === 'left' ? 'text-start' : '';
    const alignAttr = align ? `align="${align}"` : '';
    const tag = isHeader ? 'th' : 'td';
    const content = token.tokens ? this.parser.parseInline(token.tokens) : (token.text || '');
    return `<${tag} class="table-cell ${alignClass}" ${alignAttr}>${content}</${tag}>`;
  };

  // Blockquotes
  renderer.blockquote = function ({ tokens }) {
    const body = this.parser.parse(tokens);
    return `<blockquote class="border-s-4 border-amber-500/80 ps-5 pe-3 py-2 my-6 text-[var(--text-secondary)] italic bg-amber-500/5 rounded-e-xl">${body}</blockquote>`;
  };

  return renderer;
}

// Main parser function
export async function parseMarkdownToHtml(markdown: string): Promise<string> {
  if (!markdown) return '';

  const { processed, mathBlocks, mathInlines } = preprocessMarkdown(markdown);

  marked.setOptions({
    gfm: true,
    breaks: true,
    renderer: createCustomRenderer(),
  });

  const parsed = await marked.parse(processed);
  return postprocessHtml(parsed, mathBlocks, mathInlines);
}

// Extract headings for Table of Contents / Outline
export function extractHeadings(markdown: string): HeadingItem[] {
  const headings: HeadingItem[] = [];
  const lines = markdown.split('\n');

  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const rawText = match[2].trim();
      // Remove inline markdown markers for outline title
      const cleanText = rawText
        .replace(/==(?:[\w]+:)?(.+?)==/g, '$1')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
        .replace(/\$(.+?)\$/g, '$1');

      headings.push({
        id: slugify(cleanText || `section-${index}`),
        text: cleanText,
        level,
        line: index + 1,
      });
    }
  });

  return headings;
}

// Calculate document statistics
export function calculateStats(text: string): DocStats {
  if (!text.trim()) {
    return {
      words: 0,
      chars: 0,
      charsNoSpaces: 0,
      lines: 1,
      readingTimeMin: 0,
      headingsCount: 0,
      tasksCount: { total: 0, completed: 0 },
    };
  }

  // Word count with Unicode support for Persian/Arabic and Latin
  const wordsArray = text.trim().match(/[\w\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF-]+/g);
  const words = wordsArray ? wordsArray.length : 0;
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s+/g, '').length;
  const lines = text.split('\n').length;
  const readingTimeMin = Math.max(1, Math.ceil(words / 180));

  // Headings
  const headingsCount = (text.match(/^#{1,6}\s+.+$/gm) || []).length;

  // Tasks
  const totalTasks = (text.match(/^[\s]*[-*+]\s+\[[ xX]\]\s+/gm) || []).length;
  const completedTasks = (text.match(/^[\s]*[-*+]\s+\[[xX]\]\s+/gm) || []).length;

  return {
    words,
    chars,
    charsNoSpaces,
    lines,
    readingTimeMin,
    headingsCount,
    tasksCount: {
      total: totalTasks,
      completed: completedTasks,
    },
  };
}

// Detect language text direction
export function detectDirection(text: string): 'rtl' | 'ltr' {
  if (!text) return 'rtl';
  const persianArabicRegex = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const firstHundredChars = text.slice(0, 300);
  return persianArabicRegex.test(firstHundredChars) ? 'rtl' : 'ltr';
}

// Toggle a task item at given task index in raw markdown
export function toggleTaskInMarkdown(markdown: string, targetTaskIndex: number): string {
  let currentIndex = 0;
  return markdown.replace(/^([\s]*[-*+]\s+\[)([ xX])(\]\s+.*)$/gm, (match, prefix, checked, suffix) => {
    if (currentIndex === targetTaskIndex) {
      currentIndex++;
      const newCheck = checked.toLowerCase() === 'x' ? ' ' : 'x';
      return `${prefix}${newCheck}${suffix}`;
    }
    currentIndex++;
    return match;
  });
}
