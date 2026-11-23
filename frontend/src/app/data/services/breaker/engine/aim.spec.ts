import { traceAim } from './aim';
import { WORLD } from './config';
import type { Brick } from './types';

const R = 8;

function brick(x: number, y: number, alive = true): Brick {
  return { id: 1, col: 0, row: 0, x, y, w: 66, h: 26, kind: 'normal', hp: 1, maxHp: 1, tone: 0, alive, flashMs: 0 };
}

/** The points of a trace as [x, y] pairs. */
function points(out: number[], count: number): [number, number][] {
  const list: [number, number][] = [];
  for (let i = 0; i < count; i++) list.push([out[i * 2], out[i * 2 + 1]]);
  return list;
}

describe('traceAim', () => {
  it('runs straight along the angle for its whole length in open space', () => {
    const out: number[] = [];
    const count = traceAim(out, 480, 600, Math.PI / 6, R, 200, { bricks: [] });
    const [start, end] = points(out, count);
    expect(count).toBe(2);
    expect(start).toEqual([480, 600]);
    expect(end[0]).toBeCloseTo(480 + 200 * Math.sin(Math.PI / 6), 6);
    expect(end[1]).toBeCloseTo(600 - 200 * Math.cos(Math.PI / 6), 6);
  });

  it('bounces off a side wall with the ball one radius away from it, keeping the length', () => {
    const out: number[] = [];
    const count = traceAim(out, 900, 600, Math.PI / 4, R, 300, { bricks: [] });
    const list = points(out, count);
    expect(count).toBe(3);
    expect(list[1][0]).toBeCloseTo(WORLD.RIGHT_WALL_X - R, 6);
    expect(list[2][0]).toBeLessThan(list[1][0]);
    let total = 0;
    for (let i = 1; i < list.length; i++) total += Math.hypot(list[i][0] - list[i - 1][0], list[i][1] - list[i - 1][1]);
    expect(total).toBeCloseTo(300, 6);
  });

  it('bounces off the ceiling', () => {
    const out: number[] = [];
    const count = traceAim(out, 480, 200, 0.2, R, 400, { bricks: [] });
    const list = points(out, count);
    expect(list[1][1]).toBeCloseTo(WORLD.CEILING_Y + R, 6);
    expect(list[2][1]).toBeGreaterThan(list[1][1]);
  });

  it('stops where the ball would touch the first live brick, skipping dead ones', () => {
    const out: number[] = [];
    const dead = brick(447, 500, false);
    const live = brick(447, 300);
    const count = traceAim(out, 480, 600, 0, R, 500, { bricks: [dead, live] });
    const list = points(out, count);
    expect(count).toBe(2);
    expect(list[1][0]).toBeCloseTo(480, 6);
    expect(list[1][1]).toBeCloseTo(300 + 26 + R, 6);
  });

  it('stops at the core of a boss sector', () => {
    const out: number[] = [];
    const boss = { x: 400, y: 200, w: 160, h: 60, alive: true } as Parameters<typeof traceAim>[6]['boss'];
    const count = traceAim(out, 480, 600, 0, R, 600, { bricks: [], boss });
    expect(points(out, count)[1][1]).toBeCloseTo(260 + R, 6);
  });

  it('follows at most two wall bounces, and reuses the array it is given', () => {
    const out: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const count = traceAim(out, 480, 650, 1.3, R, 5000, { bricks: [] });
    expect(count).toBe(4);
    expect(out.length).toBe(8);
  });
});
