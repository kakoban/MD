import React, { useState, useRef, useEffect } from 'react';
import { DocStats, CloudSyncStatus } from '../types';
import {
  CheckCircle2,
  Clock,
  FileText,
  AlignLeft,
  Target,
  Trophy,
  X,
  Check,
  Trash2,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { fireGoalCelebrationConfetti, fireInteractiveSparkleConfetti } from '../utils/confetti';

interface StatsBarProps {
  stats: DocStats;
  direction: 'rtl' | 'ltr';
  cursorPos?: { line: number; col: number };
  selectionStats?: { chars: number; words: number } | null;
  wordGoal?: number;
  onUpdateWordGoal?: (newGoal: number | undefined) => void;
  onGoalMet?: () => void;
  syncStatus?: CloudSyncStatus;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  stats,
  direction,
  cursorPos,
  selectionStats,
  wordGoal,
  onUpdateWordGoal,
  onGoalMet,
  syncStatus,
}) => {
  const [isGoalPopoverOpen, setIsGoalPopoverOpen] = useState(false);
  const [goalInputValue, setGoalInputValue] = useState<string>(wordGoal ? String(wordGoal) : '500');
  const [showCelebrationBanner, setShowCelebrationBanner] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const prevGoalReachedRef = useRef<boolean>(false);

  // Sync input value when wordGoal prop changes
  useEffect(() => {
    if (wordGoal) {
      setGoalInputValue(String(wordGoal));
    }
  }, [wordGoal]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsGoalPopoverOpen(false);
      }
    };
    if (isGoalPopoverOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isGoalPopoverOpen]);

  const taskProgress =
    stats.tasksCount.total > 0
      ? Math.round((stats.tasksCount.completed / stats.tasksCount.total) * 100)
      : null;

  const goalProgress =
    wordGoal && wordGoal > 0 ? Math.round((stats.words / wordGoal) * 100) : null;
  const isGoalReached = Boolean(wordGoal && wordGoal > 0 && stats.words >= wordGoal);

  // Detect when user meets their word count goal and trigger confetti animation
  useEffect(() => {
    if (wordGoal && wordGoal > 0) {
      const reached = stats.words >= wordGoal;
      if (reached && !prevGoalReachedRef.current) {
        // Trigger interactive confetti celebration!
        fireGoalCelebrationConfetti();
        onGoalMet?.();
        setShowCelebrationBanner(true);
        const timer = setTimeout(() => setShowCelebrationBanner(false), 5500);
        prevGoalReachedRef.current = true;
        return () => clearTimeout(timer);
      }
      prevGoalReachedRef.current = reached;
    } else {
      prevGoalReachedRef.current = false;
      setShowCelebrationBanner(false);
    }
  }, [stats.words, wordGoal, onGoalMet]);

  const handleSaveGoal = (val?: number) => {
    const target = val !== undefined ? val : parseInt(goalInputValue, 10);
    if (!isNaN(target) && target > 0) {
      onUpdateWordGoal?.(target);
      setIsGoalPopoverOpen(false);
      // If newly set target is already met, celebrate immediately!
      if (stats.words >= target) {
        fireGoalCelebrationConfetti();
        onGoalMet?.();
        setShowCelebrationBanner(true);
        setTimeout(() => setShowCelebrationBanner(false), 5000);
      }
    }
  };

  const handleClearGoal = () => {
    onUpdateWordGoal?.(undefined);
    setIsGoalPopoverOpen(false);
    setShowCelebrationBanner(false);
  };

  const handleManualConfetti = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = rect.top / window.innerHeight;
    fireInteractiveSparkleConfetti(x, y);
  };

  const presets = [250, 500, 1000, 2000, 5000];

  const isSaving = syncStatus === 'saving';
  const isPending = syncStatus === 'pending';

  return (
    <footer
      className={`status-bar select-none relative px-4 py-1.5 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] backdrop-blur-sm text-[11px] text-[var(--text-muted)] flex flex-wrap items-center justify-between gap-4 z-10 transition-all duration-300 ${
        isSaving
          ? 'is-saving status-bar-saving'
          : isPending
          ? 'is-pending status-bar-pending'
          : ''
      }`}
      data-sync-status={syncStatus}
    >
      {/* Interactive Goal Celebration Banner (pops up when goal is reached) */}
      {showCelebrationBanner && (
        <div
          onClick={() => fireGoalCelebrationConfetti()}
          className="absolute bottom-full start-4 mb-2 px-3.5 py-2 rounded-2xl bg-neutral-900/95 border border-emerald-500/50 text-emerald-400 text-xs flex items-center gap-2.5 shadow-2xl backdrop-blur-md cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-200 z-50 select-none hover:bg-neutral-800 transition-all hover:scale-[1.02]"
          title="کلیک برای پرتاب دوباره کاغذ رنگی جشن! 🎉"
        >
          <Trophy className="w-4 h-4 text-emerald-400 animate-bounce shrink-0" />
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-[var(--text-primary)]">
              هدف نگارش {wordGoal?.toLocaleString('fa-IR')} کلمه محقق شد!
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">
              (کلیک برای پرتاب کاغذ رنگی ✨)
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowCelebrationBanner(false);
            }}
            className="p-1 rounded-lg text-neutral-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Left items: Counts, metrics & Word Goal */}
      <div className="flex items-center gap-3 md:gap-4 flex-wrap">
        {/* Word count */}
        <div className="flex items-center gap-1.5" title="تعداد کلمات">
          <FileText className="w-3.5 h-3.5 text-neutral-500" />
          <span>{stats.words.toLocaleString('fa-IR')} کلمه</span>
        </div>

        {/* Word Goal Progress Bar & Popover */}
        {onUpdateWordGoal && (
          <div className="relative flex items-center gap-1.5" ref={popoverRef}>
            {wordGoal && wordGoal > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsGoalPopoverOpen(!isGoalPopoverOpen)}
                  className={`flex items-center gap-2 px-2.5 py-0.5 rounded-lg border transition-all cursor-pointer ${
                    isGoalReached
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-medium shadow-xs hover:border-emerald-500/60'
                      : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-amber-500/50 hover:bg-[var(--bg-primary)]'
                  }`}
                  title="کلیک برای ویرایش یا مشاهده هدف کلمات"
                >
                  {isGoalReached ? (
                    <Trophy className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-bounce" />
                  ) : (
                    <Target className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px]">
                      هدف: {stats.words.toLocaleString('fa-IR')} / {wordGoal.toLocaleString('fa-IR')}
                    </span>

                    {/* Progress Bar Container */}
                    <div className="w-16 h-1.5 rounded-full bg-neutral-900/60 border border-[var(--border-color)] overflow-hidden inline-flex">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isGoalReached
                            ? 'bg-emerald-500'
                            : goalProgress && goalProgress >= 75
                            ? 'bg-amber-400'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(goalProgress || 0, 100)}%` }}
                      />
                    </div>

                    <span
                      className={`font-mono text-[10px] font-bold ${
                        isGoalReached ? 'text-emerald-400' : 'text-amber-500'
                      }`}
                    >
                      %{goalProgress}
                    </span>
                  </div>
                </button>

                {/* Interactive Confetti trigger button when goal is reached */}
                {isGoalReached && (
                  <button
                    type="button"
                    onClick={handleManualConfetti}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/35 text-[10px] font-bold transition-all shadow-xs hover:scale-105 active:scale-95"
                    title="پرتاب کاغذ رنگی جشن (Confetti)"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span className="hidden sm:inline">جشن 🎉</span>
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsGoalPopoverOpen(!isGoalPopoverOpen)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] text-[var(--text-muted)] hover:text-amber-500 hover:bg-[var(--bg-tertiary)] transition-colors border border-dashed border-[var(--border-color)]"
                title="تعیین هدف کلمات برای نگارش روزانه یا مقاله"
              >
                <Target className="w-3 h-3 text-amber-500/80" />
                <span>+ تعیین هدف کلمات</span>
              </button>
            )}

            {/* Popover Dialog (Pops up above status bar) */}
            {isGoalPopoverOpen && (
              <div className="absolute bottom-full start-0 mb-2 w-72 p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 text-[var(--text-primary)] select-none">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)] mb-3">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Target className="w-4 h-4 text-amber-500" />
                    <span>هدف‌گذاری نگارش (Writing Goal)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsGoalPopoverOpen(false)}
                    className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[11px] text-[var(--text-muted)] mb-2.5 leading-relaxed">
                  تعداد کلماتی که قصد دارید در این سند بنویسید را مشخص کنید:
                </p>

                {/* Presets */}
                <div className="grid grid-cols-5 gap-1 mb-3">
                  {presets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setGoalInputValue(String(preset));
                        handleSaveGoal(preset);
                      }}
                      className={`py-1 rounded-lg text-[10px] font-mono transition-colors border ${
                        wordGoal === preset
                          ? 'bg-amber-500 text-neutral-950 font-bold border-amber-500'
                          : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-amber-500/50'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Custom Input */}
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="number"
                    min="10"
                    max="100000"
                    step="50"
                    value={goalInputValue}
                    onChange={(e) => setGoalInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveGoal();
                    }}
                    placeholder="مثلاً ۱۰۰۰"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 font-mono text-center"
                  />
                  <span className="text-xs text-[var(--text-muted)]">کلمه</span>
                </div>

                {/* Interactive Confetti Test Button in popover */}
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={() => fireGoalCelebrationConfetti()}
                    className="w-full py-1 px-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>تست پرتاب کاغذ رنگی (Confetti Test) 🎉</span>
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-color)]">
                  {wordGoal ? (
                    <button
                      type="button"
                      onClick={handleClearGoal}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 text-[10px] transition-colors"
                      title="حذف هدف نگارش"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>حذف هدف</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsGoalPopoverOpen(false)}
                      className="px-2.5 py-1.5 rounded-xl text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                      انصراف
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveGoal()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-[10px] transition-colors shadow-xs"
                    >
                      <Check className="w-3 h-3" />
                      <span>ذخیره هدف</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Character count */}
        <div className="flex items-center gap-1.5" title="تعداد کاراکترها">
          <span className="text-neutral-600">·</span>
          <span>{stats.chars.toLocaleString('fa-IR')} کاراکتر</span>
        </div>

        {/* Line count */}
        <div className="flex items-center gap-1.5" title="تعداد خطوط">
          <span className="text-neutral-600">·</span>
          <AlignLeft className="w-3.5 h-3.5 text-neutral-500" />
          <span>{stats.lines.toLocaleString('fa-IR')} خط</span>
        </div>

        {/* Reading time */}
        <div className="flex items-center gap-1.5" title="مدت زمان تقریبی مطالعه">
          <span className="text-neutral-600">·</span>
          <Clock className="w-3.5 h-3.5 text-neutral-500" />
          <span>حدود {stats.readingTimeMin.toLocaleString('fa-IR')} دقیقه خواندن</span>
        </div>

        {/* Selection Stats */}
        {selectionStats && selectionStats.chars > 0 && (
          <div className="flex items-center gap-1.5 text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded">
            <span>
              انتخاب: {selectionStats.words} کلمه ({selectionStats.chars} کاراکتر)
            </span>
          </div>
        )}
      </div>

      {/* Right items: Auto-save status, Task progress & cursor position */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Auto-save & Sync Status Indicator */}
        {syncStatus && (
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all ${
              syncStatus === 'saving'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-500 font-semibold'
                : syncStatus === 'pending'
                ? 'bg-sky-500/15 border-sky-500/35 text-sky-400 font-medium'
                : syncStatus === 'error'
                ? 'bg-rose-500/15 border-rose-500/35 text-rose-400'
                : 'border-transparent text-neutral-400 hover:text-[var(--text-primary)]'
            }`}
            title={
              syncStatus === 'saving'
                ? 'در حال ذخیره‌سازی خودکار تغییرات...'
                : syncStatus === 'pending'
                ? 'تغییرات اعمال شد (در انتظار ذخیره خودکار)'
                : syncStatus === 'error'
                ? 'خطا در ذخیره‌سازی تغییرات'
                : 'تمامی تغییرات به‌صورت خودکار ذخیره شده‌اند'
            }
          >
            {syncStatus === 'saving' ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
                <span className="text-[10px]">در حال ذخیره...</span>
              </>
            ) : syncStatus === 'pending' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                </span>
                <span className="text-[10px]">در صف ذخیره...</span>
              </>
            ) : syncStatus === 'error' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-[10px]">خطا در ذخیره</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] hidden sm:inline text-neutral-400">ذخیره خودکار</span>
              </>
            )}
          </div>
        )}

        {taskProgress !== null && (
          <div className="flex items-center gap-2" title="وضعیت پیشرفت چک‌لیست">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <div className="flex items-center gap-1.5">
              <span>
                وظایف: {stats.tasksCount.completed}/{stats.tasksCount.total}
              </span>
              <div className="w-16 h-1.5 rounded-full bg-neutral-800 overflow-hidden inline-flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${taskProgress}%` }}
                />
              </div>
              <span className="text-emerald-400 font-medium">%{taskProgress}</span>
            </div>
          </div>
        )}

        {cursorPos && (
          <div className="flex items-center gap-1 text-neutral-500 font-mono">
            <span>
              خط {cursorPos.line} : ستون {cursorPos.col}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 text-neutral-500 uppercase font-mono">
          <span>{direction}</span>
        </div>
      </div>
    </footer>
  );
};
