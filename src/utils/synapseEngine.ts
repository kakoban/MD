import { MarkdownDoc } from '../types';
import { slugify, escapeHtml } from './markdownParser';

export interface SynapseLinkMatch {
  raw: string;
  targetDocTitle: string;
  heading?: string;
  label?: string;
  isTransclusion: boolean;
}

// Extract section text under a specific heading from markdown content
export function extractSectionByHeading(content: string, headingText: string): string | null {
  if (!content || !headingText) return null;
  const targetSlug = slugify(headingText);

  const lines = content.split(/\r?\n/);
  let capturing = false;
  let targetDepth = 0;
  const capturedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      const depth = headingMatch[1].length;
      const title = headingMatch[2].trim();
      const slug = slugify(title);

      if (!capturing) {
        if (slug === targetSlug || title.toLowerCase() === headingText.toLowerCase()) {
          capturing = true;
          targetDepth = depth;
          continue;
        }
      } else {
        // Stop if we hit a heading of equal or higher level
        if (depth <= targetDepth) {
          break;
        }
      }
    }

    if (capturing) {
      capturedLines.push(line);
    }
  }

  return capturing ? capturedLines.join('\n').trim() : null;
}

// Preprocess ![[Doc#Heading]] transclusions before markdown rendering
export function resolveTransclusions(
  markdown: string,
  allDocs: MarkdownDoc[],
  visitedDocIds: Set<string> = new Set()
): string {
  // Regex: ![[Doc Title#Heading|Label]] or ![[Doc Title]]
  return markdown.replace(/!\[\[([^\]\n]+)\]\]/g, (match, inner) => {
    const parts = inner.split('|')[0].trim();
    const [rawDocTitle, rawHeading] = parts.split('#');
    const docTitle = rawDocTitle.trim();
    const heading = rawHeading ? rawHeading.trim() : null;

    const targetDoc = allDocs.find(
      (d) => d.title.trim().toLowerCase() === docTitle.toLowerCase()
    );

    if (!targetDoc) {
      return `\n> ⚠️ *سند مرجع «${escapeHtml(docTitle)}» یافت نشد*\n`;
    }

    // Guard against circular transclusions
    if (visitedDocIds.has(targetDoc.id)) {
      return `\n> ⚠️ *ارجاع بازگشتی (حلقه) به سند «${escapeHtml(docTitle)}» نادیده گرفته شد*\n`;
    }

    visitedDocIds.add(targetDoc.id);

    let contentToEmbed = targetDoc.content;
    if (heading) {
      const section = extractSectionByHeading(targetDoc.content, heading);
      if (section !== null) {
        contentToEmbed = section;
      } else {
        return `\n> ⚠️ *بخش «${escapeHtml(heading)}» در سند «${escapeHtml(docTitle)}» یافت نشد*\n`;
      }
    }

    // Embed in styled blockquote with source attribution
    const rendered = `\n<div class="synapse-transclusion-block my-4 p-4 rounded-xl border border-[#0061FF]/30 bg-[#0061FF]/5 shadow-xs">
<div class="flex items-center justify-between pb-2 mb-2 border-b border-[#0061FF]/20 text-[11px] font-bold text-[#0061FF]">
  <span class="flex items-center gap-1.5 cursor-pointer hover:underline" data-synapse-target="${escapeHtml(targetDoc.id)}" data-synapse-heading="${heading ? escapeHtml(heading) : ''}">
    🔗 ${escapeHtml(targetDoc.title)}${heading ? ` ❯ ${escapeHtml(heading)}` : ''}
  </span>
  <span class="text-[10px] text-[var(--text-muted)] font-normal">جاسازی زنده (Live Embed)</span>
</div>\n\n${contentToEmbed}\n\n</div>\n`;

    return rendered;
  });
}

// Convert [[Doc Title#Heading|Label]] into clickable HTML links
export function renderSynapseLinks(html: string): string {
  // Negative lookbehind ensures we don't match transclusions
  return html.replace(/(?<!\!)\[\[([^\]\n]+)\]\]/g, (match, inner) => {
    const [pathPart, labelPart] = inner.split('|');
    const [rawTitle, rawHeading] = pathPart.split('#');
    const title = rawTitle.trim();
    const heading = rawHeading ? rawHeading.trim() : null;
    const label = labelPart ? labelPart.trim() : (heading ? `${title} > ${heading}` : title);

    return `<a href="javascript:void(0)" class="synapse-wiki-link inline-flex items-center gap-1 font-semibold text-[#0061FF] hover:text-[#0050d4] hover:underline px-1 py-0.5 rounded bg-[#0061FF]/10 text-xs transition-colors" data-synapse-title="${escapeHtml(title)}" data-synapse-heading="${heading ? escapeHtml(heading) : ''}" title="پرش به سند: ${escapeHtml(title)}${heading ? ` (${escapeHtml(heading)})` : ''}"><span>🔗</span><span>${escapeHtml(label)}</span></a>`;
  });
}

// Find all inbound links (backlinks) pointing to a target document
export function getInboundSynapses(
  targetDocTitle: string,
  allDocs: MarkdownDoc[]
): { sourceDoc: MarkdownDoc; context: string }[] {
  if (!targetDocTitle) return [];
  const targetLower = targetDocTitle.trim().toLowerCase();
  const results: { sourceDoc: MarkdownDoc; context: string }[] = [];

  allDocs.forEach((doc) => {
    if (doc.title.trim().toLowerCase() === targetLower) return;
    const regex = new RegExp(`\\[\\[${targetDocTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[#|][^\\]]+)?\\]\\]`, 'i');
    if (regex.test(doc.content)) {
      // Extract a line snippet
      const line = doc.content.split(/\r?\n/).find((l) => regex.test(l)) || '';
      results.push({
        sourceDoc: doc,
        context: line.replace(/[#*`~\[\]]/g, '').slice(0, 100),
      });
    }
  });

  return results;
}
