import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { storage, sanitizePathSegments, type FolderRow, type FileRow } from './storage.ts';

export interface McpAuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
}

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, any>;
}

const SUPPORTED_PROTOCOL_VERSIONS = ['2025-03-26', '2024-11-05'];

function generateDocId(title: string): string {
  const cleanTitle = title
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 30);
  const suffix = crypto.randomBytes(3).toString('hex');
  return cleanTitle ? `${cleanTitle}-${suffix}` : `mem-${suffix}`;
}

function splitFilePathInput(fullPath: string): { folderPath: string; title: string } {
  const segments = sanitizePathSegments(fullPath);
  if (segments.length === 0) {
    throw new Error('مسیر فایل نمی‌تواند خالی باشد.');
  }
  const fileName = segments[segments.length - 1].replace(/\.md$/i, '').trim();
  if (!fileName) {
    throw new Error('نام فایل معتبر نیست.');
  }
  return {
    folderPath: segments.slice(0, -1).join('/'),
    title: fileName,
  };
}

function buildFileFullPath(file: FileRow, pathMap: Map<string, string>): string {
  const folderPath = file.folder_id ? pathMap.get(file.folder_id) || '' : '';
  const safeName = file.title.trim().replace(/\.md$/i, '');
  return folderPath ? `${folderPath}/${safeName}.md` : `${safeName}.md`;
}

function makeToolResult(payload: unknown, isError = false) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  return {
    content: [{ type: 'text', text }],
    ...(isError ? { isError: true } : {}),
  };
}

function makeRpcResult(id: string | number | null, result: unknown) {
  return { jsonrpc: '2.0', id, result };
}

function makeRpcError(id: string | number | null, code: number, message: string, data?: unknown) {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message, ...(data !== undefined ? { data } : {}) },
  };
}

export const MCP_TOOLS = [
  {
    name: 'get_memory_tree',
    description:
      'Returns the complete hierarchical tree of folders, subfolders, and Markdown memory files in the user workspace so you can orient yourself before reading or writing memories.',
    inputSchema: {
      type: 'object',
      properties: {
        folder_path: {
          type: 'string',
          description: 'Optional subfolder path (e.g. "projects/backend") to inspect only that subtree. Omit for full root tree.',
        },
        include_excerpts: {
          type: 'boolean',
          description: 'Include a short 160-character excerpt for each Markdown file (default false).',
        },
      },
    },
  },
  {
    name: 'create_folder',
    description:
      'Creates a folder or nested folder path (e.g. "memory/projects/alpha"). Intermediate folders are created automatically and idempotently.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Nested folder path separated by "/" (e.g. "projects/ai-agent/decisions").',
        },
        description: {
          type: 'string',
          description: 'Optional short description of what belongs in this folder.',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_folder',
    description: 'Lists immediate subfolders and Markdown files inside a folder path (or root when path is empty).',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Folder path relative to root (omit or pass "" for root).',
        },
      },
    },
  },
  {
    name: 'rename_or_move_folder',
    description: 'Renames a folder and/or moves it under a different parent folder path.',
    inputSchema: {
      type: 'object',
      properties: {
        folder_id: { type: 'string', description: 'Folder ID (optional if path is provided).' },
        path: { type: 'string', description: 'Current folder path (e.g. "projects/old-name").' },
        new_name: { type: 'string', description: 'New folder name (optional).' },
        new_parent_path: {
          type: 'string',
          description: 'Destination parent folder path. Pass "" to move to root.',
        },
        description: { type: 'string', description: 'Updated folder description (optional).' },
      },
    },
  },
  {
    name: 'delete_folder',
    description:
      'Deletes a folder by ID or path. By default moves child files and subfolders safely to the parent folder; pass mode="cascade" to permanently delete the entire subtree.',
    inputSchema: {
      type: 'object',
      properties: {
        folder_id: { type: 'string', description: 'Folder ID (optional if path is provided).' },
        path: { type: 'string', description: 'Folder path to delete.' },
        mode: {
          type: 'string',
          enum: ['move-to-parent', 'cascade'],
          description: 'Deletion strategy (default "move-to-parent").',
        },
      },
    },
  },
  {
    name: 'write_memory_file',
    description:
      'Creates or updates a Markdown memory file inside any folder or subfolder. Missing folders are automatically created. Supports mode="replace" (default) or mode="append" for logs and incremental notes.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description:
            'Full virtual path including optional subfolders and filename (e.g. "projects/backend/decisions.md"). Alternative to folder_path + title.',
        },
        folder_path: {
          type: 'string',
          description: 'Folder path (e.g. "projects/backend"). Used together with title.',
        },
        title: {
          type: 'string',
          description: 'Document title / filename without extension (e.g. "Architecture Decisions").',
        },
        content: {
          type: 'string',
          description: 'Markdown content to store or append.',
        },
        mode: {
          type: 'string',
          enum: ['replace', 'append'],
          description: 'Whether to replace existing content or append to it (default "replace").',
        },
        description: {
          type: 'string',
          description: 'Short summary of the note (optional).',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of tags for categorization.',
        },
        visibility: {
          type: 'string',
          enum: ['private', 'unlisted', 'public'],
          description: 'Visibility level (defaults to "private").',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'read_memory_file',
    description: 'Reads the full Markdown content and metadata of a memory file by its ID or virtual path.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Document ID.' },
        path: {
          type: 'string',
          description: 'Virtual path such as "projects/backend/decisions.md".',
        },
        folder_path: { type: 'string', description: 'Folder path (paired with title).' },
        title: { type: 'string', description: 'Document title (paired with folder_path).' },
      },
    },
  },
  {
    name: 'search_memory',
    description:
      'Searches across the user Markdown memory vault by keyword, tag, or folder subtree, returning ranked matches with snippets and paths.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query string.' },
        folder_path: {
          type: 'string',
          description: 'Optional folder path to restrict search to a specific branch.',
        },
        tag: { type: 'string', description: 'Optional tag filter.' },
        limit: { type: 'number', description: 'Maximum results (default 15, max 50).' },
      },
    },
  },
  {
    name: 'move_memory_file',
    description: 'Moves a Markdown memory file into another folder (creating the target folder path if needed) or to root ("").',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Document ID.' },
        path: { type: 'string', description: 'Current virtual path (alternative to id).' },
        target_folder_path: {
          type: 'string',
          description: 'Destination folder path (pass "" to move to root).',
        },
        new_title: { type: 'string', description: 'Optional new title for the file.' },
      },
      required: ['target_folder_path'],
    },
  },
  {
    name: 'delete_memory_file',
    description: 'Deletes a Markdown memory file from the user workspace by ID or virtual path.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Document ID.' },
        path: { type: 'string', description: 'Virtual path of the file to delete.' },
      },
    },
  },
];

