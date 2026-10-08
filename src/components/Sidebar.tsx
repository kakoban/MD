import React, { useState, useRef } from 'react';
import {
  FileText,
  FolderKanban,
  LayoutDashboard,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Upload,
  User
} from 'lucide-react';
import { MarkdownDoc, UserProfile } from '../types';
import { SharedMarkdownFile } from '../services/cloudApi';

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
  onBackToWorkspace?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onCreateDoc,
  onOpenTemplates,
  onImportFiles,
  isOpen,
  onToggleOpen,
  currentUser,
  pendingRequestsCount = 0,
  onBackToWorkspace,
}) => {
  const [activeNavItem, setActiveNavItem] = useState<'content' | 'spaces' | 'analytics' | 'settings'>('content');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      label: 'محتوا و اسناد',
      icon: <FileText className="w-5 h-5" />,
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

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <aside
      className={`relative h-full flex flex-col bg-[#1a1a2e] border-e border-[#2a2a4a] shrink-0 z-30 transition-all duration-200 select-none ${
        isOpen ? 'w-60' : 'w-16'
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

      {/* 1. Logo Area */}
      <div
        className="p-4 flex items-center cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => {
          if (onBackToWorkspace) onBackToWorkspace();
          else onToggleOpen();
        }}
        title="بازگشت به صفحه اصلی / داشبورد"
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0061FF] flex items-center justify-center text-white font-bold shadow-md">
          M
        </div>

        {isOpen && (
          <div className="ms-3 flex-1 overflow-hidden">
            <div className="text-white font-bold text-sm truncate">MD Studio</div>
            <div className="text-[#8b8fa3] text-[10px] truncate">بازگشت به داشبورد</div>
          </div>
        )}
      </div>

      {/* Quick Actions (Moved below logo for better flow, but follows layout spec loosely or directly if requested) */}
      <div className={`px-3 py-4 ${isOpen ? '' : 'flex flex-col items-center'}`}>
        <button
          type="button"
          onClick={onCreateDoc}
          className={`bg-[#0061FF] hover:bg-[#0052cc] text-white rounded-lg flex items-center justify-center transition-colors ${
            isOpen ? 'w-full py-2 px-3 gap-2' : 'w-10 h-10 p-0'
          }`}
          title="سند جدید"
        >
          <Plus className="w-5 h-5" />
          {isOpen && <span className="text-sm font-medium">جدید</span>}
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`mt-2 flex items-center justify-center text-[#8b8fa3] hover:text-white transition-colors ${
            isOpen ? 'w-full py-1.5 gap-2 text-xs' : 'w-10 h-10 p-0'
          }`}
          title="آپلود فایل"
        >
          <Upload className="w-4 h-4" />
          {isOpen && <span>آپلود فایل...</span>}
        </button>
      </div>

      {/* 2. Navigation Items */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = activeNavItem === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                title={!isOpen ? item.label : undefined}
                className={`relative flex items-center w-full transition-colors ${
                  isOpen ? 'px-4 py-2.5' : 'justify-center py-3'
                } ${
                  isActive
                    ? 'bg-[#0061FF]/20 text-white border-e-2 border-[#0061FF]'
                    : 'text-[#8b8fa3] hover:bg-white/5 hover:text-white border-e-2 border-transparent'
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
                  <div className="ms-3 flex items-center justify-between flex-1">
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
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
