import {
  OBSTACLES_AT_START,
  OBSTACLES_MAX,
  OBSTACLE_SOLID_MS,
  OBSTACLE_WARNING_MS,
  ObstacleField,
  ObstacleSurroundings,
} from './obstacles';

/** A repeatable random source, so the tests always place the same rocks. */
function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

describe('ObstacleField', () => {
  const around: ObstacleSurroundings = {
    columns: 26,
    rows: 15,
    taken: () => false,
    head: { x: 14, y: 8 },
    heading: { x: 1, y: 0 },
  };

  it('raises the first rocks one after another, see-through', () => {
    const field = new ObstacleField(seeded(7));
    field.reset();
    field.tick(500, OBSTACLES_AT_START, around);

    expect(field.obstacles.length).toBe(1);

    field.tick(3000, OBSTACLES_AT_START, around);

    expect(field.obstacles.length).toBe(OBSTACLES_AT_START);
  });

  it('only kills once a rock is solid', () => {
    const field = new ObstacleField(seeded(3));
    field.reset();
    field.tick(500, 1, around);
    const [rock] = field.obstacles;
    const { x, y } = rock.cells[0];

    expect(field.isAt(x, y)).toBeTrue();
    expect(field.isSolidAt(x, y)).toBeFalse();

    field.tick(OBSTACLE_WARNING_MS, 1, around);

    expect(field.isSolidAt(x, y)).toBeTrue();

    field.tick(OBSTACLE_SOLID_MS, 1, around);

    expect(field.obstacles).not.toContain(rock);
  });

  it('never covers a taken cell, the head, or the line ahead of it', () => {
    const field = new ObstacleField(seeded(11));
    field.reset();
    const taken = (x: number, y: number) => x <= 6;
    for (let i = 0; i < 200; i++) {
      field.tick(400, OBSTACLES_MAX, { ...around, taken });
      for (const rock of field.obstacles) {
        for (const cell of rock.cells) {
          expect(cell.x).toBeGreaterThan(6);
          expect(cell.x).toBeLessThanOrEqual(around.columns);
          expect(cell.y).toBeGreaterThanOrEqual(1);
          expect(cell.y).toBeLessThanOrEqual(around.rows);
          const ahead = cell.y === around.head.y && cell.x > around.head.x && cell.x <= around.head.x + 5;
          expect(ahead).toBeFalse();
        }
      }
      expect(field.obstacles.length).toBeLessThanOrEqual(OBSTACLES_MAX);
    }
  });

  it('has nothing after clear', () => {
    const field = new ObstacleField(seeded(5));
    field.reset();
    field.tick(5000, OBSTACLES_AT_START, around);
    field.clear();
    field.tick(5000, 0, around);

    expect(field.obstacles.length).toBe(0);
  });
});
