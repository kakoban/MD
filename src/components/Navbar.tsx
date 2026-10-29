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
  LayoutDashboard,
  Type,
  ChevronDown,
  FileDown,
  Presentation,
  BookOpen,
  User,
  LogOut,
  FolderOpen,
  Folder,
  ArrowLeft,
  ArrowRight,
  Link as LinkIcon,
  MessageSquare,
  RefreshCw,
  Compass,
  Menu,
  MoreVertical,
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
  onToggleComments?: () => void;
  commentsCount?: number;
  folderPath?: string;
  onUpdateFolder?: (newFolder: string) => void;
  onSyncLocalDisk?: (forcePickNew?: boolean) => void;
  linkedLocalFolder?: string | null;
  isSyncingLocal?: boolean;
  onOpenTopology?: () => void;
  isAiBrain?: boolean;
  onToggleAiBrain?: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
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
  onToggleComments,
  commentsCount = 0,
  folderPath,
  onUpdateFolder,
  onSyncLocalDisk,
  linkedLocalFolder,
  isSyncingLocal = false,
  onOpenTopology,
  isAiBrain = false,
  onToggleAiBrain,
  onToggleSidebar,
  isSidebarOpen,
}: NavbarProps) => {
  const { language, setLanguage, t } = useLanguage();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const fontMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
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
    <header className="no-print relative z-30 flex items-center justify-between px-2 sm:px-4 h-14 bg-white border-b border-[#e5e5e5] text-[#1a1a1a] select-none shrink-0 w-full gap-1.5 sm:gap-2">
      {/* Left Section: Mobile Menu, Back to Dashboard, Title, Cloud Status */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-1 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg hover:bg-[#f7f7f8] text-[#374151] md:hidden cursor-pointer shrink-0"
            title="سایدبار و سرفصل‌ها"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => onViewModeChange('workspace')}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#0061FF] hover:bg-[#0050d4] text-white font-bold text-xs transition-all shrink-0 shadow-xs cursor-pointer"
          title="بازگشت به صفحه اصلی و داشبورد اسناد"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 rtl:rotate-180" />
          <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">داشبورد اسناد</span>
        </button>

        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={t('navbar.docTitlePlaceholder')}
          className="font-semibold text-xs sm:text-sm bg-transparent border border-transparent hover:border-[#e5e5e5] focus:border-[#0061FF] focus:outline-none px-1.5 sm:px-2 py-1 rounded-md text-[#1a1a1a] truncate min-w-0 max-w-[100px] xs:max-w-[140px] sm:max-w-[200px] lg:max-w-[300px] transition-colors"
        />

        <button
          type="button"
          onClick={() => {
            const promptVal = prompt('تغییر یا انتساب پوشه / سرفصل این سند:', folderPath || 'عمومی');
            if (promptVal !== null) {
              onUpdateFolder?.(promptVal.trim());
            }
          }}
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#374151] border border-[#d1d5db] transition-colors cursor-pointer shrink-0"
          title="کلیک برای تغییر پوشه، دوره یا سرفصل این سند"
        >
          <Folder className="w-3.5 h-3.5 text-amber-500" />
          <span className="truncate max-w-[120px]">{folderPath || 'عمومی'}</span>
        </button>

        {currentUser && onToggleAiBrain && (
          <button
            type="button"
            onClick={onToggleAiBrain}
            className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
              isAiBrain
                ? 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/40 shadow-xs'
                : 'bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#6b7280] border-[#d1d5db]'
            }`}
            title={
              isAiBrain
                ? 'این سند در مغز هوش مصنوعی ثبت است (کلیک برای خروج)'
                : 'افزودن این سند به مغز هوش مصنوعی (AI Brain) برای اتصال به Claude و MCP'
            }
          >
            <span>🧠</span>
            <span className="font-bold">
              {isAiBrain ? 'مغز هوش مصنوعی' : 'ثبت در مغز AI'}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(`![[${title}]]`);
            setCopiedAction('embed_quick');
            setTimeout(() => setCopiedAction(null), 2000);
          }}
          className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#374151] border border-[#d1d5db] transition-colors cursor-pointer shrink-0 font-mono"
          title={`کپی تگ جاسازی زنده (Embed): ![[${title}]]`}
        >
          {copiedAction === 'embed_quick' ? (
            <Check className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <LinkIcon className="w-3.5 h-3.5 text-[#0061FF]" />
          )}
          <span className="text-[11px] font-bold">
            {copiedAction === 'embed_quick' ? 'کپی شد!' : '![[...]]'}
          </span>
        </button>

        {onSyncLocalDisk && (
          <button
            type="button"
            onClick={() => onSyncLocalDisk(false)}
            disabled={isSyncingLocal}
            className={`hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
              linkedLocalFolder
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                : 'bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#4b5563] border-[#d1d5db]'
            }`}
            title={
              linkedLocalFolder
                ? `بروزرسانی مستقیم تغییرات از پوشه «${linkedLocalFolder}» کامپیوتر شما`
                : 'اتصال به پوشه لوکال کامپیوتر جهت بروزرسانی با ۱ کلیک'
            }
          >
            <RefreshCw className={`w-3 h-3 ${isSyncingLocal ? 'animate-spin text-emerald-600' : linkedLocalFolder ? 'text-emerald-600' : ''}`} />
            <span>
              {linkedLocalFolder ? `بروزرسانی از دیسک (${linkedLocalFolder})` : 'بروزرسانی از کامپیوتر'}
            </span>
          </button>
        )}

        {isCloudShared && (
          <div className="flex items-center shrink-0 ms-1" title={`وضعیت همگام‌سازی: ${cloudSyncStatus}`}>
            {cloudSyncStatus === 'synced' && <div className="w-2 h-2 rounded-full bg-green-500" />}
            {cloudSyncStatus === 'pending' && <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />}
            {cloudSyncStatus === 'saving' && <div className="w-2 h-2 rounded-full bg-[#0061FF] animate-bounce" />}
            {cloudSyncStatus === 'error' && (
              <button onClick={onManualSyncCloud} className="w-2 h-2 rounded-full bg-red-500" title="خطا در ذخیره. تلاش مجدد" />
            )}
          </div>
        )}
      </div>

      {/* Center Section: View Modes on Desktop */}
      <div className="flex items-center bg-[#f7f7f8] border border-[#e5e5e5] rounded-lg p-0.5 gap-0.5 shrink-0 hidden md:flex">
        <button
          type="button"
          onClick={() => onViewModeChange('workspace')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-[#4b5563] hover:text-[#0061FF] hover:bg-white transition-colors cursor-pointer"
          title="بازگشت به داشبورد اسناد"
        >
          <LayoutDashboard className="w-4 h-4 text-[#0061FF]" />
          <span>داشبورد</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('split')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            viewMode === 'split' ? 'bg-[#0061FF] text-white shadow-sm' : 'text-[#6b7280] hover:text-[#1a1a1a] hover:bg-white'
          }`}
        >
          <Columns2 className="w-4 h-4" />
          <span className="hidden lg:inline">{t('navbar.split')}</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('editor')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            viewMode === 'editor' ? 'bg-[#0061FF] text-white shadow-sm' : 'text-[#6b7280] hover:text-[#1a1a1a] hover:bg-white'
          }`}
        >
          <FileEdit className="w-4 h-4" />
          <span className="hidden lg:inline">{t('navbar.editor')}</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('preview')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            viewMode === 'preview' ? 'bg-[#0061FF] text-white shadow-sm' : 'text-[#6b7280] hover:text-[#1a1a1a] hover:bg-white'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span className="hidden lg:inline">{t('navbar.preview')}</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('presentation')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            viewMode === 'presentation' ? 'bg-[#0061FF] text-white shadow-sm' : 'text-[#6b7280] hover:text-[#1a1a1a] hover:bg-white'
          }`}
        >
          <Presentation className="w-4 h-4" />
          <span className="hidden lg:inline">{t('navbar.presentation')}</span>
        </button>
      </div>

      {/* Center Section: Compact Toggle on Mobile Screen */}
      <div className="flex md:hidden items-center bg-[#f7f7f8] border border-[#e5e5e5] rounded-lg p-0.5 gap-0.5 shrink-0">
        <button
          type="button"
          onClick={() => onViewModeChange('editor')}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            viewMode === 'editor' ? 'bg-[#0061FF] text-white shadow-xs' : 'text-[#6b7280] hover:text-[#1a1a1a]'
          }`}
          title="حالت ویرایشگر"
        >
          <FileEdit className="w-3.5 h-3.5" />
          <span>ویرایش</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('preview')}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            viewMode === 'preview' || viewMode === 'split' ? 'bg-[#0061FF] text-white shadow-xs' : 'text-[#6b7280] hover:text-[#1a1a1a]'
          }`}
          title="حالت مطالعه و پیش‌نمایش"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>نمایش</span>
        </button>
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 justify-end">
        <button
          type="button"
          onClick={onToggleSearch}
          className="p-1.5 sm:p-2 rounded-lg hover:bg-[#f7f7f8] text-[#6b7280] hover:text-[#1a1a1a] transition-colors cursor-pointer"
          title="جستجو"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleOutline}
          className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer ${
            isOutlineOpen ? 'bg-[#f7f7f8] text-[#1a1a1a]' : 'hover:bg-[#f7f7f8] text-[#6b7280] hover:text-[#1a1a1a]'
          }`}
          title="فهرست مطالب"
        >
          <ListTree className="w-4 h-4" />
        </button>

        {onOpenTopology && (
          <button
            type="button"
            onClick={onOpenTopology}
            className="p-2 rounded-lg hover:bg-[#f7f7f8] text-[#0061FF] transition-colors hidden md:block cursor-pointer"
            title="گراف عصبی و اتصالات اسناد (Neural Topology)"
          >
            <Compass className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            const next = direction === 'rtl' ? 'ltr' : direction === 'ltr' ? 'auto' : 'rtl';
            onDirectionChange(next);
          }}
          className="p-2 rounded-lg hover:bg-[#f7f7f8] text-[#6b7280] hover:text-[#1a1a1a] transition-colors hidden sm:block cursor-pointer"
          title="جهت متن"
        >
          {direction === 'rtl' ? <AlignRight className="w-4 h-4" /> : <AlignLeft className="w-4 h-4" />}
        </button>

        {/* Font Menu (Desktop) */}
        <div className="relative hidden sm:block" ref={fontMenuRef}>
          <button
            type="button"
            onClick={() => setShowFontMenu(!showFontMenu)}
            className="p-2 rounded-lg hover:bg-[#f7f7f8] text-[#6b7280] hover:text-[#1a1a1a] transition-colors cursor-pointer"
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
                  className={`w-full text-start px-3 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
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

        {/* Theme Menu (Desktop) */}
        <div className="relative hidden sm:block" ref={themeMenuRef}>
          <button
            type="button"
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="p-2 rounded-lg hover:bg-[#f7f7f8] text-[#6b7280] hover:text-[#1a1a1a] transition-colors cursor-pointer"
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
                  className={`w-full text-start px-3 py-2 text-xs transition-colors flex items-center gap-2 cursor-pointer ${
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

        <div className="w-[1px] h-6 bg-[#e5e5e5] mx-0.5 hidden sm:block" />

        {/* Export Menu (Desktop) */}
        <div className="relative hidden sm:block" ref={exportMenuRef}>
          <button
            type="button"
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="p-2 rounded-lg hover:bg-[#f7f7f8] text-[#6b7280] hover:text-[#1a1a1a] transition-colors cursor-pointer"
            title="خروجی"
          >
            <FileDown className="w-4 h-4" />
          </button>
          {showExportMenu && (
            <div className="absolute top-full end-0 mt-2 w-56 rounded-lg bg-white border border-[#e5e5e5] shadow-lg py-1 z-40">
              {onOpenBookletModal && (
                 <button
                   onClick={() => { onOpenBookletModal(); setShowExportMenu(false); }}
                   className="w-full text-start flex items-center gap-2 px-3 py-2 hover:bg-[#f7f7f8] text-[#1a1a1a] text-xs transition-colors cursor-pointer"
                 >
                   <BookOpen className="w-4 h-4 text-[#6b7280]" />
                   <span>کتابچه (PDF Pro)</span>
                 </button>
              )}
              <button
                onClick={() => { onExportMarkdown(); setShowExportMenu(false); }}
                className="w-full text-start flex items-center gap-2 px-3 py-2 hover:bg-[#f7f7f8] text-[#1a1a1a] text-xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#6b7280]" />
                <span>دانلود فایل .md</span>
              </button>
              <button
                onClick={() => { onExportHtml(); setShowExportMenu(false); }}
                className="w-full text-start flex items-center gap-2 px-3 py-2 hover:bg-[#f7f7f8] text-[#1a1a1a] text-xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#6b7280]" />
                <span>دانلود سایت .html</span>
              </button>
              <button
                onClick={() => { onPrint(); setShowExportMenu(false); }}
                className="w-full text-start flex items-center gap-2 px-3 py-2 hover:bg-[#f7f7f8] text-[#1a1a1a] text-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#6b7280]" />
                <span>چاپ / PDF</span>
              </button>
              <div className="border-t border-[#e5e5e5] my-1" />
              <button
                onClick={() => { onCopyMarkdown(); setCopiedAction('md'); setTimeout(() => setCopiedAction(null), 2000); setShowExportMenu(false); }}
                className="w-full text-start flex items-center gap-2 px-3 py-2 hover:bg-[#f7f7f8] text-[#1a1a1a] text-xs transition-colors cursor-pointer"
              >
                {copiedAction === 'md' ? <Check className="w-4 h-4 text-[#0061FF]" /> : <Copy className="w-4 h-4 text-[#6b7280]" />}
                <span>کپی متن خام</span>
              </button>
              <button
                onClick={() => { onCopyHtml(); setCopiedAction('html'); setTimeout(() => setCopiedAction(null), 2000); setShowExportMenu(false); }}
                className="w-full text-start flex items-center gap-2 px-3 py-2 hover:bg-[#f7f7f8] text-[#1a1a1a] text-xs transition-colors cursor-pointer"
              >
                {copiedAction === 'html' ? <Check className="w-4 h-4 text-[#0061FF]" /> : <Copy className="w-4 h-4 text-[#6b7280]" />}
                <span>کپی کد HTML</span>
              </button>
              <div className="border-t border-[#e5e5e5] my-1" />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`![[${title}]]`);
                  setCopiedAction('embed');
                  setTimeout(() => setCopiedAction(null), 2000);
                  setShowExportMenu(false);
                }}
                className="w-full text-start flex items-center gap-2 px-3 py-2 hover:bg-[#f7f7f8] text-[#1a1a1a] text-xs transition-colors font-mono cursor-pointer"
              >
                {copiedAction === 'embed' ? <Check className="w-4 h-4 text-emerald-600" /> : <LinkIcon className="w-4 h-4 text-[#0061FF]" />}
                <span>کپی تگ جاسازی زنده (![[...]])</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`[[${title}]]`);
                  setCopiedAction('wiki');
                  setTimeout(() => setCopiedAction(null), 2000);
                  setShowExportMenu(false);
                }}
                className="w-full text-start flex items-center gap-2 px-3 py-2 hover:bg-[#f7f7f8] text-[#1a1a1a] text-xs transition-colors font-mono cursor-pointer"
              >
                {copiedAction === 'wiki' ? <Check className="w-4 h-4 text-emerald-600" /> : <LinkIcon className="w-4 h-4 text-emerald-600" />}
                <span>کپی پیوند سند ([[...]])</span>
              </button>
            </div>
          )}
        </div>

        {/* Copy Share Link button */}
        {isCloudShared && onCopyShareLink && (
          <button
            type="button"
            onClick={onCopyShareLink}
            className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-colors cursor-pointer shrink-0"
            title="کپی لینک اختصاصی سند"
          >
            <LinkIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">کپی لینک سند</span>
          </button>
        )}

        {/* Document Comments Button */}
        {onToggleComments && (
          <button
            type="button"
            onClick={onToggleComments}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#f7f7f8] hover:bg-[#e5e7eb] text-[#1a1a1a] text-xs font-semibold transition-colors cursor-pointer shrink-0"
            title="مشاهده و ثبت نظرات"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#0061FF]" />
            <span className="hidden md:inline">نظرات</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#0061FF]/10 text-[#0061FF] font-bold text-[10px]">
              {commentsCount}
            </span>
          </button>
        )}

        {/* Share Button (Desktop & Tablet) */}
        {onOpenShareModal && (
          <button
            type="button"
            onClick={onOpenShareModal}
            className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md bg-[#0061FF] hover:bg-[#0050e6] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
            title="انتشار و تنظیم مجوزهای دسترسی سند"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{isCloudShared ? 'اشتراک' : 'انتشار'}</span>
          </button>
        )}

        {/* User Account (Desktop) */}
        <div className="relative hidden sm:block" ref={userMenuRef}>
          {currentUser ? (
            <div>
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 rounded-full bg-[#0061FF]/10 text-[#0061FF] flex items-center justify-center text-xs font-bold border border-[#0061FF]/20 hover:bg-[#0061FF]/20 transition-colors cursor-pointer"
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
                      className="w-full text-start flex items-center gap-2.5 px-4 py-2 hover:bg-[#f7f7f8] text-[#1a1a1a] text-xs transition-colors cursor-pointer"
                    >
                      <FolderOpen className="w-4 h-4 text-[#6b7280]" />
                      <span>اسناد من</span>
                    </button>
                  )}
                  {onOpenProfile && (
                    <button
                      onClick={() => { onOpenProfile(); setShowUserMenu(false); }}
                      className="w-full text-start flex items-center gap-2.5 px-4 py-2 hover:bg-[#f7f7f8] text-[#1a1a1a] text-xs transition-colors cursor-pointer"
                    >
                      <User className="w-4 h-4 text-[#6b7280]" />
                      <span>حساب کاربری</span>
                    </button>
                  )}
                  <div className="border-t border-[#e5e5e5] my-1" />
                  {onLogout && (
                    <button
                      onClick={() => { onLogout(); setShowUserMenu(false); }}
                      className="w-full text-start flex items-center gap-2.5 px-4 py-2 hover:bg-[#f7f7f8] text-red-600 text-xs transition-colors cursor-pointer"
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#f7f7f8] hover:bg-[#e5e5e5] border border-[#e5e5e5] text-[#1a1a1a] text-xs font-semibold transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-[#6b7280]" />
                <span className="hidden sm:inline">ورود</span>
              </button>
            )
          )}
        </div>

        {/* MOBILE OVERFLOW MENU (More Actions) */}
        <div className="relative md:hidden" ref={mobileMenuRef}>
          <button
            type="button"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-1.5 rounded-lg hover:bg-[#f7f7f8] text-[#374151] transition-colors cursor-pointer"
            title="منوی ابزارهای بیشتر"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMobileMenu && (
            <div className="absolute top-full end-0 mt-2 w-64 max-h-[85vh] overflow-y-auto rounded-2xl bg-white border border-[#e5e5e5] shadow-2xl p-2 z-50 text-xs text-[#1a1a1a] divide-y divide-[#f0f0f0] animate-in fade-in zoom-in-95 duration-150">
              {/* Document Quick Actions */}
              <div className="py-1.5 space-y-1">
                {onOpenShareModal && (
                  <button
                    onClick={() => { onOpenShareModal(); setShowMobileMenu(false); }}
                    className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#0061FF]/10 text-[#0061FF] font-bold"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{isCloudShared ? 'تنظیمات اشتراک ابری' : 'انتشار و اشتراک سند'}</span>
                  </button>
                )}

                {onToggleComments && (
                  <button
                    onClick={() => { onToggleComments(); setShowMobileMenu(false); }}
                    className="w-full text-start flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#f7f7f8]"
                  >
                    <div className="flex items-center gap-2.5">
                      <MessageSquare className="w-4 h-4 text-[#0061FF]" />
                      <span>نظرات سند</span>
                    </div>
                    <span className="px-1.5 py-0.2 rounded-full bg-[#0061FF] text-white font-bold text-[10px]">
                      {commentsCount}
                    </span>
                  </button>
                )}

                {currentUser && onToggleAiBrain && (
                  <button
                    onClick={() => { onToggleAiBrain(); setShowMobileMenu(false); }}
                    className="w-full text-start flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#f7f7f8]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span>🧠</span>
                      <span>مغز هوش مصنوعی</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${isAiBrain ? 'bg-fuchsia-500/20 text-fuchsia-700' : 'text-neutral-400'}`}>
                      {isAiBrain ? 'فعال' : 'غیرفعال'}
                    </span>
                  </button>
                )}

                <button
                  onClick={() => {
                    const promptVal = prompt('تغییر سرفصل یا پوشه این سند:', folderPath || 'عمومی');
                    if (promptVal !== null) onUpdateFolder?.(promptVal.trim());
                    setShowMobileMenu(false);
                  }}
                  className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#f7f7f8]"
                >
                  <Folder className="w-4 h-4 text-amber-500" />
                  <span>تغییر پوشه: {folderPath || 'عمومی'}</span>
                </button>
              </div>

              {/* Mode, Theme & Formatting */}
              <div className="py-2 space-y-2">
                <div className="px-3 text-[10px] font-bold text-neutral-400 uppercase">قالب و نمایش</div>

                {/* Theme Selector */}
                <div className="px-3">
                  <label className="text-[11px] text-[#6b7280] block mb-1">تم رنگی:</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {themes.slice(0, 4).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => onThemeChange(t.id)}
                        className={`py-1 text-[10px] rounded-lg border font-medium truncate ${
                          theme === t.id ? 'border-[#0061FF] bg-[#0061FF]/10 text-[#0061FF]' : 'border-neutral-200'
                        }`}
                      >
                        {t.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between px-3 py-1">
                  <span className="text-[11px] text-[#6b7280]">جهت متن:</span>
                  <button
                    onClick={() => {
                      const next = direction === 'rtl' ? 'ltr' : direction === 'ltr' ? 'auto' : 'rtl';
                      onDirectionChange(next);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-[#f7f7f8] text-xs font-semibold"
                  >
                    {direction === 'rtl' ? <AlignRight className="w-3.5 h-3.5" /> : <AlignLeft className="w-3.5 h-3.5" />}
                    <span>{direction === 'rtl' ? 'راست‌به‌چپ' : direction === 'ltr' ? 'چپ‌به‌راست' : 'خودکار'}</span>
                  </button>
                </div>

                <button
                  onClick={() => { onViewModeChange('presentation'); setShowMobileMenu(false); }}
                  className="w-full text-start flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-[#f7f7f8]"
                >
                  <Presentation className="w-4 h-4 text-[#0061FF]" />
                  <span>حالت ارائه و اسلاید</span>
                </button>
              </div>

              {/* Export Tools */}
              <div className="py-1.5 space-y-1">
                <div className="px-3 text-[10px] font-bold text-neutral-400 uppercase">خروجی و چاپ</div>

                {onOpenBookletModal && (
                  <button
                    onClick={() => { onOpenBookletModal(); setShowMobileMenu(false); }}
                    className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#f7f7f8] text-amber-600 font-bold"
                  >
                    <BookOpen className="w-4 h-4 text-amber-500" />
                    <span>چاپ کتابچه رسمی (PDF Pro)</span>
                  </button>
                )}

                <button
                  onClick={() => { onExportMarkdown(); setShowMobileMenu(false); }}
                  className="w-full text-start flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-[#f7f7f8]"
                >
                  <Download className="w-4 h-4 text-neutral-500" />
                  <span>دانلود فایل Markdown</span>
                </button>

                <button
                  onClick={() => { onExportHtml(); setShowMobileMenu(false); }}
                  className="w-full text-start flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-[#f7f7f8]"
                >
                  <Download className="w-4 h-4 text-neutral-500" />
                  <span>دانلود قالب HTML</span>
                </button>

                <button
                  onClick={() => { onPrint(); setShowMobileMenu(false); }}
                  className="w-full text-start flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-[#f7f7f8]"
                >
                  <Printer className="w-4 h-4 text-neutral-500" />
                  <span>چاپ مستقیم (Print)</span>
                </button>
              </div>

              {/* User Account / Auth */}
              <div className="pt-2">
                {currentUser ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1.5 bg-[#f7f7f8] rounded-xl mb-1">
                      <p className="font-bold text-xs truncate">{currentUser.displayName || currentUser.username}</p>
                      <p className="text-[10px] text-neutral-500 font-mono" dir="ltr">@{currentUser.username}</p>
                    </div>
                    {onOpenMyDocuments && (
                      <button
                        onClick={() => { onOpenMyDocuments(); setShowMobileMenu(false); }}
                        className="w-full text-start flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-[#f7f7f8]"
                      >
                        <FolderOpen className="w-4 h-4 text-neutral-500" />
                        <span>اسناد ابری من</span>
                      </button>
                    )}
                    {onOpenProfile && (
                      <button
                        onClick={() => { onOpenProfile(); setShowMobileMenu(false); }}
                        className="w-full text-start flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-[#f7f7f8]"
                      >
                        <User className="w-4 h-4 text-neutral-500" />
                        <span>پروفایل کاربری</span>
                      </button>
                    )}
                    {onLogout && (
                      <button
                        onClick={() => { onLogout(); setShowMobileMenu(false); }}
                        className="w-full text-start flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 font-bold"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>خروج از حساب</span>
                      </button>
                    )}
                  </div>
                ) : (
                  onOpenAuth && (
                    <button
                      onClick={() => { onOpenAuth(); setShowMobileMenu(false); }}
                      className="w-full py-2 rounded-xl bg-[#0061FF] text-white font-bold flex items-center justify-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      <span>ورود / عضویت</span>
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
