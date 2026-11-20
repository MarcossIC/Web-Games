import { bestPerKey, type Check, count, keepBest, number, object, recordOf, text } from '@app-persistence';
import type { RunSummary } from './types';

/**
 * The records of Nova Breaker and the rules that update them after a run.
 * Saving them is not the engine's job: see breaker-saves.ts.
 */
export interface BestRun {
  score: number;
  sector: number;
  timeMs: number;
  /** ISO date of the run. */
  date: string;
}

export interface BreakerRecords {
  best: BestRun | null;
  /** Fastest clear of each sector, ms, by sector number. */
  bestSectorTimes: Record<number, number>;
  bestCombo: number;
}

export interface RecordOutcome {
  records: BreakerRecords;
  newBestScore: boolean;
  /** Sectors whose best time this run improved, ascending. */
  newSectorBests: number[];
}

/** A best run as it can be trusted: no NaN, nothing negative, sectors from 1. */
export const bestRun: Check<BestRun> = object({
  score: number({ min: 0 }),
  sector: number({ min: 1 }),
  timeMs: number({ min: 0 }),
  date: text(),
});

/** Sector times by sector: a time of 0 cannot be a real clear, so it is dropped with the rest of the noise. */
export const sectorTimes: Check<Record<number, number>> = recordOf(count(1), number({ above: 0 }));

export function emptyRecords(): BreakerRecords {
  return { best: null, bestSectorTimes: {}, bestCombo: 0 };
}

/** Folds a finished run into `previous` and says what the run beat. `previous` is not changed. */
export function recordRun(previous: BreakerRecords, summary: RunSummary, now: Date): RecordOutcome {
  const score = keepBest(previous.best?.score ?? 0, summary.score, 'higher');
  const best: BestRun | null = score.improved
    ? { score: summary.score, sector: summary.sector, timeMs: summary.timeMs, date: now.toISOString() }
    : previous.best;
  const times = bestPerKey(previous.bestSectorTimes, sectorTimes(summary.sectorTimes) ?? {}, 'lower');
  const combo = keepBest(previous.bestCombo, summary.maxCombo, 'higher');

  return {
    records: { best, bestSectorTimes: times.values, bestCombo: combo.value },
    newBestScore: score.improved,
    newSectorBests: times.improved,
  };
}

/** A time as m:ss.cc, hundredths cut, not rounded: 62345 -> "1:02.34". */
export function formatTime(ms: number): string {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const hundredths = Math.floor(safe / 10);
  const minutes = Math.floor(hundredths / 6000);
  const seconds = Math.floor(hundredths / 100) % 60;
  const cc = hundredths % 100;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(cc).padStart(2, '0')}`;
}
