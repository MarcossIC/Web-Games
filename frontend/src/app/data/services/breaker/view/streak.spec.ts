import { buildStreak, STREAK_STRIDE, streakFade, streakTaper } from './streak';
import { TrailRing } from './trail-ring';

describe('buildStreak', () => {
  function ringOf(points: [number, number][]): TrailRing {
    const ring = new TrailRing(16, 1000);
    for (const [x, y] of points) ring.push(x, y);
    return ring;
  }

  it('draws nothing before the ball has left a sample behind', () => {
    const out = new Float32Array(8 * STREAK_STRIDE);
    expect(buildStreak(new TrailRing(4), 10, 10, 5, out)).toBe(0);
  });

  it('starts at the ball, full width, and narrows to a point at the oldest sample', () => {
    // The ball travels right along y = 50: samples behind it at x = 30, 20, 10.
    const ring = ringOf([
      [10, 50],
      [20, 50],
      [30, 50]
    ]);
    const out = new Float32Array(8 * STREAK_STRIDE);
    const n = buildStreak(ring, 40, 50, 6, out);
    expect(n).toBe(4);
    // At the ball: edges 6 px either side of the path, across the direction of travel.
    expect(out[0]).toBeCloseTo(40);
    expect(Math.abs(out[1] - out[3])).toBeCloseTo(12);
    // At the tail: both edges meet on the oldest sample.
    const t = (n - 1) * STREAK_STRIDE;
    expect(out[t]).toBeCloseTo(10);
    expect(out[t + 1]).toBeCloseTo(50);
    expect(out[t + 3]).toBeCloseTo(50);
  });

  it('never writes past its buffer', () => {
    const ring = ringOf([
      [0, 0],
      [5, 0],
      [10, 0],
      [15, 0],
      [20, 0]
    ]);
    const out = new Float32Array(3 * STREAK_STRIDE);
    expect(buildStreak(ring, 25, 0, 4, out)).toBe(3);
  });

  it('keeps a width where two samples coincide', () => {
    const ring = ringOf([
      [0, 0],
      [10, 0]
    ]);
    const out = new Float32Array(4 * STREAK_STRIDE);
    buildStreak(ring, 10, 0, 4, out);
    expect(Number.isFinite(out[1])).toBeTrue();
    expect(Math.abs(out[1] - out[3])).toBeCloseTo(8);
  });
});

describe('streak taper and fade', () => {
  it('are full at the ball and gone at the tail', () => {
    expect(streakTaper(0)).toBe(1);
    expect(streakTaper(1)).toBe(0);
    expect(streakFade(0)).toBe(1);
    expect(streakFade(1)).toBe(0);
    expect(streakFade(0.5)).toBeLessThan(streakTaper(0.5));
  });
});
