import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Highlighter,
  Code,
  FileCode,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Table as TableIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
  HelpCircle,
  Undo,
  Redo,
  Sparkles,
  Info,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { HighlightColor } from '../types';

interface ToolbarProps {
  onInsertMarkdown: (prefix: string, suffix?: string, defaultText?: string) => void;
  onInsertHighlight: (color: HighlightColor) => void;
  onInsertTable: (rows: number, cols: number) => void;
  onInsertCallout: (type: 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION') => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenCheatsheet: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onInsertMarkdown,
  onInsertHighlight,
  onInsertTable,
  onInsertCallout,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenCheatsheet,
}) => {
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showCalloutMenu, setShowCalloutMenu] = useState(false);
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  const highlightRef = useRef<HTMLDivElement>(null);
  const calloutRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (highlightRef.current && !highlightRef.current.contains(event.target as Node)) {
        setShowHighlightMenu(false);
      }
      if (calloutRef.current && !calloutRef.current.contains(event.target as Node)) {
        setShowCalloutMenu(false);
      }
      if (headingRef.current && !headingRef.current.contains(event.target as Node)) {
        setShowHeadingMenu(false);
      }
      if (tableRef.current && !tableRef.current.contains(event.target as Node)) {
        setShowTableMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const highlightColors: { id: HighlightColor; label: string; bgClass: string; dotClass: string }[] = [
    { id: 'yellow', label: 'زرد (استاندارد)', bgClass: 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-700 dark:text-amber-300', dotClass: 'bg-amber-400' },
    { id: 'green', label: 'سبز (تایید / موفقیت)', bgClass: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300', dotClass: 'bg-emerald-400' },
    { id: 'blue', label: 'آبی (اطلاعاتی)', bgClass: 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-700 dark:text-sky-300', dotClass: 'bg-sky-400' },
    { id: 'pink', label: 'صورتی (نکته ظریف)', bgClass: 'bg-pink-500/20 hover:bg-pink-500/30 text-pink-700 dark:text-pink-300', dotClass: 'bg-pink-400' },
    { id: 'purple', label: 'بنفش (ایده / خلاقیت)', bgClass: 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-700 dark:text-purple-300', dotClass: 'bg-purple-400' },
    { id: 'orange', label: 'نارنجی (هشدار / فوری)', bgClass: 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-700 dark:text-orange-300', dotClass: 'bg-orange-400' },
  ];

  const calloutTypes: { type: 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION'; label: string; icon: string; color: string }[] = [
    { type: 'NOTE', label: 'یادداشت (Note)', icon: 'ℹ️', color: 'text-blue-600 dark:text-blue-400' },
    { type: 'TIP', label: 'ترفند (Tip)', icon: '💡', color: 'text-emerald-600 dark:text-emerald-400' },
    { type: 'IMPORTANT', label: 'مهم (Important)', icon: '📌', color: 'text-purple-600 dark:text-purple-400' },
    { type: 'WARNING', label: 'هشدار (Warning)', icon: '⚠️', color: 'text-amber-600 dark:text-amber-400' },
    { type: 'CAUTION', label: 'احتیاط (Caution)', icon: '🛑', color: 'text-rose-600 dark:text-rose-400' },
  ];

  return (
    <div className="toolbar-container flex flex-wrap items-center gap-1 px-3 py-1.5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] backdrop-blur-sm select-none z-20 text-[var(--text-secondary)] text-xs">
      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5 pe-1.5 border-e border-[var(--border-color)]">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="بازگشت (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="انجام مجدد (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Headings Dropdown */}
      <div className="relative pe-1 border-e border-[var(--border-color)]" ref={headingRef}>
        <button
          type="button"
          onClick={() => setShowHeadingMenu(!showHeadingMenu)}
          className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors font-medium text-[var(--text-primary)]"
          title="عنوان‌ها (Headings)"
        >
          <span>سرفصل</span>
          <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
        </button>
        {showHeadingMenu && (
          <div className="absolute top-full start-0 mt-1 w-44 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl py-1 z-30 divide-y divide-[var(--border-color)]">
            <button
              type="button"
              onClick={() => {
                onInsertMarkdown('# ', '', 'عنوان اصلی');
                setShowHeadingMenu(false);
              }}
              className="w-full text-start px-3 py-2 text-sm font-bold hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] flex items-center justify-between"
            >
              <span>عنوان ۱ (H1)</span>
              <span className="text-[var(--text-muted)] text-xs">#</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onInsertMarkdown('## ', '', 'عنوان فرعی');
                setShowHeadingMenu(false);
              }}
              className="w-full text-start px-3 py-2 text-sm font-semibold hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] flex items-center justify-between"
            >
              <span>عنوان ۲ (H2)</span>
              <span className="text-[var(--text-muted)] text-xs">##</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onInsertMarkdown('### ', '', 'زیرعنوان');
                setShowHeadingMenu(false);
              }}
              className="w-full text-start px-3 py-2 text-xs font-semibold hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] flex items-center justify-between"
            >
              <span>عنوان ۳ (H3)</span>
              <span className="text-[var(--text-muted)] text-xs">###</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onInsertMarkdown('#### ', '', 'تیتر کوچک');
                setShowHeadingMenu(false);
              }}
              className="w-full text-start px-3 py-2 text-xs hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] flex items-center justify-between"
            >
              <span>عنوان ۴ (H4)</span>
              <span className="text-[var(--text-muted)] text-xs">####</span>
            </button>
          </div>
        )}
      </div>

      {/* Basic Text Formatting */}
      <div className="flex items-center gap-0.5 pe-1.5 border-e border-[var(--border-color)]">
        <button
          type="button"
          onClick={() => onInsertMarkdown('**', '**', 'متن پررنگ')}
          className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          title="پررنگ / Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertMarkdown('*', '*', 'متن مورب')}
          className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          title="مورب / Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertMarkdown('~~', '~~', 'متن خط‌خورده')}
          className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          title="خط‌خورده / Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>
      </div>

      {/* HIGHLIGHT TOOL (Key User Feature) */}
      <div className="relative pe-1.5 border-e border-[var(--border-color)]" ref={highlightRef}>
        <div className="flex items-center bg-amber-500/15 rounded-md border border-amber-500/30 overflow-hidden">
          <button
            type="button"
            onClick={() => onInsertHighlight('yellow')}
            className="flex items-center gap-1.5 px-2 py-1 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-medium transition-colors"
            title="هایلایت متن (Ctrl+H)"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-500" />
            <span>هایلایت</span>
          </button>
          <button
            type="button"
            onClick={() => setShowHighlightMenu(!showHighlightMenu)}
            className="px-1 py-1 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-s border-amber-500/20 transition-colors"
            title="انتخاب رنگ هایلایت"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {showHighlightMenu && (
          <div className="absolute top-full start-0 mt-1 w-52 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl p-2 z-30 space-y-1">
            <div className="text-[11px] font-medium text-[var(--text-muted)] px-2 py-1">رنگ هایلایت را انتخاب کنید:</div>
            {highlightColors.map((color) => (
              <button
                key={color.id}
                type="button"
                onClick={() => {
                  onInsertHighlight(color.id);
                  setShowHighlightMenu(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${color.bgClass}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${color.dotClass} shadow-xs`}></span>
                  <span>{color.label}</span>
                </div>
                <span className="font-mono opacity-70 text-[10px]">=={color.id === 'yellow' ? '' : `${color.id}:`}==</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Code Tools */}
      <div className="flex items-center gap-0.5 pe-1.5 border-e border-[var(--border-color)]">
        <button
          type="button"
          onClick={() => onInsertMarkdown('`', '`', 'کد درون‌خطی')}
          className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          title="کد درون خطی / Inline Code"
        >
          <Code className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertMarkdown('```typescript\n', '\n```', '// کد خود را اینجا بنویسید')}
          className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          title="بلوک کد با هایلایت سینتکس"
        >
          <FileCode className="w-4 h-4" />
        </button>
      </div>

      {/* Lists & Checklists */}
      <div className="flex items-center gap-0.5 pe-1.5 border-e border-[var(--border-color)]">
        <button
          type="button"
          onClick={() => onInsertMarkdown('- ', '', 'مورد لیست')}
          className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          title="لیست نشانه‌دار (Bullet List)"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertMarkdown('1. ', '', 'مورد شماره یک')}
          className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          title="لیست شماره‌دار (Numbered List)"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertMarkdown('- [ ] ', '', 'وظیفه جدید')}
          className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] hover:text-emerald-500 transition-colors"
          title="چک‌لیست تعاملی (Task List)"
        >
          <CheckSquare className="w-4 h-4" />
        </button>
      </div>

      {/* Admonitions / Callouts */}
      <div className="relative pe-1 border-e border-[var(--border-color)]" ref={calloutRef}>
        <button
          type="button"
          onClick={() => setShowCalloutMenu(!showCalloutMenu)}
          className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
          title="جعبه‌های اعلان (Callouts)"
        >
          <Info className="w-4 h-4 text-sky-500" />
          <span>اعلان‌ها</span>
          <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
        </button>
        {showCalloutMenu && (
          <div className="absolute top-full start-0 mt-1 w-52 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl p-1.5 z-30 space-y-1">
            {calloutTypes.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => {
                  onInsertCallout(item.type);
                  setShowCalloutMenu(false);
                }}
                className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-xs transition-colors"
              >
                <span>{item.icon}</span>
                <span className={item.color}>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tables Dropdown */}
      <div className="relative pe-1 border-e border-[var(--border-color)]" ref={tableRef}>
        <button
          type="button"
          onClick={() => setShowTableMenu(!showTableMenu)}
          className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
          title="درج جدول"
        >
          <TableIcon className="w-4 h-4 text-amber-500" />
          <span className="font-medium">جدول</span>
        </button>
        {showTableMenu && (
          <div className="absolute top-full start-0 mt-1 w-56 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl p-3 z-30">
            <div className="text-xs font-semibold text-[var(--text-primary)] mb-2">ساخت جدول سفارشی</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-[10px] text-[var(--text-muted)] block mb-1">سطرها:</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2 py-1 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-center text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-muted)] block mb-1">ستون‌ها:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={tableCols}
                  onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2 py-1 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-center text-xs"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onInsertTable(tableRows, tableCols);
                setShowTableMenu(false);
              }}
              className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-neutral-950 font-medium text-xs transition-colors shadow-xs"
            >
              افزودن جدول به متن
            </button>
          </div>
        )}
      </div>

      {/* Math, Quotes, Links, Images */}
      <div className="flex items-center gap-0.5 pe-1.5 border-e border-[var(--border-color)]">
        <button
          type="button"
          onClick={() => onInsertMarkdown('$', '$', 'E = mc^2')}
          className="px-2 py-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-serif italic transition-colors"
          title="فرمول ریاضی KaTeX (درون خطی)"
        >
          $x$
        </button>
        <button
          type="button"
          onClick={() => onInsertMarkdown('$$\n', '\n$$', '\\int_{-\\infty}^{+\\infty} e^{-x^2} dx = \\sqrt{\\pi}')}
          className="px-2 py-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-serif font-bold transition-colors"
          title="فرمول ریاضی KaTeX (بلوکی)"
        >
          $$
        </button>
        <button
          type="button"
          onClick={() => onInsertMarkdown('> ', '', 'متن نقل قول')}
          className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          title="نقل قول (Quote)"
        >
          <Quote className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertMarkdown('[', '](https://example.com)', 'عنوان پیوند')}
          className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          title="درج پیوند (Ctrl+K)"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertMarkdown('![', '](https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800)', 'تصویر نمونه')}
          className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          title="درج تصویر"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertMarkdown('\n---\n')}
          className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          title="خط جداکننده (Divider)"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            const dateStr = now.toLocaleDateString('fa-IR');
            const timeStr = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
            onInsertMarkdown(`*تاریخ: ${dateStr} - ساعت: ${timeStr}*\n`);
          }}
          className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          title="درج زمان و تاریخ امروز"
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>

      {/* Cheatsheet Button */}
      <button
        type="button"
        onClick={onOpenCheatsheet}
        className="ms-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] transition-colors"
        title="راهنمای نشانه‌گذاری مارک‌دان"
      >
        <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
        <span>راهنمای نشانه‌گذاری</span>
      </button>
    </div>
  );
};
