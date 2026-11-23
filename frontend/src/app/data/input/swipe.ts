/** The four ways a swipe goes. */
export type Direction = 'up' | 'down' | 'left' | 'right';

/** A finger has to travel this far before it counts as a swipe. */
export const SWIPE_MIN_PX = 22;

/**
 * The way a finger went by moving from where it was by (dx, dy),
 * or null while it has not gone far enough to tell.
 */
export function swipeDirection(dx: number, dy: number, min = SWIPE_MIN_PX): Direction | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < min) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/** What SwipeTracker reads from a pointer event. */
export interface SwipePointer {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  /** 'mouse', 'touch' or 'pen', as PointerEvent.pointerType. */
  readonly type: string;
}

/**
 * Swipes of one finger. The finger does not have to lift between turns:
 * once a direction is taken, the swipe starts again from there, so one
 * stroke can draw a whole path (right, then down, then left...). A mouse
 * is left out: its clicks stay clicks.
 */
export class SwipeTracker {
  private from: { x: number; y: number; id: number } | null = null;

  constructor(private readonly min = SWIPE_MIN_PX) {}

  down(pointer: SwipePointer): void {
    if (pointer.type === 'mouse') return;
    // A new finger takes over: the swipe follows the one that went down last.
    this.from = { x: pointer.x, y: pointer.y, id: pointer.id };
  }

  /** The direction this move made, if it went far enough. */
  move(pointer: SwipePointer): Direction | null {
    const from = this.from;
    if (!from || pointer.id !== from.id) return null;
    const direction = swipeDirection(pointer.x - from.x, pointer.y - from.y, this.min);
    if (direction) this.from = { x: pointer.x, y: pointer.y, id: from.id };
    return direction;
  }

  /** The finger came up, or the system took it (pointercancel). */
  up(pointer: Pick<SwipePointer, 'id'>): void {
    if (this.from && pointer.id === this.from.id) this.from = null;
  }
}
