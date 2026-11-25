import { Axis } from '@app/data/models/Axis';

/**
 * The rocks of Hard mode. Each one goes through the same life:
 * - warning: it shows, see-through, where it is about to rise. It does
 *   nothing yet, so a rock never appears under the snake and kills it.
 * - solid: running the head into it ends the game.
 * - then it sinks and, after a short while, another rises somewhere else.
 *
 * Plain TypeScript: the controller gives it the board, the time that went
 * by and what cells are taken; it never touches Angular or the screen.
 */

/** How long a rock shows, see-through, before it turns solid. */
export const OBSTACLE_WARNING_MS = 2600;
/** How long a rock stays solid. */
export const OBSTACLE_SOLID_MS = 9000;
/** In its last moments a solid rock blinks, to say it is about to sink. */
export const OBSTACLE_LEAVING_MS = 1500;
/** Time between a rock sinking and the next one rising. */
export const OBSTACLE_RESPAWN_MS = 700;
/** Rocks on the board at the start of a game. */
export const OBSTACLES_AT_START = 3;
/** Rocks on the board at the most. */
export const OBSTACLES_MAX = 6;
/** Every this many apples, one more rock. */
export const APPLES_PER_EXTRA_OBSTACLE = 5;
/**
 * No rock rises this close to the head (in steps along each axis), nor in
 * the line right ahead of it: the player always has room to react.
 */
export const OBSTACLE_HEAD_ROOM = 2;
export const OBSTACLE_AHEAD_ROOM = 5;

/** The shapes a rock can take, as offsets from its first cell. */
const SHAPES: readonly (readonly Axis[])[] = [
  [{ x: 0, y: 0 }],
  [{ x: 0, y: 0 }, { x: 1, y: 0 }],
  [{ x: 0, y: 0 }, { x: 0, y: 1 }],
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
  [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }],
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
];

/** How many tries a rock gets to find a free place before it waits. */
const PLACE_TRIES = 40;

export type ObstaclePhase = 'warning' | 'solid';

export interface Obstacle {
  cells: readonly Axis[];
  phase: ObstaclePhase;
  /** Time left in the current phase. */
  leftMs: number;
}

/** A rock that is not on the board: it rises when its wait is over. */
interface Pending {
  waitMs: number;
}

export interface ObstacleSurroundings {
  columns: number;
  rows: number;
  /** Whether the cell holds something a rock may not cover. */
  taken: (x: number, y: number) => boolean;
  head: Axis;
  heading: Axis;
}

export class ObstacleField {
  private _obstacles: Obstacle[] = [];
  private pending: Pending[] = [];

  constructor(private readonly random: () => number = Math.random) {}

  /** The rocks on the board, see-through or solid. */
  get obstacles(): readonly Obstacle[] {
    return this._obstacles;
  }

  /** A new game: no rocks yet, the first ones rise one after another. */
  reset(): void {
    this._obstacles = [];
    this.pending = [];
    for (let i = 0; i < OBSTACLES_AT_START; i++) {
      this.pending.push({ waitMs: 400 + i * 1200 });
    }
  }

  /** Nothing on the board and nothing waiting: for the other modes. */
  clear(): void {
    this._obstacles = [];
    this.pending = [];
  }

  /** Whether a solid rock is at the cell. */
  isSolidAt(x: number, y: number): boolean {
    return this._obstacles.some(
      (rock) =>
        rock.phase === 'solid' &&
        rock.cells.some((cell) => cell.x === x && cell.y === y)
    );
  }

  /** Whether any rock, see-through or solid, is at the cell. */
  isAt(x: number, y: number): boolean {
    return this._obstacles.some((rock) =>
      rock.cells.some((cell) => cell.x === x && cell.y === y)
    );
  }

  /**
   * Lets `elapsedMs` go by: see-through rocks turn solid, solid ones sink,
   * and the ones waiting rise where the board has room.
   * @param wanted how many rocks the board should hold now
   */
  tick(elapsedMs: number, wanted: number, around: ObstacleSurroundings): void {
    const kept: Obstacle[] = [];
    for (const rock of this._obstacles) {
      rock.leftMs -= elapsedMs;
      if (rock.leftMs > 0) {
        kept.push(rock);
      } else if (rock.phase === 'warning') {
        rock.phase = 'solid';
        rock.leftMs = OBSTACLE_SOLID_MS;
        kept.push(rock);
      } else {
        this.pending.push({ waitMs: OBSTACLE_RESPAWN_MS });
      }
    }
    this._obstacles = kept;

    // More apples, more rocks: the new ones join the queue.
    const count = Math.min(OBSTACLES_MAX, wanted);
    while (this._obstacles.length + this.pending.length < count) {
      this.pending.push({ waitMs: OBSTACLE_RESPAWN_MS });
    }

    const waiting: Pending[] = [];
    for (const rock of this.pending) {
      rock.waitMs -= elapsedMs;
      if (rock.waitMs > 0) {
        waiting.push(rock);
        continue;
      }
      const cells = this.findPlace(around);
      if (cells) {
        this._obstacles.push({
          cells,
          phase: 'warning',
          leftMs: OBSTACLE_WARNING_MS,
        });
      } else {
        // No room right now: try again a little later.
        waiting.push({ waitMs: OBSTACLE_RESPAWN_MS });
      }
    }
    this.pending = waiting;
  }

  /** A random shape at a random free place, or null if none was found. */
  private findPlace(around: ObstacleSurroundings): Axis[] | null {
    for (let attempt = 0; attempt < PLACE_TRIES; attempt++) {
      const shape = SHAPES[Math.floor(this.random() * SHAPES.length)];
      const x = 1 + Math.floor(this.random() * around.columns);
      const y = 1 + Math.floor(this.random() * around.rows);
      const cells = shape.map((offset) => ({ x: x + offset.x, y: y + offset.y }));
      if (cells.every((cell) => this.isFree(cell, around))) return cells;
    }
    return null;
  }

  private isFree(cell: Axis, around: ObstacleSurroundings): boolean {
    const { columns, rows, head, heading } = around;
    if (cell.x < 1 || cell.x > columns || cell.y < 1 || cell.y > rows) {
      return false;
    }
    // Rocks do not touch each other, so each one reads as its own.
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (this.isAt(cell.x + dx, cell.y + dy)) return false;
      }
    }
    if (around.taken(cell.x, cell.y)) return false;
    const dx = cell.x - head.x;
    const dy = cell.y - head.y;
    if (Math.abs(dx) <= OBSTACLE_HEAD_ROOM && Math.abs(dy) <= OBSTACLE_HEAD_ROOM) {
      return false;
    }
    // The line right ahead of the head.
    for (let step = 1; step <= OBSTACLE_AHEAD_ROOM; step++) {
      if (dx === heading.x * step && dy === heading.y * step) return false;
    }
    return true;
  }
}
