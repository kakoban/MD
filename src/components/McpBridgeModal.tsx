import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  KeyRound,
  Cpu,
  HardDrive,
  Copy,
  Check,
  Trash2,
  Plus,
  Download,
  RefreshCw,
  FolderOpen,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertCircle,
  CheckCircle2,
  Terminal,
  Loader2,
  PlugZap,
} from 'lucide-react';
import { McpTokenItem, McpToolInfo } from '../types';
import { memoryApi, buildFolderPathMap } from '../services/memoryApi';

interface McpBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVaultSynced: () => Promise<void>;
}

type ModalTab = 'tokens' | 'clients' | 'sync';
type ClientTarget = 'claude-desktop' | 'claude-code' | 'cursor-vscode' | 'web-mcp';

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim() || 'untitled';
}

async function ensureDirectoryPathHandle(
  rootHandle: any,
  relFolderPath: string
): Promise<any> {
  if (!relFolderPath) return rootHandle;
  const parts = relFolderPath.split('/').map((p) => sanitizeFileName(p)).filter(Boolean);
  let current = rootHandle;
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create: true });
  }
  return current;
}

async function scanLocalDirectoryHandle(
  dirHandle: any,
  relPrefix = ''
): Promise<{
  folders: string[];
  files: Array<{ relPath: string; folderPath: string; title: string; content: string; lastModified: number }>;
}> {
  const folders: string[] = [];
  const files: Array<{ relPath: string; folderPath: string; title: string; content: string; lastModified: number }> = [];

  for await (const [name, handle] of dirHandle.entries()) {
    if (name.startsWith('.')) continue;
    const rel = relPrefix ? `${relPrefix}/${name}` : name;
    if (handle.kind === 'directory') {
      folders.push(rel);
      const sub = await scanLocalDirectoryHandle(handle, rel);
      folders.push(...sub.folders);
      files.push(...sub.files);
    } else if (handle.kind === 'file' && name.toLowerCase().endsWith('.md')) {
      const file = await handle.getFile();
      const content = await file.text();
      files.push({
        relPath: rel,
        folderPath: relPrefix,
        title: name.replace(/\.md$/i, ''),
        content,
        lastModified: file.lastModified || Date.now(),
      });
    }
  }
  return { folders, files };
}

