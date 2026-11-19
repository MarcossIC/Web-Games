import { emptyRecords, formatTime, loadRecords, recordRun, RECORDS_KEY } from './records';
import type { RunSummary } from './types';

function memoryStorage(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial };
  return {
    store,
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
  };
}

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
  describe('loadRecords', () => {
    it('is empty when nothing was saved', () => {
      expect(loadRecords(memoryStorage())).toEqual(emptyRecords());
      expect(emptyRecords()).toEqual({ version: 1, best: null, bestSectorTimes: {}, bestCombo: 0 });
    });

    it('reads what recordRun saved', () => {
      const storage = memoryStorage();
      recordRun(run(), storage, NOW);

      const records = loadRecords(storage);
      expect(records.best).toEqual({ score: 5000, sector: 3, timeMs: 120000, date: NOW.toISOString() });
      expect(records.bestSectorTimes).toEqual({ 1: 40000, 2: 55000 });
      expect(records.bestCombo).toBe(14);
    });

    const broken: [string, string][] = [
      ['invalid JSON', '{not json'],
      ['a JSON that is not an object', '42'],
      ['null', 'null'],
      ['another version', JSON.stringify({ version: 2, best: null, bestSectorTimes: {}, bestCombo: 3 })],
      ['no version', JSON.stringify({ best: null, bestSectorTimes: {}, bestCombo: 3 })],
    ];
    for (const [what, raw] of broken) {
      it(`falls back to empty records on ${what}`, () => {
        expect(loadRecords(memoryStorage({ [RECORDS_KEY]: raw }))).toEqual(emptyRecords());
      });
    }

    it('drops a best score with NaN, negative or missing numbers, keeping the rest', () => {
      const raw = (best: unknown) =>
        JSON.stringify({ version: 1, best, bestSectorTimes: { 1: 30000 }, bestCombo: 9 });

      for (const best of [
        { score: 'NaN', sector: 2, timeMs: 1000, date: 'x' },
        { score: -5, sector: 2, timeMs: 1000, date: 'x' },
        { score: 100, sector: 0, timeMs: 1000, date: 'x' },
        { score: 100, sector: 2, date: 'x' },
        'a string',
      ]) {
        const records = loadRecords(memoryStorage({ [RECORDS_KEY]: raw(best) }));
        expect(records.best).withContext(JSON.stringify(best)).toBeNull();
        expect(records.bestSectorTimes).toEqual({ 1: 30000 });
        expect(records.bestCombo).toBe(9);
      }
    });

    it('drops bad sector times and a bad combo one by one', () => {
      const raw = JSON.stringify({
        version: 1,
        best: null,
        bestSectorTimes: { 1: 30000, 2: -4, 3: 'fast', x: 100, 4: null, 5: 0, 6: 41000.5 },
        bestCombo: -1,
      });
      const records = loadRecords(memoryStorage({ [RECORDS_KEY]: raw }));
      expect(records.bestSectorTimes).toEqual({ 1: 30000, 6: 41000.5 });
      expect(records.bestCombo).toBe(0);
    });

    it('never throws, even when the storage does', () => {
      const throwing = {
        getItem: (): string | null => {
          throw new Error('denied');
        },
      };
      expect(loadRecords(throwing)).toEqual(emptyRecords());
    });
  });

  describe('recordRun', () => {
    it('saves the first run as the best of everything', () => {
      const storage = memoryStorage();

      const outcome = recordRun(run(), storage, NOW);

      expect(outcome.newBestScore).toBeTrue();
      expect(outcome.newSectorBests).toEqual([1, 2]);
      expect(JSON.parse(storage.store[RECORDS_KEY])).toEqual(outcome.records);
    });

    it('keeps the old best when the new run scores less, but takes its faster sectors', () => {
      const storage = memoryStorage();
      recordRun(run(), storage, NOW);

      const outcome = recordRun(
        run({ score: 900, maxCombo: 4, sectorTimes: { 1: 50000, 2: 41000, 3: 70000 } }),
        storage,
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
      const storage = memoryStorage();
      recordRun(run(), storage, NOW);
      const later = new Date('2026-12-01T10:00:00.000Z');

      const outcome = recordRun(run({ score: 8000, sector: 5, timeMs: 300000, sectorTimes: {} }), storage, later);

      expect(outcome.newBestScore).toBeTrue();
      expect(outcome.records.best).toEqual({ score: 8000, sector: 5, timeMs: 300000, date: later.toISOString() });
      expect(outcome.newSectorBests).toEqual([]);
    });

    it('a run with no score is not a best score', () => {
      const outcome = recordRun(run({ score: 0, sectorTimes: {} }), memoryStorage(), NOW);
      expect(outcome.newBestScore).toBeFalse();
      expect(outcome.records.best).toBeNull();
    });

    it('still answers when the storage cannot be written', () => {
      const storage = {
        getItem: () => null,
        setItem: () => {
          throw new Error('quota');
        },
      };
      const outcome = recordRun(run(), storage, NOW);
      expect(outcome.newBestScore).toBeTrue();
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
