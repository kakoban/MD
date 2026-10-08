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
  Compass,
  Monitor,
  MousePointerClick,
  FileSpreadsheet,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface WalkthroughStep {
  id: number;
  number: number;
  title: string;
  targetTool: string;
  pathSteps: string[];
  instruction: string;
  file?: string;
}

function parseStepDetails(rawText: string, targetHint = '', stepNumber = 1): WalkthroughStep {
  const text = rawText.trim();
  let targetTool = targetHint;
  if (!targetTool) {
    if (/power\s*bi/i.test(text)) targetTool = 'Power BI Desktop';
    else if (/excel/i.test(text)) targetTool = 'Microsoft Excel';
    else if (/power\s*query/i.test(text)) targetTool = 'Power Query Editor';
    else if (/vscode|vs\s*code/i.test(text)) targetTool = 'VS Code';
    else if (/python/i.test(text)) targetTool = 'Python Environment';
    else if (/terminal|bash|shell/i.test(text)) targetTool = 'Terminal / CLI';
    else targetTool = 'نرم‌افزار / محیط کار';
  }

  const pathMatch = text.match(/([A-Za-z0-9_؀-ۿ\s]+(?:\s*(?:->|➔|→)\s*[A-Za-z0-9_؀-ۿ\s]+)+)/);
  const pathSteps = pathMatch ? pathMatch[0].split(/\s*(?:->|➔|→)\s*/).map((s) => s.trim()).filter(Boolean) : [];

  const fileMatch = text.match(/[\w؀-ۿ-]+\.(xlsx|pbix|csv|json|py|sql|txt|md)\b/i);
  const file = fileMatch ? fileMatch[0] : undefined;

  const title = text.split(/[:\n.]/)[0].trim().slice(0, 60) || `مرحله ${stepNumber}`;

  return {
    id: stepNumber,
    number: stepNumber,
    title,
    targetTool,
    pathSteps,
    instruction: text,
    file,
  };
}

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
}

interface FloatingMenuState {
  x: number;
  y: number;
  text: string;
  isExistingHighlight?: boolean;
  currentColor?: HighlightColor;
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
  const [floatingMenu, setFloatingMenu] = useState<FloatingMenuState | null>(null);
  const [showNoteModal, setShowNoteModal] = useState<{ targetText: string } | null>(null);
  const [teacherNoteInput, setTeacherNoteInput] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Interactive Walkthrough feature states
  const [walkthroughActive, setWalkthroughActive] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<WalkthroughStep | null>(null);
  const [totalStepsCount, setTotalStepsCount] = useState<number>(0);

  const handleAdvanceStep = useCallback(
    (delta: number) => {
      if (!activeStep) return;
      const el = activeRef.current;
      if (!el) return;
      const stepElements = Array.from(
        el.querySelectorAll<HTMLElement>(
          '.walkthrough-step-chip, .walkthrough-file-chip, .markdown-body ol > li'
        )
      );
      const nextIdx = activeStep.number - 1 + delta;
      if (nextIdx >= 0 && nextIdx < stepElements.length) {
        const targetEl = stepElements[nextIdx];
        const chipStep = targetEl.getAttribute('data-walkthrough-step');
        const chipTarget = targetEl.getAttribute('data-walkthrough-target') || '';
        const chipFile = targetEl.getAttribute('data-walkthrough-file');
        const rawText = chipStep || targetEl.innerText.trim();
        const nextData = parseStepDetails(rawText, chipTarget, nextIdx + 1);
        if (chipFile) nextData.file = chipFile;

        stepElements.forEach((s) => s.classList.remove('walkthrough-step-focused'));
        targetEl.classList.add('walkthrough-step-focused');
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

        setActiveStep(nextData);
      }
    },
    [activeStep, activeRef]
  );

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

  // Handle text selection in preview pane
  const handleMouseUp = useCallback(() => {
    // If floating menu is open and user clicked inside it, don't close immediately
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 1) {
      return;
    }

    // Verify selection is inside activeRef
    const range = selection.getRangeAt(0);
    const container = activeRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) {
      return;
    }

    // If Teacher Pen mode is active: automatically highlight with chosen color!
    if (teacherPenActive && onHighlightText) {
      onHighlightText(selectedText, activePenColor);
      const colorName = HIGHLIGHT_COLORS.find((c) => c.id === activePenColor)?.name || activePenColor;
      showToast(`متن با رنگ ${colorName} هایلایت شد`);
      selection.removeAllRanges();
      return;
    }

