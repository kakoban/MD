import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronLeft,
  ChevronDown,
  Layers,
  Inbox,
  Edit3,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { FolderItem, MarkdownDoc } from '../types';
import { getDescendantFolderIds } from '../services/memoryApi';

export type FolderSelection = 'all' | 'root' | string;

interface FolderTreeProps {
  folders: FolderItem[];
  documents: MarkdownDoc[];
  selectedFolder: FolderSelection;
  onSelectFolder: (selection: FolderSelection) => void;
  onCreateFolder: (name: string, parentId: string | null) => Promise<void>;
  onRenameFolder: (folderId: string, newName: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  compact?: boolean;
}

export const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  documents,
  selectedFolder,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  compact = false,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [creatingParentId, setCreatingParentId] = useState<string | null | 'none'>('none');
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, FolderItem[]>();
    for (const f of folders) {
      const key = f.parentId ?? null;
      const list = map.get(key) || [];
      list.push(f);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, 'fa'));
    }
    return map;
  }, [folders]);

  const docCountBySubtree = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of folders) {
      const descendants = getDescendantFolderIds(folders, f.id);
      let total = 0;
      for (const doc of documents) {
        if (doc.folderId && descendants.has(doc.folderId)) total++;
      }
      counts.set(f.id, total);
    }
    return counts;
  }, [folders, documents]);

  const rootUnfiledCount = useMemo(
    () => documents.filter((d) => !d.folderId).length,
    [documents]
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startCreate = (parentId: string | null) => {
    setCreatingParentId(parentId);
    setNewFolderName('');
    setRenamingId(null);
    setConfirmDeleteId(null);
    if (parentId) {
      setExpandedIds((prev) => new Set(prev).add(parentId));
    }
  };

  const handleConfirmCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed || creatingParentId === 'none' || isBusy) return;
    setIsBusy(true);
    try {
      await onCreateFolder(trimmed, creatingParentId);
      setCreatingParentId('none');
      setNewFolderName('');
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirmRename = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = renameValue.trim();
    if (!trimmed || !renamingId || isBusy) return;
    setIsBusy(true);
    try {
      await onRenameFolder(renamingId, trimmed);
      setRenamingId(null);
      setRenameValue('');
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirmDelete = async (id: string) => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await onDeleteFolder(id);
      setConfirmDeleteId(null);
      if (selectedFolder === id) {
        onSelectFolder('all');
      }
    } finally {
      setIsBusy(false);
    }
  };

  const renderNode = (folder: FolderItem, depth: number) => {
    const children = childrenByParent.get(folder.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(folder.id);
    const isSelected = selectedFolder === folder.id;
    const count = docCountBySubtree.get(folder.id) || 0;
    const isRenaming = renamingId === folder.id;
    const isDeleting = confirmDeleteId === folder.id;

    return (
      <div key={folder.id}>
        <div
          style={{ paddingInlineStart: `${depth * 14 + 8}px` }}
          className={`group flex items-center gap-1.5 pe-2 rounded-lg transition-colors cursor-pointer ${
            compact ? 'py-1.5 text-xs' : 'py-2 text-xs'
          } ${
            isSelected
              ? 'bg-[var(--accent-color)]/12 text-[var(--accent-color)] font-semibold'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
          }`}
          onClick={() => {
            if (!isRenaming) onSelectFolder(folder.id);
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(folder.id);
            }}
            aria-label={isExpanded ? 'بستن زیرپوشه‌ها' : 'باز کردن زیرپوشه‌ها'}
            className={`w-4 h-4 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0 cursor-pointer ${
              hasChildren || creatingParentId === folder.id ? 'opacity-100' : 'opacity-25'
            }`}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>

          {isSelected || isExpanded ? (
            <FolderOpen className="w-3.5 h-3.5 shrink-0 text-[var(--accent-color)]" />
          ) : (
            <Folder className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
          )}

          {isRenaming ? (
            <form
              onSubmit={handleConfirmRename}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 flex items-center gap-1 min-w-0"
            >
              <input
                type="text"
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                className="flex-1 min-w-0 px-1.5 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--accent-color)] text-xs text-[var(--text-primary)] focus:outline-none"
              />
              <button
                type="submit"
                disabled={isBusy}
                className="p-0.5 text-emerald-600 hover:bg-emerald-500/10 rounded cursor-pointer"
                title="ذخیره"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setRenamingId(null)}
                className="p-0.5 text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] rounded cursor-pointer"
                title="لغو"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <>
              <span className="flex-1 truncate" title={folder.name}>
                {folder.name}
              </span>

              {isDeleting ? (
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleConfirmDelete(folder.id)}
                    className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-semibold cursor-pointer"
                  >
                    حذف
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-1 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)] text-[10px] cursor-pointer"
                  >
                    لغو
                  </button>
                </div>
              ) : (
                <>
                  <div
                    className="hidden group-hover:flex items-center gap-0.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => startCreate(folder.id)}
                      title="زیرپوشه جدید"
                      className="p-1 rounded hover:bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--accent-color)] cursor-pointer"
                    >
                      <FolderPlus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(folder.id);
                        setRenameValue(folder.name);
                        setConfirmDeleteId(null);
                      }}
                      title="تغییر نام پوشه"
                      className="p-1 rounded hover:bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(folder.id)}
                      title="حذف پوشه (اسناد به والد منتقل می‌شوند)"
                      className="p-1 rounded hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-[var(--text-muted)] group-hover:hidden">
                    {count}
                  </span>
                </>
              )}
            </>
          )}
        </div>

        {/* Inline subfolder creator */}
        {creatingParentId === folder.id && (
          <form
            onSubmit={handleConfirmCreate}
            style={{ paddingInlineStart: `${(depth + 1) * 14 + 12}px` }}
            className="flex items-center gap-1 py-1 pe-2"
          >
            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setCreatingParentId('none');
              }}
              placeholder="نام زیرپوشه (مثلاً notes یا a/b)"
              className="flex-1 min-w-0 px-2 py-1 rounded-md bg-[var(--bg-primary)] border border-[var(--accent-color)] text-xs text-[var(--text-primary)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isBusy || !newFolderName.trim()}
              className="p-1 rounded bg-[var(--accent-color)] text-white disabled:opacity-50 cursor-pointer"
              title="ایجاد"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCreatingParentId('none')}
              className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] cursor-pointer"
              title="لغو"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Render nested children */}
        {isExpanded && hasChildren && (
          <div className="space-y-0.5">
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootFolders = childrenByParent.get(null) || [];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-2 pb-1">
        <span className="text-[11px] font-semibold text-[var(--text-muted)]">
          پوشه‌ها و حافظه
        </span>
        <button
          type="button"
          onClick={() => startCreate(null)}
          title="ساخت پوشه جدید در ریشه"
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium text-[var(--accent-color)] hover:bg-[var(--accent-color)]/10 transition-colors cursor-pointer"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>پوشه جدید</span>
        </button>
      </div>

      {/* All Documents */}
      <button
        type="button"
        onClick={() => onSelectFolder('all')}
        className={`w-full flex items-center justify-between px-2.5 rounded-lg transition-colors cursor-pointer ${
          compact ? 'py-1.5 text-xs' : 'py-2 text-xs'
        } ${
          selectedFolder === 'all'
            ? 'bg-[var(--accent-color)]/12 text-[var(--accent-color)] font-semibold'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">همه اسناد</span>
        </span>
        <span className="text-[11px] font-mono tabular-nums text-[var(--text-muted)]">
          {documents.length}
        </span>
      </button>

      {/* Root (Unfiled) when folders exist */}
      {folders.length > 0 && (
        <button
          type="button"
          onClick={() => onSelectFolder('root')}
          className={`w-full flex items-center justify-between px-2.5 rounded-lg transition-colors cursor-pointer ${
            compact ? 'py-1.5 text-xs' : 'py-2 text-xs'
          } ${
            selectedFolder === 'root'
              ? 'bg-[var(--accent-color)]/12 text-[var(--accent-color)] font-semibold'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <span className="flex items-center gap-2 truncate">
            <Inbox className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">بدون پوشه (ریشه)</span>
          </span>
          <span className="text-[11px] font-mono tabular-nums text-[var(--text-muted)]">
            {rootUnfiledCount}
          </span>
        </button>
      )}

      {/* Root inline creator */}
      {creatingParentId === null && (
        <form onSubmit={handleConfirmCreate} className="flex items-center gap-1 px-1.5 py-1">
          <input
            type="text"
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setCreatingParentId('none');
            }}
            placeholder="نام پوشه یا مسیر (مثل memory/projects)"
            className="flex-1 min-w-0 px-2 py-1 rounded-md bg-[var(--bg-primary)] border border-[var(--accent-color)] text-xs text-[var(--text-primary)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={isBusy || !newFolderName.trim()}
            className="p-1 rounded bg-[var(--accent-color)] text-white disabled:opacity-50 cursor-pointer"
            title="ایجاد"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCreatingParentId('none')}
            className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] cursor-pointer"
            title="لغو"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* Nested folder tree */}
      {rootFolders.length > 0 ? (
        <div className="space-y-0.5 pt-0.5">
          {rootFolders.map((folder) => renderNode(folder, 0))}
        </div>
      ) : (
        creatingParentId === 'none' && (
          <p className="px-2.5 py-1.5 text-[11px] text-[var(--text-muted)] leading-relaxed">
            هنوز پوشه‌ای ساخته نشده است. می‌توانید اینجا یا از طریق MCP پوشه و زیرپوشه بسازید.
          </p>
        )
      )}
    </div>
  );
};
