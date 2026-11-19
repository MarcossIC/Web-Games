import { clamp01, easeOutBack, easeOutCubic, lerp, pulse, squash } from './view-math';

describe('view-math', () => {
  describe('lerp (interpolation between fixed steps)', () => {
    it('goes from prev at alpha 0 to cur at alpha 1', () => {
      expect(lerp(10, 20, 0)).toBe(10);
      expect(lerp(10, 20, 1)).toBe(20);
      expect(lerp(10, 20, 0.25)).toBe(12.5);
    });
  });

  it('clamp01 keeps a value inside 0..1', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(3)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
  });

  it('easings start at 0 and end at 1', () => {
    for (const ease of [easeOutCubic, easeOutBack]) {
      expect(ease(0)).toBeCloseTo(0, 6);
      expect(ease(1)).toBeCloseTo(1, 6);
    }
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    // Back overshoots before settling.
    expect(easeOutBack(0.7)).toBeGreaterThan(1);
  });

  it('pulse swings 0..1 with the given period', () => {
    expect(pulse(0, 1000)).toBeCloseTo(0, 6);
    expect(pulse(500, 1000)).toBeCloseTo(1, 6);
    expect(pulse(1000, 1000)).toBeCloseTo(0, 6);
  });

  describe('squash (paddle hit)', () => {
    it('is flattened right after the hit and back to rest at the end', () => {
      const start = squash(0);
      expect(start.y).toBeLessThan(1);
      expect(start.x).toBeGreaterThan(1);
      const end = squash(1);
      expect(end.x).toBeCloseTo(1, 6);
      expect(end.y).toBeCloseTo(1, 6);
    });

    it('reuses its result object', () => {
      expect(squash(0.2)).toBe(squash(0.6));
    });
  });
});
