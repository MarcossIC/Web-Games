/**
 * How a Ring Out level is written down. Angles are in degrees, clockwise
 * from the right (the board's y points down, as on screen).
 */

export type PieceColor =
  | 'orange'
  | 'blue'
  | 'purple'
  | 'green'
  | 'red'
  | 'teal'
  | 'yellow'
  | 'pink'
  | 'navy'
  | 'lime';

export type Point = readonly [number, number];

export interface RingSpec {
  readonly x: number;
  readonly y: number;
  /** Radius to the middle of the tube; RING_RADIUS when left out. */
  readonly r?: number;
  /** Width of the opening in degrees; 0 is a closed ring. DEFAULT_GAP when left out. */
  readonly gap?: number;
  /** Where the opening faces, in degrees. */
  readonly facing?: number;
  readonly color: PieceColor;
}

/**
 * A clip: an arm fixed to one ring (`from`) ending in a sleeve closed
 * around the tube of another (`on`). `on` can turn and slide its tube out
 * of the sleeve through its opening; `from` cannot turn while it holds it.
 */
export interface ClipSpec {
  readonly from: number;
  readonly on: number;
  /** Where the sleeve sits on `on`, in degrees; facing `from` when left out. */
  readonly at?: number;
}

/**
 * A rod held by a metal clamp. It slides from `tail` towards `head`, so
 * the part behind the clamp is straight; `bend`, if any, is where it
 * leads, past the head.
 */
export interface RodSpec {
  readonly tail: Point;
  readonly head: Point;
  readonly bend?: Point;
  /** Where the clamp holds it, from the tail (0) to the head (1). 0.5 when left out. */
  readonly clamp?: number;
  readonly color: PieceColor;
}

/** One move of a solution: turn a ring by some degrees (clockwise is positive), or pull a rod. */
export type Move = { readonly ring: number; readonly turn: number } | { readonly rod: number };

export interface LevelSpec {
  readonly rings: readonly RingSpec[];
  readonly clips: readonly ClipSpec[];
  readonly rods?: readonly RodSpec[];
  /** A line for the player, on the first levels. */
  readonly tip?: string;
  /** A way to clear the level. The tests play it; the game never reads it. */
  readonly solution: readonly Move[];
}
