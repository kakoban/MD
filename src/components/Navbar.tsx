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
  CheckCircle2,
  ChevronDown,
  Sparkles,
  HelpCircle,
  FileDown,
  Presentation,
  BookOpen,
  CloudUpload,
  Database,
  RefreshCw,
  User,
  LogOut,
  FolderOpen,
  Edit3,
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

  return (
    <header className="no-print relative z-30 flex items-center justify-between px-3 md:px-4 py-2 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] select-none">
      {/* Title Input & Save / Cloud Status Indicator */}
      <div className="flex items-center gap-2 max-w-sm md:max-w-md lg:max-w-lg flex-1">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="عنوان سند..."
          className="font-bold text-sm bg-transparent border-b border-transparent hover:border-[var(--border-color)] focus:border-amber-500 focus:outline-none px-1.5 py-0.5 text-[var(--text-primary)] truncate flex-1 min-w-[100px] transition-colors"
        />

        {/* Cloud Sync Status Pill with Auto-Save */}
        {isCloudShared ? (
          <div className="flex items-center gap-1.5 shrink-0">
            {cloudSyncStatus === 'saving' && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[10px] font-medium"
                title="در حال ارسال و ذخیره خودکار تغییرات در پایگاه داده ابری Neon..."
              >
                <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
                <span className="hidden xs:inline">در حال ذخیره در ابر...</span>
              </div>
            )}

            {cloudSyncStatus === 'pending' && (
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-medium"
                title="تغییرات شما به صورت خودکار در پایگاه داده Neon ذخیره خواهد شد (پس از توقف تایپ)."
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span className="hidden xs:inline">در انتظار ذخیره خودکار...</span>
                <span className="xs:hidden">...</span>
              </div>
            )}

            {cloudSyncStatus === 'synced' && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-medium"
                title="تمام تغییرات به صورت خودکار در پایگاه داده Neon ذخیره شده‌اند."
              >
                <Database className="w-3 h-3 text-emerald-400" />
                <span className="hidden sm:inline">ذخیره خودکار در ابر</span>
                <span className="sm:hidden">همگام</span>
              </div>
            )}

            {cloudSyncStatus === 'error' && (
              <button
                type="button"
                onClick={onManualSyncCloud}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-[10px] font-bold transition-all shadow-xs"
                title="خطا در ذخیره خودکار ابری. برای تلاش مجدد کلیک کنید."
              >
                <RefreshCw className="w-3 h-3 text-rose-400" />
                <span>خطا در ذخیره (تلاش مجدد)</span>
              </button>
            )}

            {/* Quick Copy Link Pill */}
            {onCopyShareLink && (
              <button
                type="button"
                onClick={onCopyShareLink}
                className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-emerald-400 transition-colors"
                title="کپی لینک اختصاصی اشتراک این سند"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          /* Not yet in cloud: quick publish button */
          onOpenShareModal && (
            <button
              type="button"
              onClick={onOpenShareModal}
              className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 text-[10px] font-bold transition-colors shrink-0"
              title="اشتراک و انتشار این سند در پایگاه داده Neon"
            >
              <CloudUpload className="w-3 h-3" />
              <span>+ اشتراک ابری</span>
            </button>
          )
        )}
      </div>

      {/* Center: View Mode Switcher (Split, Editor, Preview) */}
      <div className="flex items-center bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-1 gap-1">
        <button
          type="button"
          onClick={() => onViewModeChange('split')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
            viewMode === 'split' ? 'bg-[var(--bg-secondary)] text-amber-500 font-semibold shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
          title="نمایش دو ستونه (ویرایش و پیش‌نمایش همزمان)"
        >
          <Columns2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">دو ستونه</span>
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange('editor')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
            viewMode === 'editor' ? 'bg-[var(--bg-secondary)] text-amber-500 font-semibold shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
          title="فقط ویرایشگر"
        >
          <FileEdit className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ویرایش</span>
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange('preview')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
            viewMode === 'preview' ? 'bg-[var(--bg-secondary)] text-amber-500 font-semibold shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
          title="حالت مطالعه و خواندن (بدون حواس‌پرتی)"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">مطالعه</span>
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange('presentation')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
            viewMode === 'presentation'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md ring-2 ring-amber-400/50'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
          title="حالت پرزنتیشن و اسلاید تدریس مدرس (کلید میانبر F5)"
        >
          <Presentation className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ارائه / اسلاید</span>
          <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-500 font-bold border border-amber-500/30">
            PRO
          </span>
        </button>
      </div>

      {/* Right Controls: Export, Search, Outline, Theme, Direction */}
      <div className="flex items-center gap-1 md:gap-1.5">
        {/* Search button */}
        <button
          type="button"
          onClick={onToggleSearch}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          title="جستجو و جایگزینی در متن (Ctrl+F)"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Outline / TOC Toggle */}
        <button
          type="button"
          onClick={onToggleOutline}
          className={`p-1.5 rounded-lg transition-colors ${
            isOutlineOpen ? 'bg-amber-500/10 text-amber-500' : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
          title="فهرست مطالب سرفصل‌ها"
        >
          <ListTree className="w-4 h-4" />
        </button>

        {/* Direction Toggle */}
        <button
          type="button"
          onClick={() => {
            const next = direction === 'rtl' ? 'ltr' : direction === 'ltr' ? 'auto' : 'rtl';
            onDirectionChange(next);
          }}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xs font-mono"
          title={`جهت متن: ${direction.toUpperCase()}`}
        >
          {direction === 'rtl' ? <AlignRight className="w-4 h-4 text-amber-500" /> : <AlignLeft className="w-4 h-4 text-sky-500" />}
        </button>

        {/* Font Family Menu */}
        <div className="relative" ref={fontMenuRef}>
          <button
            type="button"
            onClick={() => setShowFontMenu(!showFontMenu)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="انتخاب فونت"
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
                  className={`w-full text-start px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
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
            className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="تغییر تم رنگی"
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
                  className={`w-full text-start px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 ${
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

        {/* Templates Button */}
        {onOpenTemplates && (
          <button
            type="button"
            onClick={onOpenTemplates}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-semibold transition-all shadow-xs"
            title="الگوهای آماده اسناد (Templates)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden md:inline">الگوها</span>
          </button>
        )}

        {/* Cloud Community Hub */}
        {onOpenCommunity && (
          <button
            type="button"
            onClick={onOpenCommunity}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/25 text-xs font-semibold transition-all shadow-xs"
            title="مشاهده مخزن ابری فایل‌های مارک‌دان (Neon PostgreSQL)"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">مخزن ابری</span>
            {cloudFilesCount !== undefined && cloudFilesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-neutral-950 font-bold text-[10px]">
                {cloudFilesCount}
              </span>
            )}
          </button>
        )}

        {/* Cloud Share Button */}
        {onOpenShareModal && (
          <button
            type="button"
            onClick={onOpenShareModal}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-neutral-950 text-xs font-bold transition-all shadow-xs"
            title="اشتراک‌گذاری این سند در پایگاه داده ابری Neon"
          >
            <CloudUpload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">اشتراک ابری</span>
          </button>
        )}

        {/* Export / Share Menu */}
        <div className="relative" ref={exportMenuRef}>
          <button
            type="button"
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-medium transition-colors"
            title="خروجی و دانلود"
          >
            <FileDown className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">خروجی</span>
            <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
          </button>

          {showExportMenu && (
            <div className="absolute top-full end-0 mt-1 w-52 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl p-1.5 z-40 space-y-1 text-xs">
              {onOpenShareModal && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenShareModal();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-medium transition-colors border border-emerald-500/25"
                >
                  <CloudUpload className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-400">اشتراک در پایگاه داده</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500 text-neutral-950 font-bold">
                        NEON
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      تولید لینک و انتشار در مخزن
                    </div>
                  </div>
                </button>
              )}

              {onOpenBookletModal && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenBookletModal();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[var(--text-primary)] font-medium transition-colors border border-amber-500/25"
                >
                  <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-500">کتابچه رسمی (PDF Pro)</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500 text-neutral-950 font-bold">
                        PRO
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      همراه با صفحه جلد، واترمارک و سربرگ
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
                className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
              >
                <Download className="w-4 h-4 text-amber-500" />
                <span>دانلود فایل .md (مارک‌دان)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onExportHtml();
                  setShowExportMenu(false);
                }}
                className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
              >
                <Download className="w-4 h-4 text-sky-500" />
                <span>دانلود به عنوان وبسایت .html</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onPrint();
                  setShowExportMenu(false);
                }}
                className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
              >
                <Printer className="w-4 h-4 text-emerald-500" />
                <span>چاپ یا ذخیره به صورت PDF</span>
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
                className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
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
                className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
              >
                {copiedAction === 'html' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-[var(--text-muted)]" />}
                <span>کپی کد خروجی HTML</span>
              </button>
            </div>
          )}
        </div>

        {/* User Account / Auth Button & Menu */}
        <div className="relative" ref={userMenuRef}>
          {currentUser ? (
            <div>
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 ps-1.5 pe-2.5 py-1 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] transition-all cursor-pointer shadow-xs"
                title="مشاهده حساب کاربری"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-500 flex items-center justify-center font-bold text-[10px]">
                  {currentUser.displayName ? currentUser.displayName.slice(0, 1).toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)] max-w-[90px] truncate hidden md:inline">
                  {currentUser.displayName}
                </span>
                <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
              </button>

              {showUserMenu && (
                <div className="absolute top-full end-0 mt-1.5 w-56 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl p-2 z-50 space-y-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                  {/* User info banner */}
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
                          title="ویرایش نام انتخابی و آیدی"
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
                      <FolderOpen className="w-4 h-4 text-amber-500" />
                      <span>اسناد ابری من</span>
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
                      <User className="w-4 h-4 text-sky-400" />
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
                      <LogOut className="w-4 h-4" />
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs transition-all shadow-xs cursor-pointer"
                title="ورود به حساب کاربری یا عضویت جدید"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">اتورایز و ورود</span>
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
};
