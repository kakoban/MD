import React, { useEffect, useState } from 'react';
import { Trophy, Sparkles, X } from 'lucide-react';
import { fireGoalCelebrationConfetti } from '../utils/confetti';

interface ConfettiOverlayProps {
  targetWords?: number;
  currentWords?: number;
  onClose?: () => void;
  durationMs?: number;
}

export const ConfettiOverlay: React.FC<ConfettiOverlayProps> = ({
  targetWords,
  currentWords,
  onClose,
  durationMs = 6000,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Fire the confetti burst cannons immediately upon mounting
    fireGoalCelebrationConfetti();

    // Secondary burst 1.5 seconds later
    const secondBurstTimer = setTimeout(() => {
      fireGoalCelebrationConfetti();
    }, 1200);

    // Auto dismiss after duration
    const dismissTimer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, durationMs);

    return () => {
      clearTimeout(secondBurstTimer);
      clearTimeout(dismissTimer);
    };
  }, [durationMs, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9999] flex flex-col items-center justify-start pt-16 sm:pt-20 px-4 overflow-hidden"
      aria-live="polite"
      role="status"
    >
      {/* Interactive celebratory toast card */}
      <div
        onClick={() => fireGoalCelebrationConfetti()}
        className="pointer-events-auto cursor-pointer flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-neutral-900/90 dark:bg-neutral-900/95 border-2 border-emerald-500/60 shadow-[0_20px_50px_rgba(16,185,129,0.35)] backdrop-blur-xl text-white animate-in zoom-in-95 fade-in slide-in-from-top-6 duration-300 hover:scale-105 active:scale-95 transition-all select-none group"
        title="کلیک برای پرتاب دوباره کاغذ رنگی! 🎉"
      >
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-inner">
          <Trophy className="w-5 h-5 text-emerald-400 animate-bounce" />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-emerald-400">
              هدف نگارش شما با موفقیت محقق شد! 🎉
            </span>
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <p className="text-[11px] text-neutral-300">
            {targetWords && currentWords ? (
              <>
                شما به <span className="font-bold text-white">{currentWords.toLocaleString('fa-IR')}</span> کلمه رسیدید (هدف: {targetWords.toLocaleString('fa-IR')} کلمه).
              </>
            ) : (
              'آفرین بر پشتکار شما در نوشتن و تولید محتوا!'
            )}
            <span className="text-emerald-400/90 ms-2 font-medium text-[10px] group-hover:underline">
              (کلیک برای جشن دوباره ✨)
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
            onClose?.();
          }}
          className="ms-2 p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          title="بستن پیام"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
