import { MarkdownDoc } from "../types";

export interface DocTreeNode {
  name: string;
  fullPath: string;
  children: DocTreeNode[];
  docs: MarkdownDoc[];
}

export function normalizeDocKey(title: string, folderPath?: string): string {
  const normTitle = (title || "")
    .trim()
    .toLowerCase()
    .replace(/\.(md|markdown|txt)$/i, "")
    .replace(/[\s\-_]+/g, "_");
  const normFolder = (folderPath || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
  return `${normFolder}::${normTitle}`;
}

export function deduplicateDocs(docs: MarkdownDoc[]): MarkdownDoc[] {
  const map = new Map<string, MarkdownDoc>();
  // Sort oldest first so newer docs overwrite older duplicates
  const sorted = [...docs].sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
  for (const doc of sorted) {
    const key = normalizeDocKey(doc.title, doc.folderPath);
    map.set(key, doc);
  }
  return Array.from(map.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

// ponytail: in-memory tree grouping by folderPath; upgrade to indexed tree if docs > 1000
export function buildDocTree(docs: MarkdownDoc[]): DocTreeNode {
  const root: DocTreeNode = { name: "", fullPath: "", children: [], docs: [] };
  const cleanDocs = deduplicateDocs(docs);

  cleanDocs.forEach((doc) => {
    const rawPath = (doc.folderPath || "")
      .trim()
      .replace(/\\/g, "/")
      .replace(/^\/+|\/+$/g, "");
    if (!rawPath) {
      root.docs.push(doc);
      return;
    }

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

  return root;
}

export function countTreeDocs(node: DocTreeNode): number {
  return node.docs.length + node.children.reduce((acc, c) => acc + countTreeDocs(c), 0);
}

