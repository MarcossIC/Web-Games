import { count, keepBest, number, recordOf, type Check } from '@app-persistence';

/**
 * How far the player has got in Ring Out, and their best times. Saving it
 * is ringout-saves.ts's job; this is the arithmetic.
 */
export interface RingOutProgress {
  /** Levels cleared, counted from the first: the one after them is open. */
  cleared: number;
  /** Fastest clear of each level, in milliseconds, by level number (from 1). */
  bestTimes: Record<number, number>;
}

export interface ClearOutcome {
  readonly progress: RingOutProgress;
  /** The time beat the best saved for the level, or there was none. */
  readonly newBest: boolean;
  /** The best before this clear, if there was one. */
  readonly previousBest: number | null;
  /** This clear opened the next level. */
  readonly unlocked: boolean;
}

/** Times by level: a time of 0 cannot be a real clear, so it is dropped with the rest of the noise. */
export const levelTimes: Check<Record<number, number>> = recordOf(count(1), number({ above: 0 }));

export function emptyProgress(): RingOutProgress {
  return { cleared: 0, bestTimes: {} };
}

/** Level `level` (from 1) can be played: it is the first, or the one before it was cleared. */
export function isUnlocked(progress: RingOutProgress, level: number): boolean {
  return level >= 1 && level <= progress.cleared + 1;
}

/** Folds a clear of `level` in `timeMs` into `previous`, which is not changed. */
export function recordClear(previous: RingOutProgress, level: number, timeMs: number): ClearOutcome {
  const saved = previous.bestTimes[level];
  const best = saved === undefined ? { value: timeMs, improved: true } : keepBest(saved, timeMs, 'lower');
  const cleared = Math.max(previous.cleared, level);
  return {
    progress: { cleared, bestTimes: { ...previous.bestTimes, [level]: best.value } },
    newBest: best.improved,
    previousBest: saved ?? null,
    unlocked: cleared > previous.cleared,
  };
}

/** A time as the clock shows it: minutes, seconds and tenths, as 1:05.3. */
export function formatTime(ms: number): string {
  const tenths = Math.floor(Math.max(0, ms) / 100);
  const minutes = Math.floor(tenths / 600);
  const seconds = Math.floor((tenths % 600) / 10);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths % 10}`;
}
