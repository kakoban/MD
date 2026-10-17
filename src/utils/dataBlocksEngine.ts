import { MarkdownDoc } from '../types';
import { getEffectiveFolderPath, getFolderTheme, getDocUploadTime, sortDocs } from './docTree';
import { escapeHtml } from './markdownParser';

export interface DataBlockQuery {
  fromFolder?: string;
  tagFilter?: string;
  titleFilter?: string;
  sortBy: 'upload-desc' | 'upload-asc' | 'updated-desc' | 'title-asc';
  limit: number;
  view: 'table' | 'cards' | 'list';
}

export function parseStudioQuery(queryText: string): DataBlockQuery {
  const query: DataBlockQuery = {
    sortBy: 'upload-desc',
    limit: 10,
    view: 'table',
  };

  const lines = queryText.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;

    // FROM "folder" or FROM folder or FROM *
    const fromMatch = line.match(/^FROM\s+(?:"([^"]+)"|'([^']+)'|(\S+))/i);
    if (fromMatch) {
      const f = fromMatch[1] || fromMatch[2] || fromMatch[3];
      if (f && f !== '*') {
        query.fromFolder = f.trim();
      }
      continue;
    }

    // WHERE tags CONTAINS "tag"
    const tagMatch = line.match(/^WHERE\s+tags?\s+CONTAINS\s+(?:"([^"]+)"|'([^']+)'|(\S+))/i);
    if (tagMatch) {
      query.tagFilter = (tagMatch[1] || tagMatch[2] || tagMatch[3]).trim().toLowerCase();
      continue;
    }

    // WHERE title CONTAINS "title"
    const titleMatch = line.match(/^WHERE\s+title\s+CONTAINS\s+(?:"([^"]+)"|'([^']+)'|(\S+))/i);
    if (titleMatch) {
      query.titleFilter = (titleMatch[1] || titleMatch[2] || titleMatch[3]).trim().toLowerCase();
      continue;
    }

    // SORT upload DESC | upload ASC | updated DESC | title ASC
    const sortMatch = line.match(/^SORT\s+(upload|updated|title)\s+(ASC|DESC)?/i);
    if (sortMatch) {
      const field = sortMatch[1].toLowerCase();
      const dir = (sortMatch[2] || 'DESC').toUpperCase();
      if (field === 'upload') {
        query.sortBy = dir === 'ASC' ? 'upload-asc' : 'upload-desc';
      } else if (field === 'updated') {
        query.sortBy = 'updated-desc';
      } else if (field === 'title') {
        query.sortBy = 'title-asc';
      }
      continue;
    }

    // LIMIT 10
    const limitMatch = line.match(/^LIMIT\s+(\d+)/i);
    if (limitMatch) {
      query.limit = Math.max(1, Math.min(100, parseInt(limitMatch[1], 10)));
      continue;
    }

    // VIEW TABLE | CARDS | LIST
    const viewMatch = line.match(/^VIEW\s+(TABLE|CARDS|LIST)/i);
    if (viewMatch) {
      query.view = viewMatch[1].toLowerCase() as any;
      continue;
    }
  }

  return query;
}

export function executeStudioQuery(query: DataBlockQuery, allDocs: MarkdownDoc[]): MarkdownDoc[] {
  let matched = allDocs.filter((doc) => {
    // 1. Folder filter
    if (query.fromFolder) {
      const docFolder = getEffectiveFolderPath(doc.folderPath).toLowerCase();
      const qFolder = query.fromFolder.toLowerCase();
      if (!docFolder.includes(qFolder)) {
        return false;
      }
    }

    // 2. Tag filter
    if (query.tagFilter) {
      const tags = (doc.tags || []).map((t) => t.toLowerCase());
      if (!tags.some((t) => t.includes(query.tagFilter!))) {
        return false;
      }
    }

    // 3. Title filter
    if (query.titleFilter) {
      if (!doc.title.toLowerCase().includes(query.titleFilter)) {
        return false;
      }
    }

    return true;
  });

  // Sort
  matched = sortDocs(matched, query.sortBy);

  // Limit
  return matched.slice(0, query.limit);
}

