import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Search,
  Lock,
  Copy,
  Check,
  Cloud,
  Eye,
  Link as LinkIcon,
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

  const getAuthorInitials = (name?: string, username?: string) => {
    if (name) return name.slice(0, 2).toUpperCase();
    if (username) return username.slice(0, 2).toUpperCase();
    return 'DS';
  };

  const currentUserInitials = getAuthorInitials(currentUser?.displayName, currentUser?.username);
  const currentUserName = currentUser?.displayName || currentUser?.username || 'مهمان';

  return (
    <div
      className="flex-1 flex flex-col w-full h-full bg-white text-[#1a1a1a] select-none"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleFileDrop}
      dir={language === 'fa' ? 'rtl' : 'ltr'}
    >
      {/* Header Area */}
      <header className="flex flex-col border-b border-[#e5e5e5] bg-white px-6 pt-6 shrink-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#1a1a1a] whitespace-nowrap">محتوا</h1>
          
          <div className="flex-1 max-w-xl mx-8 relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو..."
              className="w-full ps-10 pe-4 py-2 bg-white border border-[#e5e5e5] rounded-md focus:outline-none focus:border-[#0061FF] text-sm text-[#1a1a1a] placeholder-[#6b7280]"
            />
          </div>

          <div className="flex items-center gap-3">
            {!currentUser && (
               <button
                 onClick={onOpenAuth}
                 className="px-4 py-2 bg-white border border-[#e5e5e5] text-[#1a1a1a] hover:bg-[#f7f7f8] rounded-md text-sm font-medium transition-colors"
               >
                 ورود
               </button>
            )}
            {currentUser && (
              <button
                onClick={onOpenProfile}
                className="w-8 h-8 rounded-full bg-[#f9fafb] border border-[#e5e5e5] flex items-center justify-center text-xs font-bold text-[#1a1a1a] hover:bg-[#f7f7f8] transition-colors"
              >
                {currentUserInitials}
              </button>
            )}
            <button
              onClick={onCreateDoc}
              className="flex items-center gap-2 px-4 py-2 bg-[#0061FF] hover:bg-[#0050d4] text-white rounded-md text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>جدید</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveNav('home')}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeNav === 'home' ? 'text-[#0061FF] border-b-2 border-[#0061FF]' : 'text-[#6b7280] hover:text-[#1a1a1a]'
            }`}
          >
            همه اسناد
          </button>
          <button
            onClick={() => setActiveNav('cloud')}
            className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
              activeNav === 'cloud' ? 'text-[#0061FF] border-b-2 border-[#0061FF]' : 'text-[#6b7280] hover:text-[#1a1a1a]'
            }`}
          >
            ابری
            <span className="bg-[#f9fafb] text-[#6b7280] px-1.5 py-0.5 rounded text-xs border border-[#e5e5e5]">
              {cloudFiles.length}
            </span>
          </button>
          <button
            onClick={() => setActiveNav('permissions')}
            className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
              activeNav === 'permissions' ? 'text-[#0061FF] border-b-2 border-[#0061FF]' : 'text-[#6b7280] hover:text-[#1a1a1a]'
            }`}
          >
            مجوزها
            {pendingRequestsCount > 0 && (
              <span className="bg-[#0061FF] text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-white p-6">
        {/* Home Tab */}
        {activeNav === 'home' && (
          <div className="border border-[#e5e5e5] rounded-lg overflow-hidden shadow-sm">
            {filteredDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white">
                <FileText className="w-12 h-12 text-[#e5e5e5] mb-4" />
                <h3 className="text-[#1a1a1a] font-medium mb-1">هیچ سندی یافت نشد</h3>
                <p className="text-[#6b7280] text-sm mb-4">برای شروع، سند جدید بسازید یا فایلی را اینجا رها کنید</p>
                <button
                  onClick={onCreateDoc}
                  className="px-4 py-2 bg-[#0061FF] hover:bg-[#0050d4] text-white rounded-md text-sm font-medium transition-colors"
                >
                  سند جدید بسازید
                </button>
              </div>
            ) : (
              <table className="w-full text-start">
                <thead className="bg-[#f9fafb] border-b border-[#e5e5e5]">
                  <tr>
                    <th className="py-3 px-4 text-start text-[#6b7280] text-xs font-medium uppercase tracking-wider">نام</th>
                    <th className="py-3 px-4 text-start text-[#6b7280] text-xs font-medium uppercase tracking-wider w-48 hidden sm:table-cell">نویسنده</th>
                    <th className="py-3 px-4 text-start text-[#6b7280] text-xs font-medium uppercase tracking-wider w-40 hidden md:table-cell">آخرین ویرایش</th>
                    <th className="py-3 px-4 text-end text-[#6b7280] text-xs font-medium uppercase tracking-wider w-24">لینک‌ها</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5]">
                  {filteredDocs.map(doc => {
                    const dateStr = new Date(doc.updatedAt).toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    });
                    return (
                      <tr key={doc.id} className="hover:bg-[#f7f7f8] transition-colors group cursor-pointer" onClick={() => onOpenDoc(doc.id, 'preview')}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-[#0061FF] shrink-0" />
                            <span className="font-medium text-[#1a1a1a] text-sm truncate">{doc.title || 'سند بدون عنوان'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#f9fafb] border border-[#e5e5e5] flex items-center justify-center text-[10px] font-bold text-[#1a1a1a] shrink-0">
                              {currentUserInitials}
                            </div>
                            <span className="text-sm text-[#1a1a1a] truncate">{currentUserName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-[#6b7280] hidden md:table-cell">{dateStr}</td>
                        <td className="py-3 px-4 text-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenDoc(doc.id, 'preview');
                            }}
                            className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-white border border-[#e5e5e5] text-[#1a1a1a] hover:bg-[#f7f7f8] rounded-md text-xs font-medium transition-all"
                          >
                            باز کردن
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Cloud Tab */}
        {activeNav === 'cloud' && (
          <div className="border border-[#e5e5e5] rounded-lg overflow-hidden shadow-sm">
            {cloudFiles.length === 0 && !isCloudLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white">
                 <Cloud className="w-12 h-12 text-[#e5e5e5] mb-4" />
                 <p className="text-[#6b7280] text-sm">هیچ سند ابری یافت نشد.</p>
              </div>
            ) : (
              <table className="w-full text-start">
                <thead className="bg-[#f9fafb] border-b border-[#e5e5e5]">
                  <tr>
                    <th className="py-3 px-4 text-start text-[#6b7280] text-xs font-medium uppercase tracking-wider">نام</th>
                    <th className="py-3 px-4 text-start text-[#6b7280] text-xs font-medium uppercase tracking-wider w-48 hidden sm:table-cell">نویسنده</th>
                    <th className="py-3 px-4 text-center text-[#6b7280] text-xs font-medium uppercase tracking-wider w-24 hidden md:table-cell">بازدید</th>
                    <th className="py-3 px-4 text-end text-[#6b7280] text-xs font-medium uppercase tracking-wider w-32">لینک‌ها</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5]">
                  {cloudFiles.map(file => (
                    <tr key={file.id} className="hover:bg-[#f7f7f8] transition-colors group cursor-pointer" onClick={() => onOpenCloudDoc(file)}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {file.is_public ? <FileText className="w-5 h-5 text-[#0061FF] shrink-0" /> : <Lock className="w-5 h-5 text-[#6b7280] shrink-0" />}
                          <span className="font-medium text-[#1a1a1a] text-sm truncate">{file.title}</span>
                          {!file.is_public && (
                            <span className="px-2 py-0.5 rounded bg-[#f9fafb] border border-[#e5e5e5] text-[#6b7280] text-[10px] font-medium shrink-0">
                              محرمانه
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#f9fafb] border border-[#e5e5e5] flex items-center justify-center text-[10px] font-bold text-[#1a1a1a] shrink-0">
                            {getAuthorInitials(file.author_name, file.author_username)}
                          </div>
                          <span className="text-sm text-[#1a1a1a] truncate">{file.author_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center hidden md:table-cell">
                        <div className="flex items-center justify-center gap-1 text-[#6b7280]">
                          <Eye className="w-4 h-4" />
                          <span className="text-sm">0</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-end">
                         <div className="flex items-center justify-end gap-2">
                           <button
                             onClick={(e) => handleCopyLink(file.id, e)}
                             className="p-1.5 text-[#6b7280] hover:text-[#1a1a1a] hover:bg-[#e5e5e5] rounded transition-colors"
                             title="کپی لینک"
                           >
                             {copiedId === file.id ? <Check className="w-4 h-4 text-green-600" /> : <LinkIcon className="w-4 h-4" />}
                           </button>
                           <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenCloudDoc(file);
                              }}
                              className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-white border border-[#e5e5e5] text-[#1a1a1a] hover:bg-[#f7f7f8] rounded-md text-xs font-medium transition-all"
                            >
                              {file.is_public ? 'باز کردن' : 'درخواست'}
                           </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Permissions Tab */}
        {activeNav === 'permissions' && (
          <div className="border border-[#e5e5e5] rounded-lg overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e5e5e5] flex justify-between items-center bg-[#f9fafb]">
               <h3 className="text-[#1a1a1a] text-sm font-medium">مدیریت مجوزها</h3>
               {onOpenAccessRequestsManager && (
                  <button
                    onClick={onOpenAccessRequestsManager}
                    className="px-4 py-2 bg-white border border-[#e5e5e5] text-[#1a1a1a] hover:bg-[#f7f7f8] rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <span>درخواست‌ها</span>
                    {pendingRequestsCount > 0 && (
                      <span className="bg-[#0061FF] text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
                        {pendingRequestsCount}
                      </span>
                    )}
                  </button>
               )}
            </div>
            <table className="w-full text-start">
              <thead className="bg-[#f9fafb] border-b border-[#e5e5e5]">
                <tr>
                  <th className="py-3 px-4 text-start text-[#6b7280] text-xs font-medium uppercase tracking-wider">سند</th>
                  <th className="py-3 px-4 text-center text-[#6b7280] text-xs font-medium uppercase tracking-wider w-32">نوع دسترسی</th>
                  <th className="py-3 px-4 text-center text-[#6b7280] text-xs font-medium uppercase tracking-wider w-32 hidden sm:table-cell">عمومی</th>
                  <th className="py-3 px-4 text-end text-[#6b7280] text-xs font-medium uppercase tracking-wider w-24">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5]">
                {cloudFiles.slice(0, 15).map(file => (
                  <tr key={file.id} className="hover:bg-[#f7f7f8] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-[#1a1a1a] text-sm truncate">{file.title}</span>
                        <span className="text-[#6b7280] text-xs font-mono truncate">@{file.author_username || 'author'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                        file.is_public 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {file.is_public ? 'عمومی' : 'محرمانه'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center hidden sm:table-cell">
                      {file.is_public ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : <Lock className="w-4 h-4 text-[#6b7280] mx-auto" />}
                    </td>
                    <td className="py-3 px-4 text-end">
                      <button
                        onClick={() => onOpenCloudDoc(file)}
                        className="px-3 py-1 bg-white border border-[#e5e5e5] text-[#1a1a1a] hover:bg-[#f7f7f8] rounded-md text-xs font-medium transition-colors"
                      >
                        ویرایش
                      </button>
                    </td>
                  </tr>
                ))}
                {cloudFiles.length === 0 && !isCloudLoading && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#6b7280] text-sm">هیچ فایلی برای نمایش وجود ندارد</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};
