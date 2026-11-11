import {
  buildGalaxyPoints,
  buildStarfieldPositions,
  GalaxyOptions,
} from './galaxy-points';

describe('buildGalaxyPoints', () => {
  const options: GalaxyOptions = {
    count: 500,
    arms: 3,
    radius: 5,
    spin: 1.1,
    randomness: 0.4,
    seed: 7,
  };

  it('returns one xyz position and one rgb color per point', () => {
    const points = buildGalaxyPoints(options);

    expect(points.positions.length).toBe(500 * 3);
    expect(points.colors.length).toBe(500 * 3);
  });

  it('returns the same galaxy for the same seed', () => {
    const first = buildGalaxyPoints(options);
    const second = buildGalaxyPoints(options);

    expect(Array.from(first.positions)).toEqual(Array.from(second.positions));
  });

  it('returns a different galaxy for a different seed', () => {
    const first = buildGalaxyPoints(options);
    const second = buildGalaxyPoints({ ...options, seed: 8 });

    expect(Array.from(first.positions)).not.toEqual(
      Array.from(second.positions)
    );
  });

  it('keeps every point finite and every color channel between 0 and 1', () => {
    const points = buildGalaxyPoints(options);

    expect(points.positions.every((value) => Number.isFinite(value))).toBeTrue();
    expect(points.colors.every((value) => value >= 0 && value <= 1)).toBeTrue();
  });
});

describe('buildStarfieldPositions', () => {
  it('places every star at the given distance from the center', () => {
    const positions = buildStarfieldPositions(200, 40, 3);

    expect(positions.length).toBe(200 * 3);
    for (let i = 0; i < 200; i++) {
      const distance = Math.hypot(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      );
      expect(distance).toBeCloseTo(40, 3);
    }
  });

  it('returns the same sky for the same seed', () => {
    expect(Array.from(buildStarfieldPositions(50, 40, 3))).toEqual(
      Array.from(buildStarfieldPositions(50, 40, 3))
    );
  });
});