const MCP_PROMPTS = [
  {
    name: 'remember_note',
    description: 'Structure and store a durable memory note into an organized folder path.',
    arguments: [
      { name: 'topic', description: 'Topic or project name', required: true },
      { name: 'details', description: 'Key facts or decisions to remember', required: true },
    ],
  },
  {
    name: 'recall_context',
    description: 'Inspect the memory tree and search relevant notes before answering a question.',
    arguments: [
      { name: 'question', description: 'What context you want to recall', required: true },
    ],
  },
];

async function findFileForUserByLocator(
  userId: string,
  args: { id?: string; path?: string; folder_path?: string; title?: string }
): Promise<FileRow | null> {
  if (args.id && typeof args.id === 'string') {
    const file = await storage.getFileById(args.id.trim());
    if (file && file.user_id === userId) return file;
    return null;
  }

  let folderPath = typeof args.folder_path === 'string' ? args.folder_path : '';
  let title = typeof args.title === 'string' ? args.title : '';

  if (args.path && typeof args.path === 'string') {
    const parsed = splitFilePathInput(args.path);
    folderPath = parsed.folderPath;
    title = parsed.title;
  }

  if (!title.trim()) return null;
  const folder = folderPath ? await storage.resolveFolderPath(userId, folderPath) : null;
  if (folderPath && !folder) return null;
  return storage.findUserFileByFolderAndTitle(userId, folder?.id ?? null, title);
}

