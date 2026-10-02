import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderKanban,
  FileText,
  Plus,
  Upload,
  Search,
  Lock,
  Unlock,
  Key,
  ShieldCheck,
  Eye,
  Download,
  Share2,
  Copy,
  Check,
  Star,
  Clock,
  Sparkles,
  ArrowUpRight,
  User,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Layers,
  Database,
  RefreshCw,
  FolderOpen,
  Trash2,
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
  const [activeNav, setActiveNav] = useState<'home' | 'permissions' | 'cloud'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [cloudFiles, setCloudFiles] = useState<SharedMarkdownFile[]>([]);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchCloud = useCallback(async () => {
    setIsCloudLoading(true);
    try {
      const res = await cloudApi.getFiles({ limit: 50 });
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
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImportFiles(e.dataTransfer.files);
    }
  };

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const spaceTitle = currentUser
    ? `${currentUser.displayName || currentUser.username}'s Space`
    : 'Project Beacon (Data Room)';

  const userInitials = currentUser?.displayName
    ? currentUser.displayName.slice(0, 2).toUpperCase()
    : currentUser?.username
    ? currentUser.username.slice(0, 2).toUpperCase()
    : 'DS';

  return (
    <div
      className="flex-1 flex flex-col md:flex-row h-full w-full overflow-hidden bg-[#f8fafc] text-neutral-900 select-none"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleFileDrop}
    >
      {/* 1. LEFT: DocSend Navigation Sidebar */}
      <aside className="w-full md:w-56 shrink-0 bg-white border-b md:border-b-0 md:border-e border-neutral-200 flex flex-col justify-between z-20">
        <div>
          {/* Sub-header inside sidebar */}
          <div className="p-3 md:p-4 border-b border-neutral-100 flex items-center justify-between">
            <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              DocSend Spaces
            </span>
            <span className="text-[9px] md:text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
              Active
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 md:p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible text-xs font-semibold text-neutral-600">
            <button
              type="button"
              onClick={() => setActiveNav('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all shrink-0 md:w-full ${
                activeNav === 'home'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5 shrink-0" />
              <span>صفحه اصلی (Home)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveNav('permissions')}
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl transition-all shrink-0 md:w-full ${
                activeNav === 'permissions'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>مجوزها (Permissions)</span>
              </div>
              {pendingRequestsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-neutral-950 font-black text-[9px]">
                  {pendingRequestsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveNav('cloud')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all shrink-0 md:w-full ${
                activeNav === 'cloud'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>مخزن ابری ({cloudFiles.length})</span>
            </button>

            <button
              type="button"
              onClick={onOpenTemplates}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-all shrink-0 md:w-full"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              <span>الگوهای آماده</span>
            </button>
          </nav>
        </div>

        {/* Space Folders / Trash (Desktop Only) */}
        <div className="hidden md:block p-3 border-t border-neutral-100 text-xs space-y-1 text-neutral-500">
          <div className="px-3 py-1 text-[10px] uppercase font-bold text-neutral-400">Space Folders</div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-800 font-semibold cursor-pointer">
            <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
            <span>Home ({documents.length})</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-neutral-50 cursor-pointer text-neutral-400">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Trash</span>
          </div>
        </div>
      </aside>

      {/* 2. CENTER: Main Space Area */}
      <main className="flex-1 h-full overflow-y-auto flex flex-col bg-[#f8fafc]">
        {/* Cover Graphic */}
        <div className="h-28 md:h-44 w-full relative shrink-0 overflow-hidden bg-gradient-to-r from-emerald-800 via-teal-700 to-cyan-800">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:16px_16px]" />
        </div>

        {/* Space Profile Card & Header */}
        <div className="max-w-4xl w-full mx-auto px-4 md:px-6 -mt-10 md:-mt-14 relative z-10 space-y-5 pb-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="flex items-end gap-3.5">
              {/* Profile Avatar Box */}
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white border border-neutral-200 shadow-lg flex items-center justify-center font-black text-xl md:text-2xl text-neutral-900 shrink-0">
                {userInitials}
              </div>
              <div className="pb-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg md:text-xl font-black text-neutral-900 truncate">
                    {spaceTitle}
                  </h1>
                  <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    Active
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1.5 font-medium truncate">
                  {currentUser?.username ? (
                    <span className="text-sky-600 font-mono font-bold" dir="ltr">@{currentUser.username}</span>
                  ) : (
                    <span>مهمان (برای انتشار رسمی وارد شوید)</span>
                  )}
                  <span>•</span>
                  <span>{documents.length} سند فعال</span>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
              <button
                type="button"
                onClick={onCreateDoc}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ سند جدید</span>
              </button>

              {currentUser ? (
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="px-3 py-2 rounded-xl bg-white border border-neutral-300 hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-all cursor-pointer shadow-xs"
                >
                  پروفایل
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="px-3 py-2 rounded-xl bg-white border border-neutral-300 hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-all cursor-pointer shadow-xs"
                >
                  ورود
                </button>
              )}
            </div>
          </div>

          {/* DocSend "What are you building?" Box & Drop Zone */}
          <div className="p-5 md:p-6 rounded-3xl bg-white border border-neutral-200 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
              <Sparkles className="w-3.5 h-3.5" />
              <span>What are you building?</span>
            </div>

            <div className="max-w-md w-full relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در اسناد یا شروع یک یادداشت..."
                className="w-full ps-3.5 pe-10 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 focus:border-blue-500 focus:bg-white focus:outline-none text-xs text-neutral-800 placeholder-neutral-400 transition-all"
              />
              <button
                type="button"
                onClick={onCreateDoc}
                className="absolute end-1.5 top-1.5 p-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all"
                title="شروع نوشتن"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-neutral-500 pt-0.5 flex-wrap justify-center">
              <span>آپلود فایل:</span>
              <label className="text-blue-600 font-bold hover:underline cursor-pointer">
                انتخاب فایل .md
                <input
                  type="file"
                  multiple
                  accept=".md,.markdown,.txt"
                  className="hidden"
                  onChange={(e) => e.target.files && onImportFiles(e.target.files)}
                />
              </label>
              <span>•</span>
              <button type="button" onClick={onOpenTemplates} className="text-blue-600 font-bold hover:underline">
                تمپلیت‌ها
              </button>
            </div>
          </div>

          {/* Tab Content: Home, Permissions, Cloud */}
          {activeNav === 'home' && (
            <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs md:text-sm text-neutral-800">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>اسناد موجود در این فضا ({filteredDocs.length})</span>
                </div>
                <div className="text-[11px] text-neutral-400 font-medium">کلیک برای مطالعه یا ویرایش</div>
              </div>

              <div className="divide-y divide-neutral-100">
                {filteredDocs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-neutral-400 space-y-2">
                    <FileText className="w-8 h-8 mx-auto opacity-30" />
                    <p>سندی یافت نشد.</p>
                  </div>
                ) : (
                  filteredDocs.map((doc) => {
                    const dateStr = new Date(doc.updatedAt).toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                    });

                    return (
                      <div
                        key={doc.id}
                        onClick={() => onOpenDoc(doc.id, 'split')}
                        className="p-3.5 hover:bg-neutral-50 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-xs text-neutral-900 group-hover:text-blue-600 transition-colors truncate">
                              {doc.title || 'سند بدون عنوان'}
                            </h3>
                            <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                              {doc.content.slice(0, 100).replace(/[#*`~\[\]]/g, '') || 'متن خالی...'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 text-xs">
                          <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">{dateStr}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenDoc(doc.id, 'split');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs transition-colors"
                          >
                            باز کردن
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeNav === 'permissions' && (
            <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs md:text-sm text-neutral-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>ماتریس دسترسی و مجوزهای سازمانی اسناد (DocSend Permissions)</span>
                  </h3>
                </div>
                {onOpenAccessRequestsManager && (
                  <button
                    type="button"
                    onClick={onOpenAccessRequestsManager}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs"
                  >
                    <span>درخواست‌ها</span>
                    {pendingRequestsCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-neutral-950 font-black text-[9px]">
                        {pendingRequestsCount}
                      </span>
                    )}
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50 text-neutral-500 font-bold">
                      <th className="py-2.5 px-3 text-start">عنوان سند</th>
                      <th className="py-2.5 px-3 text-center">نوع دسترسی</th>
                      <th className="py-2.5 px-3 text-center">مشاهده آزاد</th>
                      <th className="py-2.5 px-3 text-center">نیاز به تأیید</th>
                      <th className="py-2.5 px-3 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-medium">
                    {cloudFiles.slice(0, 15).map((file) => (
                      <tr key={file.id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="py-2.5 px-3 max-w-xs truncate">
                          <span className="font-bold text-neutral-900">{file.title}</span>
                          <span className="text-[10px] text-neutral-400 block font-mono">@{file.author_username || 'author'}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {file.is_public ? (
                            <span className="px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[9px] border border-emerald-200">
                              عمومی
                            </span>
                          ) : (
                            <span className="px-2 py-0.2 rounded-full bg-rose-50 text-rose-700 font-bold text-[9px] border border-rose-200">
                              محرمانه
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {file.is_public ? <Check className="w-3.5 h-3.5 text-emerald-600 mx-auto" /> : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {!file.is_public ? <Lock className="w-3.5 h-3.5 text-amber-500 mx-auto" /> : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => onOpenCloudDoc(file)}
                            className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs"
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
          )}

          {activeNav === 'cloud' && (
            <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm divide-y divide-neutral-100">
              <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                <span className="font-bold text-xs md:text-sm text-neutral-800 flex items-center gap-2">
                  <Database className="w-4 h-4 text-sky-500" />
                  <span>اسناد ابری مخزن مشترک ({cloudFiles.length})</span>
                </span>
                <button
                  type="button"
                  onClick={fetchCloud}
                  className="p-1 rounded text-neutral-400 hover:text-neutral-700"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCloudLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {cloudFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => onOpenCloudDoc(file)}
                  className="p-3.5 hover:bg-neutral-50 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${file.is_public ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                      {file.is_public ? <FileText className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-neutral-900 group-hover:text-blue-600 transition-colors truncate">
                          {file.title}
                        </span>
                        {!file.is_public && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold shrink-0">
                            غیرعمومی
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                        نویسنده: <strong className="text-neutral-700">{file.author_name}</strong>
                        {file.author_username && <span className="font-mono text-sky-600 ms-1">@{file.author_username}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(file.id, e)}
                      className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
                      title="کپی لینک"
                    >
                      {copiedId === file.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenCloudDoc(file)}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 transition-colors"
                    >
                      {file.is_public ? 'مطالعه' : 'درخواست دسترسی'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
