/** A position on the board, in cells. May be fractional while moving. */
export interface Cell {
  x: number;
  y: number;
}

/** Size of the board in cells. Cells are numbered from 1. */
export interface Board {
  columns: number;
  rows: number;
}

/**
 * One coordinate of a segment between two steps.
 * @param size number of cells along this axis
 * @returns the position, or null when the segment did not simply move
 */
function slide(
  before: number,
  now: number,
  t: number,
  size: number
): number | null {
  const moved = now - before;
  if (Math.abs(moved) <= 1) return before + moved * t;
  // From the last cell to the first, or the other way round: the segment
  // went through an edge. It keeps going the way it was going, past the
  // edge, instead of travelling back across the whole board.
  if (Math.abs(moved) === size - 1) return before - Math.sign(moved) * t;
  return null;
}

/**
 * Where to draw each segment of the snake between two steps of the game.
 *
 * The game moves the snake one whole cell per step, a few times a second.
 * Drawing it part of the way between the last two steps on every frame is
 * what makes it glide instead of jump.
 *
 * A segment crossing an edge ends up just outside the board (for example
 * at column 32.5 of 32); `unwrapBody` and the painter take it from there.
 *
 * @param previous the body one step ago, head first
 * @param current the body now, head first
 * @param progress how far into the current step we are, 0 to 1
 */
export function interpolateBody(
  previous: readonly Cell[],
  current: readonly Cell[],
  progress: number,
  board: Board
): Cell[] {
  const t = Math.min(Math.max(progress, 0), 1);

  return current.map((now, index) => {
    // A segment the snake just grew has no past: it appears in place.
    const before = previous[index] ?? now;
    const x = slide(before.x, now.x, t, board.columns);
    const y = slide(before.y, now.y, t, board.rows);
    // Placed somewhere unrelated (a restart): it jumps.
    if (x === null || y === null) return { x: now.x, y: now.y };
    return { x, y };
  });
}

/** Moves `value` by whole boards until it is next to `anchor`. */
function near(value: number, anchor: number, size: number): number {
  let result = value;
  while (result - anchor > size / 2) result -= size;
  while (anchor - result > size / 2) result += size;
  return result;
}

/**
 * Lays the body out as one unbroken line, starting at the head.
 *
 * A snake crossing an edge has segments at both ends of the board. Each
 * segment is moved by whole boards until it sits next to the one before
 * it, so the result can run past the edges. Drawing that line once more,
 * shifted by one board, shows the part coming in on the other side.
 */
export function unwrapBody(body: readonly Cell[], board: Board): Cell[] {
  const line: Cell[] = [];
  body.forEach((segment, index) => {
    const before = line[index - 1];
    line.push(
      before
        ? {
            x: near(segment.x, before.x, board.columns),
            y: near(segment.y, before.y, board.rows),
          }
        : { x: segment.x, y: segment.y }
    );
  });
  return line;
}

/** Cells between two coordinates, going around the board if shorter. */
function apart(a: number, b: number, size: number): number {
  const direct = Math.abs(a - b);
  return Math.min(direct, size - direct);
}

/**
 * Puts a segment the snake just grew where it belongs: at the tail.
 *
 * When the snake eats, the game adds the new segment at the end of the
 * body but leaves it on the cell of the head until the next step. Drawn
 * as it is, the body would reach from the tail back to the head for a
 * moment. Any segment that is not next to the one before it is such a
 * newcomer, so it is placed on top of that one instead. From there it
 * follows on the next step, and the snake visibly grows from its tail.
 */
export function settleBody(body: readonly Cell[], board: Board): Cell[] {
  const settled: Cell[] = [];
  body.forEach((segment, index) => {
    const before = settled[index - 1];
    const follows =
      before === undefined ||
      apart(segment.x, before.x, board.columns) +
        apart(segment.y, before.y, board.rows) <=
        1;
    settled.push(follows ? { x: segment.x, y: segment.y } : { ...before });
  });
  return settled;
}
