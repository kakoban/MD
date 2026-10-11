import { MarkdownDoc } from "../types";

export interface DocTreeNode {
  name: string;
  fullPath: string;
  children: DocTreeNode[];
  docs: MarkdownDoc[];
}

// ponytail: in-memory tree grouping by folderPath; upgrade to indexed tree if docs > 1000
export function buildDocTree(docs: MarkdownDoc[]): DocTreeNode {
  const root: DocTreeNode = { name: "", fullPath: "", children: [], docs: [] };

  docs.forEach((doc) => {
    const rawPath = doc.folderPath?.trim();
    if (!rawPath) {
      root.docs.push(doc);
      return;
    }

    const segments = rawPath.split("/").map((s) => s.trim()).filter(Boolean);
    let current = root;
    let currentPath = "";

    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      let child = current.children.find((c) => c.name === segment);
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
