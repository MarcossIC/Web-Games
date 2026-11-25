import { Board } from './board';
import { LEVELS } from './levels';
import { autoplay, nextMove, playMove } from './solver';
import { levelProblems } from './validate';

describe('Ring Out levels', () => {
  it('has a good number of them', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(16);
  });

  LEVELS.forEach((level, index) => {
    const n = index + 1;

    it(`level ${n} is drawn without overlaps or loose pieces`, () => {
      expect(levelProblems(level)).toEqual([]);
    });

    it(`level ${n} is cleared by its solution, every move going all the way`, () => {
      const board = Board.load(level);
      level.solution.forEach((move, k) => {
        expect(board.cleared).withContext(`cleared before move ${k + 1}`).toBeFalse();
        expect(playMove(board, move).ok).withContext(`move ${k + 1}: ${JSON.stringify(move)}`).toBeTrue();
      });
      expect(board.cleared).toBeTrue();
    });

    it(`level ${n} is cleared by following the hints`, () => {
      const board = Board.load(level);
      const run = autoplay(board);
      expect(run.cleared).withContext(`stopped after ${run.moves.length} moves`).toBeTrue();
    });
  });

  it('gives a hint that is a piece still on the board', () => {
    const board = Board.load(LEVELS[1]);
    const move = nextMove(board);
    expect(move).not.toBeNull();
    // Only the blue ring can do anything at first: the orange one holds a clip.
    expect(move).toEqual(jasmine.objectContaining({ ring: 1 }));
  });
});
