/**
 * The ways to play Snakeling.
 * - classic: the edges are walls, and running into one ends the game.
 * - portal: no walls, the snake leaves on one side and comes back on the other.
 * - time: one minute to score as much as possible, with walls as in Classic.
 */
export type SnakelingMode = 'classic' | 'portal' | 'time';

/** What ended a game. */
export type SnakelingEnding = 'wall' | 'tail' | 'time';

/** Whether the edges of the board are walls in `mode`. */
export function hasWalls(mode: SnakelingMode): boolean {
  return mode === 'classic' || mode === 'time';
}

/** Whether `mode` is played against the clock. */
export function isTimed(mode: SnakelingMode): boolean {
  return mode === 'time';
}
