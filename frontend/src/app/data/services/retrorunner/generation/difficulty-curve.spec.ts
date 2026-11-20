import { FLOOR_TILES, GAP, SAFE_START_END_X, UNLOCKS } from './balance';
import { BiomeType } from './chunk-plan';
import { biomeAt, budgetAt, difficultyAt, isUnlocked, speedMultiplierAt } from './difficulty-curve';

/** Every 10 px from 0 to 40000. */
const SAMPLES = Array.from({ length: 4001 }, (_, i) => i * 10);

describe('difficulty curve', () => {
  it('asks for nothing while the player arrives', () => {
    expect(budgetAt(0)).toBe(0);
    expect(budgetAt(SAFE_START_END_X)).toBe(0);
    expect(budgetAt(SAFE_START_END_X + 100)).toBeGreaterThan(0);
  });

  // D-05: the levels used to stop at x = 11000, about 50 s into a run, and
  // the world stayed the same from there on.
  it('keeps growing past x = 11000, slower than before it', () => {
    for (let i = 1; i < SAMPLES.length; i++) {
      if (SAMPLES[i] <= SAFE_START_END_X) continue;
      expect(budgetAt(SAMPLES[i])).withContext(`at ${SAMPLES[i]}`).toBeGreaterThan(budgetAt(SAMPLES[i - 1]));
    }
    expect(budgetAt(20000) - budgetAt(11000)).toBeGreaterThan(0.05);
    expect(budgetAt(40000) - budgetAt(20000)).toBeGreaterThan(0.05);

    const before = (budgetAt(11000) - budgetAt(2000)) / 9000;
    const after = (budgetAt(20000) - budgetAt(11000)) / 9000;
    expect(after).toBeLessThan(before);
  });

  // D-03 and the open decision "Hueco máximo": the hardest stretch asks for
  // 85 % of the jump at the speed of its X, never more.
  it('lets gaps grow from an easy share of the jump to 85 % of it, and no further', () => {
    expect(difficultyAt(1500).maxGapFraction).toBeLessThanOrEqual(0.5);
    expect(difficultyAt(11000).maxGapFraction).toBeCloseTo(GAP.MAX_FRACTION, 2);
    for (const x of SAMPLES) {
      const { minGapFraction, maxGapFraction } = difficultyAt(x);
      expect(minGapFraction).withContext(`at ${x}`).toBeGreaterThanOrEqual(GAP.MIN_FRACTION);
      expect(minGapFraction).withContext(`at ${x}`).toBeLessThanOrEqual(maxGapFraction);
      expect(maxGapFraction).withContext(`at ${x}`).toBeLessThanOrEqual(GAP.MAX_FRACTION);
    }
  });

  // Past x = 11000 the widest gap is as wide as it gets: what keeps growing
  // is how often a gap is that hard.
  it('makes the easy gaps rarer once the widest is as wide as it gets', () => {
    expect(difficultyAt(11000).minGapFraction).toBeCloseTo(GAP.MIN_FRACTION, 2);
    expect(difficultyAt(20000).minGapFraction).toBeGreaterThan(difficultyAt(11000).minGapFraction);
    expect(difficultyAt(40000).minGapFraction).toBeGreaterThan(difficultyAt(20000).minGapFraction);
  });

  it('shortens the floors as the budget grows, down to the hardest length', () => {
    expect(difficultyAt(0)).toEqual(jasmine.objectContaining(FLOOR_TILES.EASY));
    expect(difficultyAt(11000)).toEqual(jasmine.objectContaining(FLOOR_TILES.HARD));
    expect(difficultyAt(40000)).toEqual(jasmine.objectContaining(FLOOR_TILES.HARD));
    for (const x of SAMPLES) {
      const { minCenterTiles, maxCenterTiles } = difficultyAt(x);
      expect(minCenterTiles).withContext(`at ${x}`).toBeLessThanOrEqual(maxCenterTiles);
      expect(minCenterTiles).withContext(`at ${x}`).toBeGreaterThanOrEqual(FLOOR_TILES.HARD.minCenterTiles);
    }
  });

  it('changes biome exactly where each one starts', () => {
    expect(biomeAt(0)).toBe(BiomeType.PLAINS);
    expect(biomeAt(2999)).toBe(BiomeType.PLAINS);
    expect(biomeAt(3000)).toBe(BiomeType.FOREST);
    expect(biomeAt(8999)).toBe(BiomeType.FOREST);
    expect(biomeAt(9000)).toBe(BiomeType.DUSK);
    expect(biomeAt(100000)).toBe(BiomeType.DUSK);
  });

  // I-12: the gates used to compare the obstacle chance, which the wave
  // moved up and down, so features came and went on their own.
  it('unlocks each feature at its distance and never takes it back', () => {
    for (const feature of Object.keys(UNLOCKS) as (keyof typeof UNLOCKS)[]) {
      expect(isUnlocked(feature, UNLOCKS[feature] - 1)).withContext(feature).toBeFalse();
      let seen = false;
      for (const x of SAMPLES) {
        const unlocked = isUnlocked(feature, x);
        if (seen) expect(unlocked).withContext(`${feature} at ${x}`).toBeTrue();
        seen ||= unlocked;
      }
      expect(seen).withContext(feature).toBeTrue();
    }
  });

  it('speeds the player up from its start to 1.4x over 15000 px', () => {
    expect(speedMultiplierAt(0)).toBe(1);
    expect(speedMultiplierAt(50)).toBe(1);
    expect(speedMultiplierAt(7550)).toBeCloseTo(1.2, 10);
    expect(speedMultiplierAt(15050)).toBeCloseTo(1.4, 10);
    expect(speedMultiplierAt(40000)).toBe(1.4);
  });
});
