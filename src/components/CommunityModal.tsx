import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Search,
  X,
  FileText,
  User,
  Star,
  Eye,
  Share2,
  Download,
  FolderOpen,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
  Check,
  Tag,
  Trash2,
  ExternalLink,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { cloudApi, SharedMarkdownFile, CommunityTag } from '../services/cloudApi';
import { MarkdownDoc } from '../types';

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFileInEditor: (doc: MarkdownDoc) => void;
  onOpenPublishModal: () => void;
}

export const CommunityModal: React.FC<CommunityModalProps> = ({
  isOpen,
  onClose,
  onOpenFileInEditor,
  onOpenPublishModal,
}) => {
  const [files, setFiles] = useState<SharedMarkdownFile[]>([]);
  const [popularTags, setPopularTags] = useState<CommunityTag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'recent' | 'popular' | 'views'>('recent');

  // Interactive feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [starredMap, setStarredMap] = useState<Record<string, number>>({});
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const [dbStats, setDbStats] = useState<{ totalFiles: number; totalViews: number; totalStars: number } | null>(null);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await cloudApi.getFiles({
        search: searchQuery,
        tag: selectedTag || undefined,
        sort: sortOrder,
        limit: 40,
      });
      setFiles(data.files);
      setPopularTags(data.tags);

      // fetch stats
      const health = await cloudApi.getHealth();
      if (health.stats) {
        setDbStats(health.stats);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در بارگذاری فایل‌ها از دیتابیس');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedTag, sortOrder]);

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen, fetchFiles]);

  if (!isOpen) return null;

  // Handle opening a cloud file in the editor
  const handleOpenDoc = async (file: SharedMarkdownFile) => {
    setLoadingFileId(file.id);
    try {
      // fetch full content if not present
      const fullDoc = await cloudApi.getFileById(file.id);
      const newDoc: MarkdownDoc = {
        id: fullDoc.id,
        title: fullDoc.title,
        content: fullDoc.content || '',
        createdAt: new Date(fullDoc.created_at).getTime(),
        updatedAt: new Date(fullDoc.updated_at).getTime(),
        tags: fullDoc.tags,
      };
      onOpenFileInEditor(newDoc);
      onClose();
    } catch (err: any) {
      alert(err.message || 'خطا در باز کردن فایل');
    } finally {
      setLoadingFileId(null);
    }
  };

  // Star a file
  const handleStar = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    try {
      const res = await cloudApi.starFile(fileId);
      setStarredMap((prev) => ({ ...prev, [fileId]: res.stars }));
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, stars_count: res.stars } : f))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Copy share link
  const handleCopyLink = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/?share=${fileId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(fileId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Download directly
  const handleDownload = async (e: React.MouseEvent, file: SharedMarkdownFile) => {
    e.stopPropagation();
    try {
      const fullDoc = await cloudApi.getFileById(file.id);
      const blob = new Blob([fullDoc.content || ''], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fullDoc.title || 'document'}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete file
  const handleDelete = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    if (!confirm('آیا از حذف این فایل از پایگاه داده اطمینان دارید؟')) return;
    try {
      await cloudApi.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err: any) {
      alert(err.message || 'خطا در حذف فایل');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-5xl h-[88vh] rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden text-[var(--text-primary)]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base text-[var(--text-primary)]">
                  مخزن اشتراک‌گذاری فایل‌های مارک‌دان
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Neon PostgreSQL
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                کاوش، مطالعه، دانلود و اشتراک‌گذاری عمومی و مستقیم فایل‌های مارک‌دان
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPublishModal();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>انتشار فایل جدید</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Search Box */}
          <div className="flex-1 min-w-[240px] max-w-md relative">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس عنوان، توضیح یا متن..."
              className="w-full ps-9 pe-8 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
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

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setSortOrder('recent')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                sortOrder === 'recent'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              جدیدترین‌ها
            </button>
            <button
              type="button"
              onClick={() => setSortOrder('popular')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                sortOrder === 'popular'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              محبوب‌ترین
            </button>
            <button
              type="button"
              onClick={() => setSortOrder('views')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                sortOrder === 'views'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              پربازدیدترین
            </button>
          </div>

          {/* Refresh Button & Stats */}
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
            {dbStats && (
              <span className="hidden md:inline">
                {dbStats.totalFiles} فایل | {dbStats.totalViews} بازدید کل
              </span>
            )}
            <button
              type="button"
              onClick={fetchFiles}
              disabled={isLoading}
              className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title="بارگذاری مجدد"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Popular Tags Horizontal Bar */}
        {popularTags.length > 0 && (
          <div className="px-6 py-2 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/50 flex items-center gap-1.5 overflow-x-auto shrink-0 text-xs">
            <span className="text-[11px] text-[var(--text-muted)] shrink-0 flex items-center gap-1">
              <Tag className="w-3 h-3 text-amber-500" />
              موضوعات:
            </span>
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={`px-2 py-0.5 rounded-lg text-xs transition-colors shrink-0 ${
                selectedTag === null
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              همه فایل‌ها
            </button>
            {popularTags.map((t) => (
              <button
                key={t.tag}
                type="button"
                onClick={() => setSelectedTag(selectedTag === t.tag ? null : t.tag)}
                className={`px-2 py-0.5 rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1 ${
                  selectedTag === t.tag
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-amber-500/15 hover:text-amber-500'
                }`}
              >
                <span>#{t.tag}</span>
                <span className="text-[10px] opacity-60">({t.count})</span>
              </button>
            ))}
          </div>
        )}

        {/* Main Content Area (Grid of Files) */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm">در حال دریافت فایل‌ها از پایگاه داده Neon...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-center text-xs space-y-2">
              <p>{errorMsg}</p>
              <button
                type="button"
                onClick={fetchFiles}
                className="px-3 py-1.5 rounded-lg bg-rose-500 text-white font-medium"
              >
                تلاش مجدد
              </button>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="p-4 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-muted)]">
                <FileText className="w-10 h-10" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)]">فایلی یافت نشد</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm">
                  {searchQuery || selectedTag
                    ? 'هیچ فایلی با این عبارت یا تگ در پایگاه داده پیدا نشد.'
                    : 'هنوز فایلی در پایگاه داده منتشر نشده است. اولین نفری باشید که فایلی را به اشتراک می‌گذارد!'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPublishModal();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>اشتراک‌گذاری سند فعلی</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map((file) => {
                const isCopied = copiedId === file.id;
                const stars = starredMap[file.id] ?? file.stars_count;
                const isLoadingThis = loadingFileId === file.id;

                return (
                  <div
                    key={file.id}
                    onClick={() => handleOpenDoc(file)}
                    className="p-5 rounded-2xl bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-amber-500/40 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group space-y-3 relative"
                  >
                    {/* Top: Title & Stars */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm text-[var(--text-primary)] group-hover:text-amber-500 transition-colors line-clamp-2">
                          {file.title}
                        </h3>
                        <button
                          type="button"
                          onClick={(e) => handleStar(e, file.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-secondary)] hover:bg-amber-500/20 text-xs text-[var(--text-muted)] hover:text-amber-500 transition-colors shrink-0"
                          title="امتیاز و ستاره دادن"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-500/20 text-amber-500" />
                          <span className="font-mono text-[11px] font-semibold">{stars}</span>
                        </button>
                      </div>

                      {/* Description */}
                      {file.description ? (
                        <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-2 leading-relaxed">
                          {file.description}
                        </p>
                      ) : (
                        <p className="text-xs text-[var(--text-muted)] italic mt-2">
                          بدون توضیح اضافی
                        </p>
                      )}
                    </div>

                    {/* Middle: Tags */}
                    {file.tags && file.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {file.tags.map((t) => (
                          <span
                            key={t}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTag(t);
                            }}
                            className="px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] text-[10px] text-[var(--text-secondary)] hover:bg-amber-500/20 hover:text-amber-500 transition-colors"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Bottom: Author, Views, Actions */}
                    <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {file.author_name ? file.author_name.charAt(0) : 'ک'}
                        </div>
                        <span className="text-[11px] truncate">{file.author_name || 'کاربر ناشناس'}</span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] shrink-0">
                        <Eye className="w-3 h-3 text-[var(--text-muted)]" />
                        <span className="font-mono">{file.views_count}</span>
                      </div>
                    </div>

                    {/* Action buttons bar */}
                    <div className="pt-2 flex items-center justify-between border-t border-[var(--border-color)]/60">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDoc(file);
                        }}
                        disabled={isLoadingThis}
                        className="flex items-center gap-1 text-xs text-amber-500 font-bold hover:underline"
                      >
                        {isLoadingThis ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <FolderOpen className="w-3 h-3" />
                        )}
                        <span>باز کردن در استودیو</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleCopyLink(e, file.id)}
                          className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                          title="کپی لینک اشتراک"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDownload(e, file)}
                          className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                          title="دانلود فایل .md"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, file.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-[var(--text-muted)] hover:text-rose-500 transition-colors"
                          title="حذف از دیتابیس"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-color)] bg-[var(--bg-primary)] flex items-center justify-between text-xs text-[var(--text-muted)] shrink-0">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span>اتصال مستقیم پایگاه داده: Neon Serverless PostgreSQL</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
