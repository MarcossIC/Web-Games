import { memoryStore } from '@app-persistence';
import { emptyProgress, formatTime, isUnlocked, recordClear } from './ringout-progress';
import { ringOutProgress } from './ringout-saves';

describe('Ring Out progress', () => {
  it('opens only the first level at the start', () => {
    const progress = emptyProgress();
    expect(isUnlocked(progress, 1)).toBeTrue();
    expect(isUnlocked(progress, 2)).toBeFalse();
    expect(isUnlocked(progress, 0)).toBeFalse();
  });

  it('opens the next level on a first clear and keeps the time', () => {
    const outcome = recordClear(emptyProgress(), 1, 8400);
    expect(outcome.progress).toEqual({ cleared: 1, bestTimes: { 1: 8400 } });
    expect(outcome.newBest).toBeTrue();
    expect(outcome.previousBest).toBeNull();
    expect(outcome.unlocked).toBeTrue();
    expect(isUnlocked(outcome.progress, 2)).toBeTrue();
    expect(isUnlocked(outcome.progress, 3)).toBeFalse();
  });

  it('keeps the faster time when a level is played again', () => {
    const first = recordClear(emptyProgress(), 1, 8400).progress;
    const slower = recordClear(first, 1, 9100);
    expect(slower.progress.bestTimes[1]).toBe(8400);
    expect(slower.newBest).toBeFalse();
    expect(slower.previousBest).toBe(8400);
    expect(slower.unlocked).toBeFalse();

    const faster = recordClear(first, 1, 5000);
    expect(faster.progress.bestTimes[1]).toBe(5000);
    expect(faster.newBest).toBeTrue();
  });

  it('does not close levels when an earlier one is played again', () => {
    const progress = { cleared: 5, bestTimes: { 1: 1000 } };
    expect(recordClear(progress, 2, 3000).progress.cleared).toBe(5);
  });

  it('does not change the progress it is given', () => {
    const progress = emptyProgress();
    recordClear(progress, 1, 1000);
    expect(progress).toEqual(emptyProgress());
  });

  it('formats times as minutes, seconds and tenths', () => {
    expect(formatTime(0)).toBe('0:00.0');
    expect(formatTime(8_460)).toBe('0:08.4');
    expect(formatTime(65_300)).toBe('1:05.3');
    expect(formatTime(-5)).toBe('0:00.0');
  });

  it('saves and reads the progress back, dropping broken times', () => {
    const store = memoryStore();
    ringOutProgress.write(store, { cleared: 3, bestTimes: { 1: 1200, 2: 3400 } });
    expect(ringOutProgress.read(store)).toEqual({ cleared: 3, bestTimes: { 1: 1200, 2: 3400 } });

    store.write(ringOutProgress.key, JSON.stringify({ v: 1, data: { cleared: 2, bestTimes: { 1: 0, 2: 900, x: 5 } } }));
    expect(ringOutProgress.read(store)).toEqual({ cleared: 2, bestTimes: { 2: 900 } });
  });

  it('starts from nothing when nothing was saved', () => {
    expect(ringOutProgress.read(memoryStore())).toEqual(emptyProgress());
  });
});
