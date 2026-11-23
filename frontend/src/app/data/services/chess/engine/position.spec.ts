import { SQUARE_ENDGAME, SQUARE_OPENING } from './piece-squares';
import { MAX_MOVES, Move, Position, QUEEN, ROOK, moveName } from './position';

/** Counts the games of `depth` moves from a position: the classic check of a move generator. */
function countLines(position: Position, depth: number): number {
  if (depth === 0) return 1;
  const moves = new Int32Array(MAX_MOVES);
  const count = position.generate(moves);
  let lines = 0;
  for (let i = 0; i < count; i++) {
    position.make(moves[i]);
    if (!position.leavesKingInCheck()) lines += countLines(position, depth - 1);
    position.unmake(moves[i]);
  }
  return lines;
}

const names = (position: Position) => position.legalMoves().map(moveName);

describe('chess engine position', () => {
  // The counts are the known ones for these positions, which between them
  // go through castling, en passant, promotions, pins and checks.
  const known: [string, string, number[]][] = [
    ['the start', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [20, 400, 8902]],
    [
      'a middle game with every special move',
      'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
      [48, 2039, 97862],
    ],
    ['an endgame with pins and en passant', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
    [
      'promotions on both sides',
      'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
      [6, 264, 9467],
    ],
  ];

  for (const [name, fen, counts] of known) {
    it(`finds every legal game from ${name}`, () => {
      const position = Position.fromFen(fen);

      counts.forEach((count, index) => {
        expect(countLines(position, index + 1)).toBe(count);
      });
    });
  }

  it('starts on the starting position, white to move', () => {
    const position = new Position();

    expect(position.legalMoves().length).toBe(20);
    expect(position.inCheck()).toBeFalse();
    expect(position.ply).toBe(0);
  });

  it('gives back the same position when a move is taken back', () => {
    const position = Position.fromFen(
      'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'
    );
    const board = Array.from(position.board);
    const key = [position.keyLo, position.keyHi];

    for (const move of position.legalMoves()) {
      position.make(move);
      position.unmake(move);

      expect(Array.from(position.board)).withContext(moveName(move)).toEqual(board);
      expect([position.keyLo, position.keyHi]).withContext(moveName(move)).toEqual(key);
    }
  });

  it('gives the same key to the same position reached another way', () => {
    const play = (...moves: string[]) => {
      const position = new Position();
      for (const name of moves) {
        position.make(position.legalMoves().find((move) => moveName(move) === name)!);
      }
      return [position.keyLo, position.keyHi];
    };

    expect(play('g1f3', 'g8f6', 'b1c3', 'b8c6')).toEqual(play('b1c3', 'b8c6', 'g1f3', 'g8f6'));
    expect(play('g1f3', 'g8f6')).not.toEqual(play('b1c3', 'g8f6'));
  });

  it('notices a position that comes back', () => {
    const position = new Position();
    const play = (name: string) =>
      position.make(position.legalMoves().find((move) => moveName(move) === name)!);

    for (const name of ['g1f3', 'g8f6', 'f3g1']) play(name);
    expect(position.isRepetition()).toBeFalse();

    play('f6g8');
    expect(position.isRepetition()).toBeTrue();
  });

  it('takes back any number of moves, however little room it started with', () => {
    const position = new Position(4);
    const start = Array.from(position.board);
    const played: number[] = [];

    // Knights out and back, forty times over: far more moves than fit at first.
    for (let round = 0; round < 40; round++) {
      for (const name of ['g1f3', 'g8f6', 'f3g1', 'f6g8']) {
        const move = position.legalMoves().find((legal) => moveName(legal) === name)!;
        position.make(move);
        played.push(move);
      }
    }
    expect(position.ply).toBe(160);
    expect(position.halfmoves).toBe(160);

    while (played.length > 0) position.unmake(played.pop()!);

    expect(Array.from(position.board)).toEqual(start);
    expect(position.ply).toBe(0);
    expect(position.halfmoves).toBe(0);
    expect(position.legalMoves().length).toBe(20);
  });

  it('allows castling only while the king does not cross an attacked square', () => {
    const free = Position.fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    expect(names(free)).toContain('e1g1');
    expect(names(free)).toContain('e1c1');

    // The black rook looks down the f-file: the king would cross f1.
    const watched = Position.fromFen('r3kr2/8/8/8/8/8/8/R3K2R w KQq - 0 1');
    expect(names(watched)).not.toContain('e1g1');
    expect(names(watched)).toContain('e1c1');
  });

  it('keeps its lists of pieces and its running totals right through any game', () => {
    // Random games, with every special move in them sooner or later.
    let seed = 7;
    const random = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    /** Whether what the position keeps matches what is on its board. */
    const isRight = (position: Position): boolean => {
      let opening = 0;
      let endgame = 0;
      const counts = [0, 0];
      for (let square = 0; square < 64; square++) {
        const piece = position.board[square];
        if (piece === 0) continue;
        counts[piece > 0 ? 0 : 1]++;
        opening += SQUARE_OPENING[(piece + 6) * 64 + square];
        endgame += SQUARE_ENDGAME[(piece + 6) * 64 + square];
      }
      for (let side = 0; side < 2; side++) {
        if (position.pieceCount[side] !== counts[side]) return false;
        for (let i = 0; i < counts[side]; i++) {
          const piece = position.board[position.pieceSquares[side * 16 + i]];
          if (side === 0 ? piece <= 0 : piece >= 0) return false;
        }
      }
      return position.opening === opening && position.endgame === endgame;
    };

    // One expectation per game: thousands of them would stall the browser.
    for (let game = 0; game < 30; game++) {
      const position = new Position();
      const played: Move[] = [];
      let wrongAfter = '';
      for (let ply = 0; ply < 120 && wrongAfter === ''; ply++) {
        const moves = position.legalMoves();
        if (moves.length === 0) break;
        const move = moves[Math.floor(random() * moves.length)];
        position.make(move);
        played.push(move);
        if (!isRight(position)) wrongAfter = played.map(moveName).join(' ');
      }
      expect(wrongAfter).withContext(`game ${game}`).toBe('');

      while (played.length > 0) position.unmake(played.pop()!);
      expect(isRight(position)).withContext(`game ${game} taken back`).toBeTrue();
      expect(position.phase).toBe(24);
    }
  });

  describe('exchanges', () => {
    const exchange = (fen: string, name: string) => {
      const position = Position.fromFen(fen);
      const board = Array.from(position.board);
      const result = position.exchange(position.legalMoves().find((move) => moveName(move) === name)!);
      expect(Array.from(position.board)).toEqual(board);
      return result;
    };

    it('count a piece nobody defends as won', () => {
      expect(exchange('k7/8/8/3n4/8/8/8/K2R4 w - - 0 1', 'd1d5')).toBe(320);
    });

    it('see that a queen taking a defended pawn is lost for it', () => {
      expect(exchange('k7/8/2p5/3p4/8/8/8/K2Q4 w - - 0 1', 'd1d5')).toBe(100 - 900);
    });

    it('count the pieces lined up behind the one that takes', () => {
      // Rook takes pawn, rook takes back, the second rook takes that one.
      expect(exchange('k2r4/8/8/3p4/8/8/3R4/K2R4 w - - 0 1', 'd2d5')).toBe(100);
      // With one rook only, taking the pawn costs the rook.
      expect(exchange('k2r4/8/8/3p4/8/8/3R4/K7 w - - 0 1', 'd2d5')).toBe(100 - 500);
    });

    it('know the rival stops taking back when it would lose by it', () => {
      // The knight takes a pawn the queen defends: taking back costs her to the rook behind.
      expect(exchange('k2q4/8/8/3p4/8/2N5/8/K2R4 w - - 0 1', 'c3d5')).toBe(100);
    });
  });

  it('tells a check from the piece that moves, and never calls one that is not', () => {
    const knight = Position.fromFen('4k3/8/8/8/8/8/5N2/4K3 w - - 0 1');
    const checking = knight.legalMoves().filter((move) => knight.checks(move)).map(moveName);
    expect(checking.sort()).toEqual([]);

    const pieces = Position.fromFen('4k3/8/8/3N4/8/8/4P3/R2BK3 w - - 0 1');
    const called = pieces.legalMoves().filter((move) => pieces.checks(move)).map(moveName).sort();
    // The knight from c7 and f6, the rook from a8, the bishop from a4.
    expect(called).toEqual(['a1a8', 'd1a4', 'd5c7', 'd5f6']);

    let seed = 11;
    const random = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const wronglyCalled: string[] = [];
    for (let game = 0; game < 20; game++) {
      const position = new Position();
      for (let ply = 0; ply < 100; ply++) {
        const moves = position.legalMoves();
        if (moves.length === 0) break;
        for (const move of moves) {
          if (!position.checks(move)) continue;
          position.make(move);
          if (!position.inCheck()) wronglyCalled.push(moveName(move));
          position.unmake(move);
        }
        position.make(moves[Math.floor(random() * moves.length)]);
      }
    }
    expect(wronglyCalled).toEqual([]);
  });

  it('finds a move by its squares, promoting to a queen unless told', () => {
    const position = Position.fromFen('8/4P3/8/8/8/k7/8/K7 w - - 0 1');
    const from = 12;
    const to = 4;

    expect(moveName(position.findMove(from, to))).toBe('e7e8q');
    expect(moveName(position.findMove(from, to, QUEEN))).toBe('e7e8q');
    expect(moveName(position.findMove(from, to, ROOK))).toBe('e7e8r');
    expect(position.findMove(from, 5)).toBe(0);
  });
});
