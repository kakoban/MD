import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FontFamily, HighlightColor } from '../types';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MoveHorizontal,
  Highlighter,
  MessageSquarePlus,
  MessageSquare,
  LayoutDashboard,
  Trash2,
  X,
  Check,
  Sparkles,
  Palette,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { executeCode } from '../utils/codeRunner';
import { escapeHtml } from '../utils/markdownParser';

interface PreviewProps {
  html: string;
  fontFamily: FontFamily;
  direction: 'rtl' | 'ltr';
  onToggleTask: (taskIndex: number) => void;
  onHighlightText?: (selectedText: string, color: HighlightColor) => void;
  onRemoveHighlight?: (highlightedText: string) => void;
  onAddTeacherNote?: (targetText: string, noteText: string) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onToggleComments?: () => void;
  commentsCount?: number;
  onBackToWorkspace?: () => void;
  onNavigateToDoc?: (docTitle: string, heading?: string) => void;
}

const HIGHLIGHT_COLORS: { id: HighlightColor; name: string; bg: string; dot: string; hover: string }[] = [
  { id: 'yellow', name: 'زرد', bg: 'bg-amber-300', dot: 'bg-amber-400', hover: 'hover:ring-amber-400' },
  { id: 'green', name: 'سبز', bg: 'bg-emerald-300', dot: 'bg-emerald-400', hover: 'hover:ring-emerald-400' },
  { id: 'blue', name: 'آبی', bg: 'bg-sky-300', dot: 'bg-sky-400', hover: 'hover:ring-sky-400' },
  { id: 'purple', name: 'بنفش', bg: 'bg-purple-300', dot: 'bg-purple-400', hover: 'hover:ring-purple-400' },
  { id: 'orange', name: 'نارنجی', bg: 'bg-orange-300', dot: 'bg-orange-400', hover: 'hover:ring-orange-400' },
  { id: 'pink', name: 'صورتی', bg: 'bg-pink-300', dot: 'bg-pink-400', hover: 'hover:ring-pink-400' },
];

