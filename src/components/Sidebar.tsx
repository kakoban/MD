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
  FolderOpen,
  Sparkles,
  RefreshCw,
  FileCode,
  Tag,
  Database,
  CloudUpload,
  Globe,
  Eye,
  Check,
  Share2,
  Loader2,
  Lock,
  Unlock,
  Key,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { MarkdownDoc, UserProfile } from '../types';
import { cloudApi, SharedMarkdownFile } from '../services/cloudApi';
import { useLanguage } from '../context/LanguageContext';

interface SidebarProps {
  documents: MarkdownDoc[];
  activeDocId: string;
  onSelectDoc: (id: string) => void;
  onCreateDoc: () => void;
  onOpenTemplates?: () => void;
  onDeleteDoc: (id: string) => void;
  onDuplicateDoc: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onImportFiles: (files: FileList) => void;
  onRestoreSamples: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onOpenCloudDoc?: (doc: MarkdownDoc) => void;
  onOpenPublishModal?: () => void;
  currentUser?: UserProfile | null;
  onRequestAccess?: (file: SharedMarkdownFile) => void;
  onOpenAccessRequestsManager?: () => void;
  pendingRequestsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  documents,
  activeDocId,
  onSelectDoc,
  onCreateDoc,
  onOpenTemplates,
  onDeleteDoc,
  onDuplicateDoc,
  onToggleFavorite,
  onImportFiles,
  onRestoreSamples,
  isOpen,
  onToggleOpen,
  onOpenCloudDoc,
  onOpenPublishModal,
  currentUser,
  onRequestAccess,
  onOpenAccessRequestsManager,
  pendingRequestsCount,
}: SidebarProps) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'local' | 'cloud'>('local');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cloud Hub State inside sidebar
  const [cloudFiles, setCloudFiles] = useState<SharedMarkdownFile[]>([]);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [cloudSearch, setCloudSearch] = useState('');
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);

  const fetchCloudFiles = useCallback(async () => {
    setIsCloudLoading(true);
    try {
      const res = await cloudApi.getFiles({ search: cloudSearch, limit: 30 });
      setCloudFiles(res.files);
    } catch (err) {
      console.warn('Sidebar cloud fetch:', err);
    } finally {
      setIsCloudLoading(false);
    }
  }, [cloudSearch]);

  useEffect(() => {
    if (activeTab === 'cloud') {
      fetchCloudFiles();
    }
  }, [activeTab, fetchCloudFiles]);

  const filteredDocs = documents.filter((doc) => {
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

  const handleCopyCloudLink = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/?share=${fileId}`;
    navigator.clipboard.writeText(url);
    setCopiedShareId(fileId);
    setTimeout(() => setCopiedShareId(null), 2000);
  };

  const handleOpenCloudDoc = async (file: SharedMarkdownFile) => {
    const isOwner = currentUser && file.user_id === currentUser.id;
    const isApproved = file.my_access_status === 'approved';
    const isLocked = !file.is_public && !isOwner && !isApproved;

    if (isLocked) {
      onRequestAccess?.(file);
      return;
    }

    if (!onOpenCloudDoc) return;
    try {
      const fullDoc = await cloudApi.getFileById(file.id);
      const doc: MarkdownDoc = {
        id: fullDoc.id,
        title: fullDoc.title,
        content: fullDoc.content || '',
        createdAt: new Date(fullDoc.created_at).getTime(),
        updatedAt: new Date(fullDoc.updated_at).getTime(),
        tags: fullDoc.tags,
        isCloudShared: true,
        cloudAuthor: fullDoc.author_name,
        cloudSyncedAt: Date.now(),
      };
      onOpenCloudDoc(doc);
    } catch (err: any) {
      alert(err.message || 'خطا در باز کردن فایل از ابر');
    }
  };

  if (!isOpen) {
    return (
      <div className="shrink-0 p-2 z-20">
        <button
          type="button"
          onClick={onToggleOpen}
          className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors shadow-sm"
          title="باز کردن منوی یادداشت‌ها"
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

      {/* Top Header & App Branding */}
      <div className="p-3.5 border-b border-[var(--border-color)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-neutral-950 font-bold shadow-xs">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <span>Markdown Studio</span>
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">ویرایشگر و مخزن ابری Neon</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleOpen}
          className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          title={t('sidebar.closeSidebar')}
        >
          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>

      {/* TAB SELECTOR: Local Documents vs Cloud Community */}
      <div className="p-2 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/40 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('local')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'local'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{t('sidebar.myDocuments')} ({documents.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cloud')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'cloud'
              ? 'bg-emerald-500 text-neutral-950 font-bold shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>{t('sidebar.cloudRepo')}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      </div>

      {/* TAB 1: LOCAL DOCUMENTS */}
      {activeTab === 'local' && (
        <>
          {/* Action Buttons: New Note, Templates & Import File */}
          <div className="p-2.5 space-y-1.5 border-b border-[var(--border-color)]">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={onCreateDoc}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-semibold text-xs transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{t('sidebar.newNote')}</span>
              </button>

              {onOpenTemplates && (
                <button
                  type="button"
                  onClick={onOpenTemplates}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 border border-purple-500/30 font-semibold text-xs transition-colors"
                  title="ایجاد سند جدید از الگوهای آماده"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>{t('sidebar.templates')}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-color)] font-medium text-[11px] transition-colors"
              title="آپلود فایل‌های md. یا txt."
            >
              <Upload className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('sidebar.importFile')}</span>
            </button>
          </div>

          {/* Search & Favorite filter */}
          <div className="p-2.5 space-y-1.5 border-b border-[var(--border-color)]">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('sidebar.searchPlaceholder')}
                className="w-full ps-8 pe-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500 focus:outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors"
              />
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute start-2.5 top-2.5" />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] px-1">
              <span>{filteredDocs.length} {t('sidebar.localDocs')}</span>
              <button
                type="button"
                onClick={() => setFilterFavorite(!filterFavorite)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                  filterFavorite
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 font-medium'
                    : 'hover:text-[var(--text-primary)]'
                }`}
              >
                <Star className={`w-3 h-3 ${filterFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                <span>{t('sidebar.starred')}</span>
              </button>
            </div>
          </div>

          {/* Local Documents List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredDocs.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                {searchQuery ? 'سندی با این مشخصات پیدا نشد.' : 'هیچ سندی موجود نیست.'}
              </div>
            ) : (
              filteredDocs.map((doc) => {
                const isActive = doc.id === activeDocId;
                const updatedDate = new Date(doc.updatedAt).toLocaleDateString('fa-IR', {
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div
                    key={doc.id}
                    onClick={() => onSelectDoc(doc.id)}
                    className={`group relative p-2.5 rounded-xl cursor-pointer transition-all border ${
                      isActive
                        ? 'bg-amber-500/10 border-amber-500/30 shadow-xs text-[var(--text-primary)]'
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

                      {/* Favorite star */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(doc.id);
                        }}
                        className="p-0.5 rounded hover:text-amber-400 text-[var(--text-muted)] transition-colors"
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

                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <span>{updatedDate}</span>
                        {doc.isCloudShared && (
                          <span
                            className="px-1 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5"
                            title="ذخیره شده در دیتابیس ابری Neon"
                          >
                            <Database className="w-2.5 h-2.5" />
                            ابر
                          </span>
                        )}
                      </div>

                      {/* Actions on hover: Duplicate & Delete */}
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateDoc(doc.id);
                          }}
                          className="p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          title={t('sidebar.duplicateDoc')}
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {documents.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`آیا از حذف سند "${doc.title}" اطمینان دارید؟`)) {
                                onDeleteDoc(doc.id);
                              }
                            }}
                            className="p-1 rounded hover:bg-rose-500/20 text-[var(--text-muted)] hover:text-rose-500"
                            title={t('sidebar.deleteDoc')}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drag & drop helper / Samples loader */}
          <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)] space-y-2">
            <div className="border border-dashed border-[var(--border-color)] rounded-xl p-2 text-center text-[10px] text-[var(--text-muted)]">
              فایل‌های <span className="text-amber-500 font-semibold">.md</span> را بکشید و اینجا رها کنید
            </div>
            <button
              type="button"
              onClick={onRestoreSamples}
              className="w-full py-1 text-center text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{t('sidebar.reloadSamples')}</span>
            </button>
          </div>
        </>
      )}

      {/* TAB 2: CLOUD COMMUNITY HUB */}
      {activeTab === 'cloud' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Cloud Search & Actions */}
          <div className="p-2.5 space-y-2 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/30">
            <div className="relative">
              <input
                type="text"
                value={cloudSearch}
                onChange={(e) => setCloudSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchCloudFiles();
                }}
                placeholder="جستجو در مخزن Neon..."
                className="w-full ps-8 pe-8 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-emerald-500 focus:outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)]"
              />
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute start-2.5 top-2.5" />
              <button
                type="button"
                onClick={fetchCloudFiles}
                className="p-1 rounded text-[var(--text-muted)] hover:text-emerald-400 absolute end-2 top-1.5"
                title="تازه کردن نتایج"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCloudLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {onOpenPublishModal && (
              <button
                type="button"
                onClick={onOpenPublishModal}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs transition-colors shadow-xs"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>اشتراک سند فعلی در ابر</span>
              </button>
            )}
          </div>

          {/* Cloud Files List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {isCloudLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)] space-y-2 text-xs">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                <span>در حال دریافت اسناد از Neon...</span>
              </div>
            ) : cloudFiles.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--text-muted)] space-y-2">
                <Database className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
                <p>فایلی در مخزن ابری یافت نشد.</p>
              </div>
            ) : (
              cloudFiles.map((file) => {
                const isCopied = copiedShareId === file.id;
                return (
                  <div
                    key={file.id}
                    onClick={() => handleOpenCloudDoc(file)}
                    className="group p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-emerald-500/40 hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer flex flex-col gap-1.5"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-semibold text-xs text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors line-clamp-1 flex-1">
                        {file.title}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-amber-500 shrink-0">
                        <Star className="w-3 h-3 fill-amber-500/20" />
                        <span>{file.stars_count}</span>
                      </div>
                    </div>

                    {/* Access Status & Badges */}
                    {!file.is_public && (
                      <div className="flex items-center gap-1 text-[9px] flex-wrap">
                        {currentUser && file.user_id === currentUser.id ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25 font-bold flex items-center gap-1">
                            <Key className="w-2.5 h-2.5" />
                            سند شما (خصوصی)
                          </span>
                        ) : file.my_access_status === 'approved' ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-bold flex items-center gap-1">
                            <Unlock className="w-2.5 h-2.5" />
                            دسترسی تایید شد
                          </span>
                        ) : file.my_access_status === 'pending' ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25 font-bold flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            در انتظار تأیید
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/25 font-bold flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            غیر عمومی (نیاز به مجوز)
                          </span>
                        )}
                      </div>
                    )}
                    {file.description && (
                      <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">
                        {file.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)]/60 text-[10px] text-[var(--text-muted)]">
                      <span className="truncate max-w-[120px]">
                        {file.author_name || 'ناشناس'}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleCopyCloudLink(e, file.id)}
                          className="p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-emerald-400 transition-colors"
                          title="کپی لینک اشتراک"
                        >
                          {isCopied ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Share2 className="w-3 h-3" />
                          )}
                        </button>
                        <span className="text-[10px] text-emerald-500 font-bold group-hover:underline">
                          باز کردن
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cloud Info Bar */}
          <div className="p-2.5 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Neon PostgreSQL
            </span>
            <span>{cloudFiles.length} فایل آنلاین</span>
          </div>
        </div>
      )}
    </aside>
  );
};

