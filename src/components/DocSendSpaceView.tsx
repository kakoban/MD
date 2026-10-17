import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText,
  Plus,
  Upload,
  Search,
  Lock,
  Unlock,
  ShieldCheck,
  Eye,
  Share2,
  Copy,
  Check,
  Star,
  Clock,
  Sparkles,
  ArrowUpRight,
  User,
  Database,
  RefreshCw,
  FolderOpen,
  Trash2,
  Grid,
  List,
  FileCode2,
  BookOpen,
  Calendar,
  CheckSquare,
  HelpCircle,
  X,
  ExternalLink,
  FolderTree,
  FolderUp,
  Folder,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  Edit3,
  Compass,
} from 'lucide-react';
import { MarkdownDoc, UserProfile, DocSortOption } from '../types';
import { SharedMarkdownFile, cloudApi } from '../services/cloudApi';
import { useLanguage } from '../context/LanguageContext';
import {
  buildDocTree,
  DocTreeNode,
  countTreeDocs,
  deduplicateDocs,
  getFolderTheme,
  getEffectiveFolderPath,
  sortDocs,
  getDocUploadTime,
} from '../utils/docTree';
import { LinkedFolderRecord } from '../utils/localSync';

interface DocSendSpaceViewProps {
  documents: MarkdownDoc[];
  currentUser: UserProfile | null;
  onOpenDoc: (docId: string, mode?: 'split' | 'editor' | 'preview') => void;
  onCreateDoc: (initialFolderPath?: string) => void;
  onOpenCloudDoc: (file: SharedMarkdownFile) => void;
  onImportFiles: (files: FileList | File[], targetFolderPath?: string) => void;
  onOpenTemplates: () => void;
  onOpenProfile: () => void;
  onOpenAuth: () => void;
  onOpenAccessRequestsManager?: () => void;
  pendingRequestsCount?: number;
  onUpdateDocFolder?: (docId: string, folderPath?: string) => void;
  onDeleteDoc?: (docId: string) => void;
  onOpenQuickSwitcher?: () => void;
  onRenameFolder?: (oldPath: string, newPath: string) => void;
  onDeleteFolder?: (folderPath: string) => void;
  onSyncLocalDisk?: (forcePickNew?: boolean) => void;
  linkedLocalFolder?: string | null;
  linkedFolders?: LinkedFolderRecord[];
  isSyncingLocal?: boolean;
  onUnlinkLocalFolder?: (folderName?: string) => void;
  onAddLocalFolder?: () => void;
  onOpenTopology?: () => void;
}

