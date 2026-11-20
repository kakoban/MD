import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Upload,
  Search,
  Star,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  FileCode,
  Globe,
  Check,
  Share2,
  Loader2,
  Lock,
  Link2,
  Folder,
  FolderInput,
} from 'lucide-react';
import { MarkdownDoc, FolderItem } from '../types';
import { cloudApi, SharedMarkdownFile } from '../services/cloudApi';
import { FolderTree, FolderSelection } from './FolderTree';
import { buildFolderPathMap, getDescendantFolderIds } from '../services/memoryApi';

interface SidebarProps {
  documents: MarkdownDoc[];
  activeDocId: string;
  onSelectDoc: (id: string) => void;
  onCreateDoc: () => void;
  onDeleteDoc: (id: string) => void;
  onDuplicateDoc: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onImportFiles: (files: FileList) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onOpenCloudDoc?: (doc: MarkdownDoc) => void;
  onOpenPublishModal?: () => void;
  folders?: FolderItem[];
  selectedFolder?: FolderSelection;
  onSelectFolder?: (selection: FolderSelection) => void;
  onCreateFolder?: (name: string, parentId: string | null) => Promise<void>;
  onRenameFolder?: (folderId: string, newName: string) => Promise<void>;
  onDeleteFolder?: (folderId: string) => Promise<void>;
  onMoveDocToFolder?: (docId: string, folderId: string | null) => Promise<void>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  documents,
  activeDocId,
  onSelectDoc,
  onCreateDoc,
  onDeleteDoc,
  onDuplicateDoc,
  onToggleFavorite,
  onImportFiles,
  isOpen,
  onToggleOpen,
  onOpenCloudDoc,
  onOpenPublishModal,
  folders = [],
  selectedFolder = 'all',
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveDocToFolder,
}) => {
  const [activeTab, setActiveTab] = useState<'my-docs' | 'explore'>('my-docs');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [movingDocId, setMovingDocId] = useState<string | null>(null);
  const [showFolderTree, setShowFolderTree] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Public Explore state inside sidebar
  const [exploreFiles, setExploreFiles] = useState<SharedMarkdownFile[]>([]);
  const [isExploreLoading, setIsExploreLoading] = useState(false);
  const [exploreSearch, setExploreSearch] = useState('');
  const [exploreError, setExploreError] = useState<string | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);

  const fetchExploreFiles = useCallback(async () => {
    setIsExploreLoading(true);
    setExploreError(null);
    try {
      const res = await cloudApi.getFiles({ search: exploreSearch, limit: 30 });
      setExploreFiles(res.files);
    } catch (err: any) {
      setExploreError(err.message || 'خطا در دریافت اسناد اکسپلور عمومی');
    } finally {
      setIsExploreLoading(false);
    }
  }, [exploreSearch]);

  useEffect(() => {
    if (activeTab === 'explore') {
      fetchExploreFiles();
    }
  }, [activeTab, fetchExploreFiles]);

  const folderPathMap = React.useMemo(() => buildFolderPathMap(folders), [folders]);

  const sortedFolderOptions = React.useMemo(() => {
    return folders
      .map((f) => ({ id: f.id, path: folderPathMap.get(f.id) || f.name }))
      .sort((a, b) => a.path.localeCompare(b.path, 'fa'));
  }, [folders, folderPathMap]);

  const allowedFolderIds = React.useMemo(() => {
    if (selectedFolder === 'all' || selectedFolder === 'root') return null;
    return getDescendantFolderIds(folders, selectedFolder);
  }, [folders, selectedFolder]);

  const filteredDocs = documents.filter((doc) => {
    if (selectedFolder === 'root' && doc.folderId) return false;
    if (allowedFolderIds && (!doc.folderId || !allowedFolderIds.has(doc.folderId))) return false;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.tags && doc.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesFav = filterFavorite ? doc.isFavorite : true;
    return matchesSearch && matchesFav;
  });

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImportFiles(e.dataTransfer.files);
    }
  };

  const handleCopyShareLink = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/?share=${fileId}`;
    navigator.clipboard.writeText(url);
    setCopiedShareId(fileId);
    setTimeout(() => setCopiedShareId(null), 2000);
  };

  const handleOpenExploreDoc = async (file: SharedMarkdownFile) => {
    if (!onOpenCloudDoc) return;
    setExploreError(null);
    try {
      const fullDoc = await cloudApi.getFileById(file.id);
      const doc: MarkdownDoc = {
        id: fullDoc.id,
        title: fullDoc.title,
        content: fullDoc.content || '',
        description: fullDoc.description,
        createdAt: new Date(fullDoc.created_at).getTime(),
        updatedAt: new Date(fullDoc.updated_at).getTime(),
        tags: fullDoc.tags,
        visibility: fullDoc.visibility || (fullDoc.is_public ? 'public' : 'private'),
        isCloudShared: true,
        cloudAuthor: fullDoc.author_name,
        userId: fullDoc.user_id,
        isOwner: fullDoc.is_owner,
        cloudSyncedAt: Date.now(),
      };
      onOpenCloudDoc(doc);
    } catch (err: any) {
      setExploreError(err.message || 'خطا در باز کردن سند');
    }
  };

  if (!isOpen) {
    return (
      <div className="shrink-0 p-2 z-20">
        <button
          type="button"
          onClick={onToggleOpen}
          className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors shadow-sm cursor-pointer"
          title="باز کردن فهرست اسناد"
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>
    );
  }

  return (
    <aside
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-80 h-full flex flex-col bg-[var(--bg-secondary)] border-e border-[var(--border-color)] shrink-0 z-20 transition-all select-none ${
        isDragging ? 'ring-2 ring-amber-500 bg-amber-500/10' : ''
      }`}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".md,.markdown,.txt"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Top Header & Branding */}
      <div className="p-3.5 border-b border-[var(--border-color)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-neutral-950 font-bold">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--text-primary)]">
              استودیو مارک‌دان
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">فضای کار اختصاصی شما</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleOpen}
          className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          title="بستن پنل"
        >
          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>

      {/* TAB SELECTOR: My Documents vs Public Explore */}
      <div className="p-2 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/40 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('my-docs')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'my-docs'
              ? 'bg-amber-500 text-neutral-950 font-bold'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span>اسناد من</span>
          <span className="tabular-nums text-[11px] opacity-80">({documents.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('explore')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'explore'
              ? 'bg-amber-500 text-neutral-950 font-bold'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span>اکسپلور عمومی</span>
        </button>
      </div>

      {/* TAB 1: MY DOCUMENTS */}
      {activeTab === 'my-docs' && (
        <>
          <div className="p-2.5 space-y-1.5 border-b border-[var(--border-color)]">
            <button
              type="button"
              onClick={onCreateDoc}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-semibold text-xs whitespace-nowrap transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>سند جدید</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-color)] font-medium text-[11px] transition-colors cursor-pointer"
              title="افزودن فایل .md یا .txt به اسناد من"
            >
              <Upload className="w-3.5 h-3.5 text-amber-500" />
              <span>افزودن فایل از سیستم (.md)</span>
            </button>
          </div>

          {/* Collapsible Nested Folder Tree */}
          {onSelectFolder && onCreateFolder && onRenameFolder && onDeleteFolder && (
            <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]/30">
              <button
                type="button"
                onClick={() => setShowFolderTree((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-sky-500" />
                  <span>پوشه‌های حافظه</span>
                  <span className="tabular-nums opacity-70">({folders.length})</span>
                </span>
                <span className="text-[10px]">{showFolderTree ? 'پنهان' : 'نمایش'}</span>
              </button>
              {showFolderTree && (
                <div className="px-2 pb-2 max-h-56 overflow-y-auto">
                  <FolderTree
                    folders={folders}
                    documents={documents}
                    selectedFolder={selectedFolder}
                    onSelectFolder={onSelectFolder}
                    onCreateFolder={onCreateFolder}
                    onRenameFolder={onRenameFolder}
                    onDeleteFolder={onDeleteFolder}
                    compact
                  />
                </div>
              )}
            </div>
          )}

          <div className="p-2.5 space-y-1.5 border-b border-[var(--border-color)]">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در اسناد من..."
                className="w-full ps-8 pe-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500 focus:outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors"
              />
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute start-2.5 top-2.5" />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] px-1">
              <span className="tabular-nums">{filteredDocs.length} سند</span>
              <button
                type="button"
                onClick={() => setFilterFavorite(!filterFavorite)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  filterFavorite
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 font-medium'
                    : 'hover:text-[var(--text-primary)]'
                }`}
              >
                <Star className={`w-3 h-3 ${filterFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                <span>ستاره‌دارها</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredDocs.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                {searchQuery ? 'سندی با این عبارت پیدا نشد.' : 'هنوز سندی در این بخش وجود ندارد.'}
              </div>
            ) : (
              filteredDocs.map((doc) => {
                const isActive = doc.id === activeDocId;
                const updatedDate = new Date(doc.updatedAt).toLocaleDateString('fa-IR', {
                  month: 'short',
                  day: 'numeric',
                });
                const isConfirming = confirmDeleteId === doc.id;
                const isMoving = movingDocId === doc.id;
                const docFolderPath = doc.folderId ? folderPathMap.get(doc.folderId) : null;

                return (
                  <div
                    key={doc.id}
                    onClick={() => onSelectDoc(doc.id)}
                    className={`group relative p-2.5 rounded-xl cursor-pointer transition-all border ${
                      isActive
                        ? 'bg-amber-500/10 border-amber-500/30 text-[var(--text-primary)]'
                        : 'border-transparent hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 font-medium text-xs truncate flex-1">
                        <FileText
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-amber-500' : 'text-[var(--text-muted)]'
                          }`}
                        />
                        <span className="truncate">{doc.title || 'سند بدون عنوان'}</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(doc.id);
                        }}
                        className="p-0.5 rounded hover:text-amber-400 text-[var(--text-muted)] transition-colors cursor-pointer"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            doc.isFavorite
                              ? 'fill-amber-400 text-amber-400'
                              : 'opacity-0 group-hover:opacity-100'
                          }`}
                        />
                      </button>
                    </div>

                    {docFolderPath && selectedFolder === 'all' && (
                      <div className="flex items-center gap-1 text-[10px] text-sky-600 dark:text-sky-400 truncate mb-0.5">
                        <Folder className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{docFolderPath}</span>
                      </div>
                    )}

                    {isMoving && onMoveDocToFolder ? (
                      <div
                        className="flex items-center gap-1 pt-1 text-[10px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={doc.folderId || ''}
                          onChange={async (e) => {
                            const nextId = e.target.value || null;
                            await onMoveDocToFolder(doc.id, nextId);
                            setMovingDocId(null);
                          }}
                          className="flex-1 min-w-0 px-1.5 py-1 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[10px] text-[var(--text-primary)] focus:outline-none focus:border-sky-500"
                        >
                          <option value="">ریشه (بدون پوشه)</option>
                          {sortedFolderOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.path}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setMovingDocId(null)}
                          className="px-1.5 py-1 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-pointer shrink-0"
                        >
                          بستن
                        </button>
                      </div>
                    ) : isConfirming ? (
                      <div
                        className="flex items-center justify-between gap-1.5 pt-1 text-[10px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-rose-500 font-semibold">حذف شود؟</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteDoc(doc.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-0.5 rounded bg-rose-500 text-white font-bold cursor-pointer"
                          >
                            حذف
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-pointer"
                          >
                            لغو
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-0.5">
                        <div className="flex items-center gap-1.5 tabular-nums">
                          <span>{updatedDate}</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-0.5">
                            {doc.visibility === 'public' ? (
                              <>
                                <Globe className="w-2.5 h-2.5 text-emerald-500" />
                                <span>عمومی</span>
                              </>
                            ) : doc.visibility === 'unlisted' ? (
                              <>
                                <Link2 className="w-2.5 h-2.5 text-sky-500" />
                                <span>لینک‌دار</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-2.5 h-2.5" />
                                <span>خصوصی</span>
                              </>
                            )}
                          </span>
                        </div>

                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          {onMoveDocToFolder && folders.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(null);
                                setMovingDocId(doc.id);
                              }}
                              className="p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-sky-500 cursor-pointer"
                              title="انتقال به پوشه"
                            >
                              <FolderInput className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicateDoc(doc.id);
                            }}
                            className="p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                            title="تکثیر سند"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMovingDocId(null);
                              setConfirmDeleteId(doc.id);
                            }}
                            className="p-1 rounded hover:bg-rose-500/20 text-[var(--text-muted)] hover:text-rose-500 cursor-pointer"
                            title="حذف سند"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)]">
            <div className="border border-dashed border-[var(--border-color)] rounded-xl p-2 text-center text-[10px] text-[var(--text-muted)]">
              فایل‌های <span className="text-amber-500 font-semibold">.md</span> را بکشید و اینجا رها کنید
            </div>
          </div>
        </>
      )}

      {/* TAB 2: PUBLIC EXPLORE */}
      {activeTab === 'explore' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-2.5 space-y-2 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/30">
            <div className="relative">
              <input
                type="text"
                value={exploreSearch}
                onChange={(e) => setExploreSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchExploreFiles();
                }}
                placeholder="جستجو در اکسپلور عمومی..."
                className="w-full ps-8 pe-8 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500 focus:outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)]"
              />
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute start-2.5 top-2.5" />
              <button
                type="button"
                onClick={fetchExploreFiles}
                className="p-1 rounded text-[var(--text-muted)] hover:text-amber-500 absolute end-2 top-1.5 cursor-pointer"
                title="بروزرسانی"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isExploreLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {onOpenPublishModal && (
              <button
                type="button"
                onClick={onOpenPublishModal}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>تنظیم اشتراک سند فعلی</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {exploreError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[11px]">
                {exploreError}
              </div>
            )}

            {isExploreLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)] space-y-2 text-xs">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                <span>در حال دریافت اسناد عمومی...</span>
              </div>
            ) : exploreFiles.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--text-muted)] space-y-2">
                <Globe className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
                <p>سند عمومی یافت نشد.</p>
              </div>
            ) : (
              exploreFiles.map((file) => {
                const isCopied = copiedShareId === file.id;
                return (
                  <div
                    key={file.id}
                    onClick={() => handleOpenExploreDoc(file)}
                    className="group p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-amber-500/50 hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer flex flex-col gap-1.5"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-semibold text-xs text-[var(--text-primary)] group-hover:text-amber-500 transition-colors line-clamp-1 flex-1">
                        {file.title}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-amber-500 shrink-0 tabular-nums">
                        <Star className="w-3 h-3" />
                        <span>{file.stars_count}</span>
                      </div>
                    </div>

                    {file.description && (
                      <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">
                        {file.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)]/60 text-[10px] text-[var(--text-muted)]">
                      <span className="truncate max-w-[120px]">
                        {file.author_name || 'کاربر'}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleCopyShareLink(e, file.id)}
                          className="p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-emerald-500 transition-colors cursor-pointer"
                          title="کپی لینک اشتراک"
                        >
                          {isCopied ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Share2 className="w-3 h-3" />
                          )}
                        </button>
                        <span className="text-[10px] text-amber-500 font-bold group-hover:underline">
                          مطالعه
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2.5 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)] flex items-center justify-between text-[10px] text-[var(--text-muted)] tabular-nums">
            <span>اکسپلور عمومی</span>
            <span>{exploreFiles.length} سند منتشرشده</span>
          </div>
        </div>
      )}
    </aside>
  );
};
