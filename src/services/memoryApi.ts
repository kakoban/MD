import { authApi } from './authApi';
import { FolderItem, McpTokenItem, McpToolInfo } from '../types';
import { SharedMarkdownFile } from './cloudApi';

export interface ServerFolderRow {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export function mapServerFolder(row: ServerFolderRow): FolderItem {
  return {
    id: row.id,
    parentId: row.parent_id ?? null,
    name: row.name,
    description: row.description || '',
    createdAt: new Date(row.created_at).getTime() || Date.now(),
    updatedAt: new Date(row.updated_at).getTime() || Date.now(),
  };
}

export function buildFolderPathMap(folders: FolderItem[]): Map<string, string> {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const cache = new Map<string, string>();

  const resolve = (id: string, visited = new Set<string>()): string => {
    if (cache.has(id)) return cache.get(id)!;
    if (visited.has(id)) return '';
    visited.add(id);
    const f = byId.get(id);
    if (!f) return '';
    const full = f.parentId ? `${resolve(f.parentId, visited)}/${f.name}` : f.name;
    cache.set(id, full);
    return full;
  };

  for (const f of folders) {
    resolve(f.id);
  }
  return cache;
}

export function getFolderBreadcrumbs(folders: FolderItem[], folderId: string | null): FolderItem[] {
  if (!folderId) return [];
  const byId = new Map(folders.map((f) => [f.id, f]));
  const trail: FolderItem[] = [];
  const seen = new Set<string>();
  let cur: string | null = folderId;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const item = byId.get(cur);
    if (!item) break;
    trail.unshift(item);
    cur = item.parentId;
  }
  return trail;
}

export function getDescendantFolderIds(folders: FolderItem[], rootFolderId: string): Set<string> {
  const result = new Set<string>([rootFolderId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of folders) {
      if (f.parentId && result.has(f.parentId) && !result.has(f.id)) {
        result.add(f.id);
        changed = true;
      }
    }
  }
  return result;
}

export const memoryApi = {
  async getFolders(): Promise<FolderItem[]> {
    const res = await fetch('/api/folders', {
      credentials: 'same-origin',
      headers: authApi.getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'خطا در دریافت پوشه‌ها');
    }
    return (data.folders || []).map(mapServerFolder);
  },

  async createFolder(params: {
    name: string;
    parentId?: string | null;
    description?: string;
  }): Promise<{ folder: FolderItem; folders: FolderItem[] }> {
    const res = await fetch('/api/folders', {
      method: 'POST',
      credentials: 'same-origin',
      headers: authApi.getAuthHeaders(),
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'خطا در ایجاد پوشه');
    }
    return {
      folder: mapServerFolder(data.folder),
      folders: (data.folders || []).map(mapServerFolder),
    };
  },

  async ensureFolderPath(
    path: string,
    description?: string
  ): Promise<{ folder: FolderItem | null; path: string; folders: FolderItem[] }> {
    const res = await fetch('/api/folders/ensure-path', {
      method: 'POST',
      credentials: 'same-origin',
      headers: authApi.getAuthHeaders(),
      body: JSON.stringify({ path, description }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'خطا در ایجاد مسیر پوشه');
    }
    return {
      folder: data.folder ? mapServerFolder(data.folder) : null,
      path: data.path || '',
      folders: (data.folders || []).map(mapServerFolder),
    };
  },

  async updateFolder(
    id: string,
    params: { name?: string; parentId?: string | null; description?: string }
  ): Promise<{ folder: FolderItem; folders: FolderItem[] }> {
    const res = await fetch(`/api/folders/${encodeURIComponent(id)}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: authApi.getAuthHeaders(),
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'خطا در ویرایش پوشه');
    }
    return {
      folder: mapServerFolder(data.folder),
      folders: (data.folders || []).map(mapServerFolder),
    };
  },

  async deleteFolder(
    id: string,
    mode: 'move-to-parent' | 'cascade' = 'move-to-parent'
  ): Promise<{ folders: FolderItem[]; deletedFolders: number; affectedFiles: number }> {
    const res = await fetch(`/api/folders/${encodeURIComponent(id)}?mode=${mode}`, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: authApi.getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'خطا در حذف پوشه');
    }
    return {
      folders: (data.folders || []).map(mapServerFolder),
      deletedFolders: Number(data.deletedFolders || 0),
      affectedFiles: Number(data.affectedFiles || 0),
    };
  },

  async listMcpTokens(): Promise<{ tokens: McpTokenItem[]; tools: McpToolInfo[] }> {
    const res = await fetch('/api/mcp/tokens', {
      credentials: 'same-origin',
      headers: authApi.getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'خطا در دریافت توکن‌های MCP');
    }
    const tokens: McpTokenItem[] = (data.tokens || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      tokenPrefix: t.token_prefix,
      lastUsedAt: t.last_used_at || null,
      createdAt: t.created_at,
    }));
    return {
      tokens,
      tools: Array.isArray(data.tools) ? data.tools : [],
    };
  },

  async createMcpToken(name: string): Promise<{ token: string; record: McpTokenItem }> {
    const res = await fetch('/api/mcp/tokens', {
      method: 'POST',
      credentials: 'same-origin',
      headers: authApi.getAuthHeaders(),
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'خطا در ساخت توکن MCP');
    }
    return {
      token: data.token,
      record: {
        id: data.record.id,
        name: data.record.name,
        tokenPrefix: data.record.token_prefix,
        lastUsedAt: data.record.last_used_at || null,
        createdAt: data.record.created_at,
      },
    };
  },

  async revokeMcpToken(id: string): Promise<void> {
    const res = await fetch(`/api/mcp/tokens/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: authApi.getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'خطا در لغو توکن');
    }
  },

  async testMcpEndpoint(rawToken?: string): Promise<{ serverName: string; protocolVersion: string; toolsCount: number }> {
    const headers: Record<string, string> = rawToken
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${rawToken}` }
      : authApi.getAuthHeaders();

    const initRes = await fetch('/api/mcp', {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'markdown-studio-self-test', version: '1.0.0' },
        },
      }),
    });
    const initJson = await initRes.json().catch(() => ({}));
    if (!initRes.ok || initJson.error) {
      throw new Error(initJson.error?.message || 'خطا در اتصال به سرور MCP');
    }

    const toolsRes = await fetch('/api/mcp', {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
    });
    const toolsJson = await toolsRes.json().catch(() => ({}));
    return {
      serverName: initJson.result?.serverInfo?.name || 'markdown-studio-memory',
      protocolVersion: initJson.result?.protocolVersion || '2025-03-26',
      toolsCount: Array.isArray(toolsJson.result?.tools) ? toolsJson.result.tools.length : 0,
    };
  },

  async getSyncSnapshot(): Promise<{
    serverTime: string;
    folders: FolderItem[];
    files: SharedMarkdownFile[];
  }> {
    const res = await fetch('/api/sync/snapshot', {
      credentials: 'same-origin',
      headers: authApi.getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'خطا در دریافت وضعیت همگام‌سازی');
    }
    return {
      serverTime: data.serverTime,
      folders: (data.folders || []).map(mapServerFolder),
      files: data.files || [],
    };
  },

  async syncUpsertFile(params: {
    folderPath: string;
    title: string;
    content: string;
    description?: string;
    tags?: string[];
  }): Promise<{ action: 'created' | 'updated'; file: SharedMarkdownFile }> {
    const res = await fetch('/api/sync/upsert', {
      method: 'POST',
      credentials: 'same-origin',
      headers: authApi.getAuthHeaders(),
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'خطا در همگام‌سازی فایل');
    }
    return { action: data.action, file: data.file };
  },
};