export const McpBridgeModal: React.FC<McpBridgeModalProps> = ({
  isOpen,
  onClose,
  onVaultSynced,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('tokens');
  const [clientTarget, setClientTarget] = useState<ClientTarget>('claude-desktop');

  const [tokens, setTokens] = useState<McpTokenItem[]>([]);
  const [tools, setTools] = useState<McpToolInfo[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live MCP self-test
  const [isTestingMcp, setIsTestingMcp] = useState(false);
  const [mcpTestResult, setMcpTestResult] = useState<string | null>(null);

  // Browser File System Access Sync state
  const [dirHandle, setDirHandle] = useState<any>(null);
  const [dirName, setDirName] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState<{
    mode: string;
    foldersCreated: number;
    pulled: number;
    pushed: number;
    timestamp: string;
  } | null>(null);

  const supportsFileSystemAccess =
    typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function';

  const loadTokens = useCallback(async () => {
    setIsLoadingTokens(true);
    setErrorMsg(null);
    try {
      const res = await memoryApi.listMcpTokens();
      setTokens(res.tokens);
      setTools(res.tools);
    } catch (err: any) {
      setErrorMsg(err?.message || 'خطا در بارگذاری اطلاعات MCP');
    } finally {
      setIsLoadingTokens(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadTokens();
      setMcpTestResult(null);
    }
  }, [isOpen, loadTokens]);

  if (!isOpen) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://markdown-studio-pro-qoe5.onrender.com';
  const mcpUrl = `${baseUrl}/api/mcp`;
  const displayToken = freshToken || 'YOUR_MCP_TOKEN';

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
    } catch {
      setErrorMsg('امکان کپی در کلیپ‌بورد فراهم نشد.');
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingToken) return;
    setIsCreatingToken(true);
    setErrorMsg(null);
    try {
      const label = newTokenName.trim() || 'حافظه MCP شخصی';
      const res = await memoryApi.createMcpToken(label);
      setFreshToken(res.token);
      setTokens((prev) => [res.record, ...prev]);
      setNewTokenName('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'خطا در ساخت توکن');
    } finally {
      setIsCreatingToken(false);
    }
  };

  const handleRevokeToken = async (id: string) => {
    setErrorMsg(null);
    try {
      await memoryApi.revokeMcpToken(id);
      setTokens((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      setErrorMsg(err?.message || 'خطا در لغو توکن');
    }
  };

  const handleRunMcpSelfTest = async () => {
    setIsTestingMcp(true);
    setErrorMsg(null);
    setMcpTestResult(null);
    try {
      const res = await memoryApi.testMcpEndpoint(freshToken || undefined);
      setMcpTestResult(
        `اتصال موفق · سرور ${res.serverName} · پروتکل ${res.protocolVersion} · ${res.toolsCount} ابزار حافظه فعال`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'آزمون اتصال MCP ناموفق بود.');
    } finally {
      setIsTestingMcp(false);
    }
  };

  const handlePickLocalFolder = async () => {
    setErrorMsg(null);
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      setDirHandle(handle);
      setDirName(handle.name || 'پوشه انتخاب‌شده');
      setSyncSummary(null);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setErrorMsg('دسترسی به پوشه محلی انجام نشد.');
      }
    }
  };

  const runBrowserSync = async (mode: 'two-way' | 'pull' | 'push') => {
    if (!dirHandle || isSyncing) return;
    setIsSyncing(true);
    setErrorMsg(null);
    try {
      const snapshot = await memoryApi.getSyncSnapshot();
      const pathMap = buildFolderPathMap(snapshot.folders);

      let foldersCreated = 0;
      let pulled = 0;
      let pushed = 0;

      // Map remote files by relative path
      const remoteByPath = new Map<
        string,
        { title: string; folderPath: string; content: string; updatedAtMs: number }
      >();
      for (const file of snapshot.files) {
        const folderPath = file.folder_id ? pathMap.get(file.folder_id) || '' : '';
        const cleanFileName = `${sanitizeFileName(file.title.replace(/\.md$/i, ''))}.md`;
        const relPath = folderPath ? `${folderPath}/${cleanFileName}` : cleanFileName;
        remoteByPath.set(relPath, {
          title: file.title,
          folderPath,
          content: file.content || '',
          updatedAtMs: new Date(file.updated_at).getTime() || Date.now(),
        });
      }

      const localScan = await scanLocalDirectoryHandle(dirHandle);
      const localByPath = new Map(localScan.files.map((f) => [f.relPath, f]));

      // Ensure folders locally on pull / two-way
      if (mode === 'pull' || mode === 'two-way') {
        for (const folder of snapshot.folders) {
          const fPath = pathMap.get(folder.id);
          if (fPath) {
            await ensureDirectoryPathHandle(dirHandle, fPath);
          }
        }
      }

      // Ensure local folders in cloud on push / two-way
      if (mode === 'push' || mode === 'two-way') {
        const remoteFolderSet = new Set(
          Array.from(pathMap.values()).map((p) => p.toLowerCase())
        );
        for (const lf of localScan.folders) {
          if (!remoteFolderSet.has(lf.toLowerCase())) {
            await memoryApi.ensureFolderPath(lf);
            foldersCreated++;
          }
        }
      }

      const allPaths = new Set([...remoteByPath.keys(), ...localByPath.keys()]);
      for (const relPath of allPaths) {
        const remote = remoteByPath.get(relPath);
        const local = localByPath.get(relPath);

        if (mode === 'pull') {
          if (remote && (!local || local.content !== remote.content)) {
            const targetDir = await ensureDirectoryPathHandle(dirHandle, remote.folderPath);
            const fileName = `${sanitizeFileName(remote.title.replace(/\.md$/i, ''))}.md`;
            const fileHandle = await targetDir.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(remote.content);
            await writable.close();
            pulled++;
          }
        } else if (mode === 'push') {
          if (local && (!remote || remote.content !== local.content)) {
            await memoryApi.syncUpsertFile({
              folderPath: local.folderPath,
              title: local.title,
              content: local.content,
            });
            pushed++;
          }
        } else {
          // two-way
          if (remote && !local) {
            const targetDir = await ensureDirectoryPathHandle(dirHandle, remote.folderPath);
            const fileName = `${sanitizeFileName(remote.title.replace(/\.md$/i, ''))}.md`;
            const fileHandle = await targetDir.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(remote.content);
            await writable.close();
            pulled++;
          } else if (local && !remote) {
            await memoryApi.syncUpsertFile({
              folderPath: local.folderPath,
              title: local.title,
              content: local.content,
            });
            pushed++;
          } else if (remote && local && remote.content !== local.content) {
            if (local.lastModified > remote.updatedAtMs) {
              await memoryApi.syncUpsertFile({
                folderPath: local.folderPath,
                title: local.title,
                content: local.content,
              });
              pushed++;
            } else {
              const targetDir = await ensureDirectoryPathHandle(dirHandle, remote.folderPath);
              const fileName = `${sanitizeFileName(remote.title.replace(/\.md$/i, ''))}.md`;
              const fileHandle = await targetDir.getFileHandle(fileName, { create: true });
              const writable = await fileHandle.createWritable();
              await writable.write(remote.content);
              await writable.close();
              pulled++;
            }
          }
        }
      }

      await onVaultSynced();
      setSyncSummary({
        mode: mode === 'two-way' ? 'همگام‌سازی دوطرفه' : mode === 'pull' ? 'دریافت از ابر' : 'ارسال به ابر',
        foldersCreated,
        pulled,
        pushed,
        timestamp: new Date().toLocaleTimeString('fa-IR'),
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'خطا در همگام‌سازی پوشه محلی');
    } finally {
      setIsSyncing(false);
    }
  };

  // Build client configuration snippets
  const claudeDesktopStdioConfig = JSON.stringify(
    {
      mcpServers: {
        'markdown-studio-memory': {
          command: 'node',
          args: ['/PATH/TO/markdown-studio-bridge.mjs', 'mcp'],
          env: {
            MARKDOWN_STUDIO_URL: baseUrl,
            MARKDOWN_STUDIO_TOKEN: displayToken,
          },
        },
      },
    },
    null,
    2
  );

  const claudeDesktopRemoteConfig = JSON.stringify(
    {
      mcpServers: {
        'markdown-studio-memory': {
          command: 'npx',
          args: [
            '-y',
            'mcp-remote',
            mcpUrl,
            '--header',
            `Authorization: Bearer ${displayToken}`,
          ],
        },
      },
    },
    null,
    2
  );

  const claudeCodeCommand = `claude mcp add --transport http markdown-studio-memory "${mcpUrl}" --header "Authorization: Bearer ${displayToken}"`;

  const cursorVscodeConfig = JSON.stringify(
    {
      mcpServers: {
        'markdown-studio-memory': {
          url: mcpUrl,
          headers: {
            Authorization: `Bearer ${displayToken}`,
          },
        },
      },
    },
    null,
    2
  );

  const syncCommandUnix = `MARKDOWN_STUDIO_TOKEN="${displayToken}" node markdown-studio-bridge.mjs sync ./ai-memory`;
  const syncCommandWindows = `$env:MARKDOWN_STUDIO_TOKEN="${displayToken}"; node markdown-studio-bridge.mjs sync .\\ai-memory`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[88vh] flex flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/60">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              حافظه هوشمند MCP و پل همگام‌سازی کامپیوتر
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              اتصال مستقیم مدل‌های هوش مصنوعی به پوشه‌ها و اسناد شما · همگام‌سازی دوطرفه با هارد کامپیوتر
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 pb-3 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/60">
          <button
            type="button"
            onClick={() => setActiveTab('tokens')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'tokens'
                ? 'bg-[var(--accent-color)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>توکن‌های دسترسی</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('clients')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'clients'
                ? 'bg-[var(--accent-color)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>اتصال به ابزارهای هوش مصنوعی</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'sync'
                ? 'bg-[var(--accent-color)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>همگام‌سازی با کامپیوتر</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: TOKENS */}
          {activeTab === 'tokens' && (
            <div className="space-y-6">
              {/* Endpoint summary & live test */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--border-color)]">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    نشانی سرور MCP (Streamable HTTP · JSON-RPC 2.0)
                  </div>
                  <div className="flex items-center gap-2">
                    <code
                      dir="ltr"
                      className="text-xs font-mono text-[var(--text-primary)] bg-[var(--bg-tertiary)] px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] select-all truncate max-w-md"
                    >
                      {mcpUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyText('mcp-url', mcpUrl)}
                      className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] cursor-pointer"
                      title="کپی نشانی"
                    >
                      {copiedKey === 'mcp-url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRunMcpSelfTest}
                  disabled={isTestingMcp}
                  className="px-3.5 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isTestingMcp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlugZap className="w-3.5 h-3.5 text-[var(--accent-color)]" />}
                  <span>تست زنده سرور MCP</span>
                </button>
              </div>

              {mcpTestResult && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="font-mono">{mcpTestResult}</span>
                </div>
              )}

              {/* Create Token Form */}
              <form onSubmit={handleCreateToken} className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                  ساخت توکن دسترسی جدید برای کلاینت هوش مصنوعی یا بریج محلی
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    placeholder="مثلاً: Claude Desktop لپ‌تاپ یا Cursor"
                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-color)]"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingToken}
                    className="px-4 py-2 rounded-lg bg-[var(--accent-color)] hover:opacity-90 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isCreatingToken ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>ساخت توکن</span>
                  </button>
                </div>
              </form>

              {/* Newly Created Token One-Time Display */}
              {freshToken && (
                <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--accent-color)] space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      توکن جدید شما ساخته شد (فقط همین یک بار نمایش داده می‌شود)
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText('fresh-token', freshToken)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--accent-color)] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedKey === 'fresh-token' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'fresh-token' ? 'کپی شد' : 'کپی توکن'}</span>
                    </button>
                  </div>
                  <code
                    dir="ltr"
                    className="block w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] font-mono text-xs text-[var(--text-primary)] break-all select-all"
                  >
                    {freshToken}
                  </code>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    تا زمانی که این پنجره باز است، این توکن به‌طور خودکار داخل کدهای آماده تب‌های «اتصال به ابزارهای هوش مصنوعی» و «همگام‌سازی با کامپیوتر» قرار داده شده است.
                  </p>
                </div>
              )}

              {/* Token List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[var(--text-secondary)]">
                    توکن‌های فعال ({tokens.length})
                  </h3>
                  <button
                    type="button"
                    onClick={loadTokens}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingTokens ? 'animate-spin' : ''}`} />
                    <span>بروزرسانی</span>
                  </button>
                </div>

                {isLoadingTokens ? (
                  <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                    در حال بارگذاری...
                  </div>
                ) : tokens.length === 0 ? (
                  <div className="py-6 px-4 text-center rounded-xl border border-dashed border-[var(--border-color)] text-xs text-[var(--text-muted)]">
                    هنوز توکن MCP نساخته‌اید. از فرم بالا اولین توکن را ایجاد کنید تا مدل‌های هوش مصنوعی بتوانند به حافظه شما متصل شوند.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-xl overflow-hidden">
                    {tokens.map((tok) => (
                      <div
                        key={tok.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 bg-[var(--bg-primary)]/40 hover:bg-[var(--bg-tertiary)]/40 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                            {tok.name}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] mt-0.5 flex flex-wrap items-center gap-2 font-mono tabular-nums">
                            <span dir="ltr">{tok.tokenPrefix}</span>
                            <span aria-hidden="true">·</span>
                            <span>ساخت: {new Date(tok.createdAt).toLocaleDateString('fa-IR')}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              آخرین استفاده:{' '}
                              {tok.lastUsedAt ? new Date(tok.lastUsedAt).toLocaleDateString('fa-IR') : 'هنوز استفاده نشده'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRevokeToken(tok.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-500/10 flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>لغو</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AI CLIENT CONFIGS */}
          {activeTab === 'clients' && (
            <div className="space-y-5">
              {/* Segmented client tabs */}
              <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                {[
                  { id: 'claude-desktop' as ClientTarget, label: 'Claude Desktop' },
                  { id: 'claude-code' as ClientTarget, label: 'Claude Code' },
                  { id: 'cursor-vscode' as ClientTarget, label: 'Cursor / VS Code' },
                  { id: 'web-mcp' as ClientTarget, label: 'Claude.ai / ChatGPT (وب)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setClientTarget(item.id)}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      clientTarget === item.id
                        ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {clientTarget === 'claude-desktop' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        روش سریع (پیشنهادی · بدون دانلود فایل) — در فایل claude_desktop_config.json
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText('cd-remote', claudeDesktopRemoteConfig)}
                        className="px-2.5 py-1 rounded-md border border-[var(--border-color)] text-xs flex items-center gap-1.5 hover:bg-[var(--bg-tertiary)] cursor-pointer"
                      >
                        {copiedKey === 'cd-remote' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>کپی JSON</span>
                      </button>
                    </div>
                    <pre
                      dir="ltr"
                      className="p-3.5 rounded-xl bg-[var(--code-bg)] border border-[var(--border-color)] font-mono text-[11px] overflow-x-auto text-[var(--text-primary)]"
                    >
                      {claudeDesktopRemoteConfig}
                    </pre>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        روش بریج محلی stdio (با اسکریپت markdown-studio-bridge.mjs)
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText('cd-stdio', claudeDesktopStdioConfig)}
                        className="px-2.5 py-1 rounded-md border border-[var(--border-color)] text-xs flex items-center gap-1.5 hover:bg-[var(--bg-tertiary)] cursor-pointer"
                      >
                        {copiedKey === 'cd-stdio' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>کپی JSON</span>
                      </button>
                    </div>
                    <pre
                      dir="ltr"
                      className="p-3.5 rounded-xl bg-[var(--code-bg)] border border-[var(--border-color)] font-mono text-[11px] overflow-x-auto text-[var(--text-primary)]"
                    >
                      {claudeDesktopStdioConfig}
                    </pre>
                  </div>
                </div>
              )}

              {clientTarget === 'claude-code' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      دستور مستقیم اتصال در ترمینال Claude Code
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText('cc-cmd', claudeCodeCommand)}
                      className="px-2.5 py-1 rounded-md border border-[var(--border-color)] text-xs flex items-center gap-1.5 hover:bg-[var(--bg-tertiary)] cursor-pointer"
                    >
                      {copiedKey === 'cc-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>کپی دستور</span>
                    </button>
                  </div>
                  <pre
                    dir="ltr"
                    className="p-3.5 rounded-xl bg-[var(--code-bg)] border border-[var(--border-color)] font-mono text-[11px] overflow-x-auto text-[var(--text-primary)]"
                  >
                    {claudeCodeCommand}
                  </pre>
                </div>
              )}

              {clientTarget === 'cursor-vscode' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      تنظیم در .cursor/mcp.json یا .vscode/mcp.json
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText('cursor-json', cursorVscodeConfig)}
                      className="px-2.5 py-1 rounded-md border border-[var(--border-color)] text-xs flex items-center gap-1.5 hover:bg-[var(--bg-tertiary)] cursor-pointer"
                    >
                      {copiedKey === 'cursor-json' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>کپی JSON</span>
                    </button>
                  </div>
                  <pre
                    dir="ltr"
                    className="p-3.5 rounded-xl bg-[var(--code-bg)] border border-[var(--border-color)] font-mono text-[11px] overflow-x-auto text-[var(--text-primary)]"
                  >
                    {cursorVscodeConfig}
                  </pre>
                </div>
              )}

              {clientTarget === 'web-mcp' && (
                <div className="space-y-3 text-xs text-[var(--text-secondary)]">
                  <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-1.5">
                    <div className="font-bold text-[var(--text-primary)]">
                      اتصال مستقیم با OAuth 2.1 (بدون نیاز به Client Secret)
                    </div>
                    <p className="leading-relaxed text-[11px] text-[var(--text-secondary)]">
                      در <strong>Claude.ai</strong> (بخش Settings → Connectors → Add custom connector) یا <strong>ChatGPT</strong> (بخش Connectors)، فقط آدرس زیر را وارد کنید و فیلدهای OAuth Client ID / Secret را <strong>خالی</strong> بگذارید. پس از کلیک روی Connect، صفحه تأیید همین سامانه باز می‌شود و با یک کلیک متصل می‌شوید.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-1">
                      <div className="text-[11px] text-[var(--text-muted)]">Remote MCP Server URL</div>
                      <code dir="ltr" className="block font-mono text-[11px] text-[var(--text-primary)] break-all select-all">
                        {mcpUrl}
                      </code>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-1">
                      <div className="text-[11px] text-[var(--text-muted)]">OAuth Client ID اختیاری (در صورت نیاز کلاینت)</div>
                      <code dir="ltr" className="block font-mono text-[11px] text-[var(--text-primary)] break-all select-all">
                        markdown-studio-mcp
                      </code>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-1">
                    <div className="text-[11px] text-[var(--text-muted)]">
                      برای ابزارهایی که هدر مستقیم می‌پذیرند (Bearer Token):
                    </div>
                    <code dir="ltr" className="block font-mono text-[11px] text-[var(--text-primary)] break-all select-all">
                      Authorization: Bearer {displayToken}
                    </code>
                  </div>
                </div>
              )}

              {/* Available MCP Memory Tools Reference */}
              <div className="pt-4 border-t border-[var(--border-color)] space-y-2.5">
                <h3 className="text-xs font-bold text-[var(--text-primary)]">
                  ابزارهای حافظه در دسترس مدل ({tools.length || 10} ابزار)
                </h3>
                <div className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-xl overflow-hidden">
                  {tools.map((tool) => (
                    <div key={tool.name} className="px-3.5 py-2.5 bg-[var(--bg-primary)]/40 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <code dir="ltr" className="font-mono text-[11px] font-semibold text-[var(--accent-color)] sm:w-44 shrink-0">
                        {tool.name}
                      </code>
                      <span dir="ltr" className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                        {tool.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LOCAL COMPUTER SYNC */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              {/* Method 1: Browser-Direct Folder Sync */}
              <div className="space-y-3 pb-6 border-b border-[var(--border-color)]">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    روش ۱ · همگام‌سازی مستقیم پوشه کامپیوتر از داخل مرورگر
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                    یک پوشه روی هارد کامپیوتر انتخاب کنید تا پوشه‌ها، زیرپوشه‌ها و فایل‌های مارک‌دان به‌صورت دوطرفه با حافظه ابری همگام شوند.
                  </p>
                </div>

                {supportsFileSystemAccess ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePickLocalFolder}
                        className="px-4 py-2 rounded-lg bg-[var(--accent-color)] hover:opacity-90 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <FolderOpen className="w-4 h-4" />
                        <span>{dirHandle ? `تغییر پوشه (${dirName})` : 'انتخاب پوشه روی کامپیوتر'}</span>
                      </button>

                      {dirHandle && (
                        <>
                          <button
                            type="button"
                            disabled={isSyncing}
                            onClick={() => runBrowserSync('two-way')}
                            className="px-3.5 py-2 rounded-lg border border-[var(--accent-color)] text-[var(--accent-color)] hover:bg-[var(--accent-color)]/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            <span>همگام‌سازی دوطرفه</span>
                          </button>
                          <button
                            type="button"
                            disabled={isSyncing}
                            onClick={() => runBrowserSync('pull')}
                            className="px-3 py-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <ArrowDownToLine className="w-3.5 h-3.5" />
                            <span>دریافت از ابر</span>
                          </button>
                          <button
                            type="button"
                            disabled={isSyncing}
                            onClick={() => runBrowserSync('push')}
                            className="px-3 py-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <ArrowUpFromLine className="w-3.5 h-3.5" />
                            <span>ارسال به ابر</span>
                          </button>
                        </>
                      )}
                    </div>

                    {syncSummary && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex flex-wrap items-center gap-2 tabular-nums">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="font-semibold">{syncSummary.mode} انجام شد</span>
                        <span aria-hidden="true">·</span>
                        <span>دریافت روی سیستم: {syncSummary.pulled}</span>
                        <span aria-hidden="true">·</span>
                        <span>ارسال به ابر: {syncSummary.pushed}</span>
                        <span aria-hidden="true">·</span>
                        <span>پوشه جدید: {syncSummary.foldersCreated}</span>
                        <span aria-hidden="true">·</span>
                        <span>ساعت {syncSummary.timestamp}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                    مرورگر فعلی از دسترسی مستقیم به پوشه پشتیبانی نمی‌کند (در Chrome یا Edge دسکتاپ فعال است). از روش ۲ (بریج Node.js) استفاده کنید که روی همه سیستم‌عامل‌ها و در پس‌زمینه کار می‌کند.
                  </p>
                )}
              </div>

              {/* Method 2: Local Node.js Bridge */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      روش ۲ · بریج محلی Node.js (همگام‌سازی خودکار مداوم + پروکسی stdio)
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                      بدون نیاز به نصب هیچ پکیج جانبی (فقط Node.js 18+). پوشه محلی شما را لحظه‌ای با حافظه مدل همگام نگه می‌دارد؛ هر فایلی که LLM بسازد فوراً روی هارد کامپیوتر ظاهر می‌شود.
                    </p>
                  </div>
                  <a
                    href="/api/mcp/bridge-script"
                    download="markdown-studio-bridge.mjs"
                    className="px-4 py-2 rounded-lg bg-[var(--accent-color)] hover:opacity-90 text-white text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>دانلود فایل بریج (.mjs)</span>
                  </a>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>اجرا در مک / لینوکس (همگام‌سازی خودکار پوشه ai-memory)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText('sync-unix', syncCommandUnix)}
                        className="text-[11px] text-[var(--accent-color)] hover:underline cursor-pointer"
                      >
                        {copiedKey === 'sync-unix' ? 'کپی شد' : 'کپی دستور'}
                      </button>
                    </div>
                    <pre
                      dir="ltr"
                      className="p-3 rounded-xl bg-[var(--code-bg)] border border-[var(--border-color)] font-mono text-[11px] overflow-x-auto text-[var(--text-primary)]"
                    >
                      {syncCommandUnix}
                    </pre>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>اجرا در ویندوز (PowerShell)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText('sync-win', syncCommandWindows)}
                        className="text-[11px] text-[var(--accent-color)] hover:underline cursor-pointer"
                      >
                        {copiedKey === 'sync-win' ? 'کپی شد' : 'کپی دستور'}
                      </button>
                    </div>
                    <pre
                      dir="ltr"
                      className="p-3 rounded-xl bg-[var(--code-bg)] border border-[var(--border-color)] font-mono text-[11px] overflow-x-auto text-[var(--text-primary)]"
                    >
                      {syncCommandWindows}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
