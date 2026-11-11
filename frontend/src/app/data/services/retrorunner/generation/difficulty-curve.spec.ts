import { UNLOCKS } from './balance';
import { BiomeType } from './chunk-plan';
import { biomeAt, difficultyAt, isUnlocked, speedMultiplierAt } from './difficulty-curve';

/** Every 10 px from 0 to 40000. */
const SAMPLES = Array.from({ length: 4001 }, (_, i) => i * 10);

describe('difficulty curve', () => {
  it('starts with no gaps and brings them in over the first 800 px', () => {
    expect(difficultyAt(0).gapChance).toBe(0);
    expect(difficultyAt(400).gapChance).toBeGreaterThan(0);
    expect(difficultyAt(400).gapChance).toBeLessThan(difficultyAt(800).gapChance);
  });

  it('keeps every gap range ordered and within the 200 px the jump allows', () => {
    for (const x of SAMPLES) {
      const { minGapWidth, maxGapWidth } = difficultyAt(x);
      expect(minGapWidth).withContext(`at ${x}`).toBeLessThanOrEqual(maxGapWidth);
      expect(maxGapWidth).withContext(`at ${x}`).toBeLessThanOrEqual(200);
    }
  });

  it('keeps every chance between 0 and 1', () => {
    for (const x of SAMPLES) {
      const d = difficultyAt(x);
      for (const chance of [d.gapChance, d.obstacleChance, d.coinChance, d.patternChance]) {
        expect(chance).withContext(`at ${x}`).toBeGreaterThanOrEqual(0);
        expect(chance).withContext(`at ${x}`).toBeLessThanOrEqual(1);
      }
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
  // moves up and down, so features came and went on their own.
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
