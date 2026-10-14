import { MarkdownDoc, DocSortOption } from "../types";

export interface DocTreeNode {
  name: string;
  fullPath: string;
  children: DocTreeNode[];
  docs: MarkdownDoc[];
}

export const DEFAULT_FOLDER_NAME = "عمومی";

export function getDocUploadTime(doc: MarkdownDoc): number {
  return doc.uploadedAt || doc.createdAt || doc.updatedAt || 0;
}

export function sortDocs(docs: MarkdownDoc[], sortBy: DocSortOption = 'upload-desc'): MarkdownDoc[] {
  const list = [...docs];
  switch (sortBy) {
    case 'upload-desc':
      return list.sort((a, b) => getDocUploadTime(b) - getDocUploadTime(a));
    case 'upload-asc':
      return list.sort((a, b) => getDocUploadTime(a) - getDocUploadTime(b));
    case 'updated-desc':
      return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    case 'title-asc':
      return list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'fa', { numeric: true }));
    default:
      return list.sort((a, b) => getDocUploadTime(b) - getDocUploadTime(a));
  }
}

export function getEffectiveFolderPath(folderPath?: string): string {
  const clean = (folderPath || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  return clean || DEFAULT_FOLDER_NAME;
}

export interface FolderTheme {
  border: string;
  headerBg: string;
  icon: string;
  badge: string;
  cardBorder: string;
}

export const FOLDER_THEMES: Record<string, FolderTheme> = {
  general: {
    border: "border-slate-500/30 hover:border-slate-500/50",
    headerBg: "bg-slate-500/5 hover:bg-slate-500/10",
    icon: "text-slate-400",
    badge: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    cardBorder: "hover:border-slate-500/50",
  },
  blue: {
    border: "border-sky-500/30 hover:border-sky-500/50",
    headerBg: "bg-sky-500/5 hover:bg-sky-500/10",
    icon: "text-sky-400",
    badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    cardBorder: "hover:border-sky-500/50",
  },
  emerald: {
    border: "border-emerald-500/30 hover:border-emerald-500/50",
    headerBg: "bg-emerald-500/5 hover:bg-emerald-500/10",
    icon: "text-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    cardBorder: "hover:border-emerald-500/50",
  },
  amber: {
    border: "border-amber-500/30 hover:border-amber-500/50",
    headerBg: "bg-amber-500/5 hover:bg-amber-500/10",
    icon: "text-amber-400",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    cardBorder: "hover:border-amber-500/50",
  },
  purple: {
    border: "border-purple-500/30 hover:border-purple-500/50",
    headerBg: "bg-purple-500/5 hover:bg-purple-500/10",
    icon: "text-purple-400",
    badge: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    cardBorder: "hover:border-purple-500/50",
  },
  rose: {
    border: "border-rose-500/30 hover:border-rose-500/50",
    headerBg: "bg-rose-500/5 hover:bg-rose-500/10",
    icon: "text-rose-400",
    badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    cardBorder: "hover:border-rose-500/50",
  },
  indigo: {
    border: "border-indigo-500/30 hover:border-indigo-500/50",
    headerBg: "bg-indigo-500/5 hover:bg-indigo-500/10",
    icon: "text-indigo-400",
    badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    cardBorder: "hover:border-indigo-500/50",
  },
};

const PALETTE_KEYS = ["blue", "emerald", "amber", "purple", "rose", "indigo"];

export function getFolderTheme(folderName?: string): FolderTheme {
  const norm = (folderName || "").trim().toLowerCase();
  if (!norm || norm === DEFAULT_FOLDER_NAME || norm === "general" || norm === "سایر اسناد") {
    return FOLDER_THEMES.general;
  }
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = (hash << 5) - hash + norm.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PALETTE_KEYS.length;
  return FOLDER_THEMES[PALETTE_KEYS[index]];
}

export function normalizeDocKey(title: string, folderPath?: string): string {
  const normTitle = (title || "")
    .trim()
    .toLowerCase()
    .replace(/\.(md|markdown|txt)$/i, "")
    .replace(/[\s\-_]+/g, "_");
  const normFolder = getEffectiveFolderPath(folderPath).toLowerCase();
  return `${normFolder}::${normTitle}`;
}

export function deduplicateDocs(docs: MarkdownDoc[]): MarkdownDoc[] {
  const map = new Map<string, MarkdownDoc>();
  // Sort oldest first so newer docs overwrite older duplicates
  const sorted = [...docs].sort((a, b) => getDocUploadTime(a) - getDocUploadTime(b));
  for (const doc of sorted) {
    const key = normalizeDocKey(doc.title, doc.folderPath);
    map.set(key, doc);
  }
  return sortDocs(Array.from(map.values()), 'upload-desc');
}

// ponytail: in-memory tree grouping by folderPath; upgrade to indexed tree if docs > 1000
export function buildDocTree(docs: MarkdownDoc[], sortBy: DocSortOption = 'upload-desc'): DocTreeNode {
  const root: DocTreeNode = { name: "", fullPath: "", children: [], docs: [] };
  const cleanDocs = deduplicateDocs(docs);

  cleanDocs.forEach((doc) => {
    const rawPath = getEffectiveFolderPath(doc.folderPath);
    const segments = rawPath.split("/").map((s) => s.trim()).filter(Boolean);
    let current = root;
    let currentPath = "";

    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      let child = current.children.find(
        (c) => c.name.trim().toLowerCase() === segment.toLowerCase()
      );
      if (!child) {
        child = { name: segment, fullPath: currentPath, children: [], docs: [] };
        current.children.push(child);
      }
      current = child;
    }
    current.docs.push(doc);
  });

  function sortTreeNodes(node: DocTreeNode) {
    node.docs = sortDocs(node.docs, sortBy);
    node.children.sort((a, b) => a.name.localeCompare(b.name, 'fa', { numeric: true }));
    node.children.forEach(sortTreeNodes);
  }
  sortTreeNodes(root);

  return root;
}

export function countTreeDocs(node: DocTreeNode): number {
  return node.docs.length + node.children.reduce((acc, c) => acc + countTreeDocs(c), 0);
}