export function renderDataBlockHtml(queryText: string, allDocs: MarkdownDoc[]): string {
  const query = parseStudioQuery(queryText);
  const results = executeStudioQuery(query, allDocs);

  if (results.length === 0) {
    return `
      <div class="datablock-container my-6 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs text-[var(--text-muted)] text-center">
        <div class="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-color)]/60">
          <span class="font-bold text-[#0061FF] flex items-center gap-1.5">
            <span>📊</span>
            <span>کوئری زنده اسناد (Live DataBlock)</span>
          </span>
          <span class="font-mono text-[10px]">۰ سند یافت شد</span>
        </div>
        <p class="py-2">هیچ سندی با معیارهای فیلتر مشخص‌شده همخوانی ندارد.</p>
      </div>
    `;
  }

  if (query.view === 'cards') {
    const cardsHtml = results
      .map((doc) => {
        const folder = getEffectiveFolderPath(doc.folderPath);
        const theme = getFolderTheme(folder);
        return `
          <div class="p-3.5 rounded-xl border ${theme.cardBorder} bg-[var(--bg-primary)] hover:shadow-md transition-all cursor-pointer synapse-wiki-link" data-synapse-target="${doc.id}">
            <div class="flex items-center justify-between gap-2 mb-1.5">
              <span class="font-bold text-xs text-[var(--text-primary)] truncate">${escapeHtml(doc.title || 'سند')}</span>
              <span class="text-[9px] px-1.5 py-0.2 rounded font-bold border ${theme.badge}">${escapeHtml(folder)}</span>
            </div>
            <p class="text-[11px] text-[var(--text-muted)] line-clamp-2">${escapeHtml(doc.content.replace(/[#*`~\[\]]/g, '').slice(0, 80))}</p>
          </div>
        `;
      })
      .join('');

    return `
      <div class="datablock-container my-6 p-4 rounded-2xl border border-[#0061FF]/30 bg-[#0061FF]/5 shadow-xs">
        <div class="flex items-center justify-between pb-2 mb-3 border-b border-[#0061FF]/20 text-xs">
          <span class="font-bold text-[#0061FF] flex items-center gap-1.5">
            <span>📊</span>
            <span>کوئری زنده اسناد (DataBlock)</span>
          </span>
          <span class="font-mono text-[10px] text-[var(--text-muted)]">${results.length} سند مطابق</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          ${cardsHtml}
        </div>
      </div>
    `;
  }

  // Default: VIEW TABLE
  const rowsHtml = results
    .map((doc) => {
      const folder = getEffectiveFolderPath(doc.folderPath);
      const theme = getFolderTheme(folder);
      const uploadTime = getDocUploadTime(doc);
      const dateStr = new Date(uploadTime).toLocaleDateString('fa-IR', {
        month: 'short',
        day: 'numeric',
      });

      return `
        <tr class="hover:bg-[var(--bg-tertiary)]/50 transition-colors cursor-pointer synapse-wiki-link" data-synapse-target="${doc.id}">
          <td class="py-2.5 px-3 font-bold text-xs text-[var(--text-primary)] truncate max-w-xs">
            <span class="text-[#0061FF] me-1">🔗</span>
            <span>${escapeHtml(doc.title || 'سند')}</span>
          </td>
          <td class="py-2.5 px-3">
            <span class="text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${theme.badge} inline-block">${escapeHtml(folder)}</span>
          </td>
          <td class="py-2.5 px-3 text-[11px] text-[var(--text-muted)] font-mono">${dateStr}</td>
          <td class="py-2.5 px-3 text-end">
            <button type="button" class="px-2 py-0.5 rounded bg-[#0061FF]/10 text-[#0061FF] hover:bg-[#0061FF]/20 text-[10px] font-bold">مطالعه</button>
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <div class="datablock-container my-6 rounded-2xl overflow-hidden border border-[#0061FF]/30 bg-[var(--bg-secondary)] shadow-xs">
      <div class="p-3 bg-[#0061FF]/10 border-b border-[#0061FF]/20 flex items-center justify-between text-xs">
        <span class="font-bold text-[#0061FF] flex items-center gap-1.5">
          <span>📊</span>
          <span>کوئری زنده اسناد (Live DataBlock)</span>
        </span>
        <span class="font-mono text-[10px] text-[var(--text-muted)]">${results.length} نتیجه</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-start">
          <thead>
            <tr class="border-b border-[var(--border-color)] text-[var(--text-muted)] font-bold bg-[var(--bg-tertiary)]/30">
              <th class="py-2 px-3 text-start">عنوان سند</th>
              <th class="py-2 px-3 text-start">پوشه / سرفصل</th>
              <th class="py-2 px-3 text-start">زمان ثبت</th>
              <th class="py-2 px-3 text-end">اقدام</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--border-color)]/60">
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
