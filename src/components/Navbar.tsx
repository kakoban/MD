import { useLanguage } from "../context/LanguageContext";
import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Share2,
  Printer,
  Copy,
  Check,
  Columns2,
  FileEdit,
  Eye,
  Search,
  ListTree,
  Palette,
  AlignRight,
  AlignLeft,
  Type,
  ChevronDown,
  FileDown,
  Presentation,
  BookOpen,
  User,
  LogOut,
  FolderOpen,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { ViewMode, AppTheme, FontFamily, TextDirection, CloudSyncStatus, UserProfile } from '../types';

interface NavbarProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  fontFamily: FontFamily;
  onFontFamilyChange: (font: FontFamily) => void;
  direction: TextDirection;
  onDirectionChange: (dir: TextDirection) => void;
  onExportMarkdown: () => void;
  onExportHtml: () => void;
  onPrint: () => void;
  onOpenBookletModal?: () => void;
  onOpenCommunity?: () => void;
  onOpenShareModal?: () => void;
  onOpenTemplates?: () => void;
  isCloudShared?: boolean;
  cloudSyncStatus?: CloudSyncStatus;
  onManualSyncCloud?: () => void;
  onCopyShareLink?: () => void;
  cloudFilesCount?: number;
  onCopyMarkdown: () => void;
  onCopyHtml: () => void;
  onToggleSearch: () => void;
  onToggleOutline: () => void;
  isOutlineOpen: boolean;
  onOpenCheatsheet: () => void;
  isSaved?: boolean;
  currentUser?: UserProfile | null;
  onOpenAuth?: () => void;
  onOpenProfile?: () => void;
  onOpenMyDocuments?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  title,
  onTitleChange,
  viewMode,
  onViewModeChange,
  theme,
  onThemeChange,
  fontFamily,
  onFontFamilyChange,
  direction,
  onDirectionChange,
  onExportMarkdown,
  onExportHtml,
  onPrint,
  onOpenBookletModal,
  onOpenCommunity,
  onOpenShareModal,
  onOpenTemplates,
  isCloudShared,
  cloudSyncStatus = 'synced',
  onManualSyncCloud,
  onCopyShareLink,
  cloudFilesCount,
  onCopyMarkdown,
  onCopyHtml,
  onToggleSearch,
  onToggleOutline,
  isOutlineOpen,
  onOpenCheatsheet,
  isSaved = true,
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onOpenMyDocuments,
  onLogout,
}: NavbarProps) => {
  const { language, setLanguage, t } = useLanguage();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const fontMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
      if (fontMenuRef.current && !fontMenuRef.current.contains(event.target as Node)) {
        setShowFontMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themes: { id: AppTheme; name: string; color: string }[] = [
    { id: 'dark', name: 'تاریک (Dark)', color: 'bg-neutral-900 border-neutral-700' },
    { id: 'light', name: 'روشن (Clean Light)', color: 'bg-white border-neutral-300' },
    { id: 'editorial', name: 'نشر و رمان (Editorial Rose)', color: 'bg-[#fdf2f8] border-[#db2777]' },
    { id: 'academic', name: 'کتاب و آزمون (Academic Blue)', color: 'bg-[#e0f2fe] border-[#0284c7]' },
    { id: 'sepia', name: 'سپیا کاغذی (Sepia)', color: 'bg-[#f4ecdc] border-[#ded0b7]' },
    { id: 'nord', name: 'شمالی (Nord)', color: 'bg-[#2e3440] border-[#434c5e]' },
    { id: 'cyber', name: 'سایبرپانک (Cyber)', color: 'bg-[#0a0e14] border-[#00ffcc]' },
  ];

  const fonts: { id: FontFamily; name: string }[] = [
    { id: 'vazir', name: 'وزیرمتن (فارسی / مدرن)' },
    { id: 'sans', name: 'سنس (Plus Jakarta)' },
    { id: 'serif', name: 'سریف ادبی (Lora)' },
    { id: 'mono', name: 'مونواسپیس (Fira Code)' },
  ];

  if (viewMode === 'workspace') return null;

  return (
    <header className="no-print relative z-30 flex items-center justify-between px-4 h-14 bg-white border-b border-[#e5e5e5] text-[#1a1a1a] select-none shrink-0 w-full">
      {/* Left Section: Back, Title, Cloud Status */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          type="button"
          onClick={() => onViewModeChange('workspace')}
          className="p-2 rounded-lg hover:bg-[#f7f7f8] text-[#6b7280] hover:text-[#1a1a1a] transition-colors shrink-0"
          title="بازگشت به فضای اسناد"
        >
          {direction === 'rtl' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
        </button>

        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={t('navbar.docTitlePlaceholder')}
          className="font-semibold text-sm bg-transparent border border-transparent hover:border-[#e5e5e5] focus:border-[#0061FF] focus:outline-none px-2 py-1 rounded-md text-[#1a1a1a] truncate min-w-[100px] max-w-[300px] transition-colors"
        />

        {isCloudShared && (
          <div className="flex items-center shrink-0 ms-2" title={`وضعیت همگام‌سازی: ${cloudSyncStatus}`}>
            {cloudSyncStatus === 'synced' && <div className="w-2 h-2 rounded-full bg-green-500" />}
            {cloudSyncStatus === 'pending' && <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />}
            {cloudSyncStatus === 'saving' && <div className="w-2 h-2 rounded-full bg-[#0061FF] animate-bounce" />}
            {cloudSyncStatus === 'error' && (
              <button onClick={onManualSyncCloud} className="w-2 h-2 rounded-full bg-red-500" title="خطا در ذخیره. تلاش مجدد" />
            )}
          </div>
        )}
      </div>

      {/* Center Section: View Modes */}
      <div className="flex items-center bg-[#f7f7f8] border border-[#e5e5e5] rounded-lg p-0.5 gap-0.5 shrink-0 hidden md:flex">
        <button
          type="button"
          onClick={() => onViewModeChange('split')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'split' ? 'bg-[#0061FF] text-white shadow-sm' : 'text-[#6b7280] hover:text-[#1a1a1a] hover:bg-white'
          }`}
        >
          <Columns2 className="w-4 h-4" />
          <span className="hidden lg:inline">{t('navbar.split')}</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('editor')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'editor' ? 'bg-[#0061FF] text-white shadow-sm' : 'text-[#6b7280] hover:text-[#1a1a1a] hover:bg-white'
          }`}
        >
          <FileEdit className="w-4 h-4" />
          <span className="hidden lg:inline">{t('navbar.editor')}</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('preview')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'preview' ? 'bg-[#0061FF] text-white shadow-sm' : 'text-[#6b7280] hover:text-[#1a1a1a] hover:bg-white'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span className="hidden lg:inline">{t('navbar.preview')}</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('presentation')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'presentation' ? 'bg-[#0061FF] text-white shadow-sm' : 'text-[#6b7280] hover:text-[#1a1a1a] hover:bg-white'
          }`}
        >
          <Presentation className="w-4 h-4" />
          <span className="hidden lg:inline">{t('navbar.presentation')}</span>
        </button>
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-1 flex-1 justify-end min-w-0">
        <button
          type="button"
          onClick={onToggleSearch}
          className="p-2 rounded-lg hover:bg-[#f7f7f8] text-[#6b7280] hover:text-[#1a1a1a] transition-colors"
          title="جستجو"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleOutline}
          className={`p-2 rounded-lg transition-colors ${
            isOutlineOpen ? 'bg-[#f7f7f8] text-[#1a1a1a]' : 'hover:bg-[#f7f7f8] text-[#6b7280] hover:text-[#1a1a1a]'
          }`}
          title="فهرست مطالب"
        >
          <ListTree className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            const next = direction === 'rtl' ? 'ltr' : direction === 'ltr' ? 'auto' : 'rtl';
            onDirectionChange(next);
          }}
          className="p-2 rounded-lg hover:bg-[#f7f7f8] text-[#6b7280] hover:text-[#1a1a1a] transition-colors hidden sm:block"
          title="جهت متن"
        >
          {direction === 'rtl' ? <AlignRight className="w-4 h-4" /> : <AlignLeft className="w-4 h-4" />}
        </button>

        {/* Font Menu */}
        <div className="relative hidden sm:block" ref={fontMenuRef}>
          <button
            type="button"
            onClick={() => setShowFontMenu(!showFontMenu)}
            className="p-2 rounded-lg hover:bg-[#f7f7f8] text-[#6b7280] hover:text-[#1a1a1a] transition-colors"
            title="فونت"
          >
            <Type className="w-4 h-4" />
          </button>
          {showFontMenu && (
            <div className="absolute top-full end-0 mt-2 w-48 rounded-lg bg-white border border-[#e5e5e5] shadow-lg py-1 z-40">
              <div className="px-3 py-1.5 text-[10px] text-[#6b7280] font-medium uppercase tracking-wider">فونت متن</div>
              {fonts.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    onFontFamilyChange(f.id);
                    setShowFontMenu(false);
                  }}
                  className={`w-full text-start px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                    fontFamily === f.id ? 'bg-[#f7f7f8] text-[#0061FF] font-medium' : 'text-[#1a1a1a] hover:bg-[#f7f7f8]'
                  }`}
                >
                  <span>{f.name}</span>
                  {fontFamily === f.id && <Check className="w-3.5 h-3.5 text-[#0061FF]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Menu */}
        <div className="relative hidden sm:block" ref={themeMenuRef}>
          <button
            type="button"
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="p-2 rounded-lg hover:bg-[#f7f7f8] text-[#6b7280] hover:text-[#1a1a1a] transition-colors"
            title="تم رنگی"
          >
            <Palette className="w-4 h-4" />
          </button>
          {showThemeMenu && (
            <div className="absolute top-full end-0 mt-2 w-48 rounded-lg bg-white border border-[#e5e5e5] shadow-lg py-1 z-40">
              <div className="px-3 py-1.5 text-[10px] text-[#6b7280] font-medium uppercase tracking-wider">تمپلیت رنگی</div>
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    onThemeChange(t.id);
                    setShowThemeMenu(false);
                  }}
                  className={`w-full text-start px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                    theme === t.id ? 'bg-[#f7f7f8] text-[#0061FF] font-medium' : 'text-[#1a1a1a] hover:bg-[#f7f7f8]'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full border ${t.color}`} />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-[1px] h-6 bg-[#e5e5e5] mx-1 hidden sm:block" />

        {/* Export Menu */}
        <div className="relative" ref={exportMenuRef}>
          <button
            type="button"
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="p-2 rounded-lg hover:bg-[#f7f7f8] text-[#6b7280] hover:text-[#1a1a1a] transition-colors"
            title="خروجی"
          >
            <FileDown className="w-4 h-4" />
          </button>
          {showExportMenu && (
            <div className="absolute top-full end-0 mt-2 w-56 rounded-lg bg-white border border-[#e5e5e5] shadow-lg py-1 z-40">
              {onOpenBookletModal && (
                 <button
                   onClick={() => { onOpenBookletModal(); setShowExportMenu(false); }}
                   className="w-full text-start flex items-center gap-2 px-3 py-2 hover:bg-[#f7f7f8] text-[#1a1a1a] text-xs transition-colors"
                 >
                   <BookOpen className="w-4 h-4 text-[#6b7280]" />
                   <span>کتابچه (PDF Pro)</span>
                 </button>
              )}
              <button
                onClick={() => { onExportMarkdown(); setShowExportMenu(false); }}
                className="w-full text-start flex items-center gap-2 px-3 py-2 hover:bg-[#f7f7f8] text-[#1a1a1a] text-xs transition-colors"
              >
                <Download className="w-4 h-4 text-[#6b7280]" />
                <span>دانلود فایل .md</span>
              </button>
              <button
                onClick={() => { onExportHtml(); setShowExportMenu(false); }}
                className="w-full text-start flex items-center gap-2 px-3 py-2 hover:bg-[#f7f7f8] text-[#1a1a1a] text-xs transition-colors"
              >
                <Download className="w-4 h-4 text-[#6b7280]" />
                <span>دانلود سایت .html</span>
              </button>
              <button
                onClick={() => { onPrint(); setShowExportMenu(false); }}
                className="w-full text-start flex items-center gap-2 px-3 py-2 hover:bg-[#f7f7f8] text-[#1a1a1a] text-xs transition-colors"
              >
                <Printer className="w-4 h-4 text-[#6b7280]" />
                <span>چاپ / PDF</span>
              </button>
              <div className="border-t border-[#e5e5e5] my-1" />
              <button
                onClick={() => { onCopyMarkdown(); setCopiedAction('md'); setTimeout(() => setCopiedAction(null), 2000); setShowExportMenu(false); }}
                className="w-full text-start flex items-center gap-2 px-3 py-2 hover:bg-[#f7f7f8] text-[#1a1a1a] text-xs transition-colors"
              >
                {copiedAction === 'md' ? <Check className="w-4 h-4 text-[#0061FF]" /> : <Copy className="w-4 h-4 text-[#6b7280]" />}
                <span>کپی متن خام</span>
              </button>
              <button
                onClick={() => { onCopyHtml(); setCopiedAction('html'); setTimeout(() => setCopiedAction(null), 2000); setShowExportMenu(false); }}
                className="w-full text-start flex items-center gap-2 px-3 py-2 hover:bg-[#f7f7f8] text-[#1a1a1a] text-xs transition-colors"
              >
                {copiedAction === 'html' ? <Check className="w-4 h-4 text-[#0061FF]" /> : <Copy className="w-4 h-4 text-[#6b7280]" />}
                <span>کپی کد HTML</span>
              </button>
            </div>
          )}
        </div>

        {/* Share Button */}
        {onOpenShareModal && (
          <button
            type="button"
            onClick={onOpenShareModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0061FF] hover:bg-[#0050e6] text-white text-xs font-semibold transition-colors ms-1"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">اشتراک‌گذاری</span>
          </button>
        )}

        {/* User Account */}
        <div className="relative ms-2" ref={userMenuRef}>
          {currentUser ? (
            <div>
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 rounded-full bg-[#0061FF]/10 text-[#0061FF] flex items-center justify-center text-xs font-bold border border-[#0061FF]/20 hover:bg-[#0061FF]/20 transition-colors"
              >
                {currentUser.displayName ? currentUser.displayName.slice(0, 1).toUpperCase() : 'U'}
              </button>

              {showUserMenu && (
                <div className="absolute top-full end-0 mt-2 w-56 rounded-lg bg-white border border-[#e5e5e5] shadow-lg py-1 z-50">
                  <div className="px-4 py-3 border-b border-[#e5e5e5] mb-1 bg-[#f7f7f8]/50">
                    <p className="font-semibold text-sm text-[#1a1a1a] truncate">{currentUser.displayName}</p>
                    <p className="text-xs text-[#6b7280] font-mono mt-0.5" dir="ltr">@{currentUser.username}</p>
                  </div>
                  
                  {onOpenMyDocuments && (
                    <button
                      onClick={() => { onOpenMyDocuments(); setShowUserMenu(false); }}
                      className="w-full text-start flex items-center gap-2.5 px-4 py-2 hover:bg-[#f7f7f8] text-[#1a1a1a] text-xs transition-colors"
                    >
                      <FolderOpen className="w-4 h-4 text-[#6b7280]" />
                      <span>اسناد من</span>
                    </button>
                  )}
                  {onOpenProfile && (
                    <button
                      onClick={() => { onOpenProfile(); setShowUserMenu(false); }}
                      className="w-full text-start flex items-center gap-2.5 px-4 py-2 hover:bg-[#f7f7f8] text-[#1a1a1a] text-xs transition-colors"
                    >
                      <User className="w-4 h-4 text-[#6b7280]" />
                      <span>حساب کاربری</span>
                    </button>
                  )}
                  <div className="border-t border-[#e5e5e5] my-1" />
                  {onLogout && (
                    <button
                      onClick={() => { onLogout(); setShowUserMenu(false); }}
                      className="w-full text-start flex items-center gap-2.5 px-4 py-2 hover:bg-[#f7f7f8] text-red-600 text-xs transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>خروج</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            onOpenAuth && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#f7f7f8] hover:bg-[#e5e5e5] border border-[#e5e5e5] text-[#1a1a1a] text-xs font-semibold transition-colors"
              >
                <User className="w-3.5 h-3.5 text-[#6b7280]" />
                <span className="hidden sm:inline">ورود</span>
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
};
