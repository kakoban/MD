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
} from 'lucide-react';
import { MarkdownDoc, UserProfile } from '../types';
import { SharedMarkdownFile, cloudApi } from '../services/cloudApi';
import { useLanguage } from '../context/LanguageContext';

interface DocSendSpaceViewProps {
  documents: MarkdownDoc[];
  currentUser: UserProfile | null;
  onOpenDoc: (docId: string, mode?: 'split' | 'editor' | 'preview') => void;
  onCreateDoc: () => void;
  onOpenCloudDoc: (file: SharedMarkdownFile) => void;
  onImportFiles: (files: FileList) => void;
  onOpenTemplates: () => void;
  onOpenProfile: () => void;
  onOpenAuth: () => void;
  onOpenAccessRequestsManager?: () => void;
  pendingRequestsCount?: number;
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
}) => {
  const { t, language } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<'all' | 'my-docs' | 'cloud' | 'starred' | 'permissions'>('all');
  const [viewStyle, setViewStyle] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [cloudFiles, setCloudFiles] = useState<SharedMarkdownFile[]>([]);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Filter documents based on search & tab
  const filteredLocalDocs = documents.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.content.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === 'starred') return Boolean(d.isFavorite);
    if (activeFilter === 'cloud') return false;
    return true;
  });

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

        {/* Global Search Bar (Google Docs style) */}
        <div className="flex-1 max-w-xl mx-4 sm:mx-8 relative">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute start-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در تمام اسناد، متن‌ها و سرفصل‌ها..."
            className="w-full ps-10 pe-9 py-2 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-[#0061FF] focus:bg-[var(--bg-secondary)] focus:outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
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

          <button
            type="button"
            onClick={onCreateDoc}
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
                onClick={onCreateDoc}
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

              {/* View Toggle (Grid / List) */}
              {activeFilter !== 'permissions' && (
                <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
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
                    onClick={fetchCloud}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors ms-1 cursor-pointer"
                    title="بروزرسانی"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCloudLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              )}
            </div>

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
                  filteredLocalDocs.map((doc) => {
                    const snippet = doc.content
                      .replace(/[#*`~\[\]]/g, '')
                      .replace(/\n+/g, ' ')
                      .trim()
                      .slice(0, 140);
                    const updatedStr = new Date(doc.updatedAt).toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                    });

                    return (
                      <div
                        key={doc.id}
                        onClick={() => onOpenDoc(doc.id, 'split')}
                        className="group p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[#0061FF]/40 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between h-48 relative overflow-hidden"
                      >
                        {/* Top Row: Icon + Badges */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-[#0061FF] flex items-center justify-center">
                              <FileText className="w-4 h-4" />
                            </div>

                            <div className="flex items-center gap-1.5">
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
            ) : (
              /* LIST VIEW (Clean Notion Table) */
              <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] overflow-hidden shadow-xs">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/40 text-[var(--text-muted)] font-bold">
                      <th className="py-3 px-4 text-start">نام سند</th>
                      <th className="py-3 px-4 text-start">نویسنده</th>
                      <th className="py-3 px-4 text-center">نوع ذخیره</th>
                      <th className="py-3 px-4 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)] font-medium">
                    {/* Local Docs in List */}
                    {activeFilter !== 'cloud' &&
                      filteredLocalDocs.map((doc) => (
                        <tr
                          key={doc.id}
                          onClick={() => onOpenDoc(doc.id, 'split')}
                          className="hover:bg-[var(--bg-tertiary)]/50 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <FileText className="w-4 h-4 text-[#0061FF] shrink-0" />
                              <span className="font-bold text-xs text-[var(--text-primary)] truncate max-w-sm">
                                {doc.title || 'سند بدون عنوان'}
                              </span>
                            </div>
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
                            </div>
                          </td>
                        </tr>
                      ))}

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
