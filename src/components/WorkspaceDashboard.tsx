import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Plus,
  Upload,
  FolderUp,
  FileText,
  Star,
  Globe,
  Lock,
  Link2,
  Search,
  Eye,
  Edit3,
  Trash2,
  Share2,
  Check,
  GitFork,
  RefreshCw,
  Loader2,
  Tag,
  ArrowUpDown,
  PlugZap,
  Folder,
  FolderInput,
  ChevronLeft,
} from 'lucide-react';
import { MarkdownDoc, UserProfile, ViewMode, FolderItem } from '../types';
import { cloudApi, SharedMarkdownFile, CommunityTag } from '../services/cloudApi';
import { FolderTree, FolderSelection } from './FolderTree';
import {
  buildFolderPathMap,
  getFolderBreadcrumbs,
  getDescendantFolderIds,
} from '../services/memoryApi';
import { buildShareUrl, copyTextToClipboard } from '../utils/shareLink';

interface WorkspaceDashboardProps {
  currentUser: UserProfile;
  documents: MarkdownDoc[];
  isLoadingDocs: boolean;
  onCreateDoc: () => void;
  onImportFiles: (files: FileList) => void;
  onOpenDoc: (docId: string, mode: ViewMode) => void;
  onShareDoc: (docId: string) => void;
  onDeleteDoc: (docId: string) => void;
  onToggleFavorite: (docId: string) => void;
  onOpenExploreDoc: (file: SharedMarkdownFile) => void;
  onForkExploreDoc: (file: SharedMarkdownFile) => void;
  exploreCountHint?: number;
  folders: FolderItem[];
  selectedFolder: FolderSelection;
  onSelectFolder: (selection: FolderSelection) => void;
  onCreateFolder: (name: string, parentId: string | null) => Promise<void>;
  onRenameFolder: (folderId: string, newName: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onMoveDocToFolder: (docId: string, folderId: string | null) => Promise<void>;
  onOpenMcpBridge: () => void;
}

type DashboardTab = 'my-docs' | 'favorites' | 'explore';
type PersonalSort = 'updated' | 'created' | 'title';
type ExploreSort = 'recent' | 'popular' | 'views';

function extractExcerpt(content: string): string {
  if (!content) return 'سند بدون متن';
  const cleaned = content
    .replace(/^#+\s+/gm, '')
    .replace(/==(?:[a-z]+:)?([^=]+)==/g, '$1')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_~>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'سند بدون متن';
}

function getVisibilityLabel(visibility?: string): string {
  if (visibility === 'public') return 'اکسپلور عمومی';
  if (visibility === 'unlisted') return 'دسترسی با لینک';
  return 'خصوصی';
}

export const WorkspaceDashboard: React.FC<WorkspaceDashboardProps> = ({
  currentUser,
  documents,
  isLoadingDocs,
  onCreateDoc,
  onImportFiles,
  onOpenDoc,
  onShareDoc,
  onDeleteDoc,
  onToggleFavorite,
  onOpenExploreDoc,
  onForkExploreDoc,
  exploreCountHint = 0,
  folders,
  selectedFolder,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveDocToFolder,
  onOpenMcpBridge,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('my-docs');
  const [searchQuery, setSearchQuery] = useState('');
  const [personalSort, setPersonalSort] = useState<PersonalSort>('updated');
  const [exploreSort, setExploreSort] = useState<ExploreSort>('recent');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [movingDocId, setMovingDocId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Public Explore state
  const [exploreFiles, setExploreFiles] = useState<SharedMarkdownFile[]>([]);
  const [exploreTags, setExploreTags] = useState<CommunityTag[]>([]);
  const [isExploreLoading, setIsExploreLoading] = useState(false);
  const [exploreError, setExploreError] = useState<string | null>(null);
  const [loadingExploreId, setLoadingExploreId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const fetchExplore = useCallback(async () => {
    setIsExploreLoading(true);
    setExploreError(null);
    try {
      const res = await cloudApi.getFiles({
        search: searchQuery.trim() || undefined,
        tag: selectedTag || undefined,
        sort: exploreSort,
        limit: 60,
      });
      setExploreFiles(res.files);
      setExploreTags(res.tags);
    } catch (err: any) {
      setExploreError(err.message || 'خطا در دریافت اسناد اکسپلور عمومی');
    } finally {
      setIsExploreLoading(false);
    }
  }, [searchQuery, selectedTag, exploreSort]);

  useEffect(() => {
    if (activeTab === 'explore') {
      fetchExplore();
    }
  }, [activeTab, fetchExplore]);

  const favoritesCount = useMemo(
    () => documents.filter((d) => d.isFavorite).length,
    [documents]
  );

  const personalTags = useMemo(() => {
    const counts = new Map<string, number>();
    documents.forEach((doc) => {
      (doc.tags || []).forEach((t) => {
        if (t.trim()) counts.set(t.trim(), (counts.get(t.trim()) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [documents]);

  const folderPathMap = useMemo(() => buildFolderPathMap(folders), [folders]);

  const sortedFolderOptions = useMemo(() => {
    return folders
      .map((f) => ({ id: f.id, path: folderPathMap.get(f.id) || f.name }))
      .sort((a, b) => a.path.localeCompare(b.path, 'fa'));
  }, [folders, folderPathMap]);

  const breadcrumbs = useMemo(() => {
    if (selectedFolder === 'all' || selectedFolder === 'root') return [];
    return getFolderBreadcrumbs(folders, selectedFolder);
  }, [folders, selectedFolder]);

  const allowedFolderIds = useMemo(() => {
    if (selectedFolder === 'all' || selectedFolder === 'root') return null;
    return getDescendantFolderIds(folders, selectedFolder);
  }, [folders, selectedFolder]);

  const filteredPersonalDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = documents.filter((doc) => {
      if (activeTab === 'favorites' && !doc.isFavorite) return false;
      if (selectedFolder === 'root' && doc.folderId) return false;
      if (allowedFolderIds && (!doc.folderId || !allowedFolderIds.has(doc.folderId))) return false;
      if (selectedTag && !(doc.tags || []).includes(selectedTag)) return false;
      if (!q) return true;
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.content.toLowerCase().includes(q) ||
        (doc.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    });

    return [...list].sort((a, b) => {
      if (personalSort === 'title') {
        return a.title.localeCompare(b.title, 'fa');
      }
      if (personalSort === 'created') {
        return b.createdAt - a.createdAt;
      }
      return b.updatedAt - a.updatedAt;
    });
  }, [documents, activeTab, selectedFolder, allowedFolderIds, searchQuery, selectedTag, personalSort]);

  const handleCopyLink = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const url = buildShareUrl(id);
    const ok = await copyTextToClipboard(url);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleStarExplore = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    try {
      const res = await cloudApi.starFile(fileId);
      setExploreFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, stars_count: res.stars } : f))
      );
    } catch {}
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImportFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      className={`flex-1 overflow-y-auto bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors ${
        isDragging ? 'ring-2 ring-inset ring-amber-500 bg-amber-500/5' : ''
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={handleDrop}
      dir="rtl"
    >
      {/* Hidden File & Folder Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".md,.markdown,.txt"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-expect-error webkitdirectory is supported in modern browsers
        webkitdirectory=""
        directory=""
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Greeting + Quick Start Row */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-extrabold text-[var(--text-primary)] tracking-tight">
                فضای کار {currentUser.displayName}
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                اسناد شخصی شما کاملاً محرمانه هستند؛ تنها اسنادی که با لینک یا در اکسپلور عمومی منتشر کنید برای دیگران قابل مشاهده است.
              </p>
            </div>
          </div>

          {/* Quick-Start Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={onCreateDoc}
              className="group flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-amber-500/60 transition-colors text-start cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center shrink-0">
                <Plus className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[var(--text-primary)] whitespace-nowrap">
                  سند خالی جدید
                </div>
                <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                  {selectedFolder !== 'all' && selectedFolder !== 'root'
                    ? `ایجاد در ${folderPathMap.get(selectedFolder) || 'پوشه فعلی'}`
                    : 'شروع نوشتن با ویرایشگر زنده'}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-amber-500/50 transition-colors text-start cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-amber-500 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[var(--text-primary)] whitespace-nowrap">
                  آپلود فایل .md
                </div>
                <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                  افزودن فایل از سیستم شما
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="group flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-amber-500/50 transition-colors text-start cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sky-500 flex items-center justify-center shrink-0">
                <FolderUp className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[var(--text-primary)] whitespace-nowrap">
                  آپلود پوشه با زیرپوشه‌ها
                </div>
                <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                  حفظ خودکار ساختار درختی پوشه‌ها
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={onOpenMcpBridge}
              className="group flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-sky-500/60 transition-colors text-start cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-500 flex items-center justify-center shrink-0">
                <PlugZap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[var(--text-primary)] whitespace-nowrap">
                  حافظه MCP و کامپیوتر
                </div>
                <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                  اتصال مدل‌های AI و همگام‌سازی لوکال
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* Segmented Navigation Tabs + Search & Sort Bar */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Tabs */}
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('my-docs');
                  setSelectedTag(null);
                  setConfirmDeleteId(null);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  activeTab === 'my-docs'
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>اسناد من</span>
                <span className="tabular-nums text-[11px] opacity-80">({documents.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('favorites');
                  setSelectedTag(null);
                  setConfirmDeleteId(null);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  activeTab === 'favorites'
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <Star className="w-3.5 h-3.5 shrink-0" />
                <span>ستاره‌دارها</span>
                <span className="tabular-nums text-[11px] opacity-80">({favoritesCount})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('explore');
                  setSelectedTag(null);
                  setConfirmDeleteId(null);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  activeTab === 'explore'
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span>اکسپلور عمومی</span>
                <span className="tabular-nums text-[11px] opacity-80">
                  ({activeTab === 'explore' ? exploreFiles.length : exploreCountHint})
                </span>
              </button>
            </div>

            {/* Search & Sort Controls */}
            <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end min-w-[260px]">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    activeTab === 'explore'
                      ? 'جستجو در اکسپلور عمومی...'
                      : 'جستجو در اسناد من...'
                  }
                  className="w-full ps-8 pe-7 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:border-amber-500 focus:outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {activeTab === 'explore' ? (
                <div className="flex items-center gap-1.5">
                  <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs">
                    <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    <select
                      value={exploreSort}
                      onChange={(e) => setExploreSort(e.target.value as ExploreSort)}
                      className="bg-transparent text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                    >
                      <option value="recent" className="bg-[var(--bg-secondary)]">جدیدترین</option>
                      <option value="popular" className="bg-[var(--bg-secondary)]">محبوب‌ترین</option>
                      <option value="views" className="bg-[var(--bg-secondary)]">پربازدیدترین</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={fetchExplore}
                    disabled={isExploreLoading}
                    className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    title="بروزرسانی اکسپلور عمومی"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isExploreLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                  <select
                    value={personalSort}
                    onChange={(e) => setPersonalSort(e.target.value as PersonalSort)}
                    className="bg-transparent text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="updated" className="bg-[var(--bg-secondary)]">آخرین ویرایش</option>
                    <option value="created" className="bg-[var(--bg-secondary)]">زمان ایجاد</option>
                    <option value="title" className="bg-[var(--bg-secondary)]">الفبایی</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Tag Filters Row */}
          {((activeTab === 'explore' && exploreTags.length > 0) ||
            (activeTab !== 'explore' && personalTags.length > 0)) && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 shrink-0">
                <Tag className="w-3 h-3 text-amber-500" />
                برچسب‌ها:
              </span>
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  selectedTag === null
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                همه
              </button>
              {(activeTab === 'explore' ? exploreTags : personalTags).map((t) => (
                <button
                  key={t.tag}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === t.tag ? null : t.tag)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    selectedTag === t.tag
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-amber-500/40'
                  }`}
                >
                  #{t.tag} <span className="tabular-nums opacity-65">({t.count})</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Main Content Grid */}
        {activeTab !== 'explore' ? (
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5 items-start">
            {/* Nested Folder Tree Sidebar */}
            <aside className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3 space-y-3 lg:sticky lg:top-4">
              <FolderTree
                folders={folders}
                documents={documents}
                selectedFolder={selectedFolder}
                onSelectFolder={onSelectFolder}
                onCreateFolder={onCreateFolder}
                onRenameFolder={onRenameFolder}
                onDeleteFolder={onDeleteFolder}
              />

              <div className="pt-2.5 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={onOpenMcpBridge}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] text-[11px] font-semibold text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <PlugZap className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <span className="truncate">اتصال حافظه به AI و کامپیوتر</span>
                  </span>
                  <ChevronLeft className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                </button>
              </div>
            </aside>

            {/* Right / Main Document Area */}
            <div className="space-y-4 min-w-0">
              {/* Breadcrumb Navigation */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs">
                <nav className="flex flex-wrap items-center gap-1 text-[var(--text-muted)] min-w-0" aria-label="مسیر پوشه">
                  <button
                    type="button"
                    onClick={() => onSelectFolder('all')}
                    className={`hover:text-[var(--text-primary)] transition-colors cursor-pointer ${
                      selectedFolder === 'all' ? 'font-bold text-[var(--text-primary)]' : ''
                    }`}
                  >
                    همه اسناد
                  </button>

                  {selectedFolder === 'root' && (
                    <>
                      <ChevronLeft className="w-3.5 h-3.5 shrink-0 opacity-60" />
                      <span className="font-bold text-[var(--text-primary)]">بدون پوشه (ریشه)</span>
                    </>
                  )}

                  {breadcrumbs.map((crumb, idx) => {
                    const isLast = idx === breadcrumbs.length - 1;
                    return (
                      <React.Fragment key={crumb.id}>
                        <ChevronLeft className="w-3.5 h-3.5 shrink-0 opacity-60" />
                        <button
                          type="button"
                          onClick={() => onSelectFolder(crumb.id)}
                          className={`truncate max-w-[160px] transition-colors cursor-pointer ${
                            isLast
                              ? 'font-bold text-[var(--text-primary)]'
                              : 'hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {crumb.name}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </nav>

                <span className="text-[11px] text-[var(--text-muted)] tabular-nums shrink-0">
                  {filteredPersonalDocs.length} سند
                </span>
              </div>

              {isLoadingDocs ? (
                <div className="flex flex-col items-center justify-center py-24 text-[var(--text-muted)] gap-3">
                  <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
                  <p className="text-xs">در حال بارگذاری اسناد شما...</p>
                </div>
              ) : filteredPersonalDocs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)]/50 py-16 px-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
                    {activeTab === 'favorites' ? (
                      <Star className="w-6 h-6" />
                    ) : selectedFolder !== 'all' ? (
                      <Folder className="w-6 h-6 text-sky-500" />
                    ) : (
                      <FileText className="w-6 h-6" />
                    )}
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      {searchQuery || selectedTag
                        ? 'سندی با این فیلتر یافت نشد'
                        : activeTab === 'favorites'
                        ? 'هنوز سندی را ستاره‌دار نکرده‌اید'
                        : selectedFolder !== 'all'
                        ? 'این پوشه هنوز خالی است'
                        : 'هنوز سندی در فضای کار خود نساخته‌اید'}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      {searchQuery || selectedTag
                        ? 'عبارت جستجو یا برچسب انتخاب‌شده را تغییر دهید.'
                        : activeTab === 'favorites'
                        ? 'با کلیک روی آیکون ستاره روی کارت هر سند، آن را برای دسترسی سریع به این بخش اضافه کنید.'
                        : selectedFolder !== 'all'
                        ? 'می‌توانید همین حالا یک سند جدید در این پوشه بسازید یا از طریق اتصال MCP توسط مدل‌های هوش مصنوعی در آن فایل تولید کنید.'
                        : 'می‌توانید همین حالا یک سند خالی بسازید یا فایل‌های مارک‌دان خود را با کشیدن و رها کردن وارد کنید.'}
                    </p>
                  </div>
                  {!searchQuery && !selectedTag && activeTab === 'my-docs' && (
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={onCreateDoc}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{selectedFolder !== 'all' ? 'ایجاد سند در این پوشه' : 'ایجاد اولین سند'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-amber-500/50 text-[var(--text-primary)] font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-amber-500" />
                        <span>آپلود فایل .md</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredPersonalDocs.map((doc) => {
                    const updatedDate = new Date(doc.updatedAt).toLocaleDateString('fa-IR');
                    const visibilityText = getVisibilityLabel(doc.visibility);
                    const isConfirmingDelete = confirmDeleteId === doc.id;
                    const isMoving = movingDocId === doc.id;
                    const isCopied = copiedId === doc.id;
                    const docFolderPath = doc.folderId ? folderPathMap.get(doc.folderId) : null;

                    return (
                      <div
                        key={doc.id}
                        onClick={() => onOpenDoc(doc.id, 'split')}
                        className="group rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-amber-500/50 p-4 flex flex-col justify-between gap-3 transition-colors cursor-pointer"
                      >
                        <div className="space-y-2">
                          {/* Title & Favorite Toggle */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-sm text-[var(--text-primary)] group-hover:text-amber-500 transition-colors line-clamp-1">
                              {doc.title || 'سند بدون عنوان'}
                            </h3>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleFavorite(doc.id);
                              }}
                              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-amber-500 transition-colors shrink-0 cursor-pointer"
                              title={doc.isFavorite ? 'حذف از ستاره‌دارها' : 'افزودن به ستاره‌دارها'}
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  doc.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                                }`}
                              />
                            </button>
                          </div>

                          {/* Excerpt */}
                          <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                            {doc.description?.trim() || extractExcerpt(doc.content)}
                          </p>

                          {/* Clean Unboxed Metadata (Zero-Pill) */}
                          <div className="text-[11px] text-[var(--text-muted)] flex flex-wrap items-center gap-x-1.5 gap-y-0.5 pt-1 tabular-nums">
                            <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                              {doc.visibility === 'public' ? (
                                <Globe className="w-3 h-3 text-emerald-500 shrink-0" />
                              ) : doc.visibility === 'unlisted' ? (
                                <Link2 className="w-3 h-3 text-sky-500 shrink-0" />
                              ) : (
                                <Lock className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                              )}
                              <span>{visibilityText}</span>
                            </span>
                            <span>·</span>
                            <span>{updatedDate}</span>
                            {docFolderPath && (
                              <>
                                <span>·</span>
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (doc.folderId) onSelectFolder(doc.folderId);
                                  }}
                                  className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline truncate max-w-[160px]"
                                  title={docFolderPath}
                                >
                                  <Folder className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{docFolderPath}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Card Action Row */}
                        <div
                          className="pt-2.5 border-t border-[var(--border-color)] flex items-center justify-between gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isMoving ? (
                            <div className="flex items-center gap-1.5 w-full">
                              <select
                                value={doc.folderId || ''}
                                onChange={async (e) => {
                                  const nextId = e.target.value || null;
                                  await onMoveDocToFolder(doc.id, nextId);
                                  setMovingDocId(null);
                                }}
                                className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-sky-500"
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
                                className="px-2 py-1 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-[11px] whitespace-nowrap cursor-pointer shrink-0"
                              >
                                بستن
                              </button>
                            </div>
                          ) : isConfirmingDelete ? (
                            <div className="flex items-center justify-between w-full gap-2">
                              <span className="text-[11px] text-rose-500 font-semibold">حذف شود؟</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteDoc(doc.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold whitespace-nowrap cursor-pointer"
                                >
                                  تأیید حذف
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-[11px] whitespace-nowrap cursor-pointer"
                                >
                                  لغو
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onOpenDoc(doc.id, 'preview')}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-primary)] text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3 h-3 text-amber-500" />
                                  <span>مطالعه</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onOpenDoc(doc.id, 'split')}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-primary)] text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3 text-sky-500" />
                                  <span>ویرایش</span>
                                </button>
                              </div>

                              <div className="flex items-center gap-1">
                                {folders.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmDeleteId(null);
                                      setMovingDocId(doc.id);
                                    }}
                                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-sky-500 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                                    title="انتقال سند به پوشه دیگر"
                                  >
                                    <FolderInput className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {(doc.visibility === 'unlisted' || doc.visibility === 'public') && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyLink(e, doc.id)}
                                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-emerald-500 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                                    title="کپی لینک اشتراک"
                                  >
                                    {isCopied ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                      <Link2 className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onShareDoc(doc.id)}
                                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-amber-500 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                                  title="تنظیمات دسترسی و اشتراک‌گذاری"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMovingDocId(null);
                                    setConfirmDeleteId(doc.id);
                                  }}
                                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="حذف سند"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* PUBLIC EXPLORE TAB */
          isExploreLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-[var(--text-muted)] gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
              <p className="text-xs">در حال دریافت اسناد اکسپلور عمومی...</p>
            </div>
          ) : exploreError ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center space-y-3 text-xs text-rose-500">
              <p>{exploreError}</p>
              <button
                type="button"
                onClick={fetchExplore}
                className="px-4 py-1.5 rounded-xl bg-rose-500 text-white font-semibold cursor-pointer"
              >
                تلاش مجدد
              </button>
            </div>
          ) : exploreFiles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)]/50 py-16 px-6 text-center space-y-2">
              <Globe className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                سندی در اکسپلور عمومی یافت نشد
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                {searchQuery || selectedTag
                  ? 'هیچ سند عمومی با عبارت یا برچسب انتخاب‌شده پیدا نشد.'
                  : 'هنوز هیچ کاربری سندی را در اکسپلور عمومی منتشر نکرده است. شما می‌توانید از تنظیمات اشتراک‌گذاری هر سند، آن را در اکسپلور عمومی منتشر کنید.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {exploreFiles.map((file) => {
                const isCopied = copiedId === file.id;
                const isMine = file.user_id === currentUser.id;
                const isLoadingThis = loadingExploreId === file.id;

                return (
                  <div
                    key={file.id}
                    onClick={async () => {
                      setLoadingExploreId(file.id);
                      try {
                        await onOpenExploreDoc(file);
                      } finally {
                        setLoadingExploreId(null);
                      }
                    }}
                    className="group rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-amber-500/50 p-4 flex flex-col justify-between gap-3 transition-colors cursor-pointer"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm text-[var(--text-primary)] group-hover:text-amber-500 transition-colors line-clamp-1">
                          {file.title}
                        </h3>
                        <button
                          type="button"
                          onClick={(e) => handleStarExplore(e, file.id)}
                          className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-amber-500 shrink-0 tabular-nums cursor-pointer"
                          title="پسندیدن سند"
                        >
                          <Star className="w-3.5 h-3.5 text-amber-500" />
                          <span>{file.stars_count}</span>
                        </button>
                      </div>

                      <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                        {file.description || 'بدون توضیح اضافه'}
                      </p>

                      {/* Clean Unboxed Metadata */}
                      <div className="text-[11px] text-[var(--text-muted)] flex flex-wrap items-center gap-x-1.5 gap-y-0.5 pt-1 tabular-nums">
                        <span className="font-medium text-[var(--text-secondary)] truncate max-w-[130px]">
                          {file.author_name || 'کاربر'}
                        </span>
                        <span>·</span>
                        <span>{new Date(file.created_at).toLocaleDateString('fa-IR')}</span>
                        <span>·</span>
                        <span>{file.views_count} بازدید</span>
                        {isMine && (
                          <>
                            <span>·</span>
                            <span className="text-amber-500 font-semibold">سند شما</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div
                      className="pt-2.5 border-t border-[var(--border-color)] flex items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        disabled={isLoadingThis}
                        onClick={async () => {
                          setLoadingExploreId(file.id);
                          try {
                            await onOpenExploreDoc(file);
                          } finally {
                            setLoadingExploreId(null);
                          }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-primary)] text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                      >
                        {isLoadingThis ? (
                          <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                        ) : (
                          <Eye className="w-3 h-3 text-amber-500" />
                        )}
                        <span>مطالعه</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {!isMine && (
                          <button
                            type="button"
                            onClick={() => onForkExploreDoc(file)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                            title="کپی به اسناد من برای ویرایش"
                          >
                            <GitFork className="w-3 h-3" />
                            <span>کپی به اسناد من</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleCopyLink(e, file.id)}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-emerald-500 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                          title="کپی لینک اشتراک"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Link2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
};
