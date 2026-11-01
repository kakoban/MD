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
import { DocStats, HeadingItem, MarkdownDoc } from '../types';
import { getRunnableLanguage } from './codeRunner';
import { resolveTransclusions, renderSynapseLinks } from './synapseEngine';
import { renderDataBlockHtml } from './dataBlocksEngine';

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

  // 1. Extract and preserve Block Math $$...$$ (enforcing LTR)
  let processed = md.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    const idx = mathBlocks.length;
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      mathBlocks.push(`<div class="katex-display-wrapper" style="direction: ltr !important; text-align: center !important;">${rendered}</div>`);
    } catch {
      mathBlocks.push(`<div class="katex-error" style="direction: ltr !important; text-align: left !important;">$$\n${escapeHtml(math)}\n$$</div>`);
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
      mathInlines.push(`<span class="katex-inline" style="direction: ltr !important; display: inline-block;">${rendered}</span>`);
    } catch {
      mathInlines.push(`<span class="katex-error" style="direction: ltr !important;">$${escapeHtml(math)}$</span>`);
    }
    return `%%MATHINLINE_${idx}%%`;
  });

  // 3. Highlight syntax: ==color:text== or ==text==
  processed = processed.replace(/==(?:(yellow|green|blue|pink|purple|orange):)?([^=\n\r]+?)==/g, (_, color, text) => {
    const chosenColor = color || 'yellow';
    return `<mark class="md-highlight md-highlight-${chosenColor} cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all" data-highlight-color="${chosenColor}" data-raw-text="${escapeHtml(text.trim())}">${text}</mark>`;
  });

  // 4. Page break markers (for printable A4 pagination)
  processed = processed.replace(/<!--\s*page[-_]?break\s*-->|\\pagebreak|\{\.page-break\}/gi, () => {
    return '\n\n<div class="page-break" aria-hidden="true"></div>\n\n';
  });

  // 5. In-text hashtags: #tag or #هشتگ (excluding Markdown headings # Title and Hex colors)
  processed = processed.replace(/(^|[\s(])#([a-zA-Z؀-ۿ][\w؀-ۿ-]*)(?=$|[\s),.!?])/g, (match, prefix, tag) => {
    if (/^[0-9a-fA-F]{3,8}$/.test(tag)) {
      return match;
    }
    return `${prefix}<span class="md-hashtag inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 cursor-pointer hover:bg-fuchsia-500/20 transition-colors" data-tag="${escapeHtml(tag)}"><span>#</span><span>${escapeHtml(tag)}</span></span>`;
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
  const calloutRegex = /<blockquote[^>]*>\s*<p[^>]*>(?:\[\!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\])\s*(?:<br\s*\/?>)?([\s\S]*?)<\/p>\s*<\/blockquote>/gi;
  result = result.replace(calloutRegex, (_, type, content) => {
    const t = type.toUpperCase();
    const config: Record<string, { title: string; color: string; border: string; bg: string; icon: string }> = {
      NOTE: {
        title: 'یادداشت',
        color: 'text-[#0061FF] dark:text-[#388bfd]',
        border: 'border-[#0061FF]/40',
        bg: 'bg-[#0061FF]/10',
        icon: '<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
      },
      TIP: {
        title: 'نکته کاربردی',
        color: 'text-emerald-500 dark:text-emerald-400',
        border: 'border-emerald-500/40',
        bg: 'bg-emerald-500/10',
        icon: '<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>',
      },
      IMPORTANT: {
        title: 'مهم',
        color: 'text-purple-500 dark:text-purple-400',
        border: 'border-purple-500/40',
        bg: 'bg-purple-500/10',
        icon: '<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>',
      },
      WARNING: {
        title: 'هشدار',
        color: 'text-amber-500 dark:text-amber-400',
        border: 'border-amber-500/40',
        bg: 'bg-amber-500/10',
        icon: '<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      },
      CAUTION: {
        title: 'توجه ویژه',
        color: 'text-rose-500 dark:text-rose-400',
        border: 'border-rose-500/40',
        bg: 'bg-rose-500/10',
        icon: '<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      },
    };
    const c = config[t] || config.NOTE;
    return `
      <div dir="auto" class="admonition admonition-${t.toLowerCase()} my-6 rounded-xl border ${c.border} ${c.bg} p-4 text-sm leading-[1.8] shadow-xs">
        <div class="flex items-center gap-2 font-bold mb-2 ${c.color}">
          ${c.icon}
          <span>${c.title}</span>
        </div>
        <div class="admonition-content text-[var(--text-secondary)] leading-[1.8]">${content}</div>
      </div>
    `;
  });

  // Enhance Task List items with custom checkbox and data attribute
  let taskIndex = 0;
  result = result.replace(/<li[^>]*>\s*\[([ xX])\]\s*([\s\S]*?)<\/li>/gi, (_, checked, content) => {
    const isChecked = checked.toLowerCase() === 'x';
    const id = taskIndex++;
    return `
      <li dir="auto" class="task-list-item flex items-start gap-3 my-3 ${isChecked ? 'task-done text-[var(--text-muted)] line-through' : ''}">
        <input
          type="checkbox"
          data-task-index="${id}"
          class="task-item-checkbox mt-1 h-4 w-4 rounded cursor-pointer accent-[#0061FF] text-[#0061FF] focus:ring-[#0061FF]"
          ${isChecked ? 'checked' : ''}
        />
        <span class="task-label flex-1 leading-[1.8]">${content}</span>
      </li>
    `;
  });

  return result;
}

// Custom marked renderer for headings, code blocks, tables, links
function createCustomRenderer(allDocs: MarkdownDoc[] = []) {
  const renderer = new marked.Renderer();

  // Paragraphs with smart directional auto-detection and 1.8 line height
  renderer.paragraph = function ({ tokens }) {
    const text = this.parser.parseInline(tokens);
    return `<p dir="auto" class="leading-[1.8] my-4 text-[var(--text-primary)]">${text}</p>\n`;
  };

  // List items with smart direction and 1.8 line height
  renderer.listitem = function (token) {
    const content = this.parser.parse(token.tokens);
    return `<li dir="auto" class="my-1.5 leading-[1.8]">${content}</li>\n`;
  };

  // Headings with smart direction, anchor IDs and break-after: avoid
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const rawText = tokens.map((t) => ('text' in t ? t.text : '')).join('');
    const id = slugify(rawText || `heading-${depth}`);
    return `
      <h${depth} id="${id}" dir="auto" class="group scroll-mt-24 font-bold tracking-tight text-[var(--text-primary)] relative break-after-avoid">
        <a href="#${id}" class="heading-anchor opacity-0 group-hover:opacity-100 transition-opacity text-[#0061FF] absolute -start-6 pe-1 text-sm font-normal select-none" title="پیوند به این بخش">#</a>
        ${text}
      </h${depth}>
    `;
  };

  // Inline code with explicit LTR
  renderer.codespan = function ({ text }) {
    return `<code class="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)] font-mono text-xs text-[var(--text-primary)]" style="direction: ltr !important; display: inline-block;">${text}</code>`;
  };

  // Code blocks with syntax highlighting, Mermaid rendering, live DataBlocks, and copy button
  renderer.code = function ({ text, lang }) {
    const cleanLang = (lang || '').toLowerCase().trim();

    // 1. Mermaid Diagram Vector Rendering
    if (cleanLang === 'mermaid') {
      const encodedCode = encodeURIComponent(text);
      return `
        <div class="mermaid-block-wrapper my-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden shadow-xs" data-mermaid-code="${encodedCode}">
          <div class="mermaid-header flex items-center justify-between px-3 py-2 bg-[var(--bg-tertiary)]/60 border-b border-[var(--border-color)] text-xs text-[var(--text-muted)] select-none">
            <span class="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#0061FF]">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
              <span>نمودار Mermaid</span>
            </span>
            <button type="button" data-code="${encodedCode}" class="code-copy-btn flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors text-[11px] cursor-pointer" title="کپی کد نمودار">
              <span>کپی کد</span>
            </button>
          </div>
          <div class="mermaid-render-container p-4 overflow-x-auto flex justify-center items-center min-h-[100px] dir-ltr text-center">
            <div class="mermaid-loading flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <svg class="w-4 h-4 animate-spin text-[#0061FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="10"/></svg>
              <span>در حال رسم نمودار وکتور...</span>
            </div>
          </div>
        </div>
      `;
    }

    // 2. DataBlocks Studio Queries
    if (cleanLang === 'studio-query' || cleanLang === 'datablock') {
      return renderDataBlockHtml(text, allDocs);
    }

    // 3. Regular Code Blocks with Prism Highlight and Enforced LTR
    const validLang = cleanLang && Prism.languages[cleanLang] ? cleanLang : null;
    let highlighted: string;

    if (validLang) {
      try {
        highlighted = Prism.highlight(text, Prism.languages[validLang], validLang);
      } catch {
        highlighted = escapeHtml(text);
      }
    } else if (cleanLang === 'typescript' || cleanLang === 'ts') {
      highlighted = Prism.highlight(text, Prism.languages.typescript || Prism.languages.javascript, 'typescript');
    } else {
      highlighted = escapeHtml(text);
    }

    const displayLang = cleanLang || 'code';
    const lineCount = text.split('\n').length;
    const runnableLang = getRunnableLanguage(cleanLang);

    const runBtn = runnableLang
      ? `
          <button
            type="button"
            data-run-code="${encodeURIComponent(text)}"
            data-run-lang="${runnableLang}"
            class="code-run-btn flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-all text-xs font-bold cursor-pointer active:scale-95 shadow-xs"
            title="اجرای کد (${runnableLang})"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <span>اجرا</span>
          </button>
        `
      : '';

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
          <div class="flex items-center gap-2">
            ${runBtn}
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
        </div>
        <pre class="p-4 overflow-x-auto font-mono text-sm leading-relaxed text-neutral-200" style="direction: ltr !important; text-align: left !important;"><code class="language-${displayLang}">${highlighted}</code></pre>
        <div class="code-runner-output hidden border-t border-neutral-800 bg-neutral-950 p-4 text-xs font-mono"></div>
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

  // Blockquotes with smart direction and 1.8 line height
  renderer.blockquote = function ({ tokens }) {
    const body = this.parser.parse(tokens);
    return `<blockquote dir="auto" class="border-s-4 border-[#0061FF]/80 ps-5 pe-3 py-2 my-6 text-[var(--text-secondary)] italic bg-[#0061FF]/5 rounded-e-xl leading-[1.8]">${body}</blockquote>`;
  };

  return renderer;
}

// Main parser function
export async function parseMarkdownToHtml(markdown: string, allDocs: MarkdownDoc[] = []): Promise<string> {
  if (!markdown) return '';

  // 0. Resolve live block/heading embeds (![[Doc#Heading]])
  const withTransclusions = allDocs.length > 0 ? resolveTransclusions(markdown, allDocs) : markdown;

  const { processed, mathBlocks, mathInlines } = preprocessMarkdown(withTransclusions);

  marked.setOptions({
    gfm: true,
    breaks: true,
    renderer: createCustomRenderer(allDocs),
  });

  const parsed = await marked.parse(processed);
  const postprocessed = postprocessHtml(parsed, mathBlocks, mathInlines);

  // Convert [[Doc#Heading|Label]] to clickable links
  return renderSynapseLinks(postprocessed);
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

// Extract all inline #hashtags from markdown text
export function extractInlineTags(markdown: string): string[] {
  if (!markdown) return [];
  const tags = new Set<string>();
  const regex = /(?:^|[\s(])#([a-zA-Z؀-ۿ][\w؀-ۿ-]*)(?=$|[\s),.!?])/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    const tag = match[1];
    if (!/^[0-9a-fA-F]{3,8}$/.test(tag)) {
      tags.add(tag);
    }
  }
  return Array.from(tags);
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