export const DocSendSpaceView: React.FC<DocSendSpaceViewProps> = ({
  documents,
  currentUser,
  onOpenDoc,
  onCreateDoc,
  onOpenCloudDoc,
  onImportFiles,
  onOpenTemplates,
  onOpenProfile,
  onOpenAuth,
  onOpenAccessRequestsManager,
  pendingRequestsCount = 0,
  onUpdateDocFolder,
  onDeleteDoc,
  onOpenQuickSwitcher,
  onRenameFolder,
  onDeleteFolder,
  onSyncLocalDisk,
  linkedLocalFolder,
  linkedFolders = [],
  isSyncingLocal = false,
  onUnlinkLocalFolder,
  onAddLocalFolder,
  onOpenTopology,
}) => {
  const { t, language } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<'all' | 'my-docs' | 'cloud' | 'starred' | 'permissions'>('all');
  const [viewStyle, setViewStyle] = useState<'grid' | 'list' | 'tree'>('grid');
  const [sortBy, setSortBy] = useState<DocSortOption>('upload-desc');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cloudFiles, setCloudFiles] = useState<SharedMarkdownFile[]>([]);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [targetFolderForUpload, setTargetFolderForUpload] = useState<string | null>(null);
  const targetFolderInputRef = useRef<HTMLInputElement>(null);

  const handleUploadToSpecificFolder = (folderPath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetFolderForUpload(folderPath);
    targetFolderInputRef.current?.click();
  };

  const handlePromptChangeDocFolder = (doc: MarkdownDoc, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentFolder = getEffectiveFolderPath(doc.folderPath);
    const promptVal = prompt(`تغییر یا انتساب پوشه برای سند «${doc.title}»:`, currentFolder);
    if (promptVal !== null) {
      onUpdateDocFolder?.(doc.id, promptVal.trim());
    }
  };

  const availableFolders = React.useMemo(() => {
    const counts: Record<string, number> = {};
    deduplicateDocs(documents).forEach((d) => {
      const f = getEffectiveFolderPath(d.folderPath);
      counts[f] = (counts[f] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [documents]);

  const toggleFolderCollapse = (path: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const fetchCloud = useCallback(async () => {
    setIsCloudLoading(true);
    try {
      const res = await cloudApi.getFiles({ limit: 60 });
      setCloudFiles(res.files || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCloudLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCloud();
  }, [fetchCloud]);

  const handleCopyLink = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/?share=${fileId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(fileId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImportFiles(e.dataTransfer.files);
    }
  };

  // Filter and sort documents based on search, tab, folder and chosen upload time / title
  const filteredLocalDocs = deduplicateDocs(documents).filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.content.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === 'starred') return Boolean(d.isFavorite);
    if (activeFilter === 'cloud') return false;
    if (selectedFolder && getEffectiveFolderPath(d.folderPath) !== selectedFolder) {
      return false;
    }
    return true;
  });
  const sortedLocalDocs = sortDocs(filteredLocalDocs, sortBy);

  const filteredCloudFiles = cloudFiles.filter((f) => {
    const matchesSearch =
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.author_name && f.author_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.author_username && f.author_username.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (activeFilter === 'my-docs') return false;
    if (activeFilter === 'starred') return false;
    return true;
  });

  const userInitials = currentUser?.displayName
    ? currentUser.displayName.slice(0, 2).toUpperCase()
    : currentUser?.username
    ? currentUser.username.slice(0, 2).toUpperCase()
    : 'U';

  const docTree = buildDocTree(sortedLocalDocs, sortBy);

  const renderDashboardTreeNode = (node: DocTreeNode, depth: number = 0): React.ReactNode => {
    return (
      <div key={node.fullPath || 'root-tree'} className="space-y-3">
        {node.children.map((child) => {
          const isCollapsed = Boolean(collapsedFolders[child.fullPath]);
          const docCount = countTreeDocs(child);
          const theme = getFolderTheme(child.name);
          return (
            <div
              key={child.fullPath}
              className={`rounded-2xl border ${theme.border} bg-[var(--bg-secondary)] overflow-hidden transition-all shadow-xs`}
            >
              <button
                type="button"
                onClick={() => toggleFolderCollapse(child.fullPath)}
                className={`w-full px-5 py-3.5 flex items-center justify-between ${theme.headerBg} transition-colors cursor-pointer text-start`}
              >
                <div className="flex items-center gap-2.5">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] rtl:rotate-180" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                  )}
                  {isCollapsed ? (
                    <Folder className={`w-4 h-4 ${theme.icon}`} />
                  ) : (
                    <FolderOpen className={`w-4 h-4 ${theme.icon}`} />
                  )}
                  <span className="font-bold text-sm text-[var(--text-primary)]">
                    {child.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => handleUploadToSpecificFolder(child.fullPath, e)}
                    className="px-2 py-0.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[#0061FF] text-[var(--text-muted)] hover:text-white border border-[var(--border-color)] text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title={`افزودن و آپلود فایل‌های جدید در پوشه «${child.name}» بدون نیاز به آپلود مجدد کل پوشه`}
                  >
                    <Upload className="w-3 h-3 text-emerald-400" />
                    <span className="hidden sm:inline">افزودن فایل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onCreateDoc(child.fullPath)}
                    className="px-2 py-0.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[#0061FF] text-[var(--text-muted)] hover:text-white border border-[var(--border-color)] text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title={`ایجاد سند جدید در پوشه «${child.name}»`}
                  >
                    <Plus className="w-3 h-3 text-[#0061FF]" />
                    <span className="hidden sm:inline">سند جدید</span>
                  </button>

                  {onRenameFolder && child.name !== 'عمومی' && (
                    <button
                      type="button"
                      onClick={() => {
                        const newName = prompt(`تغییر نام پوشه «${child.name}»:`, child.name);
                        if (newName && newName.trim() && newName.trim() !== child.name) {
                          onRenameFolder(child.fullPath, newName.trim());
                        }
                      }}
                      className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border border-transparent hover:border-[var(--border-color)] transition-colors cursor-pointer"
                      title="تغییر نام پوشه برای تمام اسناد داخل آن"
                    >
                      <Edit3 className="w-3 h-3 text-amber-400" />
                    </button>
                  )}

                  {onDeleteFolder && child.name !== 'عمومی' && (
                    <button
                      type="button"
                      onClick={() => onDeleteFolder(child.fullPath)}
                      className="p-1 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
                      title={`حذف پوشه «${child.name}» و اسناد داخل آن`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}

                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${theme.badge} font-bold font-mono`}>
                    {docCount} سند آموزشی
                  </span>
                </div>
              </button>

              {!isCollapsed && (
                <div className="p-4 space-y-3 bg-[var(--bg-secondary)]/50">
                  {renderDashboardTreeNode(child, depth + 1)}
                </div>
              )}
            </div>
          );
        })}

        {node.docs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {node.docs.map((doc) => {
              const snippet = doc.content
                .replace(/[#*`~\[\]]/g, '')
                .replace(/\n+/g, ' ')
                .trim()
                .slice(0, 100);
              const docTheme = getFolderTheme(doc.folderPath || node.name);
              return (
                <div
                  key={doc.id}
                  onClick={() => onOpenDoc(doc.id, 'split')}
                  className={`p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] ${docTheme.cardBorder} hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-36 group`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className={`w-3.5 h-3.5 ${docTheme.icon} shrink-0`} />
                        <h4 className="font-bold text-xs text-[var(--text-primary)] group-hover:text-[#0061FF] transition-colors truncate">
                          {doc.title || 'سند بدون عنوان'}
                        </h4>
                      </div>
                      {doc.isFavorite && (
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                      {snippet || 'سند بدون متن...'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[var(--border-color)]/60 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        onClick={(e) => handlePromptChangeDocFolder(doc, e)}
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${docTheme.badge} inline-flex items-center gap-0.5 cursor-pointer hover:ring-1 hover:ring-[#0061FF] transition-all shrink-0`}
                        title="کلیک برای تغییر پوشه یا جابه‌جایی این سند"
                      >
                        <Folder className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[80px]">{getEffectiveFolderPath(doc.folderPath)}</span>
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono truncate">
                        {new Date(getDocUploadTime(doc)).toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDoc(doc.id, 'preview');
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                      >
                        مطالعه
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDoc(doc.id, 'split');
                        }}
                        className="px-2 py-0.5 rounded bg-[#0061FF]/10 text-[#0061FF] text-[10px] font-bold"
                      >
                        ویرایش
                      </button>
                      {onDeleteDoc && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`آیا از حذف «${doc.title}» اطمینان دارید؟`)) {
                              onDeleteDoc(doc.id);
                            }
                          }}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                          title="حذف سند"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="flex-1 flex flex-col h-full w-full overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] select-none"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleFileDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".md,.markdown,.txt"
        className="hidden"
        onChange={(e) => e.target.files && onImportFiles(e.target.files)}
      />

      {/* Hidden folder input */}
      <input
        ref={folderInputRef}
        type="file"
        {...({ webkitdirectory: '', directory: '' } as any)}
        multiple
        className="hidden"
        onChange={(e) => e.target.files && onImportFiles(e.target.files)}
      />

      {/* Hidden input for importing files directly into a targeted folder */}
      <input
        ref={targetFolderInputRef}
        type="file"
        multiple
        accept=".md,.markdown,.txt"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && targetFolderForUpload) {
            onImportFiles(e.target.files, targetFolderForUpload);
            setTargetFolderForUpload(null);
            if (targetFolderInputRef.current) targetFolderInputRef.current.value = '';
          }
        }}
      />

      {/* 1. TOP HEADER: Clean Google Docs / Notion Style */}
      <header className="h-16 border-b border-[var(--border-color)] px-4 sm:px-8 flex items-center justify-between bg-[var(--bg-secondary)] shrink-0 z-30">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#0061FF] text-white flex items-center justify-center font-black text-sm shadow-md">
            M
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-extrabold text-[var(--text-primary)] tracking-tight">
              Markdown Studio
            </h1>
            <p className="text-[10px] text-[var(--text-muted)] font-medium">Workspace & Cloud Docs</p>
          </div>
        </div>

        {/* Global Search Bar (Google Docs style with Ctrl+K trigger) */}
        <div className="flex-1 max-w-xl mx-4 sm:mx-8 relative">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute start-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در تمام اسناد، متن‌ها و سرفصل‌ها..."
            className="w-full ps-10 pe-24 py-2 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-[#0061FF] focus:bg-[var(--bg-secondary)] focus:outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all shadow-inner"
          />
          <div className="absolute end-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {onOpenQuickSwitcher && (
              <button
                type="button"
                onClick={onOpenQuickSwitcher}
                className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[#0061FF] hover:text-white border border-[var(--border-color)] text-[10px] text-[var(--text-muted)] font-mono cursor-pointer transition-colors"
                title="پالت جستجوی سریع (کلید میانبر Ctrl + K)"
              >
                <span>Ctrl+K</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Section: Actions & User */}
        <div className="flex items-center gap-2.5 shrink-0">
          {pendingRequestsCount > 0 && onOpenAccessRequestsManager && (
            <button
              type="button"
              onClick={onOpenAccessRequestsManager}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 text-neutral-950 font-bold text-xs shadow-sm hover:bg-amber-400 transition-all cursor-pointer animate-pulse"
              title="درخواست‌های جدید برای اسناد شما"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{pendingRequestsCount} درخواست</span>
              <span className="md:hidden">{pendingRequestsCount}</span>
            </button>
          )}

          {/* Multi-Folder 1-Click Sync from Local PC */}
          {onSyncLocalDisk && (
            <div className="flex items-center gap-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => onSyncLocalDisk(false)}
                disabled={isSyncingLocal}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  linkedFolders.length > 0
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                    : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title={
                  linkedFolders.length > 0
                    ? `بروزرسانی همزمان ${linkedFolders.length} پوشه متصل: ${linkedFolders.map((f) => f.name).join('، ')}`
                    : 'اتصال به پوشه‌های کامپیوتر برای همگام‌سازی و بروزرسانی خودکار با ۱ کلیک'
                }
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLocal ? 'animate-spin text-emerald-500' : linkedFolders.length > 0 ? 'text-emerald-500' : ''}`} />
                <span className="hidden sm:inline">
                  {linkedFolders.length > 0
                    ? `بروزرسانی (${linkedFolders.length} پوشه)`
                    : 'اتصال به کامپیوتر'}
                </span>
                <span className="sm:hidden">
                  {isSyncingLocal ? 'در حال بروزرسانی...' : 'بروزرسانی'}
                </span>
              </button>

              {onAddLocalFolder && (
                <button
                  type="button"
                  onClick={onAddLocalFolder}
                  className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                  title="افزودن یک پوشه دیگر از کامپیوتر (Multi-Folder Sync)"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}

              {linkedFolders.length > 0 && onUnlinkLocalFolder && (
                <button
                  type="button"
                  onClick={() => onUnlinkLocalFolder()}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="قطع اتصال تمام پوشه‌های محلی کامپیوتر"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => onCreateDoc()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0061FF] hover:bg-[#0050d4] text-white font-bold text-xs shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">سند جدید</span>
          </button>

          {currentUser ? (
            <button
              type="button"
              onClick={onOpenProfile}
              className="w-8 h-8 rounded-full bg-[#0061FF]/15 text-[#0061FF] border border-[#0061FF]/30 flex items-center justify-center font-bold text-xs hover:bg-[#0061FF]/25 transition-colors cursor-pointer"
              title={`پروفایل: ${currentUser.displayName || currentUser.username}`}
            >
              {userInitials}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] text-xs font-semibold text-[var(--text-secondary)] transition-colors cursor-pointer"
            >
              ورود / عضویت
            </button>
          )}
        </div>
      </header>

      {/* 2. SCROLLABLE DASHBOARD BODY */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-8">

          {/* A. START A NEW DOCUMENT / TEMPLATES (Google Docs clean top strip) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                شروع سند جدید (Start a document)
              </span>
              <button
                type="button"
                onClick={onOpenTemplates}
                className="text-xs text-[#0061FF] font-semibold hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>گالری الگوها</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
              {/* 1. Blank Document */}
              <div
                onClick={() => onCreateDoc()}
                className="group p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[#0061FF] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-32"
              >
                <div className="w-10 h-10 rounded-xl bg-[#0061FF]/10 text-[#0061FF] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <span className="font-bold text-xs text-[var(--text-primary)] block group-hover:text-[#0061FF] transition-colors">
                    سند خالی
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">ایجاد صفحه سفید</span>
                </div>
              </div>

              {/* 2. Upload file */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-32"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <span className="font-bold text-xs text-[var(--text-primary)] block group-hover:text-emerald-500 transition-colors">
                    آپلود فایل .md
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">خواندن از سیستم</span>
                </div>
              </div>

              {/* 2.5 Upload Folder / Course */}
              <div
                onClick={() => folderInputRef.current?.click()}
                className="group p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-amber-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-32"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FolderUp className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <span className="font-bold text-xs text-[var(--text-primary)] block group-hover:text-amber-400 transition-colors">
                    آپلود پوشه آموزشی
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">ایجاد درخت سرفصل‌ها</span>
                </div>
              </div>

              {/* 2.8 1-Click Sync from Local PC */}
              {onSyncLocalDisk && (
                <div
                  onClick={() => onSyncLocalDisk(false)}
                  className={`group p-4 rounded-2xl bg-[var(--bg-secondary)] border transition-all cursor-pointer flex flex-col justify-between h-32 ${
                    linkedFolders.length > 0
                      ? 'border-emerald-500/60 hover:border-emerald-400 hover:shadow-md'
                      : 'border-[var(--border-color)] hover:border-[#0061FF] hover:shadow-md'
                  }`}
                  title={
                    linkedFolders.length > 0
                      ? `بروزرسانی همزمان ${linkedFolders.length} پوشه متصل: ${linkedFolders.map((f) => f.name).join('، ')}`
                      : 'اتصال به پوشه لوکال کامپیوتر برای همگام‌سازی و بروزرسانی خودکار با ۱ کلیک'
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                      linkedFolders.length > 0 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-[#0061FF]/10 text-[#0061FF]'
                    }`}>
                      <RefreshCw className={`w-5 h-5 ${isSyncingLocal ? 'animate-spin text-emerald-400' : ''}`} />
                    </div>
                    {linkedFolders.length > 0 && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-bold border border-emerald-500/20">
                        {linkedFolders.length} پوشه
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-[var(--text-primary)] block transition-colors">
                      {linkedFolders.length > 0 ? 'بروزرسانی از کامپیوتر' : 'اتصال به کامپیوتر'}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] truncate block">
                      {linkedFolders.length > 0 ? linkedFolders.map((f) => f.name).join(' · ') : 'همگام‌سازی با ۱ کلیک'}
                    </span>
                  </div>
                </div>
              )}

              {/* 3. Meeting Notes Template */}
              <div
                onClick={onOpenTemplates}
                className="group p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-amber-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-32 hidden sm:flex"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <span className="font-bold text-xs text-[var(--text-primary)] block group-hover:text-amber-500 transition-colors">
                    یادداشت جلسه
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">الگوی آماده جلسات</span>
                </div>
              </div>

              {/* 4. Project Roadmap */}
              <div
                onClick={onOpenTemplates}
                className="group p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-purple-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-32 hidden md:flex"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckSquare className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <span className="font-bold text-xs text-[var(--text-primary)] block group-hover:text-purple-500 transition-colors">
                    نقشه راه پروژه
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">برنامه‌ریزی و تسک‌ها</span>
                </div>
              </div>

              {/* 5. Technical Docs */}
              <div
                onClick={onOpenTemplates}
                className="group p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-sky-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-32 hidden md:flex"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileCode2 className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <span className="font-bold text-xs text-[var(--text-primary)] block group-hover:text-sky-500 transition-colors">
                    مستندات فنی
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">معماری و APIها</span>
                </div>
              </div>
            </div>
          </section>

          {/* B. RECENT DOCUMENTS SECTION (Core Notion / Google Docs view) */}
          <section className="space-y-4">
            {/* Filter and View Style Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
              {/* Tab Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    activeFilter === 'all'
                      ? 'bg-[#0061FF] text-white shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  همه اسناد ({documents.length + cloudFiles.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('my-docs')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    activeFilter === 'my-docs'
                      ? 'bg-[#0061FF] text-white shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  اسناد من ({documents.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('cloud')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    activeFilter === 'cloud'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  مخزن ابری ({cloudFiles.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('starred')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    activeFilter === 'starred'
                      ? 'bg-amber-500 text-neutral-950 shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  ستاره‌دارها ({documents.filter((d) => d.isFavorite).length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('permissions')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    activeFilter === 'permissions'
                      ? 'bg-neutral-800 text-white shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  مجوزها
                </button>
              </div>

              {/* View Toggle & Sorting Controls */}
              {activeFilter !== 'permissions' && (
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                  {/* Sort Order Selector */}
                  <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-2.5 py-1 shadow-xs">
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#0061FF] shrink-0" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as DocSortOption)}
                      className="bg-transparent text-xs text-[var(--text-primary)] font-medium focus:outline-none cursor-pointer pe-1"
                      title="مرتب‌سازی اسناد و سرفصل‌ها بر اساس زمان آپلود یا نام"
                    >
                      <option value="upload-desc" className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">🕒 جدیدترین زمان آپلود</option>
                      <option value="upload-asc" className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">⏳ قدیمی‌ترین زمان آپلود</option>
                      <option value="updated-desc" className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">📝 آخرین ویرایش</option>
                      <option value="title-asc" className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">🔤 بر اساس نام (الفبا)</option>
                    </select>
                  </div>

                  {/* View Style Switcher */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setViewStyle('grid')}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        viewStyle === 'grid'
                          ? 'bg-[var(--bg-secondary)] text-[#0061FF] shadow-xs border border-[var(--border-color)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                      title="نمایش شبکه‌ای (کارت‌ها)"
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewStyle('list')}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        viewStyle === 'list'
                          ? 'bg-[var(--bg-secondary)] text-[#0061FF] shadow-xs border border-[var(--border-color)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                      title="نمایش فهرستی"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewStyle('tree')}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        viewStyle === 'tree'
                          ? 'bg-[var(--bg-secondary)] text-amber-400 shadow-xs border border-[var(--border-color)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                      title="نمایش درخت سرفصل‌های آموزشی"
                    >
                      <FolderTree className="w-4 h-4" />
                    </button>
                    {onOpenTopology && (
                      <button
                        type="button"
                        onClick={onOpenTopology}
                        className="p-1.5 rounded-lg transition-colors cursor-pointer text-[#60a5fa] hover:text-[#0061FF] hover:bg-[var(--bg-secondary)]"
                        title="نمایش گراف عصبی اسناد (Neural Topology)"
                      >
                        <Compass className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={fetchCloud}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors ms-1 cursor-pointer"
                      title="بروزرسانی"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCloudLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Folder / Course Filter Pills */}
            {availableFolders.length > 1 && activeFilter !== 'permissions' && activeFilter !== 'cloud' && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs select-none">
                <span className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1 me-1 shrink-0">
                  <Folder className="w-3.5 h-3.5 text-amber-400" />
                  <span>پوشه‌ها:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedFolder(null)}
                  className={`px-3 py-1 rounded-xl font-bold text-[11px] transition-all cursor-pointer shrink-0 ${
                    selectedFolder === null
                      ? 'bg-[#0061FF] text-white shadow-xs'
                      : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  همه پوشه‌ها ({documents.length})
                </button>
                {availableFolders.map((f) => {
                  const isSelected = selectedFolder === f.name;
                  const theme = getFolderTheme(f.name);
                  return (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => setSelectedFolder(isSelected ? null : f.name)}
                      className={`px-3 py-1 rounded-xl font-bold text-[11px] border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                        isSelected
                          ? `${theme.badge} ring-2 ring-offset-1 ring-[#0061FF] shadow-xs`
                          : `${theme.badge} opacity-80 hover:opacity-100`
                      }`}
                    >
                      <Folder className="w-3 h-3 shrink-0" />
                      <span>{f.name}</span>
                      <span className="opacity-80 font-mono text-[10px]">({f.count})</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Linked Local Folders Manager Bar (Multi-Folder Sync) */}
            {linkedFolders.length > 0 && activeFilter !== 'permissions' && activeFilter !== 'cloud' && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs select-none">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                  <RefreshCw className="w-3 h-3 text-emerald-500" />
                  <span>پوشه‌های متصل کامپیوتر ({linkedFolders.length}):</span>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {linkedFolders.map((f) => (
                    <span
                      key={f.id}
                      className="px-2.5 py-0.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-medium text-[11px] flex items-center gap-1.5 shrink-0"
                    >
                      <span>📁 {f.name}</span>
                      {onUnlinkLocalFolder && (
                        <button
                          type="button"
                          onClick={() => onUnlinkLocalFolder(f.name)}
                          className="hover:text-rose-400 text-neutral-400 transition-colors cursor-pointer"
                          title={`قطع اتصال پوشه «${f.name}»`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                  {onAddLocalFolder && (
                    <button
                      type="button"
                      onClick={onAddLocalFolder}
                      className="px-2.5 py-0.5 rounded-xl border border-dashed border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                      title="اتصال یک پوشه مستقل دیگر از کامپیوتر"
                    >
                      <Plus className="w-3 h-3" />
                      <span>افزودن پوشه دیگر</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB: PERMISSIONS MATRIX VIEW */}
            {activeFilter === 'permissions' ? (
              <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] overflow-hidden shadow-xs">
                <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold text-xs text-[var(--text-primary)]">
                      ماتریس کنترل دسترسی و سطوح محرمانگی اسناد
                    </span>
                  </div>
                  {onOpenAccessRequestsManager && (
                    <button
                      type="button"
                      onClick={onOpenAccessRequestsManager}
                      className="px-3 py-1 rounded-xl bg-[#0061FF] text-white font-bold text-xs shadow-xs"
                    >
                      <span>درخواست‌های دسترسی</span>
                      {pendingRequestsCount > 0 && (
                        <span className="ms-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-neutral-950 font-black text-[10px]">
                          {pendingRequestsCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-start">
                    <thead>
                      <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                        <th className="py-2.5 px-4 text-start font-bold">عنوان سند</th>
                        <th className="py-2.5 px-4 text-center font-bold">وضعیت دسترسی</th>
                        <th className="py-2.5 px-4 text-center font-bold">مشاهده همگانی</th>
                        <th className="py-2.5 px-4 text-center font-bold">نیاز به مجوز</th>
                        <th className="py-2.5 px-4 text-center font-bold">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {cloudFiles.map((file) => (
                        <tr key={file.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                          <td className="py-3 px-4 max-w-xs truncate">
                            <span className="font-semibold text-[var(--text-primary)] block truncate">{file.title}</span>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">@{file.author_username || 'author'}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {file.is_public ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-bold text-[10px]">
                                عمومی
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25 font-bold text-[10px]">
                                محرمانه
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {file.is_public ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {!file.is_public ? <Lock className="w-4 h-4 text-amber-500 mx-auto" /> : '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => onOpenCloudDoc(file)}
                              className="px-2.5 py-1 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[#0061FF] hover:text-white font-semibold text-xs transition-colors"
                            >
                              {file.is_public ? 'مشاهده' : 'درخواست دسترسی'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : viewStyle === 'grid' ? (
              /* GRID VIEW (Notion / Google Docs Clean Cards) */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Local Documents Cards */}
                {activeFilter !== 'cloud' &&
                  sortedLocalDocs.map((doc) => {
                    const snippet = doc.content
                      .replace(/[#*`~\[\]]/g, '')
                      .replace(/\n+/g, ' ')
                      .trim()
                      .slice(0, 140);
                    const uploadTime = getDocUploadTime(doc);
                    const updatedStr = new Date(uploadTime).toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                    });

                    const folderName = getEffectiveFolderPath(doc.folderPath);
                    const theme = getFolderTheme(folderName);

                    return (
                      <div
                        key={doc.id}
                        onClick={() => onOpenDoc(doc.id, 'split')}
                        className={`group p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] ${theme.cardBorder} hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between h-48 relative overflow-hidden`}
                      >
                        {/* Top Row: Icon + Badges */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-[#0061FF] flex items-center justify-center">
                              <FileText className="w-4 h-4" />
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                onClick={(e) => handlePromptChangeDocFolder(doc, e)}
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${theme.badge} flex items-center gap-1 cursor-pointer hover:ring-2 hover:ring-[#0061FF] transition-all`}
                                title="کلیک برای تغییر پوشه یا جابه‌جایی این سند"
                              >
                                <Folder className="w-2.5 h-2.5" />
                                <span>{folderName}</span>
                                <Edit3 className="w-2.5 h-2.5 opacity-60" />
                              </span>
                              {doc.isCloudShared && (
                                <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-bold">
                                  ابری
                                </span>
                              )}
                              {doc.isFavorite && (
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              )}
                            </div>
                          </div>

                          {/* Title */}
                          <h3 className="font-bold text-sm text-[var(--text-primary)] group-hover:text-[#0061FF] transition-colors truncate">
                            {doc.title || 'سند بدون عنوان'}
                          </h3>

                          {/* Snippet */}
                          <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-1.5 leading-relaxed">
                            {snippet || 'سند بدون متن...'}
                          </p>
                        </div>

                        {/* Footer Row */}
                        <div className="pt-3 border-t border-[var(--border-color)]/60 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-[var(--text-muted)] font-mono">{updatedStr}</span>

                          <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
                            {doc.isCloudShared && (
                              <button
                                type="button"
                                onClick={(e) => handleCopyLink(doc.id, e)}
                                className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[#0061FF] transition-colors"
                                title="کپی لینک مستقیم سند"
                              >
                                {copiedId === doc.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Share2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenDoc(doc.id, 'preview');
                              }}
                              className="px-2 py-1 rounded-md text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                            >
                              مطالعه
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenDoc(doc.id, 'split');
                              }}
                              className="px-2.5 py-1 rounded-md bg-[#0061FF]/10 hover:bg-[#0061FF]/20 text-[#0061FF] text-[11px] font-bold transition-colors"
                            >
                              ویرایش
                            </button>

                            {onDeleteDoc && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`آیا از حذف «${doc.title}» اطمینان دارید؟`)) {
                                    onDeleteDoc(doc.id);
                                  }
                                }}
                                className="p-1 rounded text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                                title="حذف سند"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {/* Cloud Files Cards */}
                {activeFilter !== 'my-docs' &&
                  filteredCloudFiles.map((file) => {
                    const isOwner = currentUser && file.user_id === currentUser.id;
                    const isApproved = file.my_access_status === 'approved';
                    const isLocked = !file.is_public && !isOwner && !isApproved;

                    return (
                      <div
                        key={file.id}
                        onClick={() => onOpenCloudDoc(file)}
                        className="group p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-emerald-500/40 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between h-48 relative overflow-hidden"
                      >
                        {/* Top Row */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLocked ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                              {isLocked ? <Lock className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                            </div>

                            <div>
                              {isLocked ? (
                                <span className="text-[10px] px-2 py-0.2 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25 font-bold flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5" />
                                  محرمانه
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-bold">
                                  ابری عمومی
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Title */}
                          <h3 className="font-bold text-sm text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors truncate">
                            {file.title}
                          </h3>

                          {/* Snippet / Description */}
                          <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-1.5 leading-relaxed">
                            {file.description || 'سند مشترک ابری در پایگاه Neon'}
                          </p>
                        </div>

                        {/* Footer */}
                        <div className="pt-3 border-t border-[var(--border-color)]/60 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-[var(--text-muted)] truncate max-w-[120px]">
                            {file.author_name}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleCopyLink(file.id, e)}
                              className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-emerald-400 transition-colors"
                              title="کپی لینک اختصاصی سند"
                            >
                              {copiedId === file.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Share2 className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => onOpenCloudDoc(file)}
                              className={`px-3 py-1 rounded-md font-bold text-[11px] transition-colors ${
                                isLocked
                                  ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30'
                                  : 'bg-emerald-500 hover:bg-emerald-600 text-neutral-950 shadow-xs'
                              }`}
                            >
                              {isLocked ? 'درخواست مجوز' : 'مطالعه'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : viewStyle === 'tree' ? (
              /* TREE VIEW (Educational Course Structure) */
              <div className="space-y-4">
                {renderDashboardTreeNode(docTree, 0)}
              </div>
            ) : (
              /* LIST VIEW (Clean Notion Table) */
              <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] overflow-hidden shadow-xs">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/40 text-[var(--text-muted)] font-bold">
                      <th className="py-3 px-4 text-start">نام سند</th>
                      <th className="py-3 px-4 text-start">پوشه / سرفصل</th>
                      <th className="py-3 px-4 text-start">زمان ثبت / آپلود</th>
                      <th className="py-3 px-4 text-start">نویسنده</th>
                      <th className="py-3 px-4 text-center">نوع ذخیره</th>
                      <th className="py-3 px-4 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)] font-medium">
                    {/* Local Docs in List */}
                    {activeFilter !== 'cloud' &&
                      sortedLocalDocs.map((doc) => {
                        const folderName = getEffectiveFolderPath(doc.folderPath);
                        const theme = getFolderTheme(folderName);
                        const uploadTime = getDocUploadTime(doc);
                        const uploadStr = new Date(uploadTime).toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        return (
                          <tr
                            key={doc.id}
                            onClick={() => onOpenDoc(doc.id, 'split')}
                            className="hover:bg-[var(--bg-tertiary)]/50 transition-colors cursor-pointer"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <FileText className={`w-4 h-4 ${theme.icon} shrink-0`} />
                                <span className="font-bold text-xs text-[var(--text-primary)] truncate max-w-sm">
                                  {doc.title || 'سند بدون عنوان'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                onClick={(e) => handlePromptChangeDocFolder(doc, e)}
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${theme.badge} inline-flex items-center gap-1 cursor-pointer hover:ring-2 hover:ring-[#0061FF] transition-all`}
                                title="کلیک برای تغییر پوشه یا جابه‌جایی این سند"
                              >
                                <Folder className="w-2.5 h-2.5" />
                                <span>{folderName}</span>
                                <Edit3 className="w-2 h-2 opacity-60" />
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[var(--text-muted)] font-mono text-[11px]">
                              {uploadStr}
                            </td>
                            <td className="py-3 px-4 text-[var(--text-muted)]">
                              {doc.cloudAuthor || 'محلی شما'}
                            </td>
                          <td className="py-3 px-4 text-center">
                            {doc.isCloudShared ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[10px]">
                                ابری
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-neutral-500/15 text-[var(--text-muted)] text-[10px]">
                                محلی
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {doc.isCloudShared && (
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyLink(doc.id, e)}
                                  className="p-1 rounded text-[var(--text-muted)] hover:text-[#0061FF]"
                                  title="کپی لینک"
                                >
                                  {copiedId === doc.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Share2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenDoc(doc.id, 'split');
                                }}
                                className="px-2.5 py-1 rounded bg-[#0061FF]/10 text-[#0061FF] hover:bg-[#0061FF]/20 font-bold text-[11px]"
                              >
                                ویرایش
                              </button>
                              {onDeleteDoc && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`آیا از حذف «${doc.title}» اطمینان دارید؟`)) {
                                      onDeleteDoc(doc.id);
                                    }
                                  }}
                                  className="p-1 rounded text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                                  title="حذف سند"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Cloud Files in List */}
                    {activeFilter !== 'my-docs' &&
                      filteredCloudFiles.map((file) => (
                        <tr
                          key={file.id}
                          onClick={() => onOpenCloudDoc(file)}
                          className="hover:bg-[var(--bg-tertiary)]/50 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {file.is_public ? (
                                <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                              )}
                              <span className="font-bold text-xs text-[var(--text-primary)] truncate max-w-sm">
                                {file.title}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[var(--text-muted)] text-[10px]">
                            —
                          </td>
                          <td className="py-3 px-4 text-[var(--text-muted)]">
                            {file.author_name} {file.author_username && `@${file.author_username}`}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[10px]">
                              {file.is_public ? 'ابری عمومی' : 'محرمانه'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => handleCopyLink(file.id, e)}
                                className="p-1 rounded text-[var(--text-muted)] hover:text-emerald-400"
                                title="کپی لینک"
                              >
                                {copiedId === file.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Share2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenCloudDoc(file)}
                                className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 font-bold text-[11px]"
                              >
                                {file.is_public ? 'مطالعه' : 'مجوز'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
