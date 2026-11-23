import { evaluate } from './evaluate';
import { Position, moveName } from './position';
import { MATE, MATE_BOUND, Search } from './search';

describe('chess engine search', () => {
  let search: Search;

  beforeAll(() => {
    // One for the whole file: its memory is a few megabytes.
    search = new Search();
  });

  const best = (fen: string, depth: number) => {
    const { moves } = search.run(Position.fromFen(fen), { depth });
    return { move: moveName(moves[0].move), score: moves[0].score };
  };

  it('takes a mate in one, even looking a single move ahead', () => {
    const { move, score } = best('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', 1);

    expect(move).toBe('a1a8');
    expect(score).toBe(MATE - 1);
  });

  it('finds a mate in two', () => {
    // The queen is given up on f7 so that the knight mates from there.
    const { move, score } = best('2bqkbn1/2pppp2/np2N3/r3P1p1/p2N2B1/5Q2/PPPPKPP1/RNB2r2 w - - 0 1', 4);

    expect(move).toBe('f3f7');
    expect(score).toBe(MATE - 3);
  });

  it('finds a mate in three behind a quiet move', () => {
    const { move, score } = best('r5rk/5p1p/5R2/4B3/8/8/7P/7K w - - 0 1', 6);

    expect(move).toBe('f6a6');
    expect(score).toBeGreaterThanOrEqual(MATE_BOUND);
  });

  it('finds the same mates when it looks at every move', () => {
    const every = (fen: string, depth: number) => {
      const { moves } = search.run(Position.fromFen(fen), { depth, everyMove: true });
      return { move: moveName(moves[0].move), score: moves[0].score };
    };

    expect(every('2bqkbn1/2pppp2/np2N3/r3P1p1/p2N2B1/5Q2/PPPPKPP1/RNB2r2 w - - 0 1', 4)).toEqual({
      move: 'f3f7',
      score: MATE - 3,
    });
    expect(every('r5rk/5p1p/5R2/4B3/8/8/7P/7K w - - 0 1', 6).move).toBe('f6a6');
  });

  it('looks further in the same time when it may leave moves out', () => {
    const fen = 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10';
    const every = search.run(Position.fromFen(fen), { depth: 30, nodes: 50000, everyMove: true });
    const likely = search.run(Position.fromFen(fen), { depth: 30, nodes: 50000 });

    expect(likely.depth).toBeGreaterThan(every.depth);
  });

  it('answers well before its time is up when one move stands alone', () => {
    // The queen on g5 is there for the taking, and nothing else comes close.
    const position = Position.fromFen('rnb1kbnr/pppp1ppp/8/4p1q1/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 1');
    const start = performance.now();

    const { moves } = search.run(position, { depth: 40, timeMs: 1600 });

    expect(moveName(moves[0].move)).toBe('c1g5');
    expect(performance.now() - start).toBeLessThan(800);
  });

  it('takes a queen left hanging', () => {
    expect(best('rnb1kbnr/pppp1ppp/8/4p1q1/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 1', 2).move).toBe('c1g5');
  });

  it('does not take a pawn that costs the queen', () => {
    // The pawn on e5 is defended: only a search past its own move sees it.
    const { move } = best('rnbqkbnr/ppp2ppp/3p4/4p3/4P1Q1/8/PPPP1PPP/RNB1KBNR w KQkq - 0 1', 3);

    expect(move).not.toBe('g4g7');
    expect(move).not.toBe('g4c8');
  });

  it('does not stalemate a king it could mate, even looking a single move ahead', () => {
    // Qc7 would leave black with no move and no check: a draw. Any level
    // has to tell that from a mate.
    const position = Position.fromFen('k7/8/1K6/8/8/8/8/2Q5 w - - 0 1');
    const { moves } = search.run(position, { depth: 1, margin: 100000 });

    const stalemates = moves.filter(({ move }) => moveName(move) === 'c1c7');
    expect(stalemates.length).toBe(1);
    expect(stalemates[0].score).toBe(0);
    expect(moveName(moves[0].move)).not.toBe('c1c7');
  });

  it('has no move to give when the game is over', () => {
    const mated = Position.fromFen('R5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1');

    expect(search.run(mated, { depth: 3 }).moves).toEqual([]);
  });

  it('gives back every move within the margin of the best, best first', () => {
    // Each on a search of its own: what one remembers would help the next.
    const position = new Position();
    const best = new Search().run(position, { depth: 3 }).moves;
    const close = new Search().run(position, { depth: 3, margin: 30 }).moves;
    const all = new Search().run(position, { depth: 3, margin: 100000 }).moves;

    expect(all.length).toBe(20);
    expect(close.length).toBeGreaterThan(best.length);
    expect(close.length).toBeLessThan(all.length);
    for (const moves of [best, close, all]) {
      const scores = moves.map(({ score }) => score);
      expect(scores).toEqual([...scores].sort((a, b) => b - a));
    }
    for (const { score } of best) expect(score).toBe(best[0].score);
    for (const { score } of close) expect(score).toBeGreaterThanOrEqual(close[0].score - 30);
  });

  it('leaves the position as it was given', () => {
    const position = Position.fromFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
    const board = Array.from(position.board);

    search.run(position, { depth: 4 });

    expect(Array.from(position.board)).toEqual(board);
    expect(position.ply).toBe(0);
  });

  it('stops at the number of positions it was allowed', () => {
    const { nodes, moves } = search.run(new Position(), { depth: 30, nodes: 20000 });

    expect(nodes).toBeLessThan(40000);
    expect(moves.length).toBeGreaterThan(0);
  });

  // The defender looks ahead as far as the attacker: the mate has to be
  // forced, and inside the fifty moves the rules give.
  const mates: [string, string][] = [
    ['king and queen', '8/8/8/3k4/8/8/8/KQ6 w - - 0 1'],
    ['king and rook', '8/8/8/3k4/8/8/8/KR6 w - - 0 1'],
  ];
  for (const [pieces, fen] of mates) {
    it(`mates with ${pieces} against a lone king`, () => {
      const position = Position.fromFen(fen);
      const defender = new Search();

      let plies = 0;
      while (position.legalMoves().length > 0 && position.halfmoves < 100) {
        const side = plies % 2 === 0 ? search : defender;
        position.make(side.run(position, { depth: 30, nodes: 60000 }).moves[0].move);
        plies++;
      }

      expect(position.legalMoves().length).toBe(0);
      expect(position.inCheck()).toBeTrue();
      expect(plies).toBeLessThan(60);
    });
  }
});

describe('chess engine evaluation', () => {
  const value = (fen: string) => evaluate(Position.fromFen(fen));

  it('sees the starting position as level, but for the move', () => {
    expect(Math.abs(value('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'))).toBeLessThan(30);
  });

  it('is the same seen from either side of the board', () => {
    const white = value('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 1');
    const black = value('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 0 1');

    expect(white).toBe(black);
  });

  it('counts a piece up for the side that has it', () => {
    const up = value('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKB1R b KQkq - 0 1');

    expect(up).toBeGreaterThan(250);
  });

  it('knows a lone knight or bishop cannot win', () => {
    expect(value('8/8/4k3/8/8/2N5/8/4K3 w - - 0 1')).toBe(0);
    expect(value('8/8/4k3/8/8/2B5/8/4K3 b - - 0 1')).toBe(0);
    expect(value('8/8/4k3/8/8/2NN4/8/4K3 w - - 0 1')).toBe(0);
  });

  it('wants a passed pawn further up the board', () => {
    const far = value('8/4P3/8/8/k7/8/8/K7 w - - 0 1');
    const near = value('8/8/8/8/k7/8/4P3/K7 w - - 0 1');

    expect(far).toBeGreaterThan(near);
  });
});
