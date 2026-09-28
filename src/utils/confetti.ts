import confetti from 'canvas-confetti';

/**
 * Trigger celebration confetti explosions from the status-bar
 */
export function fireGoalCelebrationConfetti() {
  // Fire cannon burst 1: From bottom-left / center of status-bar shooting upward
  confetti({
    particleCount: 80,
    angle: 60,
    spread: 70,
    origin: { x: 0.1, y: 0.95 },
    colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#eab308'],
    zIndex: 9999,
  });

  // Fire cannon burst 2: From bottom-right of status-bar shooting upward
  confetti({
    particleCount: 80,
    angle: 120,
    spread: 70,
    origin: { x: 0.9, y: 0.95 },
    colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#eab308'],
    zIndex: 9999,
  });

  // Center celebratory starburst after a slight delay
  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { x: 0.5, y: 0.8 },
      colors: ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'],
      shapes: ['star', 'circle'],
      scalar: 1.2,
      zIndex: 9999,
    });
  }, 250);
}

/**
 * Quick interactive sparkle confetti for clicks
 */
export function fireInteractiveSparkleConfetti(x = 0.5, y = 0.95) {
  confetti({
    particleCount: 45,
    spread: 60,
    origin: { x, y },
    colors: ['#10b981', '#f59e0b', '#ec4899', '#6366f1'],
    zIndex: 9999,
  });
}