    // Otherwise, show the floating action bar right at the selection
    const rect = range.getBoundingClientRect();
    const x = Math.max(16, Math.min(window.innerWidth - 320, rect.left + rect.width / 2 - 140));
    const y = rect.top > 65 ? rect.top - 54 : rect.bottom + 8;

    setFloatingMenu({
      x,
      y,
      text: selectedText,
      isExistingHighlight: false,
    });
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

    // 3. Click listener on existing highlight marks (<mark class="md-highlight">)
    const marks = el.querySelectorAll<HTMLElement>('mark.md-highlight');
    const handleMarkClick = (e: MouseEvent) => {
      e.stopPropagation();
      const mark = e.currentTarget as HTMLElement;
      const rawText = mark.getAttribute('data-raw-text') || mark.innerText.trim();
      const currentColor = (mark.getAttribute('data-highlight-color') as HighlightColor) || 'yellow';
      const rect = mark.getBoundingClientRect();
      const x = Math.max(16, Math.min(window.innerWidth - 320, rect.left + rect.width / 2 - 140));
      const y = rect.top > 65 ? rect.top - 54 : rect.bottom + 8;

      setFloatingMenu({
        x,
        y,
        text: rawText,
        isExistingHighlight: true,
        currentColor,
      });
    };
    marks.forEach((m) => m.addEventListener('click', handleMarkClick));

    // 4. Click listener for Walkthrough Steps, chips, and numbered list items
    const stepElements = el.querySelectorAll<HTMLElement>(
      '.walkthrough-step-chip, .walkthrough-file-chip, .markdown-body ol > li'
    );
    setTotalStepsCount(stepElements.length);

    const handleStepElementClick = (e: MouseEvent) => {
      const targetEl = e.currentTarget as HTMLElement;
      if ((e.target as HTMLElement).closest('input, button, a')) return;

      const chipStep = targetEl.getAttribute('data-walkthrough-step');
      const chipTarget = targetEl.getAttribute('data-walkthrough-target') || '';
      const chipFile = targetEl.getAttribute('data-walkthrough-file');
      const rawText = chipStep || targetEl.innerText.trim();

      let stepNum = 1;
      stepElements.forEach((s, idx) => {
        if (s === targetEl) stepNum = idx + 1;
      });

      const stepData = parseStepDetails(rawText, chipTarget, stepNum);
      if (chipFile) stepData.file = chipFile;

      stepElements.forEach((s) => s.classList.remove('walkthrough-step-focused'));
      targetEl.classList.add('walkthrough-step-focused');

      setActiveStep(stepData);
      setWalkthroughActive(true);
    };
    stepElements.forEach((s) => s.addEventListener('click', handleStepElementClick));

