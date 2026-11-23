import type { Direction, SwipePointer } from './swipe';

/** A finger that travels less than this before it lifts can still be a tap. */
export const TAP_SLOP_PX = 10;

/** A tap lifts within this many milliseconds; a longer touch is a hold, not a tap. */
export const TAP_MAX_MS = 400;

export interface DragOptions {
  /**
   * How far the finger travels for one step: on a board, the size a cell is
   * drawn at, so the piece follows the finger. Read on every move, so it
   * keeps up with a board that is resized.
   */
  readonly step: () => number;
  readonly tapSlopPx?: number;
  readonly tapMaxMs?: number;
}

interface Stroke {
  readonly id: number;
  readonly startX: number;
  readonly startY: number;
  readonly startTime: number;
  /** Where the next step is measured from. */
  x: number;
  y: number;
  /** The axis the stroke took with its first step; it keeps it until it lifts. */
  axis: 'x' | 'y' | null;
  /** It went farther than a tap goes. */
  travelled: boolean;
}

/**
 * Drags of one finger over a board, in steps of a cell, and taps.
 *
 * - A drag moves one step per cell the finger travels, as many as it
 *   covered since the last move: a fast drag is not cut short.
 * - The first step picks the axis and the stroke keeps it until the finger
 *   lifts, so a sideways drag that drifts down does not also drop the piece.
 * - A finger that lifts quickly without having travelled is a tap.
 *
 * A mouse is left out: its clicks are read as clicks by the page.
 */
export class DragTracker {
  private stroke: Stroke | null = null;
  private readonly tapSlopPx: number;
  private readonly tapMaxMs: number;

  constructor(private readonly options: DragOptions) {
    this.tapSlopPx = options.tapSlopPx ?? TAP_SLOP_PX;
    this.tapMaxMs = options.tapMaxMs ?? TAP_MAX_MS;
  }

  down(pointer: SwipePointer, time: number): void {
    if (pointer.type === 'mouse') return;
    // A new finger takes over: the drag follows the one that went down last.
    this.stroke = {
      id: pointer.id,
      startX: pointer.x,
      startY: pointer.y,
      startTime: time,
      x: pointer.x,
      y: pointer.y,
      axis: null,
      travelled: false,
    };
  }

  /** The steps this move made, oldest first; empty while it has not gone a whole cell. */
  move(pointer: SwipePointer): Direction[] {
    const stroke = this.stroke;
    if (!stroke || pointer.id !== stroke.id) return [];

    if (Math.hypot(pointer.x - stroke.startX, pointer.y - stroke.startY) >= this.tapSlopPx) {
      stroke.travelled = true;
    }

    const step = Math.max(1, this.options.step());
    const dx = pointer.x - stroke.x;
    const dy = pointer.y - stroke.y;
    if (!stroke.axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < step) return [];
      stroke.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }

    const along = stroke.axis === 'x' ? dx : dy;
    const count = Math.trunc(Math.abs(along) / step);
    if (count === 0) return [];
    const moved = Math.sign(along) * count * step;
    if (stroke.axis === 'x') stroke.x += moved;
    else stroke.y += moved;

    const direction: Direction =
      stroke.axis === 'x' ? (along > 0 ? 'right' : 'left') : along > 0 ? 'down' : 'up';
    return Array.from({ length: count }, () => direction);
  }

  /** The finger came up. Returns 'tap' if it tapped. */
  up(pointer: Pick<SwipePointer, 'id'>, time: number): 'tap' | null {
    const stroke = this.stroke;
    if (!stroke || pointer.id !== stroke.id) return null;
    this.stroke = null;
    const tapped = !stroke.travelled && !stroke.axis && time - stroke.startTime <= this.tapMaxMs;
    return tapped ? 'tap' : null;
  }

  /** The system took the finger (pointercancel): neither a drag nor a tap. */
  cancel(pointer: Pick<SwipePointer, 'id'>): void {
    if (this.stroke && pointer.id === this.stroke.id) this.stroke = null;
  }
}
