import { Board } from './board';
import { LEVELS } from './levels';
import { autoplay, plan, planNext, playMove } from './solver';
import type { LevelSpec, Move } from './types';

/**
 * Two rings threaded through each other (0 and 2), each held back by the
 * other's tube: one has to turn out of the way, then the other, before
 * either lets its clip go. Built by the generator, kept here as it was.
 */
const TWO_TURNS_IN_A_ROW: LevelSpec = {
  rings: [
    { x: 0, y: 0, gap: 120, facing: 200, color: 'pink' },
    { x: 62, y: 107, gap: 100, facing: 65, color: 'teal' },
    { x: 0, y: -69, gap: 120, facing: 80, color: 'purple' },
    { x: -94, y: -150, gap: 100, facing: 180, color: 'blue' },
  ],
  clips: [
    { from: 1, on: 0 },
    { from: 3, on: 2 },
  ],
  rods: [
    { tail: [111.4, -210], head: [-26.7, -169.7], clamp: 0.3, color: 'red' },
    { tail: [137.3, -89.3], head: [93.7, 24.4], clamp: 0.4, color: 'green' },
    { tail: [73.8, 37.1], head: [157.9, 56.1], clamp: 0.5, color: 'lime' },
    { tail: [-101.6, 6.6], head: [-97.7, -74.6], clamp: 0.4, color: 'navy' },
  ],
  solution: [],
};

/** Plays `moves` on a fresh board of `level`: every move must go all the way, and the board end cleared. */
function clearsWith(level: LevelSpec, moves: readonly Move[]): boolean {
  const board = Board.load(level);
  for (const move of moves) {
    if (board.cleared || !playMove(board, move).ok) return false;
  }
  return board.cleared;
}

describe('Ring Out planner', () => {
  LEVELS.forEach((level, index) => {
    it(`clears level ${index + 1}, every move going all the way`, () => {
      const moves = plan(Board.load(level));
      expect(moves).not.toBeNull();
      expect(clearsWith(level, moves!)).toBeTrue();
    });
  });

  it('clears a board that needs two turns in a row to open a way, where the quick look gives up', () => {
    expect(autoplay(Board.load(TWO_TURNS_IN_A_ROW)).cleared).toBeFalse();
    const moves = plan(Board.load(TWO_TURNS_IN_A_ROW));
    expect(moves).not.toBeNull();
    expect(clearsWith(TWO_TURNS_IN_A_ROW, moves!)).toBeTrue();
  });

  it('gives up rather than look further than it is allowed', () => {
    const board = Board.load(TWO_TURNS_IN_A_ROW);
    expect(plan(board, { depth: 1 })).toBeNull();
  });

  it('does not change the board it plans for', () => {
    const board = Board.load(TWO_TURNS_IN_A_ROW);
    plan(board);
    expect(board.remaining).toBe(8);
    expect(board.rings.map((ring) => ring.angle)).toEqual(Board.load(TWO_TURNS_IN_A_ROW).rings.map((ring) => ring.angle));
  });

  it('hints the first move of the way it finds, and nothing on a cleared board', () => {
    const board = Board.load(TWO_TURNS_IN_A_ROW);
    playMove(board, { rod: 2 });
    // Nothing comes off now: the hint is the turn that starts to make room.
    expect(planNext(board)).toEqual(jasmine.objectContaining({ ring: 2 }));

    const done = Board.load(LEVELS[0]);
    playMove(done, LEVELS[0].solution[0]);
    expect(done.cleared).toBeTrue();
    expect(planNext(done)).toBeNull();
  });
});
