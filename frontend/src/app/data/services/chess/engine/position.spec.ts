import { MAX_MOVES, Position, QUEEN, ROOK, moveName } from './position';

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