async function executeMcpTool(
  name: string,
  args: Record<string, any>,
  authUser: McpAuthUser
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  const userId = authUser.id;

  switch (name) {
    case 'get_memory_tree': {
      const folders = await storage.getFoldersByUser(userId);
      const files = await storage.getMyDocuments(userId);
      const pathMap = storage.buildFolderPathMap(folders);

      let rootFolderId: string | null = null;
      let rootPath = '';
      if (typeof args.folder_path === 'string' && args.folder_path.trim()) {
        const resolved = await storage.resolveFolderPath(userId, args.folder_path);
        if (!resolved) {
          return makeToolResult({ error: `Folder "${args.folder_path}" not found.` }, true);
        }
        rootFolderId = resolved.id;
        rootPath = pathMap.get(resolved.id) || resolved.name;
      }

      const includeExcerpts = Boolean(args.include_excerpts);

      const buildNode = (parentId: string | null): any => {
        const childFolders = folders
          .filter((f) => (f.parent_id ?? null) === parentId)
          .map((f) => ({
            id: f.id,
            name: f.name,
            path: pathMap.get(f.id) || f.name,
            description: f.description || '',
            ...buildNode(f.id),
          }));

        const childFiles = files
          .filter((doc) => (doc.folder_id ?? null) === parentId)
          .map((doc) => ({
            id: doc.id,
            title: doc.title,
            path: buildFileFullPath(doc, pathMap),
            tags: doc.tags || [],
            visibility: doc.visibility,
            updated_at: doc.updated_at,
            ...(includeExcerpts ? { excerpt: (doc.content || '').slice(0, 160) } : {}),
          }));

        return { folders: childFolders, files: childFiles };
      };

      const tree = buildNode(rootFolderId);
      return makeToolResult({
        root: rootPath || '/',
        total_folders: folders.length,
        total_files: files.length,
        ...tree,
      });
    }

    case 'create_folder': {
      const rawPath = String(args.path || '').trim();
      if (!rawPath) {
        return makeToolResult({ error: 'Parameter "path" is required.' }, true);
      }
      const res = await storage.ensureFolderPath(
        userId,
        rawPath,
        typeof args.description === 'string' ? args.description : undefined
      );
      return makeToolResult({
        success: true,
        path: res.path,
        created_folders_count: res.createdCount,
        folder: res.folder,
      });
    }

    case 'list_folder': {
      const rawPath = typeof args.path === 'string' ? args.path.trim() : '';
      const folders = await storage.getFoldersByUser(userId);
      const files = await storage.getMyDocuments(userId);
      const pathMap = storage.buildFolderPathMap(folders);

      let parentId: string | null = null;
      if (rawPath) {
        const resolved = await storage.resolveFolderPath(userId, rawPath);
        if (!resolved) {
          return makeToolResult({ error: `Folder "${rawPath}" not found.` }, true);
        }
        parentId = resolved.id;
      }

      const subfolders = folders
        .filter((f) => (f.parent_id ?? null) === parentId)
        .map((f) => ({
          id: f.id,
          name: f.name,
          path: pathMap.get(f.id) || f.name,
          description: f.description || '',
          updated_at: f.updated_at,
        }));

      const folderFiles = files
        .filter((d) => (d.folder_id ?? null) === parentId)
        .map((d) => ({
          id: d.id,
          title: d.title,
          path: buildFileFullPath(d, pathMap),
          description: d.description || '',
          tags: d.tags || [],
          updated_at: d.updated_at,
        }));

      return makeToolResult({
        path: rawPath || '/',
        subfolders,
        files: folderFiles,
      });
    }

    case 'rename_or_move_folder': {
      let folder: FolderRow | null = null;
      if (typeof args.folder_id === 'string' && args.folder_id.trim()) {
        folder = await storage.getFolderById(args.folder_id.trim());
      } else if (typeof args.path === 'string' && args.path.trim()) {
        folder = await storage.resolveFolderPath(userId, args.path.trim());
      }
      if (!folder || folder.user_id !== userId) {
        return makeToolResult({ error: 'Target folder not found.' }, true);
      }

      let updateParent = false;
      let nextParentId: string | null = folder.parent_id;
      if (args.new_parent_path !== undefined) {
        updateParent = true;
        const p = String(args.new_parent_path || '').trim();
        if (!p || p === '/') {
          nextParentId = null;
        } else {
          const ensured = await storage.ensureFolderPath(userId, p);
          nextParentId = ensured.folder?.id ?? null;
        }
      }

      const updated = await storage.updateFolder(folder.id, userId, {
        name: typeof args.new_name === 'string' && args.new_name.trim() ? args.new_name.trim() : undefined,
        parentId: nextParentId,
        updateParent,
        description: typeof args.description === 'string' ? args.description : undefined,
      });

      const allFolders = await storage.getFoldersByUser(userId);
      const pathMap = storage.buildFolderPathMap(allFolders);

      return makeToolResult({
        success: true,
        folder: updated,
        new_path: pathMap.get(updated.id) || updated.name,
      });
    }

    case 'delete_folder': {
      let folder: FolderRow | null = null;
      if (typeof args.folder_id === 'string' && args.folder_id.trim()) {
        folder = await storage.getFolderById(args.folder_id.trim());
      } else if (typeof args.path === 'string' && args.path.trim()) {
        folder = await storage.resolveFolderPath(userId, args.path.trim());
      }
      if (!folder || folder.user_id !== userId) {
        return makeToolResult({ error: 'Target folder not found.' }, true);
      }

      const mode = args.mode === 'cascade' ? 'cascade' : 'move-to-parent';
      const result = await storage.deleteFolder(folder.id, userId, mode);
      return makeToolResult({ success: true, mode, ...result });
    }

    case 'write_memory_file': {
      if (args.content === undefined || args.content === null) {
        return makeToolResult({ error: 'Parameter "content" is required.' }, true);
      }

      let folderPath = typeof args.folder_path === 'string' ? args.folder_path.trim() : '';
      let title = typeof args.title === 'string' ? args.title.trim().replace(/\.md$/i, '') : '';

      if (typeof args.path === 'string' && args.path.trim()) {
        const parsed = splitFilePathInput(args.path.trim());
        folderPath = parsed.folderPath;
        title = parsed.title;
      }

      if (!title) {
        return makeToolResult({ error: 'Provide either "path" or "title".' }, true);
      }

      const ensured = folderPath
        ? await storage.ensureFolderPath(userId, folderPath)
        : { folder: null, path: '', createdCount: 0 };
      const folderId = ensured.folder?.id ?? null;

      const existing = await storage.findUserFileByFolderAndTitle(userId, folderId, title);
      const mode = args.mode === 'append' ? 'append' : 'replace';
      const incomingContent = String(args.content);
      const cleanTags = Array.isArray(args.tags)
        ? args.tags.map((t: any) => String(t).trim()).filter(Boolean)
        : undefined;
      const visibility =
        args.visibility === 'public' || args.visibility === 'unlisted' || args.visibility === 'private'
          ? args.visibility
          : undefined;

      if (existing) {
        const nextContent =
          mode === 'append'
            ? `${existing.content.replace(/\s*$/, '')}\n\n${incomingContent}`
            : incomingContent;
        const updated = await storage.updateFile(existing.id, {
          content: nextContent,
          description: typeof args.description === 'string' ? args.description : null,
          tags: cleanTags ?? null,
          visibility: visibility ?? null,
          isPublic: visibility ? visibility === 'public' : null,
        });
        const folders = await storage.getFoldersByUser(userId);
        const pathMap = storage.buildFolderPathMap(folders);
        return makeToolResult({
          success: true,
          action: mode === 'append' ? 'appended' : 'updated',
          id: updated.id,
          title: updated.title,
          path: buildFileFullPath(updated, pathMap),
          updated_at: updated.updated_at,
        });
      }

      const id = generateDocId(title);
      const resolvedVisibility = visibility || 'private';
      const created = await storage.createFile({
        id,
        title,
        content: incomingContent,
        description: typeof args.description === 'string' ? args.description.trim() : '',
        authorName: authUser.displayName || authUser.username || 'کاربر',
        userId,
        folderId,
        tags: cleanTags || [],
        visibility: resolvedVisibility,
        isPublic: resolvedVisibility === 'public',
        isFavorite: false,
      });
      const folders = await storage.getFoldersByUser(userId);
      const pathMap = storage.buildFolderPathMap(folders);
      return makeToolResult({
        success: true,
        action: 'created',
        id: created.id,
        title: created.title,
        path: buildFileFullPath(created, pathMap),
        created_folders: ensured.createdCount,
        updated_at: created.updated_at,
      });
    }

    case 'read_memory_file': {
      const file = await findFileForUserByLocator(userId, args);
      if (!file) {
        return makeToolResult({ error: 'Memory file not found.' }, true);
      }
      const folders = await storage.getFoldersByUser(userId);
      const pathMap = storage.buildFolderPathMap(folders);
      return makeToolResult({
        id: file.id,
        title: file.title,
        path: buildFileFullPath(file, pathMap),
        folder_id: file.folder_id ?? null,
        description: file.description || '',
        tags: file.tags || [],
        visibility: file.visibility,
        created_at: file.created_at,
        updated_at: file.updated_at,
        content: file.content,
      });
    }

    case 'search_memory': {
      const q = typeof args.query === 'string' ? args.query.trim().toLowerCase() : '';
      const tag = typeof args.tag === 'string' ? args.tag.trim().toLowerCase() : '';
      const limit = Math.min(Math.max(Number(args.limit) || 15, 1), 50);

      const folders = await storage.getFoldersByUser(userId);
      const files = await storage.getMyDocuments(userId);
      const pathMap = storage.buildFolderPathMap(folders);

      let allowedFolderIds: Set<string> | null = null;
      if (typeof args.folder_path === 'string' && args.folder_path.trim()) {
        const rootFolder = await storage.resolveFolderPath(userId, args.folder_path.trim());
        if (!rootFolder) {
          return makeToolResult({ matches: [], total: 0, note: `Folder "${args.folder_path}" not found.` });
        }
        const prefix = (pathMap.get(rootFolder.id) || '').toLowerCase();
        allowedFolderIds = new Set<string>();
        for (const [fid, fpath] of pathMap.entries()) {
          const lower = fpath.toLowerCase();
          if (lower === prefix || lower.startsWith(`${prefix}/`)) {
            allowedFolderIds.add(fid);
          }
        }
      }

      const scored: Array<{ score: number; file: FileRow; snippet: string; path: string }> = [];
      for (const file of files) {
        if (allowedFolderIds && (!file.folder_id || !allowedFolderIds.has(file.folder_id))) {
          continue;
        }
        if (tag && !(file.tags || []).some((t) => t.toLowerCase() === tag)) {
          continue;
        }
        const fullPath = buildFileFullPath(file, pathMap);
        let score = 0;
        let snippet = (file.content || '').slice(0, 200);

        if (!q) {
          score = 1;
        } else {
          const titleLower = file.title.toLowerCase();
          const pathLower = fullPath.toLowerCase();
          const contentLower = (file.content || '').toLowerCase();
          const descLower = (file.description || '').toLowerCase();

          if (titleLower.includes(q)) score += 10;
          if (pathLower.includes(q)) score += 6;
          if (descLower.includes(q)) score += 4;
          if ((file.tags || []).some((t) => t.toLowerCase().includes(q))) score += 5;

          const idx = contentLower.indexOf(q);
          if (idx !== -1) {
            score += 3;
            const start = Math.max(0, idx - 60);
            const end = Math.min(file.content.length, idx + q.length + 140);
            snippet = (start > 0 ? '...' : '') + file.content.slice(start, end) + (end < file.content.length ? '...' : '');
          }
        }

        if (score > 0) {
          scored.push({ score, file, snippet, path: fullPath });
        }
      }

      scored.sort((a, b) => b.score - a.score || b.file.updated_at.localeCompare(a.file.updated_at));
      const matches = scored.slice(0, limit).map((item) => ({
        id: item.file.id,
        title: item.file.title,
        path: item.path,
        tags: item.file.tags || [],
        updated_at: item.file.updated_at,
        snippet: item.snippet,
      }));

      return makeToolResult({ total: scored.length, matches });
    }

    case 'move_memory_file': {
      const file = await findFileForUserByLocator(userId, args);
      if (!file) {
        return makeToolResult({ error: 'Memory file not found.' }, true);
      }

      const targetPath = String(args.target_folder_path ?? '').trim();
      let targetFolderId: string | null = null;
      if (targetPath && targetPath !== '/') {
        const ensured = await storage.ensureFolderPath(userId, targetPath);
        targetFolderId = ensured.folder?.id ?? null;
      }

      const updated = await storage.updateFile(file.id, {
        title: typeof args.new_title === 'string' && args.new_title.trim() ? args.new_title.trim() : null,
        folderId: targetFolderId,
        updateFolder: true,
      });

      const folders = await storage.getFoldersByUser(userId);
      const pathMap = storage.buildFolderPathMap(folders);
      return makeToolResult({
        success: true,
        id: updated.id,
        title: updated.title,
        new_path: buildFileFullPath(updated, pathMap),
      });
    }

    case 'delete_memory_file': {
      const file = await findFileForUserByLocator(userId, args);
      if (!file) {
        return makeToolResult({ error: 'Memory file not found.' }, true);
      }
      await storage.deleteFile(file.id);
      return makeToolResult({ success: true, deleted_id: file.id, title: file.title });
    }

    default:
      return makeToolResult({ error: `Unknown tool: ${name}` }, true);
  }
}

