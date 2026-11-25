import { distanceToPolyline, radians, samplePolyline, seededRandom, wrapAngle } from './geometry';

describe('Ring Out geometry', () => {
  it('wraps angles into (-π, π]', () => {
    expect(wrapAngle(0)).toBe(0);
    expect(wrapAngle(Math.PI)).toBeCloseTo(Math.PI, 12);
    expect(wrapAngle(-Math.PI)).toBeCloseTo(Math.PI, 12);
    expect(wrapAngle(radians(270))).toBeCloseTo(radians(-90), 12);
    expect(wrapAngle(radians(-450))).toBeCloseTo(radians(-90), 12);
  });

  it('samples a polyline with both ends and no gap wider than the step', () => {
    const points = samplePolyline(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 7 },
      ],
      3
    );
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[points.length - 1]).toEqual({ x: 10, y: 7 });
    for (let i = 1; i < points.length; i++) {
      expect(Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)).toBeLessThanOrEqual(3 + 1e-9);
    }
  });

  it('measures the distance to a polyline', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(distanceToPolyline({ x: 5, y: 3 }, path)).toBeCloseTo(3, 12);
    expect(distanceToPolyline({ x: 13, y: 4 }, path)).toBeCloseTo(5, 12);
  });

  it('repeats the same numbers for the same seed', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    first.forEach((n) => {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    });
  });
});
