import { memoryStore } from '@app-persistence';
import { breakerRecords, breakerSettings } from './breaker-saves';
import { emptyRecords, type BreakerRecords } from './engine/records';

/** A store holding `data` as this version of the records saved it. */
const saved = (data: unknown) => memoryStore({ [breakerRecords.key]: JSON.stringify({ v: 1, data }) });

describe('breakerRecords', () => {
  it('lives under gg:breaker:records', () => {
    expect(breakerRecords.key).toBe('gg:breaker:records');
  });

  it('reads empty records when nothing was saved', () => {
    expect(breakerRecords.read(memoryStore())).toEqual(emptyRecords());
  });

  it('reads back what it wrote', () => {
    const store = memoryStore();
    const records: BreakerRecords = {
      best: { score: 5000, sector: 3, timeMs: 120000, date: '2026-11-19T12:00:00.000Z' },
      bestSectorTimes: { 1: 40000, 2: 55000 },
      bestCombo: 14,
    };

    breakerRecords.write(store, records);

    expect(breakerRecords.read(store)).toEqual(records);
  });

  it('drops a best score with NaN, negative or missing numbers, keeping the rest', () => {
    for (const best of [
      { score: 'NaN', sector: 2, timeMs: 1000, date: 'x' },
      { score: -5, sector: 2, timeMs: 1000, date: 'x' },
      { score: 100, sector: 0, timeMs: 1000, date: 'x' },
      { score: 100, sector: 2, date: 'x' },
      'a string',
    ]) {
      const records = breakerRecords.read(saved({ best, bestSectorTimes: { 1: 30000 }, bestCombo: 9 }));

      expect(records.best).withContext(JSON.stringify(best)).toBeNull();
      expect(records.bestSectorTimes).toEqual({ 1: 30000 });
      expect(records.bestCombo).toBe(9);
    }
  });

  it('drops bad sector times and a bad combo one by one', () => {
    const records = breakerRecords.read(
      saved({
        best: null,
        bestSectorTimes: { 1: 30000, 2: -4, 3: 'fast', x: 100, 4: null, 5: 0, 6: 41000.5 },
        bestCombo: -1,
      })
    );

    expect(records.bestSectorTimes).toEqual({ 1: 30000, 6: 41000.5 });
    expect(records.bestCombo).toBe(0);
  });
});

describe('breakerSettings', () => {
  it('lives under gg:breaker:settings', () => {
    expect(breakerSettings.key).toBe('gg:breaker:settings');
  });

  it('starts with sound on and the mouse captured', () => {
    expect(breakerSettings.read(memoryStore())).toEqual({ muted: false, captureMouse: true });
  });

  it('reads back what it wrote', () => {
    const store = memoryStore();

    breakerSettings.write(store, { muted: true, captureMouse: false });

    expect(breakerSettings.read(store)).toEqual({ muted: true, captureMouse: false });
  });

  it('reads a setting that is not true or false as its default, keeping the other', () => {
    const store = memoryStore({
      [breakerSettings.key]: JSON.stringify({ v: 1, data: { muted: '1', captureMouse: false } }),
    });

    expect(breakerSettings.read(store)).toEqual({ muted: false, captureMouse: false });
  });
});
