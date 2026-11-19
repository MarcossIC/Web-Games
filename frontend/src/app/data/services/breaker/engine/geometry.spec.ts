import { reflect, sweepCircleRect, type SweepHit } from './geometry';

/** The rect used by most cases: x 100..200, y 100..150. */
const L = 100;
const T = 100;
const W = 100;
const H = 50;
const R = 8;

function sweep(px: number, py: number, dx: number, dy: number, r = R): SweepHit | null {
  return sweepCircleRect(px, py, dx, dy, r, L, T, W, H);
}

describe('sweepCircleRect', () => {
  describe('face hits', () => {
    it('hits the top face from above', () => {
      const hit = sweep(150, 50, 0, 100);
      expect(hit).not.toBeNull();
      // Touches when the center is r above the face: y = 92, 42 of 100.
      expect(hit!.t).toBeCloseTo(0.42, 10);
      expect([hit!.nx, hit!.ny]).toEqual([0, -1]);
      expect(hit!.depth).toBe(0);
    });

    it('hits the bottom face from below', () => {
      const hit = sweep(150, 200, 0, -100)!;
      expect(hit.t).toBeCloseTo((200 - 158) / 100, 10);
      expect([hit.nx, hit.ny]).toEqual([0, 1]);
    });

    it('hits the left face from the left', () => {
      const hit = sweep(50, 125, 100, 0)!;
      expect(hit.t).toBeCloseTo((92 - 50) / 100, 10);
      expect([hit.nx, hit.ny]).toEqual([-1, 0]);
    });

    it('hits the right face from the right', () => {
      const hit = sweep(260, 125, -100, 0)!;
      expect(hit.t).toBeCloseTo((260 - 208) / 100, 10);
      expect([hit.nx, hit.ny]).toEqual([1, 0]);
    });

    it('hits a face on a diagonal path', () => {
      const hit = sweep(120, 52, 40, 80)!;
      expect(hit.t).toBeCloseTo(0.5, 10);
      expect([hit.nx, hit.ny]).toEqual([0, -1]);
    });

    it('hits a face near its end, where the expanded rect is still flat', () => {
      const hit = sweep(199, 50, 0, 100)!;
      expect([hit.nx, hit.ny]).toEqual([0, -1]);
      expect(hit.t).toBeCloseTo(0.42, 10);
    });
  });

  describe('corner hits', () => {
    it('reflects along the corner normal on a diagonal corner hit', () => {
      // Straight at the top-left corner along the diagonal.
      const hit = sweep(50, 50, 50, 50)!;
      const d = R / Math.SQRT2;
      // Center at contact: (100 - d, 100 - d).
      expect(hit.t).toBeCloseTo((100 - d - 50) / 50, 8);
      expect(hit.nx).toBeCloseTo(-Math.SQRT1_2, 8);
      expect(hit.ny).toBeCloseTo(-Math.SQRT1_2, 8);
    });

    it('hits the rounded corner later than the square box would say', () => {
      // A vertical path 5 px left of the rect: inside the expanded box, but
      // it only meets the corner circle where |center - corner| = r.
      const hit = sweep(95, 50, 0, 100)!;
      const yAtContact = 100 - Math.sqrt(R * R - 5 * 5);
      expect(hit.t).toBeCloseTo((yAtContact - 50) / 100, 8);
      expect(hit.nx).toBeCloseTo(-5 / R, 8);
      expect(hit.ny).toBeCloseTo(-Math.sqrt(R * R - 25) / R, 8);
    });

    it('finds each of the four corners', () => {
      const cases: [number, number, number, number, number, number][] = [
        [50, 50, 50, 50, -1, -1],
        [250, 50, -50, 50, 1, -1],
        [50, 200, 50, -50, -1, 1],
        [250, 200, -50, -50, 1, 1],
      ];
      for (const [px, py, dx, dy, sx, sy] of cases) {
        const hit = sweep(px, py, dx, dy)!;
        expect(Math.sign(hit.nx)).toBe(sx);
        expect(Math.sign(hit.ny)).toBe(sy);
        expect(Math.hypot(hit.nx, hit.ny)).toBeCloseTo(1, 10);
      }
    });

    it('misses when the path only crosses the square corner of the expanded box', () => {
      // The line x + y = 186 passes 9.9 px from the corner (100, 100): inside
      // the rect grown by r as a box, outside it once the corner is rounded.
      expect(sweep(80, 106, 26, -26)).toBeNull();
      // Stopping at (94, 94), 8.5 px from the corner, is no hit either.
      expect(sweep(50, 50, 44, 44)).toBeNull();
      // Starting there and moving away is no hit.
      expect(sweep(94, 94, -10, -10)).toBeNull();
    });

    it('hits the corner from a start inside the square corner of the box', () => {
      // (94, 94) is in the box corner but 8.5 px from the corner point.
      const hit = sweep(94, 94, 10, 10)!;
      expect(hit).not.toBeNull();
      expect(hit.t).toBeGreaterThan(0);
      expect(hit.nx).toBeCloseTo(-Math.SQRT1_2, 8);
    });
  });

  describe('grazing', () => {
    it('misses a path that passes just outside the radius', () => {
      expect(sweep(50, 100 - R - 0.01, 200, 0)).toBeNull();
      expect(sweep(100 - R - 0.01, 50, 0, 200)).toBeNull();
    });

    it('hits a path that passes just inside the radius, at the corner', () => {
      const hit = sweep(50, 100 - R + 0.5, 200, 0)!;
      expect(hit).not.toBeNull();
      expect(hit.nx).toBeLessThan(0);
      expect(hit.ny).toBeLessThan(0);
    });

    it('a ball touching a face and sliding along it does not hit', () => {
      expect(sweep(150, 100 - R, 30, 0)).toBeNull();
    });

    it('a ball touching a face and moving away does not hit', () => {
      expect(sweep(150, 100 - R, 10, -30)).toBeNull();
    });

    it('a ball touching a face and moving in hits at t = 0', () => {
      const hit = sweep(150, 100 - R, 0, 30)!;
      expect(hit.t).toBe(0);
      expect([hit.nx, hit.ny]).toEqual([0, -1]);
    });
  });

  describe('out of reach', () => {
    it('returns null when the path ends before the rect', () => {
      expect(sweep(150, 50, 0, 40)).toBeNull();
    });

    it('returns null when moving away', () => {
      expect(sweep(150, 50, 0, -100)).toBeNull();
      expect(sweep(300, 125, 100, 0)).toBeNull();
    });

    it('returns null for a path that passes beside the rect', () => {
      expect(sweep(50, 50, 0, 200)).toBeNull();
    });
  });

  describe('starting inside', () => {
    it('pushes out through the closest face when the center is inside', () => {
      // 3 px under the top face: the top is the shallowest way out.
      const hit = sweep(150, 103, 0, 10)!;
      expect(hit.t).toBe(0);
      expect([hit.nx, hit.ny]).toEqual([0, -1]);
      expect(hit.depth).toBeCloseTo(3 + R, 10);
    });

    it('picks the left face when it is the shallowest', () => {
      const hit = sweep(102, 125, 0, 0)!;
      expect([hit.nx, hit.ny]).toEqual([-1, 0]);
      expect(hit.depth).toBeCloseTo(2 + R, 10);
    });

    it('pushes along the line to the closest point when the center is outside but overlapping', () => {
      const hit = sweep(150, 96, 5, -5)!;
      expect(hit.t).toBe(0);
      expect([hit.nx, hit.ny]).toEqual([0, -1]);
      expect(hit.depth).toBeCloseTo(4, 10);

      const corner = sweep(97, 96, 0, 0)!;
      expect(corner.nx).toBeCloseTo(-0.6, 10);
      expect(corner.ny).toBeCloseTo(-0.8, 10);
      expect(corner.depth).toBeCloseTo(R - 5, 10);
    });
  });

  describe('zero displacement', () => {
    it('returns null when not overlapping', () => {
      expect(sweep(150, 50, 0, 0)).toBeNull();
      expect(sweep(150, 100 - R, 0, 0)).toBeNull();
    });
  });

  it('fills and returns the given object, so the hot path allocates nothing', () => {
    const out: SweepHit = { t: -1, nx: 0, ny: 0, depth: 0 };
    const hit = sweepCircleRect(150, 50, 0, 100, R, L, T, W, H, out);
    expect(hit).toBe(out);
    expect(out.t).toBeCloseTo(0.42, 10);
  });
});

describe('reflect', () => {
  it('mirrors the velocity on the normal', () => {
    const v = { x: 3, y: 4 };
    reflect(v, 0, -1);
    expect(v).toEqual({ x: 3, y: -4 });
  });

  it('leaves a velocity that already moves away untouched', () => {
    const v = { x: 3, y: -4 };
    reflect(v, 0, -1);
    expect(v).toEqual({ x: 3, y: -4 });
  });

  it('reflects on a diagonal normal', () => {
    const v = { x: 1, y: 0 };
    reflect(v, -Math.SQRT1_2, -Math.SQRT1_2);
    expect(v.x).toBeCloseTo(0, 10);
    expect(v.y).toBeCloseTo(-1, 10);
  });
});
