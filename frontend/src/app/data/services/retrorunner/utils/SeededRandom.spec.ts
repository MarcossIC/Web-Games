import SeededRandom from './SeededRandom';

describe('SeededRandom', () => {
  /** Every value `draw` returns over many tries, sorted. */
  const valuesOf = (draw: () => number, tries = 500): number[] => {
    const seen = new Set<number>();
    for (let i = 0; i < tries; i++) seen.add(draw());
    return [...seen].sort((a, b) => a - b);
  };

  it('gives the same sequence for the same seed', () => {
    const a = new SeededRandom('A1B2C3D4');
    const b = new SeededRandom('A1B2C3D4');
    for (let i = 0; i < 50; i++) expect(a.next()).toBe(b.next());
  });

  describe('intBetween', () => {
    it('returns both ends of the range', () => {
      const rng = new SeededRandom('ends');
      expect(valuesOf(() => rng.intBetween(3, 4))).toEqual([3, 4]);
      expect(valuesOf(() => rng.intBetween(0, 5))).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('rounds bounds that are not whole numbers inward', () => {
      const rng = new SeededRandom('inward');
      expect(valuesOf(() => rng.intBetween(0.5, 2.7))).toEqual([1, 2]);
    });

    it('returns the bound when the range holds a single value', () => {
      const rng = new SeededRandom('single');
      expect(valuesOf(() => rng.intBetween(7, 7))).toEqual([7]);
      expect(valuesOf(() => rng.intBetween(7, 3))).toEqual([7]);
    });

    it('draws exactly once, whatever the range', () => {
      // The order of the draws is part of the world: a call that skipped
      // its draw would shift everything generated after it.
      const rng = new SeededRandom('once');
      const twin = new SeededRandom('once');
      rng.intBetween(7, 7);
      rng.intBetween(7, 3);
      rng.intBetween(0, 100);
      twin.next();
      twin.next();
      twin.next();
      expect(rng.next()).toBe(twin.next());
    });
  });

  it('forks streams that do not depend on how much the parent drew', () => {
    const fresh = new SeededRandom('fork').fork('terrain');
    const used = new SeededRandom('fork');
    for (let i = 0; i < 10; i++) used.next();
    expect(used.fork('terrain').next()).toBe(fresh.next());
  });
});
