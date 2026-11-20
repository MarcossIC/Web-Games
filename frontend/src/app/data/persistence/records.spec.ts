import { bestPerKey, keepBest } from './records';

describe('keepBest', () => {
  it('takes a higher result when higher is better', () => {
    expect(keepBest(100, 150, 'higher')).toEqual({ value: 150, improved: true });
    expect(keepBest(100, 80, 'higher')).toEqual({ value: 100, improved: false });
  });

  it('takes a lower result when lower is better', () => {
    expect(keepBest(100, 80, 'lower')).toEqual({ value: 80, improved: true });
    expect(keepBest(100, 150, 'lower')).toEqual({ value: 100, improved: false });
  });

  it('a tie is not an improvement', () => {
    expect(keepBest(100, 100, 'higher').improved).toBeFalse();
    expect(keepBest(0, 0, 'higher').improved).toBeFalse();
  });

  it('a result that is not a finite number never wins', () => {
    for (const bad of [Number.NaN, Infinity, -Infinity]) {
      expect(keepBest(100, bad, 'higher')).withContext(String(bad)).toEqual({ value: 100, improved: false });
      expect(keepBest(100, bad, 'lower')).withContext(String(bad)).toEqual({ value: 100, improved: false });
    }
  });
});

describe('bestPerKey', () => {
  it('keeps the best of each key and says which keys improved, in order', () => {
    const outcome = bestPerKey({ 1: 40, 2: 55 }, { 3: 70, 1: 50, 2: 41 }, 'lower');

    expect(outcome.values).toEqual({ 1: 40, 2: 41, 3: 70 });
    expect(outcome.improved).toEqual([2, 3]);
  });

  it('orders the improved keys as numbers', () => {
    expect(bestPerKey({}, { 10: 1, 2: 1 }, 'higher').improved).toEqual([2, 10]);
  });

  it('leaves the saved bests untouched', () => {
    const saved = { 1: 40 };

    bestPerKey(saved, { 1: 10 }, 'lower');

    expect(saved).toEqual({ 1: 40 });
  });

  it('skips results that are not finite numbers', () => {
    expect(bestPerKey({}, { 1: Number.NaN, 2: 5 }, 'higher')).toEqual({ values: { 2: 5 }, improved: [2] });
  });
});
