import { TestBed } from '@angular/core/testing';
import { PlayedMove } from '@app/data/models/chess/chess-mode';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';
import { ChessBot, toBotMove, toPlayedMove } from './ChessBot.service';
import { positionAfter } from './engine/chess-bot';

const played = (
  prevX: number, prevY: number, newX: number, newY: number,
  promotedPieceType: PieceSymbol | null = PieceSymbol.UNKNOWN
): PlayedMove => ({ prevX, prevY, newX, newY, promotedPieceType });

describe('ChessBot', () => {
  describe('moves between the game and the engine', () => {
    it('number the squares row by row from the top', () => {
      // e2 to e4: row 6 to row 4 of column 4.
      expect(toBotMove(played(6, 4, 4, 4))).toEqual({ from: 52, to: 36, promotion: 0 });
      expect(toPlayedMove({ from: 52, to: 36, promotion: 0 })).toEqual(played(6, 4, 4, 4));
    });

    it('take no promotion from a move that has none, however it says so', () => {
      expect(toBotMove(played(6, 4, 4, 4, null)).promotion).toBe(0);
      expect(toBotMove(played(6, 4, 4, 4, PieceSymbol.UNKNOWN)).promotion).toBe(0);
    });

    it('carry what a pawn becomes, for either side', () => {
      expect(toBotMove(played(1, 0, 0, 0, PieceSymbol.WHITE_QUEEN)).promotion).toBe(5);
      expect(toBotMove(played(6, 0, 7, 0, PieceSymbol.BLACK_KNIGHT)).promotion).toBe(2);
    });

    it('give a promotion the color of the side that reaches the last row', () => {
      // Row 0 is where white promotes, row 7 where black does.
      expect(toPlayedMove({ from: 8, to: 0, promotion: 4 }).promotedPieceType).toBe(PieceSymbol.WHITE_ROOK);
      expect(toPlayedMove({ from: 48, to: 56, promotion: 3 }).promotedPieceType).toBe(PieceSymbol.BLACK_BISHOP);
    });

    it('come back the same after a round trip', () => {
      const moves = [
        played(6, 4, 4, 4),
        played(0, 6, 2, 5),
        played(1, 2, 0, 3, PieceSymbol.WHITE_KNIGHT),
        played(6, 7, 7, 6, PieceSymbol.BLACK_QUEEN),
      ];

      for (const move of moves) expect(toPlayedMove(toBotMove(move))).toEqual(move);
    });
  });

  describe('thinking', () => {
    let bot: ChessBot;

    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [ChessBot] });
      bot = TestBed.inject(ChessBot);
      bot.minThinkMs = 0;
    });

    afterEach(() => bot.ngOnDestroy());

    it('answers the start of a game with a legal move', async () => {
      const move = await bot.think([], 'rookie');

      expect(move).not.toBeNull();
      const { from, to, promotion } = toBotMove(move!);
      expect(positionAfter([])!.findMove(from, to, promotion)).not.toBe(0);
    });

    it('answers the game it was given, not the start', async () => {
      const game = [played(6, 4, 4, 4), played(1, 4, 3, 4), played(7, 6, 5, 5)];

      const move = await bot.think(game, 'normal');

      const { from, to, promotion } = toBotMove(move!);
      expect(positionAfter(game.map(toBotMove))!.findMove(from, to, promotion)).not.toBe(0);
    });

    it('has no answer to a game that is over', async () => {
      // The fool's mate: white is mated after four moves.
      const game = [
        played(6, 5, 5, 5), played(1, 4, 3, 4), played(6, 6, 4, 6), played(0, 3, 4, 7),
      ];

      expect(await bot.think(game, 'hard')).toBeNull();
    });

    it('answers only the last question when another comes before the answer', async () => {
      const afterE4 = [played(6, 4, 4, 4)];

      const [first, second] = await Promise.all([bot.think([], 'rookie'), bot.think(afterE4, 'rookie')]);

      // The first was dropped for the second, which black answers from its own half.
      expect(first).toBeNull();
      expect(second!.prevX).toBeLessThanOrEqual(1);
    });

    it('has no answer to a question that was dropped, and answers the next one', async () => {
      const dropped = bot.think([], 'master');
      bot.cancel();

      expect(await dropped).toBeNull();
      expect(await bot.think([], 'rookie')).not.toBeNull();
    });

    it('can be made ready before it is asked anything', async () => {
      bot.prepare();
      bot.prepare();

      expect(await bot.think([], 'rookie')).not.toBeNull();
    });

    it('takes at least the time it is told to answer', async () => {
      bot.minThinkMs = 120;
      const start = performance.now();

      await bot.think([], 'rookie');

      expect(performance.now() - start).toBeGreaterThanOrEqual(115);
    });

    it('thinks on the page where there are no workers', async () => {
      const NativeWorker = window.Worker;
      (window as { Worker?: unknown }).Worker = undefined;
      try {
        const pageBot = TestBed.runInInjectionContext(() => new ChessBot());
        pageBot.minThinkMs = 0;

        const move = await pageBot.think([], 'rookie');

        expect(move).not.toBeNull();
      } finally {
        window.Worker = NativeWorker;
      }
    });
  });
});
