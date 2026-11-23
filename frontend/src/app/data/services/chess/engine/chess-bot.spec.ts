import {
  BotMove,
  CHESS_BOT_PROFILES,
  ChessBotLevel,
  ChessBotProfile,
  answerBotRequest,
  chooseBotMove,
  positionAfter,
} from './chess-bot';
import { BOOK_PLIES, BROKEN_BOOK_LINES, bookMove } from './opening-book';
import { Position, moveName } from './position';
import { Search } from './search';

/** A square by its name, as the bot numbers them. */
const square = (name: string): number =>
  (8 - Number(name[1])) * 8 + name.charCodeAt(0) - 97;

const botMove = (name: string): BotMove => ({
  from: square(name.slice(0, 2)),
  to: square(name.slice(2, 4)),
  promotion: 0,
});

const name = (move: BotMove | null): string =>
  move ? 'abcdefgh'[move.from & 7] + (8 - (move.from >> 3)) + 'abcdefgh'[move.to & 7] + (8 - (move.to >> 3)) : 'none';

/** Rolls that come out as told, then keep giving the last one. */
const rolls = (...values: number[]) => {
  let next = 0;
  return () => values[Math.min(next++, values.length - 1)];
};

describe('chess bot', () => {
  let search: Search;

  beforeAll(() => {
    search = new Search();
  });

  describe('the position it is asked about', () => {
    it('is the start of the game when nothing was played', () => {
      expect(positionAfter([])!.legalMoves().length).toBe(20);
    });

    it('is the game played so far', () => {
      const position = positionAfter(['e2e4', 'e7e5', 'g1f3'].map(botMove))!;

      expect(position.ply).toBe(3);
      expect(position.legalMoves().map(moveName)).toContain('b8c6');
    });

    it('is none when a move is not a move of chess', () => {
      expect(positionAfter([botMove('e2e5')])).toBeNull();
    });

    it('follows castling, en passant and a promotion', () => {
      const moves = [
        'e2e4', 'a7a6', 'e4e5', 'd7d5', 'e5d6', // en passant
        'a6a5', 'g1f3', 'a5a4', 'f1e2', 'a4a3', 'e1g1', // castling
        'a3b2', 'd6c7', 'b2a1', // a promotion
      ].map(botMove);
      const position = positionAfter(moves)!;

      expect(position).not.toBeNull();
      // White castled, the pawn took en passant, and a black queen stands on a1.
      expect(position.board[square('g1')]).toBe(6);
      expect(position.board[square('f1')]).toBe(4);
      expect(position.board[square('d5')]).toBe(0);
      expect(position.board[square('a1')]).toBe(-5);
    });
  });

  describe('levels', () => {
    const order: ChessBotLevel[] = ['rookie', 'normal', 'hard', 'master'];

    it('look further ahead, and slip less, the higher they are', () => {
      for (let i = 1; i < order.length; i++) {
        const lower = CHESS_BOT_PROFILES[order[i - 1]];
        const higher = CHESS_BOT_PROFILES[order[i]];

        expect(higher.depth).toBeGreaterThan(lower.depth);
        expect(higher.timeMs).toBeGreaterThanOrEqual(lower.timeMs);
        expect(higher.slipChance).toBeLessThanOrEqual(lower.slipChance);
        expect(higher.margin).toBeLessThanOrEqual(lower.margin);
      }
    });

    it('never slip from Hard up', () => {
      expect(CHESS_BOT_PROFILES.hard.slipChance).toBe(0);
      expect(CHESS_BOT_PROFILES.master.slipChance).toBe(0);
    });

    it('look at every move when they look a set number of moves ahead', () => {
      // Leaving moves out is for a search that makes up for it in depth.
      for (const level of order) {
        const { depth, everyMove } = CHESS_BOT_PROFILES[level];

        expect(everyMove).withContext(level).toBe(depth < 10);
      }
    });

    it('know more of the book the higher they are', () => {
      for (let i = 1; i < order.length; i++) {
        expect(CHESS_BOT_PROFILES[order[i]].bookPlies).toBeGreaterThan(
          CHESS_BOT_PROFILES[order[i - 1]].bookPlies
        );
      }
      expect(CHESS_BOT_PROFILES.master.bookPlies).toBeLessThanOrEqual(BOOK_PLIES);
    });
  });

  describe('the opening book', () => {
    /** A search that must not be asked: the book has the answer. */
    const unused = { run: () => fail('the book move needs no search') } as unknown as Search;

    it('has no line that cannot be played', () => {
      bookMove(new Position(), () => 0);

      expect(BROKEN_BOOK_LINES).toEqual([]);
    });

    it('opens the game without thinking, and not always the same way', () => {
      const opened = new Set<string>();
      for (let pick = 0; pick < 1; pick += 0.05) {
        opened.add(name(chooseBotMove(new Position(), CHESS_BOT_PROFILES.master, unused, rolls(0.9, pick))));
      }

      expect(opened.size).toBeGreaterThan(2);
      for (const move of opened) expect(['e2e4', 'd2d4', 'c2c4', 'g1f3']).toContain(move);
    });

    it('answers a known position reached by another order of moves', () => {
      // The queen's gambit declined, with the knights out before the pawns.
      const position = positionAfter(['g1f3', 'g8f6', 'd2d4', 'd7d5', 'c2c4', 'e7e6'].map(botMove))!;

      expect(bookMove(position, () => 0)).not.toBe(0);
    });

    it('is left sooner by the lower levels', () => {
      const position = positionAfter(['e2e4', 'e7e5', 'g1f3', 'b8c6'].map(botMove))!;
      const asked = { run: jasmine.createSpy('run').and.callFake(() => search.run(position, { depth: 1 })) };

      chooseBotMove(position, CHESS_BOT_PROFILES.rookie, asked as unknown as Search, rolls(0.9, 0));
      expect(asked.run).toHaveBeenCalled();

      expect(chooseBotMove(position, CHESS_BOT_PROFILES.master, unused, rolls(0.9, 0))).not.toBeNull();
    });

    it('has nothing to say once the game has left it', () => {
      const position = positionAfter(['a2a4', 'h7h5'].map(botMove))!;

      expect(bookMove(position, () => 0)).toBe(0);
    });
  });

  describe('choosing a move', () => {
    const HANGING_QUEEN = 'rnb1kbnr/pppp1ppp/8/4p1q1/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 1';
    // Past the opening, so that no level varies its moves on purpose.
    const afterOpening = (fen: string) => {
      const position = Position.fromFen(fen, 400);
      position.ply = 20;
      return position;
    };
    const careful: ChessBotProfile = {
      depth: 2, everyMove: true, timeMs: 5000, margin: 0, slipChance: 0.5, slipMargin: 2000, bookPlies: 0,
    };

    it('plays the best move it sees when it does not slip', () => {
      const move = chooseBotMove(afterOpening(HANGING_QUEEN), careful, search, rolls(0.9, 0));

      expect(name(move)).toBe('c1g5');
    });

    it('may leave a queen untaken when it slips', () => {
      const position = afterOpening(HANGING_QUEEN);
      const played = new Set<string>();
      for (let pick = 0; pick < 1; pick += 0.03) {
        played.add(name(chooseBotMove(position, careful, search, rolls(0, pick))));
      }

      expect(played.size).toBeGreaterThan(5);
      expect([...played].some((move) => move !== 'c1g5')).toBeTrue();
    });

    it('takes a mate in one at every level, slip or no slip', () => {
      const mate = 'k7/8/1K6/8/8/8/8/7R w - - 0 1';
      for (const level of ['rookie', 'normal', 'hard', 'master'] as ChessBotLevel[]) {
        const move = chooseBotMove(
          afterOpening(mate), CHESS_BOT_PROFILES[level], search, rolls(0, 0.5), { timeMs: 200 }
        );

        expect(name(move)).withContext(level).toBe('h1h8');
      }
    });

    it('varies its first moves without its book, at the level that never slips', () => {
      // A search that says three moves are as good as each other.
      const start = new Position();
      const close = start.legalMoves().slice(0, 3).map((move) => ({ move, score: 20 }));
      const asked = { run: jasmine.createSpy('run').and.returnValue({ moves: close, depth: 1, nodes: 1 }) };
      const bookless = { ...CHESS_BOT_PROFILES.master, bookPlies: 0 };

      const opened = new Set<string>();
      for (const pick of [0, 0.5, 0.99]) {
        opened.add(name(chooseBotMove(start, bookless, asked as unknown as Search, rolls(0.9, pick))));
      }

      // It asks for every move near the best one, and plays any of them.
      expect(asked.run.calls.mostRecent().args[1].margin).toBeGreaterThan(0);
      expect(opened.size).toBe(3);

      // Later in the game it only wants the best.
      chooseBotMove(afterOpening(HANGING_QUEEN), bookless, asked as unknown as Search, rolls(0.9, 0));
      expect(asked.run.calls.mostRecent().args[1].margin).toBe(0);
    });

    it('has no move when the game is over', () => {
      const mated = Position.fromFen('R5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1');

      expect(chooseBotMove(mated, CHESS_BOT_PROFILES.hard, search)).toBeNull();
    });

    it('answers a request with a legal move and the request number', () => {
      const moves = ['e2e4', 'e7e5'].map(botMove);
      const reply = answerBotRequest({ id: 7, moves, level: 'rookie' }, search);

      expect(reply.id).toBe(7);
      const position = positionAfter(moves)!;
      expect(position.findMove(reply.move!.from, reply.move!.to, reply.move!.promotion)).not.toBe(0);
    });

    it('answers nothing to a game that is not chess', () => {
      const reply = answerBotRequest({ id: 3, moves: [botMove('a1a8')], level: 'rookie' }, search);

      expect(reply).toEqual({ id: 3, move: null });
    });
  });
});
