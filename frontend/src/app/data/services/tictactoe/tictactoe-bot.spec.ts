import { BotLevel } from '@app/data/models/tictactoe/BotLevel.enum';
import {
  BOT_PROFILES,
  Mark,
  bestMoves,
  chooseBotMove,
  emptyCells,
  winnerOf,
} from './tictactoe-bot';

const ROOKIE = BOT_PROFILES[BotLevel.ROCKIE];
const NORMAL = BOT_PROFILES[BotLevel.NOVICE];
const MASTER = BOT_PROFILES[BotLevel.MASTER];

/** Nine characters, row by row: 'X', 'O' or '0' for an empty cell. */
const board = (cells: string) => cells.split('');

/** Every roll succeeds and every pick takes the first option. */
const lucky = () => 0;
/** Every roll below 1 fails and every pick takes the last option. */
const unlucky = () => 0.999;

/** Every cell a level can choose in a position, over the whole range of rolls. */
function choices(cells: string, mark: Mark, profile = MASTER): number[] {
  const seen = new Set<number>();
  for (let roll = 0; roll < 1; roll += 0.01) {
    seen.add(chooseBotMove(board(cells), mark, profile, () => roll));
  }
  return [...seen].sort();
}

describe('Tic-Tac-Toe bot', () => {
  describe('Master', () => {
    /** The bot against every reply a rival can give; true if the rival ever wins. */
    function rivalCanWin(cells: string[], bot: Mark, toMove: Mark, random: () => number): boolean {
      const winner = winnerOf(cells);
      if (winner) return winner !== bot;
      const empty = emptyCells(cells);
      if (empty.length === 0) return false;

      const next = toMove === 'X' ? 'O' : 'X';
      const moves = toMove === bot ? [chooseBotMove(cells, bot, MASTER, random)] : empty;
      return moves.some((cell) => {
        const after = cells.slice();
        after[cell] = toMove;
        return rivalCanWin(after, bot, next, random);
      });
    }

    for (const bot of ['X', 'O'] as const) {
      it(`never loses playing ${bot}, whatever the rival does`, () => {
        for (const roll of [0, 0.3, 0.6, 0.999]) {
          expect(rivalCanWin(board('000000000'), bot, 'X', () => roll)).toBe(false);
        }
      });
    }

    it('takes the win before blocking', () => {
      expect(choices('XX0OO0000', 'X')).toEqual([2]);
      expect(choices('XX0OO0000', 'O')).toEqual([5]);
    });

    it('blocks a line about to be completed', () => {
      expect(choices('XX00O0000', 'O')).toEqual([2]);
    });

    it('opens in a corner, where only the center saves the rival', () => {
      expect(choices('000000000', 'X')).toEqual([0, 2, 6, 8]);
    });

    it('gives the only reply that holds each opening', () => {
      expect(choices('X00000000', 'O')).toEqual([4]);
      expect(choices('0000X0000', 'O')).toEqual([0, 2, 6, 8]);
    });

    it('punishes a wrong reply to its opening with a fork', () => {
      // X corner, O edge: X wins by force, and takes the quickest way.
      const cells = board('XO0000000');
      const move = chooseBotMove(cells, 'X', MASTER, lucky);
      cells[move] = 'X';
      // O has to block; whatever it does next, X is left with two lines to complete.
      for (const reply of emptyCells(cells)) {
        const after = cells.slice();
        after[reply] = 'O';
        const next = chooseBotMove(after, 'X', MASTER, lucky);
        after[next] = 'X';
        const xWon = winnerOf(after) === 'X';
        const twoThreats =
          emptyCells(after).filter((cell) => {
            const tried = after.slice();
            tried[cell] = 'X';
            return winnerOf(tried) === 'X';
          }).length >= 2;
        expect(xWon || twoThreats).toBe(true);
      }
    });
  });

  describe('Normal', () => {
    it('always takes a win and always blocks, even on its worst roll', () => {
      expect(choices('XX0OO0000', 'O', NORMAL)).toEqual([5]);
      expect(choices('XX00O0000', 'O', NORMAL)).toEqual([2]);
    });

    it('can miss the reply that holds an opening, which a fork then punishes', () => {
      const replies = choices('X00000000', 'O', NORMAL);
      expect(replies).toContain(4);
      expect(replies.length).toBeGreaterThan(1);
    });

    it('finds a best move when it thinks', () => {
      const cells = board('X00000000');
      expect(bestMoves(cells, 'O')).toContain(chooseBotMove(cells, 'O', NORMAL, lucky));
    });
  });

  describe('Rookie', () => {
    it('takes a win and blocks when it sees them', () => {
      expect(chooseBotMove(board('XX0OO0000'), 'O', ROOKIE, lucky)).toBe(5);
      expect(chooseBotMove(board('XX00O0000'), 'O', ROOKIE, lucky)).toBe(2);
    });

    it('can miss a win and a block in plain sight', () => {
      expect(chooseBotMove(board('XX0OO0000'), 'O', ROOKIE, unlucky)).toBe(8);
      expect(chooseBotMove(board('XX00O0000'), 'O', ROOKIE, unlucky)).toBe(8);
    });

    it('sees a win more often than a block, and rarely thinks further', () => {
      expect(ROOKIE.takesWin).toBeGreaterThan(ROOKIE.blocks);
      expect(ROOKIE.blocks).toBeGreaterThan(ROOKIE.thinks);
    });
  });

  it('only ever marks an empty cell, the last one included', () => {
    for (const profile of [ROOKIE, NORMAL, MASTER]) {
      expect(choices('XOXXOO0XO', 'X', profile)).toEqual([6]);
      for (const cell of choices('X0O0X000O', 'O', profile)) {
        expect([1, 3, 5, 6, 7]).toContain(cell);
      }
    }
  });
});