export const Preview: React.FC<PreviewProps> = ({
  html,
  fontFamily,
  direction,
  onToggleTask,
  onHighlightText,
  onRemoveHighlight,
  onAddTeacherNote,
  scrollRef,
  onToggleComments,
  commentsCount = 0,
  onBackToWorkspace,
  onNavigateToDoc,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = scrollRef || containerRef;

  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [readingProgress, setReadingProgress] = useState<number>(0);
  const [layoutWidth, setLayoutWidth] = useState<'comfortable' | 'wide' | 'full'>('wide');

  // Teacher Highlighter feature states
  const [teacherPenActive, setTeacherPenActive] = useState<boolean>(false);
  const [activePenColor, setActivePenColor] = useState<HighlightColor>('yellow');
  const [showPenColorMenu, setShowPenColorMenu] = useState<boolean>(false);
  const [showNoteModal, setShowNoteModal] = useState<{ targetText: string } | null>(null);
  const [teacherNoteInput, setTeacherNoteInput] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 2800);
  }, []);

  // Track reading scroll progress
  const handleScroll = () => {
    const el = activeRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const totalScroll = scrollHeight - clientHeight;
    if (totalScroll <= 0) {
      setReadingProgress(0);
      return;
    }
    const progress = Math.min(100, Math.max(0, Math.round((scrollTop / totalScroll) * 100)));
    setReadingProgress(progress);
  };

  // Handle text selection in preview pane (strictly quiet unless teacher pen is active)
  const handleMouseUp = useCallback(() => {
    if (!teacherPenActive || !onHighlightText) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    const range = selection.getRangeAt(0);
    const container = activeRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) return;

    onHighlightText(selectedText, activePenColor);
    const colorName = HIGHLIGHT_COLORS.find((c) => c.id === activePenColor)?.name || activePenColor;
    showToast(`متن با رنگ ${colorName} هایلایت شد`);
    selection.removeAllRanges();
  }, [teacherPenActive, activePenColor, onHighlightText, showToast, activeRef]);

  // Wire up interactive task checkboxes, code copy, and click-on-highlight in rendered HTML
  useEffect(() => {
    const el = activeRef.current;
    if (!el) return;

    // 1. Task checkboxes
    const checkboxes = el.querySelectorAll<HTMLInputElement>('input.task-item-checkbox');
    const handleCheckboxClick = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const indexStr = target.getAttribute('data-task-index');
      if (indexStr !== null) {
        onToggleTask(parseInt(indexStr, 10));
      }
    };
    checkboxes.forEach((cb) => cb.addEventListener('change', handleCheckboxClick));

    // 2. Code copy buttons
    const copyBtns = el.querySelectorAll<HTMLButtonElement>('button.code-copy-btn');
    const handleCopyClick = (e: MouseEvent) => {
      const btn = (e.currentTarget || e.target) as HTMLButtonElement;
      const encodedCode = btn.getAttribute('data-code');
      if (encodedCode) {
        const rawCode = decodeURIComponent(encodedCode);
        navigator.clipboard.writeText(rawCode);
        const originalContent = btn.innerHTML;
        btn.innerHTML = `
          <svg class="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span class="text-emerald-400">کپی شد!</span>
        `;
        setTimeout(() => {
          btn.innerHTML = originalContent;
        }, 2000);
      }
    };
    copyBtns.forEach((btn) => btn.addEventListener('click', handleCopyClick));

    // 2.5 Code Runner buttons (HTML, Python, JS)
    const runBtns = el.querySelectorAll<HTMLButtonElement>('button.code-run-btn');
    const handleRunClick = async (e: MouseEvent) => {
      e.stopPropagation();
      const btn = (e.currentTarget || e.target) as HTMLButtonElement;
      const encodedCode = btn.getAttribute('data-run-code');
      const lang = btn.getAttribute('data-run-lang') || '';
      if (!encodedCode || !lang) return;

      const rawCode = decodeURIComponent(encodedCode);
      const container = btn.closest('.code-block-container');
      if (!container) return;

      const outputEl = container.querySelector<HTMLElement>('.code-runner-output');
      if (!outputEl) return;

      outputEl.classList.remove('hidden');
      outputEl.innerHTML = `
        <div class="flex items-center gap-2 text-neutral-400 py-1">
          <svg class="w-4 h-4 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span class="runner-status-text">در حال اجرای کد (${lang})...</span>
        </div>
      `;

      const statusSpan = outputEl.querySelector('.runner-status-text');

      try {
        const result = await executeCode(rawCode, lang, (status) => {
          if (statusSpan) statusSpan.textContent = status;
        });

        if (result.lang === 'html' && result.htmlDoc) {
          outputEl.innerHTML = `
            <div class="flex items-center justify-between mb-2 pb-2 border-b border-neutral-800 text-xs">
              <span class="font-bold text-emerald-400 flex items-center gap-1.5">
                <span>🌐</span>
                <span>پیش‌نمایش زنده خروجی HTML</span>
              </span>
              <button type="button" class="runner-close-btn text-neutral-400 hover:text-white px-2 py-0.5 rounded hover:bg-neutral-800 text-xs cursor-pointer">بستن خروجی ×</button>
            </div>
            <iframe class="runner-html-iframe w-full h-64 bg-white rounded border border-neutral-800" sandbox="allow-scripts"></iframe>
          `;
          const iframe = outputEl.querySelector<HTMLIFrameElement>('.runner-html-iframe');
          if (iframe) iframe.srcdoc = result.htmlDoc;
        } else {
          const isErr = !result.success;
          outputEl.innerHTML = `
            <div class="flex items-center justify-between mb-2 pb-2 border-b border-neutral-800 text-xs">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full ${isErr ? 'bg-rose-500' : 'bg-emerald-400'}"></span>
                <span class="font-bold ${isErr ? 'text-rose-400' : 'text-emerald-400'}">
                  ${isErr ? 'خطا در اجرا' : 'خروجی اجرا'}
                </span>
                <span class="text-[10px] text-neutral-500 font-mono">(${result.executionTimeMs} میلی‌ثانیه)</span>
              </div>
              <button type="button" class="runner-close-btn text-neutral-400 hover:text-white px-2 py-0.5 rounded hover:bg-neutral-800 text-xs cursor-pointer">بستن خروجی ×</button>
            </div>
            <pre class="p-3 rounded bg-neutral-900 border border-neutral-800/80 overflow-x-auto whitespace-pre-wrap leading-relaxed text-xs font-mono ${isErr ? 'text-rose-400' : 'text-emerald-300'}">${escapeHtml(result.error || result.output || '')}</pre>
          `;
        }

        const closeBtn = outputEl.querySelector<HTMLButtonElement>('.runner-close-btn');
        closeBtn?.addEventListener('click', () => {
          outputEl.classList.add('hidden');
          outputEl.innerHTML = '';
        });
      } catch (err: any) {
        outputEl.innerHTML = `
          <div class="flex items-center justify-between mb-2 pb-2 border-b border-neutral-800 text-xs">
            <span class="font-bold text-rose-400">خطای غیرمنتظره</span>
            <button type="button" class="runner-close-btn text-neutral-400 hover:text-white px-2 py-0.5 rounded hover:bg-neutral-800 text-xs cursor-pointer">بستن ×</button>
          </div>
          <pre class="p-3 rounded bg-neutral-900 text-rose-400 overflow-x-auto whitespace-pre-wrap text-xs font-mono leading-relaxed">${escapeHtml(err?.message || String(err))}</pre>
        `;
        const closeBtn = outputEl.querySelector<HTMLButtonElement>('.runner-close-btn');
        closeBtn?.addEventListener('click', () => {
          outputEl.classList.add('hidden');
          outputEl.innerHTML = '';
        });
      }
    };
    runBtns.forEach((btn) => btn.addEventListener('click', handleRunClick));

    // 2.7 Synapse Bi-directional Wiki Links & Transclusion source clicks
    const synapseLinks = el.querySelectorAll<HTMLElement>('.synapse-wiki-link, [data-synapse-target]');
    const handleSynapseClick = (e: MouseEvent) => {
      e.preventDefault();
      const target = (e.currentTarget || e.target) as HTMLElement;
      const title = target.getAttribute('data-synapse-title');
      const heading = target.getAttribute('data-synapse-heading') || undefined;
      const docId = target.getAttribute('data-synapse-target');

      if (title && onNavigateToDoc) {
        onNavigateToDoc(title, heading);
      } else if (docId && onNavigateToDoc) {
        onNavigateToDoc(docId, heading);
      }
    };
    synapseLinks.forEach((link) => link.addEventListener('click', handleSynapseClick));

    return () => {
      checkboxes.forEach((cb) => cb.removeEventListener('change', handleCheckboxClick));
      copyBtns.forEach((btn) => btn.removeEventListener('click', handleCopyClick));
      runBtns.forEach((btn) => btn.removeEventListener('click', handleRunClick));
      synapseLinks.forEach((link) => link.removeEventListener('click', handleSynapseClick));
    };
  }, [html, onToggleTask, activeRef]);

  const fontClass =
    fontFamily === 'mono'
      ? 'font-mono'
      : fontFamily === 'serif'
      ? 'font-serif'
      : fontFamily === 'sans'
      ? 'font-sans'
      : 'font-sans';

  const widthContainerClass =
    layoutWidth === 'full'
      ? 'w-full max-w-full px-2 sm:px-6'
      : layoutWidth === 'wide'
      ? 'max-w-5xl mx-auto'
      : 'max-w-4xl mx-auto';

  return (
    <div className="preview-pane relative flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-primary)]">
      {/* Reading Progress Indicator Bar */}
      <div className="w-full h-1 bg-[var(--border-color)] shrink-0">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-150"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Floating Toolbar: Teacher Pen, Layout Width & Zoom Controls */}
      <div className="absolute top-4 end-5 z-20 flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-md backdrop-blur-md opacity-95 hover:opacity-100 transition-opacity select-none">
        {/* Back to Workspace Dashboard Button */}
        {onBackToWorkspace && (
          <button
            type="button"
            onClick={onBackToWorkspace}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-[#0061FF] text-white hover:bg-[#0052cc] shadow-xs transition-all cursor-pointer"
            title="بازگشت به صفحه اصلی و داشبورد اسناد"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>داشبورد اسناد</span>
          </button>
        )}

        {/* Comments Button */}
        {onToggleComments && (
          <button
            type="button"
            onClick={onToggleComments}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#0061FF]/10 hover:bg-[#0061FF]/20 text-[#0061FF] transition-all cursor-pointer"
            title="مشاهده و ثبت نظرات این سند"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#0061FF]" />
            <span className="hidden sm:inline font-bold">نظرات</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#0061FF] text-white font-black text-[10px]">
              {commentsCount}
            </span>
          </button>
        )}

        {/* TEACHER HIGHLIGHTER PEN BUTTON */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => setTeacherPenActive(!teacherPenActive)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              teacherPenActive
                ? 'bg-amber-500 text-neutral-950 shadow-md ring-2 ring-amber-400/50'
                : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            title={
              teacherPenActive
                ? 'قلم مدرس فعال است (انتخاب هر متن فوراً آن را هایلایت می‌کند)'
                : 'فعال‌سازی قلم هایلایت مدرس'
            }
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">قلم هایلایت مدرس</span>
            <span className="sm:hidden">هایلایتر</span>
            {teacherPenActive && <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />}
          </button>

          {/* Color chooser dot for active pen */}
          {teacherPenActive && (
            <div className="relative ms-1">
              <button
                type="button"
                onClick={() => setShowPenColorMenu(!showPenColorMenu)}
                className="w-5 h-5 rounded-full border border-neutral-400/40 flex items-center justify-center p-0.5 hover:scale-110 transition-transform"
                style={{
                  backgroundColor:
                    activePenColor === 'yellow'
                      ? '#fef08a'
                      : activePenColor === 'green'
                      ? '#bbf7d0'
                      : activePenColor === 'blue'
                      ? '#bae6fd'
                      : activePenColor === 'purple'
                      ? '#e9d5ff'
                      : activePenColor === 'orange'
                      ? '#fed7aa'
                      : '#fbcfe8',
                }}
                title="تغییر رنگ پیش‌فرض قلم مدرس"
              />
              {showPenColorMenu && (
                <div className="absolute top-full end-0 mt-2 p-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl flex items-center gap-1.5 z-30">
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setActivePenColor(c.id);
                        setShowPenColorMenu(false);
                      }}
                      className={`w-5 h-5 rounded-full ${c.dot} hover:scale-125 transition-transform ${
                        activePenColor === c.id ? 'ring-2 ring-offset-1 ring-amber-500' : ''
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-[1px] h-4 bg-[var(--border-color)] mx-0.5" />

        {/* Width Toggle (Medium / Wide / Full) */}
        <button
          type="button"
          onClick={() => {
            setLayoutWidth((current) =>
              current === 'wide' ? 'full' : current === 'full' ? 'comfortable' : 'wide'
            );
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-[11px]"
          title="تغییر عرض صفحه (عریض / تمام‌صفحه / استاندارد)"
        >
          <MoveHorizontal className="w-3.5 h-3.5 text-amber-500" />
          <span>{layoutWidth === 'wide' ? 'عریض' : layoutWidth === 'full' ? 'تمام‌صفحه' : 'متوسط'}</span>
        </button>

        <div className="w-[1px] h-4 bg-[var(--border-color)] mx-0.5" />

        {/* Zoom Controls */}
        <button
          type="button"
          onClick={() => setZoomLevel((z) => Math.max(80, z - 10))}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          title="کاهش اندازه قلم"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-mono text-[var(--text-muted)] px-1 select-none">
          {zoomLevel}%
        </span>
        <button
          type="button"
          onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          title="افزایش اندازه قلم"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        {zoomLevel !== 100 && (
          <button
            type="button"
            onClick={() => setZoomLevel(100)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-amber-500 transition-colors"
            title="بازنشانی اندازه قلم"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 flex overflow-hidden relative">
        <div
          ref={activeRef}
          onScroll={handleScroll}
          onMouseUp={handleMouseUp}
          dir={direction}
          className={`flex-1 overflow-y-auto p-6 md:p-12 lg:p-14 text-[var(--text-primary)] ${fontClass} ${
            teacherPenActive ? 'cursor-text select-text' : ''
          }`}
        >
          <div
            className={`${widthContainerClass} markdown-body transition-all duration-200`}
            style={{ fontSize: `${zoomLevel}%` }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>

      {/* TEACHER NOTE MODAL */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-primary)]">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <MessageSquarePlus className="w-4 h-4" />
                </div>
                <span>افزودن یادداشت یا نکته مدرس</span>
              </div>
              <button
                type="button"
                onClick={() => setShowNoteModal(null)}
                className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-primary)] p-2.5 rounded-xl border border-[var(--border-color)] line-clamp-2">
              <span className="font-semibold text-[var(--text-primary)]">بخش انتخاب‌شده: </span>
              {showNoteModal.targetText}
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                توضیح یا نکته مدرس:
              </label>
              <textarea
                autoFocus
                rows={3}
                value={teacherNoteInput}
                onChange={(e) => setTeacherNoteInput(e.target.value)}
                placeholder="توضیحات و نکات تکمیلی خود را اینجا بنویسید..."
                className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-amber-500 leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNoteModal(null)}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-xs text-[var(--text-muted)]"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  if (teacherNoteInput.trim() && onAddTeacherNote) {
                    onAddTeacherNote(showNoteModal.targetText, teacherNoteInput);
                    setTeacherNoteInput('');
                    setShowNoteModal(null);
                    showToast('یادداشت مدرس به سند اضافه شد!');
                  }
                }}
                disabled={!teacherNoteInput.trim()}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-neutral-950 font-semibold text-xs transition-colors shadow-xs"
              >
                ثبت در سند
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBTLE TOAST CONFIRMATION */}
      {toastMessage && (
        <div className="fixed bottom-6 start-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] shadow-2xl text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
