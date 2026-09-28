import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { FontFamily, HighlightColor } from '../types';
import { parseMarkdownToHtml } from '../utils/markdownParser';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Sparkles,
  LayoutGrid,
  Radio,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  Layers,
  Check,
} from 'lucide-react';

interface PresentationViewProps {
  markdown: string;
  title: string;
  fontFamily: FontFamily;
  direction: 'rtl' | 'ltr';
  onExit: () => void;
  onToggleTask?: (taskIndex: number) => void;
}

export const PresentationView: React.FC<PresentationViewProps> = ({
  markdown,
  title,
  fontFamily,
  direction,
  onExit,
}) => {
  // Splitting mode: smart (splits on dividers and subheadings), headings (every #, ##, ###), or divider (only ---)
  const [splitMode, setSplitMode] = useState<'smart' | 'headings' | 'divider'>('smart');
  const [showSplitMenu, setShowSplitMenu] = useState<boolean>(false);

  // 1. Split markdown into clean, well-proportioned slides
  const rawSlides = useMemo(() => {
    if (!markdown.trim()) return ['# اسلاید خالی\n\nمتنی برای نمایش وجود ندارد.'];

    // Mode: Strictly dividers only
    if (splitMode === 'divider') {
      const parts = markdown.split(/(?:^|\n)\s*[-_*]{3,}\s*(?:\n|$)/);
      const filtered = parts.map((s) => s.trim()).filter(Boolean);
      return filtered.length > 0 ? filtered : [markdown.trim()];
    }

    // Mode: Strictly headings (#, ##, ###)
    if (splitMode === 'headings') {
      const parts = markdown.split(/(?=(?:^|\n)#{1,3}\s+)/);
      const filtered = parts.map((s) => s.trim()).filter(Boolean);
      return filtered.length > 0 ? filtered : [markdown.trim()];
    }

    // Default: Smart Mode
    // A. First split by horizontal rule dividers (---, ***, ___)
    const ruleParts = markdown.split(/(?:^|\n)\s*[-_*]{3,}\s*(?:\n|$)/);
    const slides: string[] = [];

    for (const part of ruleParts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // Check if this part contains multiple subheadings (#, ##, or ###)
      const headingMatches = trimmed.match(/(?:^|\n)#{1,3}\s+/g);

      if (headingMatches && headingMatches.length > 1) {
        // Sub-split by each heading so sections like Phase 2, Phase 3 don't cram into 1 slide
        const subParts = trimmed.split(/(?=(?:^|\n)#{1,3}\s+)/);
        for (const sub of subParts) {
          const subTrimmed = sub.trim();
          if (subTrimmed) {
            slides.push(subTrimmed);
          }
        }
      } else {
        slides.push(trimmed);
      }
    }

    // If no dividers existed, split by any headings (#, ##, ###)
    if (slides.length <= 1) {
      const headingParts = markdown.split(/(?=(?:^|\n)#{1,3}\s+)/);
      const filtered = headingParts.map((s) => s.trim()).filter(Boolean);
      if (filtered.length > 1) {
        return filtered;
      }
    }

    return slides.length > 0 ? slides : [markdown.trim()];
  }, [markdown, splitMode]);

  const totalSlides = rawSlides.length;
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [slideHtmlMap, setSlideHtmlMap] = useState<Record<number, string>>({});
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState<boolean>(false);
  const [slideTheme, setSlideTheme] = useState<'light' | 'dark'>('light');
  const [slideZoom, setSlideZoom] = useState<number>(100);

  // Pro Teacher Tools
  const [laserActive, setLaserActive] = useState<boolean>(false);
  const [laserPos, setLaserPos] = useState<{ x: number; y: number }>({ x: -100, y: -100 });
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const slideCardRef = useRef<HTMLDivElement>(null);

  // Reset scroll to top whenever slide changes
  useEffect(() => {
    if (slideCardRef.current) {
      slideCardRef.current.scrollTop = 0;
    }
  }, [currentSlide]);

  // Ensure currentSlide stays within bounds when splitMode changes
  useEffect(() => {
    if (currentSlide >= totalSlides) {
      setCurrentSlide(Math.max(0, totalSlides - 1));
    }
  }, [totalSlides, currentSlide]);

  // Render current slide to HTML
  useEffect(() => {
    let isCancelled = false;
    const renderSlide = async (idx: number) => {
      if (slideHtmlMap[idx]) return;
      const text = rawSlides[idx] || '';
      const html = await parseMarkdownToHtml(text);
      if (!isCancelled) {
        setSlideHtmlMap((prev) => ({ ...prev, [idx]: html }));
      }
    };

    renderSlide(currentSlide);
    // Preload next slide
    if (currentSlide + 1 < totalSlides) {
      renderSlide(currentSlide + 1);
    }
    // Preload previous slide
    if (currentSlide - 1 >= 0) {
      renderSlide(currentSlide - 1);
    }

    return () => {
      isCancelled = true;
    };
  }, [currentSlide, rawSlides, slideHtmlMap, totalSlides]);

  // Stopwatch / Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Slide navigation
  const nextSlide = useCallback(() => {
    setCurrentSlide((curr) => Math.min(totalSlides - 1, curr + 1));
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((curr) => Math.max(0, curr - 1));
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(Math.max(0, Math.min(totalSlides - 1, index)));
    setIsOverviewOpen(false);
  };

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          // In RTL, left arrow goes forward; in LTR, right arrow goes forward
          if (direction === 'rtl') {
            nextSlide();
          } else {
            prevSlide();
          }
          break;
        case 'ArrowRight':
          if (direction === 'rtl') {
            prevSlide();
          } else {
            nextSlide();
          }
          break;
        case ' ': // Spacebar
        case 'PageDown':
          e.preventDefault();
          nextSlide();
          break;
        case 'PageUp':
          e.preventDefault();
          prevSlide();
          break;
        case 'Home':
          e.preventDefault();
          goToSlide(0);
          break;
        case 'End':
          e.preventDefault();
          goToSlide(totalSlides - 1);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'l':
        case 'L':
          setLaserActive((prev) => !prev);
          break;
        case 't':
        case 'T':
          setTimerActive((prev) => !prev);
          break;
        case 'o':
        case 'O':
        case 'g':
        case 'G':
          setIsOverviewOpen((prev) => !prev);
          break;
        case 'Escape':
          if (isOverviewOpen) {
            setIsOverviewOpen(false);
          } else if (showShortcutsHelp) {
            setShowShortcutsHelp(false);
          } else if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
            setIsFullscreen(false);
          } else {
            onExit();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    nextSlide,
    prevSlide,
    toggleFullscreen,
    onExit,
    direction,
    totalSlides,
    isOverviewOpen,
    showShortcutsHelp,
  ]);

  // Track laser pointer mouse position
  const handleMouseMove = (e: React.MouseEvent) => {
    if (laserActive) {
      setLaserPos({ x: e.clientX, y: e.clientY });
    }
  };

  const fontClass =
    fontFamily === 'mono'
      ? 'font-mono'
      : fontFamily === 'serif'
      ? 'font-serif'
      : fontFamily === 'sans'
      ? 'font-sans'
      : 'font-sans';

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`fixed inset-0 z-50 flex flex-col bg-neutral-950 text-neutral-100 select-none overflow-hidden ${
        laserActive ? 'cursor-none' : ''
      }`}
      dir={direction}
    >
      {/* LASER POINTER GLOW BEAM (PRO TEACHER TOOL) */}
      {laserActive && (
        <div
          className="pointer-events-none fixed z-50 w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500 shadow-[0_0_18px_6px_rgba(244,63,94,0.9),0_0_35px_15px_rgba(244,63,94,0.5)] transition-transform duration-75 ease-out"
          style={{
            left: `${laserPos.x}px`,
            top: `${laserPos.y}px`,
          }}
        >
          <div className="absolute inset-0 rounded-full bg-white opacity-90 scale-50" />
        </div>
      )}

      {/* TOP BAR: Title, Slide counter, Pro controls */}
      <div className="no-print flex items-center justify-between px-6 py-3 bg-neutral-900/80 border-b border-neutral-800/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors text-xs font-medium"
            title="خروج از حالت ارائه (Esc)"
          >
            <X className="w-4 h-4" />
            <span>خروج</span>
          </button>
          <span className="text-sm font-bold text-neutral-200 truncate max-w-xs md:max-w-md">
            {title || 'ارائه مدرس'}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            PRO SLIDES
          </span>
        </div>

        {/* Center: Slide indicator & Overview & Split Mode Button */}
        <div className="flex items-center gap-2">
          {/* Split Mode Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSplitMenu(!showSplitMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 text-xs font-medium border border-neutral-700/50 transition-colors"
              title="تغییر نحوه تفکیک اسلایدها (هوشمند / سرفصل‌ها / جداکننده‌ها)"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">
                {splitMode === 'smart'
                  ? 'تفکیک: هوشمند'
                  : splitMode === 'headings'
                  ? 'تفکیک: سرفصل‌ها'
                  : 'تفکیک: فقط ---'}
              </span>
            </button>
            {showSplitMenu && (
              <div className="absolute top-full start-0 mt-1 w-52 rounded-xl bg-neutral-900 border border-neutral-700 shadow-2xl p-1.5 z-40 space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSplitMode('smart');
                    setShowSplitMenu(false);
                  }}
                  className={`w-full text-start flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
                    splitMode === 'smart'
                      ? 'bg-amber-500/15 text-amber-400 font-semibold'
                      : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <div>
                    <div>تفکیک هوشمند (پیش‌فرض)</div>
                    <div className="text-[10px] text-neutral-500">جداکننده‌ها + سرفصل‌های فازها</div>
                  </div>
                  {splitMode === 'smart' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSplitMode('headings');
                    setShowSplitMenu(false);
                  }}
                  className={`w-full text-start flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
                    splitMode === 'headings'
                      ? 'bg-amber-500/15 text-amber-400 font-semibold'
                      : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <div>
                    <div>بر اساس هر سرفصل</div>
                    <div className="text-[10px] text-neutral-500">هر تیتر (#، ##، ###) یک اسلاید</div>
                  </div>
                  {splitMode === 'headings' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSplitMode('divider');
                    setShowSplitMenu(false);
                  }}
                  className={`w-full text-start flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
                    splitMode === 'divider'
                      ? 'bg-amber-500/15 text-amber-400 font-semibold'
                      : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <div>
                    <div>فقط با خطوط جداکننده</div>
                    <div className="text-[10px] text-neutral-500">فقط علائم ---</div>
                  </div>
                  {splitMode === 'divider' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsOverviewOpen(!isOverviewOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              isOverviewOpen
                ? 'bg-amber-500 text-neutral-950 font-bold'
                : 'bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300'
            }`}
            title="مشاهده همه اسلایدها (کلید G)"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>
              اسلاید {currentSlide + 1} از {totalSlides}
            </span>
          </button>
        </div>

        {/* Right: Teacher Tools (Theme, Zoom, Laser, Timer, Fullscreen, Help) */}
        <div className="flex items-center gap-2">
          {/* Slide Theme Toggle (Light Keynote vs Dark Cinema) */}
          <button
            type="button"
            onClick={() => setSlideTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              slideTheme === 'light'
                ? 'bg-amber-400 text-neutral-950 shadow-md ring-2 ring-amber-400/40'
                : 'bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300'
            }`}
            title="تغییر تم اسلاید (اسلاید روشن / اسلاید تاریک)"
          >
            {slideTheme === 'light' ? <Sun className="w-3.5 h-3.5 text-neutral-950" /> : <Moon className="w-3.5 h-3.5 text-amber-400" />}
            <span className="hidden sm:inline">
              {slideTheme === 'light' ? 'اسلاید روشن' : 'اسلاید تاریک'}
            </span>
          </button>

          {/* Slide Font Zoom */}
          <div className="hidden sm:flex items-center gap-0.5 bg-neutral-800/80 rounded-xl p-1 text-xs text-neutral-300 border border-neutral-700/50">
            <button
              type="button"
              onClick={() => setSlideZoom((z) => Math.max(80, z - 10))}
              className="p-1 hover:text-white rounded transition-colors"
              title="کاهش اندازه قلم اسلاید"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="font-mono text-[11px] px-1 text-neutral-400">{slideZoom}%</span>
            <button
              type="button"
              onClick={() => setSlideZoom((z) => Math.min(150, z + 10))}
              className="p-1 hover:text-white rounded transition-colors"
              title="افزایش اندازه قلم اسلاید"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          {/* Laser Pointer Pro Tool */}
          <button
            type="button"
            onClick={() => setLaserActive(!laserActive)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              laserActive
                ? 'bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.6)] font-bold'
                : 'bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300'
            }`}
            title="پوینتر لیزری مدرس (کلید L)"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden md:inline">لیزر تدریس</span>
          </button>

          {/* Stopwatch / Timer */}
          <div className="flex items-center gap-1 bg-neutral-800/80 rounded-xl px-2.5 py-1 text-xs text-neutral-300 border border-neutral-700/50">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-xs">{formatTimer(timerSeconds)}</span>
            <button
              type="button"
              onClick={() => setTimerRunning(!timerRunning)}
              className="p-1 hover:text-white transition-colors"
              title={timerRunning ? 'توقف زمان‌سنج' : 'شروع زمان‌سنج'}
            >
              {timerRunning ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
            </button>
            {timerSeconds > 0 && (
              <button
                type="button"
                onClick={() => {
                  setTimerRunning(false);
                  setTimerSeconds(0);
                }}
                className="p-1 hover:text-rose-400 transition-colors"
                title="بازنشانی زمان"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* Shortcuts Help */}
          <button
            type="button"
            onClick={() => setShowShortcutsHelp(!showShortcutsHelp)}
            className="p-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
            title="کلیدهای میانبر"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
            title="تمام صفحه (کلید F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* MAIN SLIDE VIEW CONTAINER */}
      <div className="flex-1 relative flex items-center justify-center p-4 sm:p-6 md:p-12 overflow-hidden">
        {/* Previous Slide Navigation Overlay Button */}
        <button
          type="button"
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="absolute start-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-2xl bg-neutral-900/60 hover:bg-neutral-900/90 text-neutral-400 hover:text-white disabled:opacity-20 disabled:hover:bg-neutral-900/40 border border-neutral-800/60 backdrop-blur-xs transition-all shadow-xl hover:scale-105"
          title="اسلاید قبلی"
        >
          {direction === 'rtl' ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
        </button>

        {/* Next Slide Navigation Overlay Button */}
        <button
          type="button"
          onClick={nextSlide}
          disabled={currentSlide === totalSlides - 1}
          className="absolute end-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-2xl bg-neutral-900/60 hover:bg-neutral-900/90 text-neutral-400 hover:text-white disabled:opacity-20 disabled:hover:bg-neutral-900/40 border border-neutral-800/60 backdrop-blur-xs transition-all shadow-xl hover:scale-105"
          title="اسلاید بعدی (Space)"
        >
          {direction === 'rtl' ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
        </button>

        {/* Slide Canvas / Card with Crystal Clear High Contrast */}
        <div
          key={currentSlide}
          ref={slideCardRef}
          className={`w-full max-w-5xl min-h-[500px] max-h-[86vh] overflow-y-auto rounded-3xl border shadow-2xl p-6 sm:p-10 md:p-14 flex flex-col justify-start animate-in fade-in zoom-in-95 duration-200 presentation-slide-card ${
            slideTheme === 'light'
              ? 'slide-card-light bg-white text-slate-900 border-slate-200'
              : 'slide-card-dark bg-zinc-900 text-slate-100 border-zinc-700'
          } ${fontClass}`}
          style={{
            fontSize: `${slideZoom}%`,
            backgroundColor: slideTheme === 'light' ? '#ffffff' : '#18181b',
            color: slideTheme === 'light' ? '#0f172a' : '#f8fafc',
          }}
        >
          {slideHtmlMap[currentSlide] ? (
            <div
              className={`my-auto w-full markdown-body presentation-slide-body ${
                slideTheme === 'light' ? 'text-slate-900' : 'text-slate-100'
              }`}
              style={{
                color: slideTheme === 'light' ? '#0f172a' : '#f8fafc',
              }}
              dangerouslySetInnerHTML={{ __html: slideHtmlMap[currentSlide] }}
            />
          ) : (
            <div
              className={`flex items-center justify-center p-12 my-auto ${
                slideTheme === 'light' ? 'text-slate-500' : 'text-neutral-400'
              }`}
            >
              در حال بارگذاری اسلاید...
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM SLIDE PROGRESS BAR */}
      <div className="no-print h-1.5 w-full bg-neutral-900 shrink-0">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300"
          style={{ width: `${((currentSlide + 1) / totalSlides) * 100}%` }}
        />
      </div>

      {/* SLIDE OVERVIEW / GRID MODAL */}
      {isOverviewOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex flex-col p-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-base text-neutral-100">نمای کلی همه اسلایدها</h3>
              <span className="text-xs text-neutral-400">({totalSlides} اسلاید)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOverviewOpen(false)}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {rawSlides.map((slideMarkdown, idx) => {
              // Extract first line as title
              const firstLine = slideMarkdown.split('\n')[0].replace(/^[#\s*_-]+/, '') || `اسلاید ${idx + 1}`;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  className={`text-start p-4 rounded-2xl border transition-all flex flex-col justify-between h-44 hover:scale-[1.02] shadow-lg ${
                    idx === currentSlide
                      ? 'bg-amber-500/10 border-amber-500 text-white ring-2 ring-amber-500/50'
                      : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full border-b border-neutral-800/80 pb-2 mb-2">
                    <span className="text-xs font-mono font-bold text-amber-500">#{idx + 1}</span>
                    {idx === currentSlide && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-neutral-950 font-bold">
                        جاری
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-sm text-neutral-100 line-clamp-2">{firstLine}</div>
                  <div className="text-xs text-neutral-500 line-clamp-2 mt-auto">
                    {slideMarkdown.slice(0, 100)}...
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SHORTCUTS HELP MODAL */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-bold text-base text-neutral-100 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-500" />
                <span>کلیدهای میانبر ارائه کلاسی</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowShortcutsHelp(false)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-neutral-300">
              <div className="flex items-center justify-between py-1 border-b border-neutral-800/60">
                <span>اسلاید بعدی</span>
                <kbd className="px-2 py-1 rounded bg-neutral-800 font-mono text-amber-400">Space / کلید جهت‌نما</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-neutral-800/60">
                <span>اسلاید قبلی</span>
                <kbd className="px-2 py-1 rounded bg-neutral-800 font-mono text-amber-400">کلید جهت‌نما معکوس</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-neutral-800/60">
                <span>روشن / خاموش کردن پوینتر لیزری مدرس</span>
                <kbd className="px-2 py-1 rounded bg-neutral-800 font-mono text-rose-400">L</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-neutral-800/60">
                <span>شروع / توقف تایمر کلاس</span>
                <kbd className="px-2 py-1 rounded bg-neutral-800 font-mono text-amber-400">T</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-neutral-800/60">
                <span>مشاهده شبکه اسلایدها (Overview)</span>
                <kbd className="px-2 py-1 rounded bg-neutral-800 font-mono text-amber-400">G یا O</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-neutral-800/60">
                <span>حالت تمام‌صفحه</span>
                <kbd className="px-2 py-1 rounded bg-neutral-800 font-mono text-amber-400">F</kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>خروج از حالت ارائه</span>
                <kbd className="px-2 py-1 rounded bg-neutral-800 font-mono text-neutral-400">Esc</kbd>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-neutral-400 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80">
              💡 <strong>نکته طراحی اسلاید:</strong> برای ایجاد اسلاید جدید در هر جای سند، کافیست عبارت <code className="text-amber-400">---</code> بنویسید؛ یا سرفصل‌های سطح ۱ و ۲ را قرار دهید.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