async function processSingleJsonRpc(msg: JsonRpcRequest, authUser: McpAuthUser): Promise<any | null> {
  if (!msg || typeof msg !== 'object') {
    return makeRpcError(null, -32600, 'Invalid Request');
  }

  const isNotification = msg.id === undefined;
  const id = msg.id ?? null;
  const method = msg.method;
  const params = msg.params || {};

  if (!method || typeof method !== 'string') {
    return isNotification ? null : makeRpcError(id, -32600, 'Invalid Request: missing method');
  }

  // Notifications require no JSON-RPC response body
  if (method === 'notifications/initialized' || method === 'notifications/cancelled' || isNotification) {
    return null;
  }

  try {
    switch (method) {
      case 'initialize': {
        const requestedVersion = typeof params.protocolVersion === 'string' ? params.protocolVersion : '';
        const negotiated = SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion)
          ? requestedVersion
          : SUPPORTED_PROTOCOL_VERSIONS[0];

        return makeRpcResult(id, {
          protocolVersion: negotiated,
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
            prompts: { listChanged: false },
          },
          serverInfo: {
            name: 'markdown-studio-memory',
            version: '1.0.0',
          },
          instructions:
            'You are connected to the user personal Markdown Studio AI Memory Vault. Call get_memory_tree first to inspect existing folders and files, use create_folder and write_memory_file to store structured Markdown knowledge, and use search_memory or read_memory_file to recall context.',
        });
      }

      case 'ping':
        return makeRpcResult(id, {});

      case 'tools/list':
        return makeRpcResult(id, { tools: MCP_TOOLS });

      case 'tools/call': {
        const toolName = String(params.name || '');
        const toolArgs = params.arguments && typeof params.arguments === 'object' ? params.arguments : {};
        if (!toolName) {
          return makeRpcError(id, -32602, 'Missing tool name');
        }
        const toolOutput = await executeMcpTool(toolName, toolArgs, authUser);
        return makeRpcResult(id, toolOutput);
      }

      case 'resources/list': {
        const folders = await storage.getFoldersByUser(authUser.id);
        const files = await storage.getMyDocuments(authUser.id);
        const pathMap = storage.buildFolderPathMap(folders);

        const resources = files.map((file) => {
          const fullPath = buildFileFullPath(file, pathMap);
          return {
            uri: `memory://${encodeURI(fullPath)}`,
            name: file.title,
            description: file.description || `Markdown memory at ${fullPath}`,
            mimeType: 'text/markdown',
          };
        });
        return makeRpcResult(id, { resources });
      }

      case 'resources/read': {
        const uri = String(params.uri || '');
        if (!uri.startsWith('memory://')) {
          return makeRpcError(id, -32602, 'Unsupported resource URI scheme. Expected memory://');
        }
        const virtualPath = decodeURI(uri.slice('memory://'.length));
        const file = await findFileForUserByLocator(authUser.id, { path: virtualPath });
        if (!file) {
          return makeRpcError(id, -32002, `Resource not found: ${uri}`);
        }
        return makeRpcResult(id, {
          contents: [
            {
              uri,
              mimeType: 'text/markdown',
              text: file.content,
            },
          ],
        });
      }

      case 'prompts/list':
        return makeRpcResult(id, { prompts: MCP_PROMPTS });

      case 'prompts/get': {
        const promptName = String(params.name || '');
        const promptArgs = params.arguments || {};
        if (promptName === 'remember_note') {
          return makeRpcResult(id, {
            description: 'Store a structured Markdown memory note.',
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Organize and save the following memory under an appropriate folder in my Markdown Studio memory vault using write_memory_file.\nTopic: ${promptArgs.topic || ''}\nDetails: ${promptArgs.details || ''}`,
                },
              },
            ],
          });
        }
        if (promptName === 'recall_context') {
          return makeRpcResult(id, {
            description: 'Search and retrieve relevant notes from the memory vault.',
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `First inspect my memory vault with get_memory_tree and search_memory for: "${promptArgs.question || ''}", then read the relevant Markdown notes before answering.`,
                },
              },
            ],
          });
        }
        return makeRpcError(id, -32602, `Unknown prompt: ${promptName}`);
      }

      default:
        return makeRpcError(id, -32601, `Method not found: ${method}`);
    }
  } catch (err: any) {
    return makeRpcError(id, -32603, err?.message || 'Internal MCP server error');
  }
}

export async function handleMcpPost(req: Request, res: Response, authUser: McpAuthUser): Promise<void> {
  const body = req.body;
  if (Array.isArray(body)) {
    const responses: any[] = [];
    for (const item of body) {
      const reply = await processSingleJsonRpc(item, authUser);
      if (reply !== null) responses.push(reply);
    }
    if (responses.length === 0) {
      res.status(202).end();
      return;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(responses);
    return;
  }

  const reply = await processSingleJsonRpc(body, authUser);
  if (reply === null) {
    res.status(202).end();
    return;
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.json(reply);
}

export function generateLocalBridgeScript(baseUrl: string): string {
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  return `#!/usr/bin/env node
/**
 * Markdown Studio Pro — Universal MCP & Local Computer Memory Bridge
 * Zero external dependencies (requires Node.js 18+).
 *
 * Usage:
 *   1) Local stdio MCP Proxy (for Claude Desktop / Cursor / any stdio MCP host):
 *      MARKDOWN_STUDIO_TOKEN="msp_..." node markdown-studio-bridge.mjs mcp
 *
 *   2) Two-Way Local Folder Sync (syncs cloud folders/subfolders & .md files with your PC):
 *      MARKDOWN_STUDIO_TOKEN="msp_..." node markdown-studio-bridge.mjs sync ./ai-memory
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';

const DEFAULT_BASE_URL = ${JSON.stringify(cleanBaseUrl)};

function parseArgs(argv) {
  const opts = { command: argv[2] || 'help', targetDir: '', url: process.env.MARKDOWN_STUDIO_URL || DEFAULT_BASE_URL, token: process.env.MARKDOWN_STUDIO_TOKEN || '', intervalMs: 5000 };
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--token=')) opts.token = a.slice(8);
    else if (a.startsWith('--url=')) opts.url = a.slice(6);
    else if (a.startsWith('--interval=')) opts.intervalMs = Math.max(2000, Number(a.slice(11)) || 5000);
    else if (!a.startsWith('--') && !opts.targetDir) opts.targetDir = a;
  }
  opts.url = opts.url.replace(/\\/+$/, '');
  return opts;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function ensureSafeLocalPath(rootDir, relPosixPath) {
  const normalized = relPosixPath.replace(/\\\\/g, '/').replace(/^\\/+/, '');
  const parts = normalized.split('/').filter(Boolean);
  for (const part of parts) {
    if (part === '.' || part === '..' || part.includes('\\0')) {
      throw new Error('Unsafe path rejected: ' + relPosixPath);
    }
  }
  const resolvedRoot = path.resolve(rootDir);
  const full = path.resolve(resolvedRoot, ...parts);
  if (full !== resolvedRoot && !full.startsWith(resolvedRoot + path.sep)) {
    throw new Error('Path traversal blocked: ' + relPosixPath);
  }
  return full;
}

function sanitizeFileName(name) {
  return String(name || 'untitled').replace(/[<>:"/\\\\|?*\\x00-\\x1F]/g, '_').trim() || 'untitled';
}

async function runStdioMcpProxy(opts) {
  if (!opts.token) {
    console.error('Error: Set MARKDOWN_STUDIO_TOKEN="msp_..." before starting the MCP proxy.');
    process.exit(1);
  }
  const endpoint = opts.url + '/api/mcp';
  const rl = readline.createInterface({ input: process.stdin, terminal: false });

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return;
    }
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + opts.token,
        },
        body: JSON.stringify(parsed),
      });
      if (res.status === 202) return;
      const text = await res.text();
      if (text.trim()) {
        process.stdout.write(text.trim() + '\\n');
      }
    } catch (err) {
      if (parsed && parsed.id !== undefined) {
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: parsed.id,
          error: { code: -32000, message: 'Bridge network error: ' + err.message },
        }) + '\\n');
      }
    }
  });
}

function walkLocalVault(rootDir, currentDir = rootDir, relPrefix = '') {
  const folders = [];
  const files = [];
  if (!fs.existsSync(currentDir)) return { folders, files };

  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const rel = relPrefix ? relPrefix + '/' + entry.name : entry.name;
    const full = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      folders.push(rel);
      const sub = walkLocalVault(rootDir, full, rel);
      folders.push(...sub.folders);
      files.push(...sub.files);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      const stat = fs.statSync(full);
      const content = fs.readFileSync(full, 'utf8');
      files.push({
        relPath: rel,
        folderPath: relPrefix,
        title: entry.name.replace(/\\.md$/i, ''),
        content,
        hash: sha256(content),
        mtimeMs: stat.mtimeMs,
      });
    }
  }
  return { folders, files };
}

async function runFolderSync(opts) {
  if (!opts.token) {
    console.error('Error: Set MARKDOWN_STUDIO_TOKEN="msp_..." before running sync.');
    process.exit(1);
  }
  const syncRoot = path.resolve(opts.targetDir || './ai-memory');
  fs.mkdirSync(syncRoot, { recursive: true });
  const statePath = path.join(syncRoot, '.msp-sync-state.json');

  const loadState = () => {
    try {
      return JSON.parse(fs.readFileSync(statePath, 'utf8'));
    } catch {
      return { files: {} };
    }
  };
  const saveState = (state) => {
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
  };

  const apiFetch = async (apiPath, init = {}) => {
    const res = await fetch(opts.url + apiPath, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + opts.token,
        ...(init.headers || {}),
      },
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error('HTTP ' + res.status + ' on ' + apiPath + ': ' + txt.slice(0, 200));
    }
    return res.json();
  };

  let syncing = false;
  async function syncOnce() {
    if (syncing) return;
    syncing = true;
    try {
      const state = loadState();
      const snapshot = await apiFetch('/api/sync/snapshot');
      const folderById = new Map((snapshot.folders || []).map((f) => [f.id, f]));
      const folderPathOf = (id) => {
        const parts = [];
        let cur = id;
        const seen = new Set();
        while (cur && !seen.has(cur)) {
          seen.add(cur);
          const f = folderById.get(cur);
          if (!f) break;
          parts.unshift(sanitizeFileName(f.name));
          cur = f.parent_id;
        }
        return parts.join('/');
      };

      // Ensure all cloud folders exist locally
      for (const f of snapshot.folders || []) {
        const relFolder = folderPathOf(f.id);
        if (relFolder) {
          fs.mkdirSync(ensureSafeLocalPath(syncRoot, relFolder), { recursive: true });
        }
      }

      // Build remote map by relative path
      const remoteFiles = new Map();
      for (const doc of snapshot.files || []) {
        const fPath = doc.folder_id ? folderPathOf(doc.folder_id) : '';
        const fileName = sanitizeFileName(doc.title.replace(/\\.md$/i, '')) + '.md';
        const relPath = fPath ? fPath + '/' + fileName : fileName;
        remoteFiles.set(relPath, {
          id: doc.id,
          title: doc.title,
          folderPath: fPath,
          content: doc.content || '',
          hash: sha256(doc.content || ''),
          updatedMs: new Date(doc.updated_at).getTime() || Date.now(),
        });
      }

      const localScan = walkLocalVault(syncRoot);
      const localFiles = new Map(localScan.files.map((f) => [f.relPath, f]));

      // Ensure local-only subfolders exist in cloud
      const remoteFolderPaths = new Set((snapshot.folders || []).map((f) => folderPathOf(f.id).toLowerCase()));
      for (const lf of localScan.folders) {
        if (!remoteFolderPaths.has(lf.toLowerCase())) {
          await apiFetch('/api/folders/ensure-path', {
            method: 'POST',
            body: JSON.stringify({ path: lf }),
          });
          console.log('[SYNC -> CLOUD] Created folder:', lf);
        }
      }

      let pulled = 0;
      let pushed = 0;
      const allPaths = new Set([...remoteFiles.keys(), ...localFiles.keys()]);

      for (const relPath of allPaths) {
        const remote = remoteFiles.get(relPath);
        const local = localFiles.get(relPath);
        const prev = state.files[relPath];

        if (remote && !local) {
          const fullLocal = ensureSafeLocalPath(syncRoot, relPath);
          fs.mkdirSync(path.dirname(fullLocal), { recursive: true });
          fs.writeFileSync(fullLocal, remote.content, 'utf8');
          state.files[relPath] = { hash: remote.hash, remoteUpdatedMs: remote.updatedMs };
          pulled++;
          console.log('[SYNC <- CLOUD] Pulled:', relPath);
        } else if (local && !remote) {
          const res = await apiFetch('/api/sync/upsert', {
            method: 'POST',
            body: JSON.stringify({
              folderPath: local.folderPath,
              title: local.title,
              content: local.content,
            }),
          });
          state.files[relPath] = {
            hash: local.hash,
            remoteUpdatedMs: new Date(res.file?.updated_at || Date.now()).getTime(),
          };
          pushed++;
          console.log('[SYNC -> CLOUD] Pushed:', relPath);
        } else if (remote && local) {
          if (remote.hash === local.hash) {
            state.files[relPath] = { hash: remote.hash, remoteUpdatedMs: remote.updatedMs };
            continue;
          }
          const localChanged = !prev || prev.hash !== local.hash;
          const remoteChanged = !prev || prev.hash !== remote.hash;

          if (localChanged && (!remoteChanged || local.mtimeMs > remote.updatedMs)) {
            const res = await apiFetch('/api/sync/upsert', {
              method: 'POST',
              body: JSON.stringify({
                folderPath: local.folderPath,
                title: local.title,
                content: local.content,
              }),
            });
            state.files[relPath] = {
              hash: local.hash,
              remoteUpdatedMs: new Date(res.file?.updated_at || Date.now()).getTime(),
            };
            pushed++;
            console.log('[SYNC -> CLOUD] Updated:', relPath);
          } else if (remoteChanged) {
            const fullLocal = ensureSafeLocalPath(syncRoot, relPath);
            fs.mkdirSync(path.dirname(fullLocal), { recursive: true });
            fs.writeFileSync(fullLocal, remote.content, 'utf8');
            state.files[relPath] = { hash: remote.hash, remoteUpdatedMs: remote.updatedMs };
            pulled++;
            console.log('[SYNC <- CLOUD] Updated:', relPath);
          }
        }
      }

      saveState(state);
      if (pulled > 0 || pushed > 0) {
        console.log(\`[SYNC COMPLETE] Pulled \${pulled}, Pushed \${pushed} (\${new Date().toLocaleTimeString()})\`);
      }
    } catch (err) {
      console.error('[SYNC ERROR]', err.message);
    } finally {
      syncing = false;
    }
  }

  console.log('Markdown Studio Local Memory Bridge');
  console.log('  Cloud URL :', opts.url);
  console.log('  Local Dir :', syncRoot);
  console.log('  Interval  :', opts.intervalMs + 'ms');

  await syncOnce();
  setInterval(syncOnce, opts.intervalMs);

  let debounceTimer = null;
  try {
    fs.watch(syncRoot, { recursive: true }, (_event, filename) => {
      if (!filename || filename.startsWith('.')) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(syncOnce, 800);
    });
  } catch {
    // Polling interval covers platforms where recursive fs.watch is unavailable
  }
}

const opts = parseArgs(process.argv);
if (opts.command === 'mcp') {
  runStdioMcpProxy(opts);
} else if (opts.command === 'sync') {
  runFolderSync(opts);
} else {
  console.log('Usage:');
  console.log('  MARKDOWN_STUDIO_TOKEN="msp_..." node markdown-studio-bridge.mjs mcp');
  console.log('  MARKDOWN_STUDIO_TOKEN="msp_..." node markdown-studio-bridge.mjs sync ./ai-memory');
}
`;
}
