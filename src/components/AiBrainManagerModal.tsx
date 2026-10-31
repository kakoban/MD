import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Check,
  Folder,
  Trash2,
  RefreshCw,
  Sparkles,
  Layers,
  CheckSquare,
  Square,
  Search,
  HardDrive,
  Cloud,
  Copy,
  Terminal,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  FolderPlus,
  PlayCircle,
  HelpCircle,
} from 'lucide-react';
import { MarkdownDoc } from '../types';
import { getEffectiveFolderPath, getFolderTheme } from '../utils/docTree';
import {
  LinkedFolderRecord,
  checkFoldersPermissionStatus,
  createStandardBrainFolders,
  writeDocToAppropriateFolder,
} from '../utils/localSync';

interface AiBrainManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: MarkdownDoc[];
  onUpdateDocuments: (docs: MarkdownDoc[]) => void;
  onSyncBrainToServer: (brainDocs: MarkdownDoc[]) => Promise<void>;
  onPurgeServerBrain: () => Promise<void>;
  isSyncing: boolean;
  onFetchFromCloud?: () => Promise<void>;
  linkedFolders?: LinkedFolderRecord[];
  onGrantDiskPermission?: () => Promise<void>;
  onSyncLocalDisk?: () => void;
}

export const AiBrainManagerModal: React.FC<AiBrainManagerModalProps> = ({
  isOpen,
  onClose,
  documents,
  onUpdateDocuments,
  onSyncBrainToServer,
  onPurgeServerBrain,
  isSyncing,
  onFetchFromCloud,
  linkedFolders = [],
  onGrantDiskPermission,
  onSyncLocalDisk,
}) => {
  const [activeTab, setActiveTab] = useState<'folders' | 'guide'>('folders');
  const [folderSearch, setFolderSearch] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [isFetchingCloud, setIsFetchingCloud] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<{
    allGranted: boolean;
    needsPrompt: boolean;
    statusText: string;
  }>({ allGranted: false, needsPrompt: false, statusText: 'در حال بررسی...' });

  // Check live disk permission status
  useEffect(() => {
    if (isOpen && linkedFolders.length > 0) {
      checkFoldersPermissionStatus(linkedFolders).then((res) => {
        setPermissionState({
          allGranted: res.allGranted,
          needsPrompt: res.needsPrompt,
          statusText: res.allGranted
            ? 'مجوز نوشتن فعال است ✅'
            : res.needsPrompt
            ? 'نیازمند تأیید کاربر ⚠️'
            : 'رد شده یا نامعتبر ❌',
        });
      });
    } else {
      setPermissionState({
        allGranted: false,
        needsPrompt: false,
        statusText: 'هیچ پوشه‌ای متصل نیست',
      });
    }
  }, [isOpen, linkedFolders]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Analyze all unique folders and their stats
  const folderStats = useMemo(() => {
    const map = new Map<string, { count: number; brainCount: number; docs: MarkdownDoc[] }>();
    documents.forEach((d) => {
      const folder = getEffectiveFolderPath(d.folderPath);
      // Explicitly check isAiBrain flag or ai-brain tag only (avoid hardcoded folder name locks)
      const isBrain = Boolean(
        d.isAiBrain ?? d.tags?.includes('ai-brain')
      );

      const entry = map.get(folder) || { count: 0, brainCount: 0, docs: [] };
      entry.count += 1;
      if (isBrain) entry.brainCount += 1;
      entry.docs.push(d);
      map.set(folder, entry);
    });

    return Array.from(map.entries()).map(([name, stat]) => ({
      name,
      count: stat.count,
      brainCount: stat.brainCount,
      isFullyInBrain: stat.brainCount === stat.count,
      isPartiallyInBrain: stat.brainCount > 0 && stat.brainCount < stat.count,
      docs: stat.docs,
    }));
  }, [documents]);

  const totalBrainDocsCount = useMemo(() => {
    return documents.filter((d) =>
      Boolean(
        d.isAiBrain ?? d.tags?.includes('ai-brain')
      )
    ).length;
  }, [documents]);

  const filteredFolders = useMemo(() => {
    if (!folderSearch.trim()) return folderStats;
    const q = folderSearch.toLowerCase().trim();
    return folderStats.filter((f) => f.name.toLowerCase().includes(q));
  }, [folderStats, folderSearch]);

  if (!isOpen) return null;

  // Toggle all documents in a specific folder in/out of AI Brain
  const handleToggleFolder = (folderName: string, shouldAdd: boolean) => {
    const updated = documents.map((d) => {
      const docFolder = getEffectiveFolderPath(d.folderPath);
      if (docFolder.toLowerCase() === folderName.toLowerCase()) {
        return {
          ...d,
          isAiBrain: shouldAdd,
          tags: shouldAdd
            ? Array.from(new Set([...(d.tags || []), 'ai-brain']))
            : (d.tags || []).filter((t) => t !== 'ai-brain'),
          updatedAt: Date.now(),
        };
      }
      return d;
    });

    onUpdateDocuments(updated);
    setActionNotice(
      shouldAdd
        ? `تمام اسناد پوشه «${folderName}» به مغز هوش مصنوعی اضافه شدند.`
        : `پوشه «${folderName}» از مغز هوش مصنوعی خارج شد.`
    );
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleSelectAll = () => {
    const updated = documents.map((d) => ({
      ...d,
      isAiBrain: true,
      tags: Array.from(new Set([...(d.tags || []), 'ai-brain'])),
      updatedAt: Date.now(),
    }));
    onUpdateDocuments(updated);
    setActionNotice('تمام اسناد و پوشه‌ها برای اتصال به مغز هوش مصنوعی انتخاب شدند.');
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleDeselectAll = () => {
    const updated = documents.map((d) => ({
      ...d,
      isAiBrain: false,
      tags: (d.tags || []).filter((t) => t !== 'ai-brain'),
      updatedAt: Date.now(),
    }));
    onUpdateDocuments(updated);
    setActionNotice('تمام اسناد از مغز هوش مصنوعی خارج شدند.');
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleSyncNow = async () => {
    const brainDocs = documents.filter((d) =>
      Boolean(
        d.isAiBrain ?? d.tags?.includes('ai-brain')
      )
    );

    if (brainDocs.length === 0) {
      alert('ابتدا حداقل یک پوشه را برای اتصال به مغز تیک بزنید.');
      return;
    }

    await onSyncBrainToServer(brainDocs);
  };

  const handlePurge = async () => {
    if (!confirm('آیا از تخلیه کامل حافظه هوش مصنوعی (کلود) اطمینان دارید؟\nاین عمل اسناد محلی شما را حذف نمی‌کند، بلکه حافظه آپلودشده در سرور را پاکسازی می‌کند.')) {
      return;
    }
    setIsPurging(true);
    try {
      await onPurgeServerBrain();
      handleDeselectAll();
    } finally {
      setIsPurging(false);
    }
  };

  const handleFetchCloudFiles = async () => {
    if (!onFetchFromCloud) return;
    setIsFetchingCloud(true);
    try {
      await onFetchFromCloud();
      setActionNotice('اسناد جدید با موفقیت از Claude و سرور دریافت شدند.');
      setTimeout(() => setActionNotice(null), 3500);
    } finally {
      setIsFetchingCloud(false);
    }
  };

  const handleTestWriteLocal = async () => {
    if (linkedFolders.length === 0) {
      alert('ابتدا یک پوشه محلی از کامپیوتر خود متصل کنید.');
      return;
    }
    const testDoc = {
      title: 'تست_اتصال_مغز_هوش_مصنوعی',
      content: `# تست اتصال مغز هوش مصنوعی به دیسک محلی\nاین یادداشت جهت اعتبارسنجی نوشتن خودکار روی هارد دیسک ایجاد شده است.\n\n- زمان تست: ${new Date().toLocaleString('fa-IR')}\n- وضعیت: ارتباط مستقیم بدون واسطه برقرار است.`,
      folderPath: '🧠 مغز هوش مصنوعی',
    };
    const ok = await writeDocToAppropriateFolder(linkedFolders, testDoc);
    if (ok) {
      setActionNotice('فایل آزمایشی با موفقیت روی پوشه هارد کامپیوتر شما نوشته شد ✅');
    } else {
      setActionNotice('خطا در نوشتن روی هارد دیسک. ممکن است نیاز به کلیک دکمه تأیید مجوز باشد ⚠️');
    }
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleCreateStandardFolders = async () => {
    if (linkedFolders.length === 0) {
      alert('ابتدا یک پوشه اصلی متصل کنید.');
      return;
    }
    const created = await createStandardBrainFolders(linkedFolders[0].handle);
    setActionNotice(`پوشه‌های استاندارد مغز دوم (${created.join('، ')}) روی هارد ساخته شدند ✨`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const mcpUrl = 'https://markdown-studio-pro.onrender.com/api/mcp';
  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        'markdown-studio-brain': {
          url: 'https://markdown-studio-pro.onrender.com/api/mcp',
        },
      },
    },
    null,
    2
  );
  const sampleClaudePrompt = 'از طریق ابزار hub_create_note یک یادداشت جدید با عنوان «برنامه_هفتگی» و متن «یادداشت آزمایشی هوش مصنوعی» در مغز من ایجاد کن.';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-3xl frosted-glass border border-[var(--glass-border)] shadow-2xl overflow-hidden flex flex-col text-[var(--text-primary)] max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--glass-border)] bg-gradient-to-r from-fuchsia-500/10 via-purple-500/5 to-transparent flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-400 flex items-center justify-center text-xl shadow-xs">
              🧠
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  مدیریت مغز هوش مصنوعی (AI Brain Vault)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/30 font-bold font-mono">
                  {totalBrainDocsCount} سند در مغز
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                سینک خودکار دوطرفه بین Claude، سرور ابری و پوشه هارد کامپیوتر
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs Switcher */}
            <div className="flex items-center bg-[var(--tile)] p-0.5 rounded-xl border border-[var(--glass-border)] text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('folders')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  activeTab === 'folders'
                    ? 'bg-fuchsia-600 text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                پوشه‌ها و اسناد
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                  activeTab === 'guide'
                    ? 'bg-fuchsia-600 text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>راهنمای اتصال به Claude</span>
                <span className="text-[10px]">✨</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="px-5 py-2 bg-fuchsia-500/15 border-b border-fuchsia-500/30 text-fuchsia-300 text-xs flex items-center gap-2 animate-in fade-in">
            <span>✨</span>
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Connection Health Bar (Live status of Disk & Cloud MCP) */}
        <div className="p-3 bg-[var(--bg-primary)]/80 border-b border-[var(--border-color)] grid grid-cols-1 md:grid-cols-2 gap-2 text-xs shrink-0">
          {/* 1. Local Disk Health */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <div className="flex items-center gap-2 min-w-0">
              <HardDrive className="w-4 h-4 text-sky-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-[11px] block truncate">
                  پوشه هارد: {linkedFolders.length > 0 ? linkedFolders.map(f => f.name).join('، ') : 'متصل نیست'}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {permissionState.statusText}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {permissionState.needsPrompt && onGrantDiskPermission && (
                <button
                  type="button"
                  onClick={onGrantDiskPermission}
                  className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-[10px] font-bold cursor-pointer"
                  title="کلیک برای تأیید مجوز نوشتن مرورگر"
                >
                  تأیید مجوز 🔓
                </button>
              )}
              {linkedFolders.length > 0 && (
                <button
                  type="button"
                  onClick={handleTestWriteLocal}
                  className="px-2 py-1 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] text-[10px] cursor-pointer"
                  title="تست نوشتن یک فایل روی هارد"
                >
                  تست دیسک
                </button>
              )}
            </div>
          </div>

          {/* 2. Cloud & MCP Health */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <div className="flex items-center gap-2 min-w-0">
              <Cloud className="w-4 h-4 text-fuchsia-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-[11px] block truncate">
                  سرور ابری و MCP: فعال
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {totalBrainDocsCount} سند آماده تغذیه هوش مصنوعی
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {onFetchFromCloud && (
                <button
                  type="button"
                  onClick={handleFetchCloudFiles}
                  disabled={isFetchingCloud}
                  className="px-2 py-1 rounded-md bg-fuchsia-500/15 text-fuchsia-300 hover:bg-fuchsia-500/25 border border-fuchsia-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="دریافت فایل‌های ساخته شده توسط Claude از سرور"
                >
                  <RefreshCw className={`w-3 h-3 ${isFetchingCloud ? 'animate-spin' : ''}`} />
                  <span>دریافت از کلود</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* TAB 1: FOLDERS LIST */}
        {activeTab === 'folders' && (
          <>
            {/* Search & Bulk Selection Bar */}
            <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/40 flex items-center justify-between gap-3 shrink-0 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={folderSearch}
                  onChange={(e) => setFolderSearch(e.target.value)}
                  placeholder="جستجو در بین پوشه‌ها (مثلاً 01-Projects یا عمومی)..."
                  className="w-full ps-8 pe-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-fuchsia-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] transition-colors cursor-pointer"
                >
                  انتخاب همه
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-rose-400 border border-[var(--border-color)] transition-colors cursor-pointer"
                >
                  لغو همه
                </button>
              </div>
            </div>

            {/* Folders List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredFolders.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                  پوشه‌ای با این نام یافت نشد.
                </div>
              ) : (
                filteredFolders.map((f) => {
                  const theme = getFolderTheme(f.name);
                  const inBrain = f.brainCount > 0;

                  return (
                    <div
                      key={f.name}
                      onClick={() => handleToggleFolder(f.name, !inBrain)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        inBrain
                          ? 'bg-fuchsia-500/10 border-fuchsia-500/50 shadow-xs'
                          : 'bg-[var(--bg-primary)] border-[var(--border-color)] hover:border-fuchsia-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                            inBrain
                              ? 'bg-fuchsia-500 text-white'
                              : 'border border-[var(--border-color)] text-transparent'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>

                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Folder className={`w-4 h-4 ${theme.icon} shrink-0`} />
                          <span className="font-bold text-xs text-[var(--text-primary)] truncate">
                            {f.name}
                          </span>
                          <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold border ${theme.badge} shrink-0`}>
                            {f.count} سند
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ms-2">
                        {inBrain ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 font-bold border border-fuchsia-500/30 flex items-center gap-1">
                            <span>🧠</span>
                            <span>در مغز ({f.brainCount})</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--text-muted)]">کلیک برای افزودن</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-3 sm:p-4 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)]/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={handlePurge}
                disabled={isPurging}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-500 hover:text-white hover:bg-rose-500 transition-colors border border-rose-500/30 cursor-pointer disabled:opacity-50"
                title="تخلیه کامل اسناد مغز هوش مصنوعی از سرور ابری"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isPurging ? 'در حال تخلیه...' : 'تخلیه کامل مغز هوش مصنوعی'}</span>
              </button>

              <div className="flex items-center gap-2 justify-end sm:ms-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer text-center"
                >
                  بستن
                </button>

                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'در حال ارسال...' : `ارسال و همگام‌سازی (${totalBrainDocsCount})`}</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: STEP-BY-STEP ONBOARDING GUIDE */}
        {activeTab === 'guide' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs leading-relaxed">
            {/* Step 1 */}
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-3">
              <div className="flex items-center gap-2.5 font-bold text-sm text-[var(--text-primary)]">
                <span className="w-6 h-6 rounded-full bg-fuchsia-500 text-white flex items-center justify-center text-xs">
                  ۱
                </span>
                <span>گام اول: اتصال پوشه کامپیوتر شما به استودیو</span>
              </div>
              <p className="text-[var(--text-muted)] text-[11px]">
                اسنادی که هوش مصنوعی می‌سازد یا ویرایش می‌کند، بدون نیاز به واسطه، مستقیماً داخل یک پوشه روی هارد کامپیوتر شما ذخیره می‌شوند.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {onSyncLocalDisk && (
                  <button
                    type="button"
                    onClick={onSyncLocalDisk}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0061FF] hover:bg-[#0052cc] text-white font-bold text-xs shadow-xs cursor-pointer"
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>{linkedFolders.length > 0 ? 'افزودن پوشه محلی دیگر' : 'انتخاب پوشه از هارد دیسک'}</span>
                  </button>
                )}
                {linkedFolders.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCreateStandardFolders}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-bold text-xs cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>ساخت پوشه‌های استاندارد (00-Inbox, 01-Projects, ...)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-3">
              <div className="flex items-center gap-2.5 font-bold text-sm text-[var(--text-primary)]">
                <span className="w-6 h-6 rounded-full bg-fuchsia-500 text-white flex items-center justify-center text-xs">
                  ۲
                </span>
                <span>گام دوم: اتصال هوش مصنوعی (Claude یا Cursor)</span>
              </div>

              {/* Option A: Claude.ai Web Connectors */}
              <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[var(--text-primary)]">
                    روش اول: وب‌سایت کلود (Claude.ai Connectors)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">
                    ساده‌ترین روش
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  به آدرس Claude.ai رفته، روی پروفایل و سپس Settings &gt; Connectors کلیک کنید و آدرس زیر را وارد نمایید:
                </p>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] font-mono text-[11px]">
                  <span className="truncate select-all text-fuchsia-400">{mcpUrl}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(mcpUrl, 'mcpUrl')}
                    className="p-1 text-[var(--text-muted)] hover:text-white cursor-pointer ms-2"
                    title="کپی آدرس MCP"
                  >
                    {copiedKey === 'mcpUrl' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Option B: Claude Desktop / Cursor */}
              <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[var(--text-primary)]">
                    روش دوم: نرم‌افزار دسکتاپ Claude یا Cursor
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  کد زیر را داخل فایل <code className="text-fuchsia-400">claude_desktop_config.json</code> خود قرار دهید:
                </p>
                <div className="relative p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] font-mono text-[11px] overflow-x-auto text-gray-300">
                  <pre>{claudeDesktopConfig}</pre>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(claudeDesktopConfig, 'claudeConfig')}
                    className="absolute top-2 end-2 p-1.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-white cursor-pointer border border-[var(--border-color)]"
                    title="کپی کانفیگ JSON"
                  >
                    {copiedKey === 'claudeConfig' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-3">
              <div className="flex items-center gap-2.5 font-bold text-sm text-[var(--text-primary)]">
                <span className="w-6 h-6 rounded-full bg-fuchsia-500 text-white flex items-center justify-center text-xs">
                  ۳
                </span>
                <span>گام سوم: تست عملی فرمان‌دهی به Claude</span>
              </div>
              <p className="text-[var(--text-muted)] text-[11px]">
                پرامپت زیر را کپی کرده و به Claude ارسال کنید تا بلافاصله یادداشت جدید در مغز هوش مصنوعی و روی دیسک محلی شما ظاهر شود:
              </p>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-300 text-xs">
                <span>«{sampleClaudePrompt}»</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(sampleClaudePrompt, 'samplePrompt')}
                  className="px-2.5 py-1 rounded-lg bg-fuchsia-500 text-white hover:bg-fuchsia-600 font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0 ms-2"
                >
                  {copiedKey === 'samplePrompt' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'samplePrompt' ? 'کپی شد' : 'کپی پرامپت'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
