import { Starfield } from './starfield';

describe('Starfield', () => {
  it('places every star inside the area', () => {
    const field = new Starfield(40, 960, 720, 7);
    expect(field.count).toBe(40);
    for (let i = 0; i < field.count; i++) {
      expect(field.x[i]).toBeGreaterThanOrEqual(0);
      expect(field.x[i]).toBeLessThanOrEqual(960);
      expect(field.y[i]).toBeGreaterThanOrEqual(0);
      expect(field.y[i]).toBeLessThanOrEqual(720);
    }
  });

  it('is the same for the same seed', () => {
    const a = new Starfield(10, 960, 720, 3);
    const b = new Starfield(10, 960, 720, 3);
    expect(Array.from(a.x)).toEqual(Array.from(b.x));
  });

  it('drifts down, near stars faster than far ones (parallax)', () => {
    const field = new Starfield(40, 960, 720, 11);
    const before = Array.from(field.y);
    field.update(100, 1);
    for (let i = 0; i < field.count; i++) {
      const moved = (field.y[i] - before[i] + 720) % 720;
      expect(moved).toBeCloseTo(field.speed[i] * 0.1, 3);
    }
    let near = 0;
    let far = 0;
    for (let i = 0; i < field.count; i++) {
      if (field.depth[i] > 0.66) near = Math.max(near, field.speed[i]);
      if (field.depth[i] < 0.33) far = Math.max(far, field.speed[i]);
    }
    if (near > 0 && far > 0) expect(near).toBeGreaterThan(far);
  });

  it('wraps a star that leaves the bottom back to the top', () => {
    const field = new Starfield(5, 960, 720, 1);
    field.update(1_000_000, 1);
    for (let i = 0; i < field.count; i++) {
      expect(field.y[i]).toBeGreaterThanOrEqual(0);
      expect(field.y[i]).toBeLessThanOrEqual(720);
    }
  });

  it('follows the time scale (slow motion)', () => {
    const a = new Starfield(5, 960, 720, 2);
    const b = new Starfield(5, 960, 720, 2);
    a.update(100, 1);
    b.update(400, 0.25);
    expect(Array.from(a.y)).toEqual(Array.from(b.y));
  });
});
