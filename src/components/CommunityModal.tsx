import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Search,
  X,
  FileText,
  Star,
  Eye,
  Share2,
  Download,
  FolderOpen,
  Plus,
  RefreshCw,
  Check,
  Tag,
  Trash2,
  Loader2,
} from 'lucide-react';
import { cloudApi, SharedMarkdownFile, CommunityTag } from '../services/cloudApi';
import { MarkdownDoc } from '../types';

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFileInEditor: (doc: MarkdownDoc) => void;
  onOpenPublishModal: () => void;
  currentUserId?: string;
}

export const CommunityModal: React.FC<CommunityModalProps> = ({
  isOpen,
  onClose,
  onOpenFileInEditor,
  onOpenPublishModal,
  currentUserId,
}) => {
  const [files, setFiles] = useState<SharedMarkdownFile[]>([]);
  const [popularTags, setPopularTags] = useState<CommunityTag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'recent' | 'popular' | 'views'>('recent');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [starredMap, setStarredMap] = useState<Record<string, number>>({});
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [statsSummary, setStatsSummary] = useState<{ totalFiles: number; totalViews: number } | null>(null);

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

      const health = await cloudApi.getHealth();
      if (health.stats) {
        setStatsSummary({
          totalFiles: health.stats.totalFiles,
          totalViews: health.stats.totalViews,
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در بارگذاری اسناد اکسپلور عمومی');
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

  const handleOpenDoc = async (file: SharedMarkdownFile) => {
    setLoadingFileId(file.id);
    setErrorMsg(null);
    try {
      const fullDoc = await cloudApi.getFileById(file.id);
      const newDoc: MarkdownDoc = {
        id: fullDoc.id,
        title: fullDoc.title,
        content: fullDoc.content || '',
        description: fullDoc.description,
        createdAt: new Date(fullDoc.created_at).getTime(),
        updatedAt: new Date(fullDoc.updated_at).getTime(),
        tags: fullDoc.tags,
        visibility: fullDoc.visibility || 'public',
        isCloudShared: true,
        cloudAuthor: fullDoc.author_name,
        userId: fullDoc.user_id,
        isOwner: Boolean(currentUserId && fullDoc.user_id === currentUserId),
        cloudSyncedAt: Date.now(),
      };
      onOpenFileInEditor(newDoc);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در باز کردن سند');
    } finally {
      setLoadingFileId(null);
    }
  };

  const handleStar = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    try {
      const res = await cloudApi.starFile(fileId);
      setStarredMap((prev) => ({ ...prev, [fileId]: res.stars }));
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, stars_count: res.stars } : f))
      );
    } catch {}
  };

  const handleCopyLink = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/?share=${fileId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(fileId);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
    } catch {}
  };

  const handleDelete = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    try {
      await cloudApi.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setConfirmDeleteId(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در حذف سند');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl h-[88vh] rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-[var(--text-primary)]">
                اکسپلور عمومی
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                اسناد منتشرشده توسط کاربران برای مطالعه و دریافت ایده
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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>انتشار سند فعلی</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex-1 min-w-[240px] max-w-md relative">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس عنوان، نویسنده یا متن..."
              className="w-full ps-9 pe-8 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setSortOrder('recent')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium whitespace-nowrap cursor-pointer ${
                sortOrder === 'recent'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              جدیدترین
            </button>
            <button
              type="button"
              onClick={() => setSortOrder('popular')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium whitespace-nowrap cursor-pointer ${
                sortOrder === 'popular'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              محبوب‌ترین
            </button>
            <button
              type="button"
              onClick={() => setSortOrder('views')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium whitespace-nowrap cursor-pointer ${
                sortOrder === 'views'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              پربازدیدترین
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] tabular-nums">
            {statsSummary && (
              <span className="hidden md:inline">
                {statsSummary.totalFiles} سند · {statsSummary.totalViews} بازدید
              </span>
            )}
            <button
              type="button"
              onClick={fetchFiles}
              disabled={isLoading}
              className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="بروزرسانی"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Popular Tags */}
        {popularTags.length > 0 && (
          <div className="px-6 py-2 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/50 flex items-center gap-1.5 overflow-x-auto shrink-0 text-xs">
            <span className="text-[11px] text-[var(--text-muted)] shrink-0 flex items-center gap-1">
              <Tag className="w-3 h-3 text-amber-500" />
              موضوعات:
            </span>
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={`px-2.5 py-0.5 rounded-lg text-xs transition-colors shrink-0 cursor-pointer ${
                selectedTag === null
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              همه
            </button>
            {popularTags.map((t) => (
              <button
                key={t.tag}
                type="button"
                onClick={() => setSelectedTag(selectedTag === t.tag ? null : t.tag)}
                className={`px-2.5 py-0.5 rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer ${
                  selectedTag === t.tag
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-amber-500/15 hover:text-amber-500'
                }`}
              >
                <span>#{t.tag}</span>
                <span className="text-[10px] opacity-60 tabular-nums">({t.count})</span>
              </button>
            ))}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm">در حال دریافت اسناد اکسپلور عمومی...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-center text-xs space-y-2">
              <p>{errorMsg}</p>
              <button
                type="button"
                onClick={fetchFiles}
                className="px-3 py-1.5 rounded-lg bg-rose-500 text-white font-medium cursor-pointer"
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
                <h3 className="font-bold text-sm text-[var(--text-primary)]">سندی یافت نشد</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm">
                  {searchQuery || selectedTag
                    ? 'هیچ سندی با این عبارت یا برچسب در اکسپلور عمومی پیدا نشد.'
                    : 'هنوز هیچ سندی در اکسپلور عمومی منتشر نشده است.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPublishModal();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>انتشار سند فعلی</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map((file) => {
                const isCopied = copiedId === file.id;
                const stars = starredMap[file.id] ?? file.stars_count;
                const isLoadingThis = loadingFileId === file.id;
                const isOwner = Boolean(currentUserId && file.user_id === currentUserId);
                const isConfirmingDelete = confirmDeleteId === file.id;

                return (
                  <div
                    key={file.id}
                    onClick={() => handleOpenDoc(file)}
                    className="p-4 rounded-2xl bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-amber-500/40 transition-colors cursor-pointer flex flex-col justify-between group space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm text-[var(--text-primary)] group-hover:text-amber-500 transition-colors line-clamp-2">
                          {file.title}
                        </h3>
                        <button
                          type="button"
                          onClick={(e) => handleStar(e, file.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-secondary)] hover:bg-amber-500/20 text-xs text-[var(--text-muted)] hover:text-amber-500 transition-colors shrink-0 tabular-nums cursor-pointer"
                          title="پسندیدن"
                        >
                          <Star className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-[11px] font-semibold">{stars}</span>
                        </button>
                      </div>

                      <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-2 leading-relaxed">
                        {file.description || 'بدون توضیح اضافه'}
                      </p>
                    </div>

                    {/* Clean Unboxed Metadata */}
                    <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] text-[var(--text-muted)] tabular-nums">
                      <span className="truncate max-w-[160px] text-[var(--text-secondary)]">
                        {file.author_name || 'کاربر'} · {new Date(file.created_at).toLocaleDateString('fa-IR')}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Eye className="w-3 h-3" />
                        <span>{file.views_count}</span>
                      </span>
                    </div>

                    {/* Action buttons bar */}
                    <div
                      className="pt-2 flex items-center justify-between border-t border-[var(--border-color)]/60"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isConfirmingDelete ? (
                        <div className="flex items-center justify-between w-full gap-2 text-xs">
                          <span className="text-rose-500 font-semibold">حذف شود؟</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, file.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[11px] font-bold cursor-pointer"
                            >
                              حذف
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-[11px] cursor-pointer"
                            >
                              لغو
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenDoc(file)}
                            disabled={isLoadingThis}
                            className="flex items-center gap-1 text-xs text-amber-500 font-bold hover:underline cursor-pointer"
                          >
                            {isLoadingThis ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <FolderOpen className="w-3 h-3" />
                            )}
                            <span>مطالعه در ویرایشگر</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleCopyLink(e, file.id)}
                              className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                              title="کپی لینک اشتراک"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDownload(e, file)}
                              className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                              title="دانلود فایل .md"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            {isOwner && (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(file.id)}
                                className="p-1.5 rounded-lg hover:bg-rose-500/20 text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                                title="حذف سند"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-color)] bg-[var(--bg-primary)] flex items-center justify-between text-xs text-[var(--text-muted)] shrink-0">
          <span>فقط اسناد منتشرشده در اکسپلور عمومی نمایش داده می‌شوند.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
