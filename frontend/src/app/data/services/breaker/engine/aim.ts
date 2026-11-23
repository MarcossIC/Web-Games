import { WORLD } from './config';
import { sweepCircleRect, type SweepHit } from './geometry';
import type { Boss, Brick } from './types';

/** Wall bounces the guide follows at most: past that it is a bank shot the player has to read. */
const MAX_BOUNCES = 2;

/** What the aim guide can run into besides the walls and the ceiling. */
export interface AimObstacles {
  readonly bricks: readonly Readonly<Brick>[];
  readonly boss?: Readonly<Boss> | null;
}

/**
 * The path a held ball would take if launched now, as a polyline in `out`
 * (x0, y0, x1, y1, ...: the start, each wall bounce, the end). It runs
 * `length` px along `angle` (from vertical, positive to the right) from the
 * ball's center, bounces off the walls and the ceiling like the ball does
 * (its center r away from them) and stops at the first live brick or the
 * core it would touch. Returns the number of points written.
 *
 * Pure and allocation-free for a reused `out`: the view calls it every frame.
 */
export function traceAim(
  out: number[],
  x: number,
  y: number,
  angle: number,
  r: number,
  length: number,
  obstacles: AimObstacles,
  hit: SweepHit = { t: 0, nx: 0, ny: 0, depth: 0 }
): number {
  out.length = 0;
  out.push(x, y);
  let dx = Math.sin(angle);
  let dy = -Math.cos(angle);
  let left = Math.max(0, length);

  for (let bounce = 0; bounce <= MAX_BOUNCES && left > 0; bounce++) {
    const mx = dx * left;
    const my = dy * left;
    let bestT = 1;
    let wall = 0; // 0 none, 1 side wall, 2 ceiling, 3 something solid

    if (mx < 0 && x + mx < WORLD.LEFT_WALL_X + r) {
      bestT = Math.max(0, (WORLD.LEFT_WALL_X + r - x) / mx);
      wall = 1;
    } else if (mx > 0 && x + mx > WORLD.RIGHT_WALL_X - r) {
      bestT = Math.max(0, (WORLD.RIGHT_WALL_X - r - x) / mx);
      wall = 1;
    }
    if (my < 0 && y + my < WORLD.CEILING_Y + r) {
      const t = Math.max(0, (WORLD.CEILING_Y + r - y) / my);
      if (t < bestT) {
        bestT = t;
        wall = 2;
      }
    }

    const bricks = obstacles.bricks;
    for (let i = 0; i < bricks.length; i++) {
      const b = bricks[i];
      if (!b.alive) continue;
      if (sweepCircleRect(x, y, mx, my, r, b.x, b.y, b.w, b.h, hit) && hit.t < bestT) {
        bestT = hit.t;
        wall = 3;
      }
    }
    const boss = obstacles.boss;
    if (boss && boss.alive && sweepCircleRect(x, y, mx, my, r, boss.x, boss.y, boss.w, boss.h, hit) && hit.t < bestT) {
      bestT = hit.t;
      wall = 3;
    }

    x += mx * bestT;
    y += my * bestT;
    left -= left * bestT;
    out.push(x, y);
    if (wall === 1) dx = -dx;
    else if (wall === 2) dy = -dy;
    else break;
  }
  return out.length / 2;
}