    return () => {
      checkboxes.forEach((cb) => cb.removeEventListener('change', handleCheckboxClick));
      copyBtns.forEach((btn) => btn.removeEventListener('click', handleCopyClick));
      marks.forEach((m) => m.removeEventListener('click', handleMarkClick));
      stepElements.forEach((s) => s.removeEventListener('click', handleStepElementClick));
    };
  }, [html, onToggleTask, activeRef]);

  // Clean up focus ring when walkthrough mode is deactivated
  useEffect(() => {
    if (!walkthroughActive) {
      const el = activeRef.current;
      if (el) {
        el.querySelectorAll('.walkthrough-step-focused').forEach((s) =>
          s.classList.remove('walkthrough-step-focused')
        );
      }
    }
  }, [walkthroughActive, activeRef]);

  // Close floating menu when clicking away
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.floating-highlight-menu') || target.closest('mark.md-highlight')) {
        return;
      }
      setFloatingMenu(null);
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  const handleApplyHighlight = (color: HighlightColor) => {
    if (!floatingMenu || !onHighlightText) return;
    onHighlightText(floatingMenu.text, color);
    const colorName = HIGHLIGHT_COLORS.find((c) => c.id === color)?.name || color;
    showToast(`هایلایت با رنگ ${colorName} اعمال شد`);
    setFloatingMenu(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleRemoveHighlight = () => {
    if (!floatingMenu || !onRemoveHighlight) return;
    onRemoveHighlight(floatingMenu.text);
    showToast('هایلایت برداشته شد');
    setFloatingMenu(null);
    window.getSelection()?.removeAllRanges();
  };

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

        {/* INTERACTIVE WALKTHROUGH MODE TOGGLE */}
        <button
          type="button"
          onClick={() => {
            const next = !walkthroughActive;
            setWalkthroughActive(next);
            if (!next) {
              setActiveStep(null);
              showToast('حالت آموزش تعاملی خاموش شد');
            } else {
              showToast('حالت آموزش تعاملی روشن شد. روی مراحل کلیک کنید');
              const el = activeRef.current;
              if (el) {
                const stepElements = el.querySelectorAll<HTMLElement>(
                  '.walkthrough-step-chip, .walkthrough-file-chip, .markdown-body ol > li'
                );
                if (stepElements.length > 0) {
                  const firstEl = stepElements[0];
                  const chipStep = firstEl.getAttribute('data-walkthrough-step');
                  const chipTarget = firstEl.getAttribute('data-walkthrough-target') || '';
                  const chipFile = firstEl.getAttribute('data-walkthrough-file');
                  const rawText = chipStep || firstEl.innerText.trim();
                  const firstData = parseStepDetails(rawText, chipTarget, 1);
                  if (chipFile) firstData.file = chipFile;

                  stepElements.forEach((s) => s.classList.remove('walkthrough-step-focused'));
                  firstEl.classList.add('walkthrough-step-focused');
                  setActiveStep(firstData);
                }
              }
            }
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            walkthroughActive
              ? 'bg-emerald-500 text-neutral-950 font-bold shadow-md ring-2 ring-emerald-400/50'
              : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
          title={
            walkthroughActive
              ? 'آموزش تعاملی روشن است (کلیک برای خاموش کردن)'
              : 'فعال‌سازی حالت آموزش تعاملی گام‌به‌گام'
          }
        >
          <Compass className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden sm:inline font-bold">آموزش تعاملی</span>
          {walkthroughActive && <span className="w-2 h-2 rounded-full bg-neutral-950 animate-pulse" />}
        </button>

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

      {/* Main Preview Container with Side Walkthrough Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        <div
          ref={activeRef}
          onScroll={handleScroll}
          onMouseUp={handleMouseUp}
          dir={direction}
          className={`flex-1 overflow-y-auto p-6 md:p-12 lg:p-14 text-[var(--text-primary)] ${fontClass} ${
            teacherPenActive ? 'cursor-text select-text' : ''
          } ${walkthroughActive ? 'walkthrough-active' : ''}`}
        >
          <div
            className={`${widthContainerClass} markdown-body transition-all duration-200`}
            style={{ fontSize: `${zoomLevel}%` }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>

        {/* Walkthrough Companion Simulator Panel */}
        {walkthroughActive && activeStep && (
          <aside className="w-80 md:w-96 border-s border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col shadow-2xl z-20 select-none animate-in slide-in-from-end duration-200 shrink-0">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      گام {activeStep.number} {totalStepsCount > 0 ? `از ${totalStepsCount}` : ''}
                    </span>
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] truncate max-w-[110px]">
                      {activeStep.targetTool}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-[var(--text-primary)] truncate max-w-[200px] mt-0.5">
                    {activeStep.title}
                  </h4>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveStep(null)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                title="بستن این مرحله"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Target Software & Breadcrumb Card */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 font-semibold text-[var(--text-secondary)]">
                    <Monitor className="w-3.5 h-3.5 text-[#0061FF]" />
                    <span>محیط نرم‌افزار:</span>
                  </span>
                  <span className="font-bold text-[var(--text-primary)]">{activeStep.targetTool}</span>
                </div>

                {activeStep.pathSteps.length > 0 && (
                  <div className="pt-2 border-t border-[var(--border-color)]/60">
                    <span className="text-[10px] text-[var(--text-muted)] block mb-1">مسیر منو / دکمه‌ها:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {activeStep.pathSteps.map((step, idx) => (
                        <React.Fragment key={idx}>
                          <span
                            className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                              idx === activeStep.pathSteps.length - 1
                                ? 'bg-[#0061FF] text-white shadow-xs'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                            }`}
                          >
                            {step}
                          </span>
                          {idx < activeStep.pathSteps.length - 1 && (
                            <ChevronLeft className="w-3 h-3 text-[var(--text-muted)] rtl:rotate-0 rotate-180" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Simulator Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-950 text-white border border-neutral-800 space-y-3 shadow-lg">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-[10px] text-neutral-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="ms-1.5 font-mono text-[9px] text-neutral-300">
                      {activeStep.targetTool}
                    </span>
                  </div>
                  <span>شبیه‌ساز تعاملی کلیک</span>
                </div>

                {/* Simulated Click Target */}
                <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-700/60 text-center space-y-2.5">
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    روی دکمه کلیک کنید تا مرحله در محیط شبیه‌ساز اجرا و تأیید شود:
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      showToast(`✓ گام ${activeStep.number} تأیید شد! حرکت به مرحله بعد...`);
                      handleAdvanceStep(1);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0061FF] hover:bg-[#0052cc] text-white font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer animate-pulse"
                  >
                    <MousePointerClick className="w-4 h-4" />
                    <span>
                      {activeStep.pathSteps[activeStep.pathSteps.length - 1] || activeStep.title}
                    </span>
                  </button>
                </div>
              </div>

              {/* Source/Practice File if referenced */}
              {activeStep.file && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>فایل تمرین / داده سورس:</span>
                  </div>
                  <div className="flex items-center justify-between bg-[var(--bg-secondary)] p-2 rounded-xl border border-emerald-500/20">
                    <span
                      className="font-mono text-[11px] font-bold text-[var(--text-primary)] truncate max-w-[170px]"
                      dir="ltr"
                    >
                      {activeStep.file}
                    </span>
                    <button
                      type="button"
                      onClick={() => showToast(`فایل ${activeStep.file} آماده بارگذاری و استفاده است.`)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>دریافت سورس</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Instruction text */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-1">
                <span className="font-bold text-[10px] text-[var(--text-muted)] block">متن دستورالعمل گام:</span>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  {activeStep.instruction}
                </p>
              </div>
            </div>

            {/* Navigation & Dismiss Footer */}
            <div className="p-3.5 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)]/40 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={activeStep.number <= 1}
                  onClick={() => handleAdvanceStep(-1)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-primary)] disabled:opacity-30 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5 rtl:rotate-0 rotate-180" />
                  <span>گام قبلی</span>
                </button>

                <button
                  type="button"
                  disabled={totalStepsCount > 0 && activeStep.number >= totalStepsCount}
                  onClick={() => handleAdvanceStep(1)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-xl bg-[#0061FF] hover:bg-[#0052cc] text-white disabled:opacity-30 text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  <span>گام بعدی</span>
                  <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-0 rotate-180" />
                </button>
              </div>

              {/* Explicit Exit Tutorial Button */}
              <button
                type="button"
                onClick={() => {
                  setWalkthroughActive(false);
                  setActiveStep(null);
                  showToast('حالت آموزش تعاملی خاموش شد.');
                }}
                className="w-full py-1.5 rounded-xl text-center text-xs text-rose-500 hover:bg-rose-500/10 font-bold transition-colors cursor-pointer"
              >
                ✕ خروج از حالت آموزش (غیرفعال‌سازی)
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* FLOATING SELECTION / HIGHLIGHT TOOLBAR */}
      {floatingMenu && (
        <div
          className="floating-highlight-menu fixed z-50 animate-in fade-in zoom-in-95 duration-150 flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl backdrop-blur-md select-none"
          style={{
            left: `${floatingMenu.x}px`,
            top: `${floatingMenu.y}px`,
          }}
        >
          {/* Highlighter Palette */}
          <div className="flex items-center gap-1 pe-1 border-e border-[var(--border-color)]">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleApplyHighlight(c.id)}
                className={`w-6 h-6 rounded-full ${c.dot} hover:scale-125 transition-transform shadow-xs flex items-center justify-center ${
                  floatingMenu.currentColor === c.id ? 'ring-2 ring-offset-1 ring-amber-500' : ''
                }`}
                title={`هایلایت با رنگ ${c.name}`}
              >
                {floatingMenu.currentColor === c.id && <Check className="w-3 h-3 text-neutral-900 stroke-[3]" />}
              </button>
            ))}
          </div>

          {/* Add Teacher Note Button */}
          {onAddTeacherNote && (
            <button
              type="button"
              onClick={() => {
                setShowNoteModal({ targetText: floatingMenu.text });
                setFloatingMenu(null);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs transition-colors"
              title="افزودن نکته یا یادداشت مدرس برای این بخش"
            >
              <MessageSquarePlus className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px] font-medium hidden sm:inline">یادداشت مدرس</span>
            </button>
          )}

          {/* Remove Highlight Button if existing */}
          {floatingMenu.isExistingHighlight && onRemoveHighlight && (
            <button
              type="button"
              onClick={handleRemoveHighlight}
              className="p-1 rounded-lg hover:bg-rose-500/15 text-rose-500 transition-colors"
              title="حذف هایلایت از این متن"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={() => setFloatingMenu(null)}
            className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title="بستن"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
