import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { MarkdownDoc } from '../types';
import { getEffectiveFolderPath, getFolderTheme } from '../utils/docTree';

interface AiBrainManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: MarkdownDoc[];
  onUpdateDocuments: (docs: MarkdownDoc[]) => void;
  onSyncBrainToServer: (brainDocs: MarkdownDoc[]) => Promise<void>;
  onPurgeServerBrain: () => Promise<void>;
  isSyncing: boolean;
}

export const AiBrainManagerModal: React.FC<AiBrainManagerModalProps> = ({
  isOpen,
  onClose,
  documents,
  onUpdateDocuments,
  onSyncBrainToServer,
  onPurgeServerBrain,
  isSyncing,
}) => {
  const [folderSearch, setFolderSearch] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Analyze all unique folders and their stats
  const folderStats = useMemo(() => {
    const map = new Map<string, { count: number; brainCount: number; docs: MarkdownDoc[] }>();
    documents.forEach((d) => {
      const folder = getEffectiveFolderPath(d.folderPath);
      const isBrain = Boolean(
        d.isAiBrain ||
        folder.includes('مغز') ||
        folder.includes('brain') ||
        d.tags?.includes('ai-brain')
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
        d.isAiBrain ||
        getEffectiveFolderPath(d.folderPath).includes('مغز') ||
        getEffectiveFolderPath(d.folderPath).includes('brain') ||
        d.tags?.includes('ai-brain')
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
      if (getEffectiveFolderPath(d.folderPath) === folderName) {
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

  // Add all folders to brain
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

  // Remove all documents from local brain
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

  // Sync selected to server
  const handleSyncNow = async () => {
    const brainDocs = documents.filter((d) =>
      Boolean(
        d.isAiBrain ||
        getEffectiveFolderPath(d.folderPath).includes('مغز') ||
        getEffectiveFolderPath(d.folderPath).includes('brain') ||
        d.tags?.includes('ai-brain')
      )
    );

    if (brainDocs.length === 0) {
      alert('ابتدا حداقل یک پوشه را برای اتصال به مغز تیک بزنید.');
      return;
    }

    await onSyncBrainToServer(brainDocs);
  };

  // Purge server brain
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-[var(--bg-secondary)] border border-fuchsia-500/30 shadow-2xl overflow-hidden flex flex-col text-[var(--text-primary)] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-color)] bg-gradient-to-r from-fuchsia-500/10 via-purple-500/5 to-transparent flex items-center justify-between shrink-0">
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
                انتخاب پوشه‌ها برای تغذیه حافظه Claude ،Cursor و کانکتورهای MCP
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="px-5 py-2 bg-fuchsia-500/15 border-b border-fuchsia-500/30 text-fuchsia-300 text-xs flex items-center gap-2 animate-in fade-in">
            <span>✨</span>
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Search & Bulk Selection Bar */}
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/40 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={folderSearch}
              onChange={(e) => setFolderSearch(e.target.value)}
              placeholder="جستجو در بین پوشه‌ها (مثلاً MIND یا pori)..."
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

        {/* Folders List (Toggle each folder in/out of brain) */}
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
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)]/40 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handlePurge}
            disabled={isPurging}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-500 hover:text-white hover:bg-rose-500 transition-colors border border-rose-500/30 cursor-pointer disabled:opacity-50"
            title="تخلیه کامل اسناد مغز هوش مصنوعی از سرور ابری"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isPurging ? 'در حال تخلیه...' : 'تخلیه کامل مغز هوش مصنوعی'}</span>
          </button>

          <div className="flex items-center gap-2 ms-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
            >
              بستن
            </button>

            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'در حال ارسال به سرور...' : `همگام‌سازی با مغز AI (${totalBrainDocsCount})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
