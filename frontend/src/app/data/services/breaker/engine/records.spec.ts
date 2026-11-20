import { emptyRecords, formatTime, recordRun } from './records';
import type { RunSummary } from './types';

function run(overrides: Partial<RunSummary> = {}): RunSummary {
  return {
    score: 5000,
    sector: 3,
    sectorsCleared: 2,
    timeMs: 120000,
    bricksBroken: 80,
    maxCombo: 14,
    powerUpsCaught: 5,
    perfectHits: 3,
    sectorTimes: { 1: 40000, 2: 55000 },
    ...overrides,
  };
}

const NOW = new Date('2026-11-19T12:00:00.000Z');

describe('breaker records', () => {
  it('start empty', () => {
    expect(emptyRecords()).toEqual({ best: null, bestSectorTimes: {}, bestCombo: 0 });
  });

  describe('recordRun', () => {
    it('makes the first run the best of everything', () => {
      const outcome = recordRun(emptyRecords(), run(), NOW);

      expect(outcome.newBestScore).toBeTrue();
      expect(outcome.newSectorBests).toEqual([1, 2]);
      expect(outcome.records).toEqual({
        best: { score: 5000, sector: 3, timeMs: 120000, date: NOW.toISOString() },
        bestSectorTimes: { 1: 40000, 2: 55000 },
        bestCombo: 14,
      });
    });

    it('keeps the old best when the new run scores less, but takes its faster sectors', () => {
      const first = recordRun(emptyRecords(), run(), NOW).records;

      const outcome = recordRun(
        first,
        run({ score: 900, maxCombo: 4, sectorTimes: { 1: 50000, 2: 41000, 3: 70000 } }),
        new Date('2026-11-20T00:00:00.000Z')
      );

      expect(outcome.newBestScore).toBeFalse();
      expect(outcome.records.best?.score).toBe(5000);
      expect(outcome.records.best?.date).toBe(NOW.toISOString());
      expect(outcome.newSectorBests).toEqual([2, 3]);
      expect(outcome.records.bestSectorTimes).toEqual({ 1: 40000, 2: 41000, 3: 70000 });
      expect(outcome.records.bestCombo).toBe(14);
    });

    it('a higher score replaces the best, with its sector, time and date', () => {
      const first = recordRun(emptyRecords(), run(), NOW).records;
      const later = new Date('2026-12-01T10:00:00.000Z');

      const outcome = recordRun(first, run({ score: 8000, sector: 5, timeMs: 300000, sectorTimes: {} }), later);

      expect(outcome.newBestScore).toBeTrue();
      expect(outcome.records.best).toEqual({ score: 8000, sector: 5, timeMs: 300000, date: later.toISOString() });
      expect(outcome.newSectorBests).toEqual([]);
    });

    it('a run with no score is not a best score', () => {
      const outcome = recordRun(emptyRecords(), run({ score: 0, sectorTimes: {} }), NOW);

      expect(outcome.newBestScore).toBeFalse();
      expect(outcome.records.best).toBeNull();
    });

    it('drops the sector times of a run that cannot be real clears', () => {
      const outcome = recordRun(emptyRecords(), run({ sectorTimes: { 1: 0, 2: Number.NaN, 3: 41000 } }), NOW);

      expect(outcome.records.bestSectorTimes).toEqual({ 3: 41000 });
      expect(outcome.newSectorBests).toEqual([3]);
    });

    it('leaves the records it was given untouched', () => {
      const previous = emptyRecords();

      recordRun(previous, run(), NOW);

      expect(previous).toEqual(emptyRecords());
    });
  });

  describe('formatTime', () => {
    it('shows minutes, seconds and hundredths', () => {
      expect(formatTime(62345)).toBe('1:02.34');
      expect(formatTime(0)).toBe('0:00.00');
      expect(formatTime(9999)).toBe('0:09.99');
      expect(formatTime(600000)).toBe('10:00.00');
    });

    it('shows a bad number as zero', () => {
      expect(formatTime(Number.NaN)).toBe('0:00.00');
      expect(formatTime(-500)).toBe('0:00.00');
    });
  });
});
