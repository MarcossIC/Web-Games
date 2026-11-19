import { Rng } from './rng';

describe('Rng', () => {
  it('gives the same numbers for the same seed', () => {
    const a = new Rng(1234);
    const b = new Rng(1234);
    for (let i = 0; i < 50; i++) expect(a.next()).toBe(b.next());
  });

  it('gives other numbers for another seed', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    const same = Array.from({ length: 20 }, () => a.next() === b.next()).filter(Boolean).length;
    expect(same).toBeLessThan(3);
  });

  it('stays in [0, 1) and spreads over it', () => {
    const rng = new Rng(99);
    let low = 0;
    for (let i = 0; i < 2000; i++) {
      const n = rng.next();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
      if (n < 0.5) low++;
    }
    expect(low).toBeGreaterThan(900);
    expect(low).toBeLessThan(1100);
  });

  it('range and int stay inside their bounds, int including both ends', () => {
    const rng = new Rng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const r = rng.range(-3, 5);
      expect(r).toBeGreaterThanOrEqual(-3);
      expect(r).toBeLessThan(5);
      const n = rng.int(2, 4);
      expect(Number.isInteger(n)).toBeTrue();
      seen.add(n);
    }
    expect([...seen].sort()).toEqual([2, 3, 4]);
  });

  it('picks from an array and rolls chances', () => {
    const rng = new Rng(5);
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 50; i++) expect(items).toContain(rng.pick(items));
    expect(Array.from({ length: 50 }, () => rng.chance(0)).some(Boolean)).toBeFalse();
    expect(Array.from({ length: 50 }, () => rng.chance(1)).every(Boolean)).toBeTrue();
  });

  it('works with a seed of 0 and with negative or fractional seeds', () => {
    for (const seed of [0, -42, 3.7]) {
      const n = new Rng(seed).next();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
});
