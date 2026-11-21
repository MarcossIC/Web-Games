/** One of the four keys the game steers with. */
export type Turn = 'w' | 'a' | 's' | 'd';

const OPPOSITE: Record<Turn, Turn> = { w: 's', s: 'w', a: 'd', d: 'a' };

/** A finger has to travel this far before it counts as a swipe. */
export const SWIPE_MIN_PX = 22;
/** Turns waiting for the next steps. Two are enough to turn back in a U. */
const MAX_QUEUED = 2;

/**
 * The turn a finger made by moving from where it was by (dx, dy),
 * or null while it has not gone far enough to tell.
 */
export function swipeTurn(
  dx: number,
  dy: number,
  min = SWIPE_MIN_PX
): Turn | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < min) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'd' : 'a';
  return dy > 0 ? 's' : 'w';
}

/** The key for the way the snake heads, from its speed on each axis. */
export function headingTurn(x: number, y: number): Turn {
  if (x > 0) return 'd';
  if (x < 0) return 'a';
  return y > 0 ? 's' : 'w';
}

/**
 * Turns asked for faster than the snake steps.
 *
 * The game only keeps one direction, so two quick turns between two steps
 * (right, then up and left) would leave it heading straight back into its
 * own body. Here each step takes one turn, in the order they were asked.
 */
export class TurnQueue {
  private turns: Turn[] = [];

  /**
   * @param turn the turn asked for
   * @param heading the way the snake heads now
   * @returns whether the turn was kept
   */
  push(turn: Turn, heading: Turn): boolean {
    const last = this.turns.at(-1) ?? heading;
    // Going on the same way changes nothing; going back is not allowed.
    if (turn === last || turn === OPPOSITE[last]) return false;
    if (this.turns.length >= MAX_QUEUED) return false;
    this.turns.push(turn);
    return true;
  }

  /** The turn to make on this step, if any. */
  take(): Turn | undefined {
    return this.turns.shift();
  }

  clear(): void {
    this.turns = [];
  }
}
