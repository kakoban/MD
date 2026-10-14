import React, { useState, useRef, useMemo } from 'react';
import {
  FileText,
  FolderTree,
  Folder,
  FolderOpen,
  FolderUp,
  Star,
  Trash2,
  Search,
  X,
  RotateCcw,
  FolderKanban,
  LayoutDashboard,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Upload,
  User,
  ArrowUpDown,
} from 'lucide-react';
import { MarkdownDoc, UserProfile, DocSortOption } from '../types';
import { SharedMarkdownFile } from '../services/cloudApi';
import { buildDocTree, DocTreeNode, countTreeDocs, getFolderTheme } from '../utils/docTree';

interface SidebarProps {
  documents: MarkdownDoc[];
  activeDocId: string;
  onSelectDoc: (id: string) => void;
  onCreateDoc: () => void;
  onOpenTemplates?: () => void;
  onDeleteDoc: (id: string) => void;
  onDuplicateDoc: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onImportFiles: (files: FileList | File[]) => void;
  onRestoreSamples: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onOpenCloudDoc?: (doc: MarkdownDoc) => void;
  onOpenPublishModal?: () => void;
  currentUser?: UserProfile | null;
  onRequestAccess?: (file: SharedMarkdownFile) => void;
  onOpenAccessRequestsManager?: () => void;
  pendingRequestsCount?: number;
  onBackToWorkspace?: () => void;
  onUpdateDocFolder?: (docId: string, folderPath?: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  documents,
  activeDocId,
  onSelectDoc,
  onCreateDoc,
  onDeleteDoc,
  onToggleFavorite,
  onOpenTemplates,
  onImportFiles,
  onRestoreSamples,
  onUpdateDocFolder,
  isOpen,
  onToggleOpen,
  currentUser,
  pendingRequestsCount = 0,
  onBackToWorkspace,
}) => {
  const [activeNavItem, setActiveNavItem] = useState<'content' | 'spaces' | 'analytics' | 'settings'>('content');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<DocSortOption>('upload-desc');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  const handleFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportFiles(e.target.files);
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const toggleFolderCollapse = (path: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const q = searchQuery.toLowerCase();
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        Boolean(d.folderPath && d.folderPath.toLowerCase().includes(q))
    );
  }, [documents, searchQuery]);

  const docTree = useMemo(() => {
    return buildDocTree(filteredDocs, sortBy);
  }, [filteredDocs, sortBy]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const navItems = [
    {
      id: 'spaces',
      label: 'داشبورد اسناد',
      icon: <LayoutDashboard className="w-5 h-5 text-[#0061FF]" />,
      onClick: () => {
        setActiveNavItem('spaces');
        if (onBackToWorkspace) onBackToWorkspace();
      },
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined
    },
    {
      id: 'content',
      label: 'سرفصل‌ها و اسناد',
      icon: <FolderTree className="w-5 h-5" />,
      onClick: () => {
        setActiveNavItem('content');
        if (!isOpen) onToggleOpen();
      }
    },
    {
      id: 'analytics',
      label: 'آمار',
      icon: <BarChart3 className="w-5 h-5" />,
      onClick: () => setActiveNavItem('analytics')
    },
    {
      id: 'settings',
      label: 'تنظیمات',
      icon: <Settings className="w-5 h-5" />,
      onClick: () => setActiveNavItem('settings')
    }
  ];

  const totalWords = useMemo(() => {
    return documents.reduce((sum, d) => sum + (d.content ? d.content.trim().split(/\s+/).length : 0), 0);
  }, [documents]);

  const renderTreeNode = (node: DocTreeNode, depth: number = 0): React.ReactNode => {
    return (
      <div key={node.fullPath || 'root-level'} className="flex flex-col">
        {node.children.map((child) => {
          const isCollapsed = Boolean(collapsedFolders[child.fullPath]);
          const docCount = countTreeDocs(child);
          const theme = getFolderTheme(child.name);
          return (
            <div key={child.fullPath} className="flex flex-col">
              <button
                type="button"
                onClick={() => toggleFolderCollapse(child.fullPath)}
                style={{ paddingInlineStart: `${Math.max(8, depth * 12 + 6)}px` }}
                className="flex items-center justify-between py-1.5 px-2 text-xs text-[#8b8fa3] hover:text-white hover:bg-white/5 rounded-lg transition-colors group cursor-pointer text-start w-full"
                title={child.fullPath}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 text-gray-400 rtl:rotate-180" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                  )}
                  {isCollapsed ? (
                    <Folder className={`w-3.5 h-3.5 shrink-0 ${theme.icon}`} />
                  ) : (
                    <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${theme.icon}`} />
                  )}
                  <span className="truncate font-semibold text-[11px] text-gray-200">
                    {child.name}
                  </span>
                </div>
                <span className={`text-[10px] ${theme.badge} border px-1.5 py-0.2 rounded-full font-mono shrink-0 ms-1`}>
                  {docCount}
                </span>
              </button>
              {!isCollapsed && renderTreeNode(child, depth + 1)}
            </div>
          );
        })}
        {node.docs.map((doc) => {
          const isActive = activeDocId === doc.id;
          return (
            <div
              key={doc.id}
              style={{ paddingInlineStart: `${Math.max(12, (depth + 1) * 12 + 6)}px` }}
              onClick={() => onSelectDoc(doc.id)}
              className={`group flex items-center justify-between py-1.5 px-2 rounded-lg text-xs cursor-pointer transition-colors ${
                isActive
                  ? 'bg-[#0061FF]/20 text-white font-medium border-e-2 border-[#0061FF]'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
              title={doc.title}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <FileText
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive ? 'text-[#0061FF]' : 'text-gray-400'
                  }`}
                />
                <span className="truncate text-[11px]">{doc.title || 'سند بدون عنوان'}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(doc.id);
                    }}
                    className="p-1 text-gray-400 hover:text-amber-400 transition-colors cursor-pointer"
                    title="نشان‌کردن"
                  >
                    <Star
                      className={`w-3 h-3 ${
                        doc.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                      }`}
                    />
                  </button>
                )}
                {onDeleteDoc && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`سند «${doc.title}» حذف شود؟`)) {
                        onDeleteDoc(doc.id);
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="حذف"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <aside
      className={`relative h-full flex flex-col bg-[#1a1a2e] border-e border-[#2a2a4a] shrink-0 z-30 transition-all duration-200 select-none ${
        isOpen ? 'w-64' : 'w-16'
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

      {/* Hidden folder input */}
      <input
        ref={folderInputRef}
        type="file"
        {...({ webkitdirectory: '', directory: '' } as any)}
        multiple
        onChange={handleFolderInputChange}
        className="hidden"
      />

      {/* 1. Logo Area */}
      <div
        className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors border-b border-[#2a2a4a]/50"
        onClick={() => {
          if (onBackToWorkspace) onBackToWorkspace();
          else onToggleOpen();
        }}
        title="بازگشت به داشبورد اصلی اسناد"
      >
        <div className="flex items-center min-w-0">
          <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-[#0061FF] flex items-center justify-center text-white font-bold shadow-md">
            M
          </div>

          {isOpen && (
            <div className="ms-2.5 flex-1 overflow-hidden">
              <div className="text-white font-bold text-xs truncate">MD Studio</div>
              <div className="text-[#8b8fa3] text-[10px] truncate">داشبورد و سرفصل‌ها</div>
            </div>
          )}
        </div>

        {isOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleOpen();
            }}
            className="text-gray-400 hover:text-white p-1 rounded-md cursor-pointer"
            title="بستن سایدبار"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </button>
        )}
      </div>

      {/* 2. Navigation Items (Compact Header) */}
      <div className="px-2 py-2 border-b border-[#2a2a4a]/50 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = activeNavItem === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              title={!isOpen ? item.label : undefined}
              className={`relative flex items-center w-full transition-colors rounded-lg cursor-pointer ${
                isOpen ? 'px-3 py-2' : 'justify-center py-2.5'
              } ${
                isActive
                  ? 'bg-[#0061FF]/20 text-white font-medium'
                  : 'text-[#8b8fa3] hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex-shrink-0 relative">
                {item.icon}
                {!isOpen && item.badge && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] text-white">
                    {item.badge}
                  </span>
                )}
              </div>

              {isOpen && (
                <div className="ms-2.5 flex items-center justify-between flex-1">
                  <span className="text-xs">{item.label}</span>
                  {item.badge && (
                    <span className="flex h-4 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Middle Area: Educational Tree or Content */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {activeNavItem === 'content' ? (
          isOpen ? (
            <div className="p-3 flex-1 flex flex-col">
              {/* Quick Actions Strip */}
              <div className="flex items-center gap-1.5 mb-3">
                <button
                  type="button"
                  onClick={onCreateDoc}
                  className="flex-1 bg-[#0061FF] hover:bg-[#0052cc] text-white text-[11px] font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors shadow-xs cursor-pointer"
                  title="سند جدید"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>جدید</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="آپلود فایل‌های مارک‌دان"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="p-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 rounded-lg transition-colors border border-amber-500/20 cursor-pointer"
                  title="آپلود پوشه / درخت سرفصل‌های آموزشی"
                >
                  <FolderUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSortBy((curr) =>
                      curr === 'upload-desc'
                        ? 'upload-asc'
                        : curr === 'upload-asc'
                        ? 'title-asc'
                        : 'upload-desc'
                    )
                  }
                  className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title={`مرتب‌سازی سرفصل‌ها: ${
                    sortBy === 'upload-desc'
                      ? 'جدیدترین زمان آپلود'
                      : sortBy === 'upload-asc'
                      ? 'قدیمی‌ترین زمان آپلود'
                      : 'بر اساس نام (الفبا)'
                  }`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#0061FF]" />
                </button>
              </div>

              {/* Search Inside Tree */}
              <div className="relative mb-2.5">
                <Search className="w-3 h-3 text-gray-400 absolute start-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجوی سرفصل و درس..."
                  className="w-full ps-7 pe-6 py-1 rounded-md bg-[#121224] border border-[#2a2a4a] focus:border-[#0061FF] text-[11px] text-gray-200 placeholder-gray-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute end-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              {/* Tree Container */}
              <div className="flex-1 overflow-y-auto space-y-1">
                {filteredDocs.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-xs">
                    {searchQuery ? 'موردی یافت نشد.' : 'سندی وجود ندارد.'}
                  </div>
                ) : (
                  <>
                    {renderTreeNode(docTree, 0)}
                    {docTree.docs.length > 0 && docTree.children.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[#2a2a4a]/40">
                        <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span>سایر اسناد</span>
                        </div>
                        {docTree.docs.map((doc) => {
                          const isActive = activeDocId === doc.id;
                          return (
                            <div
                              key={doc.id}
                              onClick={() => onSelectDoc(doc.id)}
                              className={`group flex items-center justify-between py-1 px-2 rounded-lg text-xs cursor-pointer transition-colors ${
                                isActive
                                  ? 'bg-[#0061FF]/20 text-white font-medium border-e-2 border-[#0061FF]'
                                  : 'text-gray-300 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <FileText className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                <span className="truncate text-[11px]">
                                  {doc.title || 'سند بدون عنوان'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {onToggleFavorite && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleFavorite(doc.id);
                                    }}
                                    className="p-0.5 text-gray-400 hover:text-amber-400 cursor-pointer"
                                  >
                                    <Star
                                      className={`w-3 h-3 ${
                                        doc.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                                      }`}
                                    />
                                  </button>
                                )}
                                {onDeleteDoc && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(`سند «${doc.title}» حذف شود؟`)) {
                                        onDeleteDoc(doc.id);
                                      }
                                    }}
                                    className="p-0.5 text-gray-400 hover:text-rose-400 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="py-3 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onCreateDoc}
                className="w-10 h-10 rounded-xl bg-[#0061FF] text-white flex items-center justify-center hover:bg-[#0052cc] transition-colors cursor-pointer"
                title="سند جدید"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center hover:bg-amber-500/25 transition-colors border border-amber-500/20 cursor-pointer"
                title="آپلود پوشه / سرفصل آموزشی"
              >
                <FolderUp className="w-4 h-4" />
              </button>
            </div>
          )
        ) : activeNavItem === 'analytics' && isOpen ? (
          <div className="p-4 space-y-3 text-xs text-gray-300">
            <div className="font-bold text-white mb-2 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-[#0061FF]" />
              <span>خلاصه آمار محتوا</span>
            </div>
            <div className="p-3 rounded-xl bg-[#121224] border border-[#2a2a4a] space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">تعداد کل اسناد:</span>
                <span className="font-bold text-white font-mono">{documents.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">تعداد کلمات کل:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {totalWords.toLocaleString('fa-IR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">سرفصل‌های آموزشی:</span>
                <span className="font-bold text-amber-400 font-mono">
                  {docTree.children.length}
                </span>
              </div>
            </div>
          </div>
        ) : activeNavItem === 'settings' && isOpen ? (
          <div className="p-4 space-y-3 text-xs">
            <div className="font-bold text-white mb-2 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-[#0061FF]" />
              <span>تنظیمات اسناد</span>
            </div>
            <button
              type="button"
              onClick={onRestoreSamples}
              className="w-full py-2 px-3 rounded-xl bg-[#121224] hover:bg-[#1f1f3a] border border-[#2a2a4a] text-gray-300 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
              <span>بازیابی اسناد و سرفصل‌های نمونه</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* 4. User Section */}
      <div className="border-t border-[#2a2a4a] p-3 flex flex-col gap-2">
        {!isOpen && (
          <button 
            onClick={onToggleOpen}
            className="w-full flex justify-center text-[#8b8fa3] hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors mb-2"
          >
            <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
        )}
        
        {currentUser ? (
          <div className={`flex items-center ${isOpen ? 'justify-start' : 'justify-center'} gap-3`}>
            <div className="w-10 h-10 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              {getInitials(currentUser.username || currentUser.email)}
            </div>
            {isOpen && (
              <div className="flex-1 overflow-hidden">
                <div className="text-white text-sm font-medium truncate">{currentUser.username || 'کاربر'}</div>
                <div className="text-[#8b8fa3] text-xs truncate">{currentUser.email}</div>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            className={`flex items-center justify-center rounded-lg border border-[#2a2a4a] text-[#8b8fa3] hover:text-white hover:bg-white/5 transition-colors ${
              isOpen ? 'w-full py-2 px-3 gap-2' : 'w-10 h-10 p-0'
            }`}
            title="ورود به حساب"
          >
            <User className="w-5 h-5" />
            {isOpen && <span className="text-sm font-medium">ورود</span>}
          </button>
        )}
      </div>
    </aside>
  );
};
