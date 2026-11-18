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
  Sun,
  Moon,
  Palette,
  AlignRight,
  AlignLeft,
  Type,
  ChevronDown,
  Sparkles,
  FileDown,
  Presentation,
  BookOpen,
  RefreshCw,
  User,
  LogOut,
  FolderOpen,
  Edit3,
  Globe,
  LayoutGrid,
  Upload,
  CheckCircle2,
  FileCode,
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
  currentUser?: UserProfile | null;
  onOpenAuth?: () => void;
  onOpenProfile?: () => void;
  onOpenMyDocuments?: () => void;
  onLogout?: () => void;
  isGuestMode?: boolean;
  isDashboardView?: boolean;
  isReadOnlyShared?: boolean;
  onBackToDashboard?: () => void;
  onGuestOpenLocalFile?: () => void;
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
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onOpenMyDocuments,
  onLogout,
  isGuestMode = false,
  isDashboardView = false,
  isReadOnlyShared = false,
  onBackToDashboard,
  onGuestOpenLocalFile,
}) => {
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
    { id: 'light', name: 'روشن', color: 'bg-white border-neutral-300' },
    { id: 'dark', name: 'تاریک', color: 'bg-neutral-900 border-neutral-700' },
    { id: 'editorial', name: 'نشر و رمان', color: 'bg-[#fdf2f8] border-[#db2777]' },
    { id: 'academic', name: 'کتاب و آزمون', color: 'bg-[#e0f2fe] border-[#0284c7]' },
    { id: 'sepia', name: 'سپیا کاغذی', color: 'bg-[#f4ecdc] border-[#ded0b7]' },
    { id: 'nord', name: 'شمالی', color: 'bg-[#2e3440] border-[#434c5e]' },
    { id: 'cyber', name: 'تاریک کنتراست بالا', color: 'bg-[#0a0e14] border-[#00ffcc]' },
  ];

  const fonts: { id: FontFamily; name: string }[] = [
    { id: 'vazir', name: 'وزیرمتن (فارسی)' },
    { id: 'sans', name: 'سنس (Plus Jakarta)' },
    { id: 'serif', name: 'سریف ادبی (Lora)' },
    { id: 'mono', name: 'مونواسپیس (Fira Code)' },
  ];

  const renderUserSection = () => (
    <div className="relative shrink-0" ref={userMenuRef}>
      {currentUser ? (
        <div>
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 ps-1.5 pe-2.5 py-1 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="مشاهده حساب کاربری"
          >
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-500 flex items-center justify-center font-bold text-[10px] shrink-0">
              {currentUser.displayName ? currentUser.displayName.slice(0, 1).toUpperCase() : 'U'}
            </div>
            <span className="text-xs font-semibold text-[var(--text-primary)] max-w-[110px] truncate hidden md:inline">
              {currentUser.displayName}
            </span>
            <ChevronDown className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
          </button>

          {showUserMenu && (
            <div className="absolute top-full end-0 mt-1.5 w-56 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl p-2 z-50 space-y-1 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-[var(--border-color)] mb-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="font-extrabold text-[var(--text-primary)] truncate">{currentUser.displayName}</p>
                  {onOpenProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenProfile();
                        setShowUserMenu(false);
                      }}
                      className="flex items-center gap-1 text-[10px] text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer shrink-0"
                      title="ویرایش نام انتخابی و نام کاربری"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>ویرایش</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 font-mono" dir="ltr">@{currentUser.username}</p>
                {currentUser.email && !currentUser.email.endsWith('@local.user') && (
                  <p className="text-[10px] text-[var(--text-muted)] truncate" dir="ltr">{currentUser.email}</p>
                )}
              </div>

              {onOpenMyDocuments && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenMyDocuments();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>اسناد من</span>
                </button>
              )}

              {onOpenProfile && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenProfile();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>مشخصات حساب</span>
                </button>
              )}

              <div className="border-t border-[var(--border-color)] my-1" />

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-400 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>خروج از حساب</span>
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
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="ورود به حساب کاربری یا ثبت‌نام"
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span>ورود / ثبت‌نام</span>
          </button>
        )
      )}
    </div>
  );

  // GUEST MODE HEADER (Restricted strictly to opening, reading, editing, and saving a local file)
  if (isGuestMode) {
    return (
      <header className="no-print relative z-30 flex items-center justify-between gap-3 px-3 md:px-5 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-neutral-950 shrink-0">
            <FileCode className="w-4 h-4" />
          </div>
          {title ? (
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="نام فایل..."
              className="font-bold text-sm bg-transparent border-b border-transparent hover:border-[var(--border-color)] focus:border-amber-500 focus:outline-none px-1.5 py-0.5 text-[var(--text-primary)] truncate max-w-[220px]"
            />
          ) : (
            <span className="font-bold text-sm whitespace-nowrap">استودیو مارک‌دان</span>
          )}
        </div>

        {/* Center View Mode Switcher (only shown when a local file is open; strictly Read / Edit / Split) */}
        {title && (
          <div className="flex items-center bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-1 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange('preview')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                viewMode === 'preview' ? 'bg-[var(--bg-secondary)] text-amber-500 font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">مطالعه</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('editor')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                viewMode === 'editor' ? 'bg-[var(--bg-secondary)] text-amber-500 font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ویرایش</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('split')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                viewMode === 'split' ? 'bg-[var(--bg-secondary)] text-amber-500 font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">دو ستونه</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {onGuestOpenLocalFile && (
            <button
              type="button"
              onClick={onGuestOpenLocalFile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">باز کردن فایل لوکال</span>
            </button>
          )}

          {title && (
            <button
              type="button"
              onClick={onExportMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              title="ذخیره فایل ویرایش‌شده روی سیستم"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">ذخیره فایل</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title={theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {renderUserSection()}
        </div>
      </header>
    );
  }

  // AUTHENTICATED DASHBOARD HEADER
  if (isDashboardView && currentUser) {
    return (
      <header className="no-print relative z-30 flex items-center justify-between gap-3 px-4 md:px-6 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-neutral-950 shrink-0">
            <FileCode className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-sm whitespace-nowrap">استودیو مارک‌دان</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title={theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
          {renderUserSection()}
        </div>
      </header>
    );
  }

  // READ-ONLY SHARED LINK HEADER
  if (isReadOnlyShared) {
    return (
      <header className="no-print relative z-30 flex items-center justify-between gap-3 px-4 md:px-5 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          {currentUser && onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">داشبورد اسناد</span>
            </button>
          )}
          <span className="font-bold text-sm truncate">{title || 'سند اشتراکی'}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title={theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
          {renderUserSection()}
        </div>
      </header>
    );
  }

  // AUTHENTICATED FULL EDITOR HEADER
  return (
    <header className="no-print relative z-30 flex items-center justify-between gap-2 px-3 md:px-4 py-2 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] select-none">
      {/* Left/Start: Back to Dashboard + Title Input + Sync Indicator */}
      <div className="flex items-center gap-2 max-w-sm md:max-w-md lg:max-w-lg flex-1 min-w-0">
        {onBackToDashboard && (
          <button
            type="button"
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            title="بازگشت به داشبورد اسناد من"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="hidden md:inline">داشبورد</span>
          </button>
        )}

        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="عنوان سند..."
          className="font-bold text-sm bg-transparent border-b border-transparent hover:border-[var(--border-color)] focus:border-amber-500 focus:outline-none px-1.5 py-0.5 text-[var(--text-primary)] truncate flex-1 min-w-[90px] transition-colors"
        />

        {/* Online Save Status */}
        {isCloudShared && (
          <div className="flex items-center gap-1.5 shrink-0">
            {cloudSyncStatus === 'saving' && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/25 text-[10px] font-medium whitespace-nowrap">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span className="hidden sm:inline">در حال ذخیره...</span>
              </div>
            )}

            {cloudSyncStatus === 'pending' && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/25 text-[10px] font-medium whitespace-nowrap">
                <span className="hidden sm:inline">در صف ذخیره...</span>
                <span className="sm:hidden">...</span>
              </div>
            )}

            {cloudSyncStatus === 'synced' && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-emerald-500 text-[10px] font-medium whitespace-nowrap">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span className="hidden sm:inline">ذخیره آنلاین</span>
              </div>
            )}

            {cloudSyncStatus === 'error' && (
              <button
                type="button"
                onClick={onManualSyncCloud}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 border border-rose-500/30 text-[10px] font-bold whitespace-nowrap cursor-pointer"
                title="خطا در ذخیره آنلاین. برای تلاش مجدد کلیک کنید."
              >
                <RefreshCw className="w-3 h-3" />
                <span>تلاش مجدد</span>
              </button>
            )}

            {onCopyShareLink && (
              <button
                type="button"
                onClick={onCopyShareLink}
                className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-emerald-500 transition-colors cursor-pointer"
                title="کپی لینک اشتراک سند"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Center: View Mode Switcher */}
      <div className="flex items-center bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-1 gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onViewModeChange('split')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            viewMode === 'split' ? 'bg-[var(--bg-secondary)] text-amber-500 font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
          title="نمایش دو ستونه"
        >
          <Columns2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">دو ستونه</span>
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange('editor')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            viewMode === 'editor' ? 'bg-[var(--bg-secondary)] text-amber-500 font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
          title="فقط ویرایشگر"
        >
          <FileEdit className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ویرایش</span>
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange('preview')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            viewMode === 'preview' ? 'bg-[var(--bg-secondary)] text-amber-500 font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
          title="حالت مطالعه"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">مطالعه</span>
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange('presentation')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            viewMode === 'presentation'
              ? 'bg-amber-500 text-neutral-950 font-bold'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
          title="حالت ارائه و اسلاید"
        >
          <Presentation className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ارائه / اسلاید</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onToggleSearch}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          title="جستجو و جایگزینی (Ctrl+F)"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleOutline}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isOutlineOpen ? 'bg-amber-500/10 text-amber-500' : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
          title="فهرست سرفصل‌ها"
        >
          <ListTree className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            const next = direction === 'rtl' ? 'ltr' : direction === 'ltr' ? 'auto' : 'rtl';
            onDirectionChange(next);
          }}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          title={`جهت متن: ${direction.toUpperCase()}`}
        >
          {direction === 'rtl' ? <AlignRight className="w-4 h-4 text-amber-500" /> : <AlignLeft className="w-4 h-4 text-sky-500" />}
        </button>

        {/* Font Family Menu */}
        <div className="relative" ref={fontMenuRef}>
          <button
            type="button"
            onClick={() => setShowFontMenu(!showFontMenu)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="انتخاب قلم"
          >
            <Type className="w-4 h-4" />
          </button>
          {showFontMenu && (
            <div className="absolute top-full end-0 mt-1 w-44 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl p-1 z-40 space-y-1">
              <div className="px-2 py-1 text-[10px] text-[var(--text-muted)] font-medium">قلم متن</div>
              {fonts.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    onFontFamilyChange(f.id);
                    setShowFontMenu(false);
                  }}
                  className={`w-full text-start px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                    fontFamily === f.id ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 font-semibold' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <span>{f.name}</span>
                  {fontFamily === f.id && <Check className="w-3 h-3 text-amber-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Selector Menu */}
        <div className="relative" ref={themeMenuRef}>
          <button
            type="button"
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="تغییر پوسته"
          >
            <Palette className="w-4 h-4" />
          </button>
          {showThemeMenu && (
            <div className="absolute top-full end-0 mt-1 w-44 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl p-1 z-40 space-y-1">
              <div className="px-2 py-1 text-[10px] text-[var(--text-muted)] font-medium">پوسته برنامه</div>
              {themes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onThemeChange(t.id);
                    setShowThemeMenu(false);
                  }}
                  className={`w-full text-start px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 cursor-pointer ${
                    theme === t.id ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 font-semibold' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full border ${t.color}`} />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Public Explore Button */}
        {onOpenCommunity && (
          <button
            type="button"
            onClick={onOpenCommunity}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            title="مشاهده اسناد منتشرشده در اکسپلور عمومی"
          >
            <Globe className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline">اکسپلور عمومی</span>
            {cloudFilesCount !== undefined && cloudFilesCount > 0 && (
              <span className="tabular-nums text-[11px] text-amber-500 font-bold">
                ({cloudFilesCount})
              </span>
            )}
          </button>
        )}

        {/* Share / Visibility Button */}
        {onOpenShareModal && (
          <button
            type="button"
            onClick={onOpenShareModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            title="تنظیم سطح دسترسی و اشتراک‌گذاری سند"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">اشتراک‌گذاری</span>
          </button>
        )}

        {/* Export Menu */}
        <div className="relative" ref={exportMenuRef}>
          <button
            type="button"
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            title="خروجی و دانلود"
          >
            <FileDown className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">خروجی</span>
            <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
          </button>

          {showExportMenu && (
            <div className="absolute top-full end-0 mt-1 w-52 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl p-1.5 z-40 space-y-1 text-xs">
              {onOpenBookletModal && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenBookletModal();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[var(--text-primary)] font-medium transition-colors border border-amber-500/25 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-amber-500">چاپ جزوه رسمی (PDF)</div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      همراه با صفحه جلد و واترمارک
                    </div>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onExportMarkdown();
                  setShowExportMenu(false);
                }}
                className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-500" />
                <span>دانلود فایل .md</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onExportHtml();
                  setShowExportMenu(false);
                }}
                className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] cursor-pointer"
              >
                <Download className="w-4 h-4 text-sky-500" />
                <span>دانلود فایل .html</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onPrint();
                  setShowExportMenu(false);
                }}
                className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-500" />
                <span>چاپ یا ذخیره PDF</span>
              </button>

              <div className="border-t border-[var(--border-color)] my-1" />

              <button
                type="button"
                onClick={() => {
                  onCopyMarkdown();
                  setCopiedAction('md');
                  setTimeout(() => setCopiedAction(null), 2000);
                  setShowExportMenu(false);
                }}
                className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] cursor-pointer"
              >
                {copiedAction === 'md' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-[var(--text-muted)]" />}
                <span>کپی متن خام مارک‌دان</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onCopyHtml();
                  setCopiedAction('html');
                  setTimeout(() => setCopiedAction(null), 2000);
                  setShowExportMenu(false);
                }}
                className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] cursor-pointer"
              >
                {copiedAction === 'html' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-[var(--text-muted)]" />}
                <span>کپی کد خروجی HTML</span>
              </button>
            </div>
          )}
        </div>

        {renderUserSection()}
      </div>
    </header>
  );
};
