import { Move, Position } from './position';

/**
 * The first moves of a game, as they are known to be good. Looking them
 * up is instant, they are sounder than what a search finds from the
 * starting position, and picking among them makes every game start
 * differently.
 *
 * Each line is a game's first moves by their squares. The book is found
 * by position, not by the moves that led to it, so a game that reaches a
 * known position by another order of moves is still in the book.
 */
const LINES = [
  // King's pawn, answered in kind.
  'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7',
  'e2e4 e7e5 g1f3 b8c6 f1b5 g8f6 e1g1 f6e4 d2d4 e4d6',
  'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d3 d7d6',
  'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 d2d3 f8c5 e1g1 d7d6',
  'e2e4 e7e5 g1f3 b8c6 d2d4 e5d4 f3d4 g8f6 d4c6 b7c6',
  'e2e4 e7e5 g1f3 g8f6 f3e5 d7d6 e5f3 f6e4 d2d4 d6d5',
  'e2e4 e7e5 g1f3 b8c6 b1c3 g8f6 f1b5 f8b4 e1g1 e8g8',
  'e2e4 e7e5 b1c3 g8f6 g1f3 b8c6 d2d4 e5d4 f3d4 f8b4',
  // Sicilian.
  'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6',
  'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 g7g6',
  'e2e4 c7c5 g1f3 b8c6 d2d4 c5d4 f3d4 g8f6 b1c3 d7d6',
  'e2e4 c7c5 g1f3 b8c6 d2d4 c5d4 f3d4 g8f6 b1c3 e7e5',
  'e2e4 c7c5 g1f3 e7e6 d2d4 c5d4 f3d4 b8c6 b1c3 d8c7',
  'e2e4 c7c5 g1f3 e7e6 d2d4 c5d4 f3d4 a7a6 f1d3 g8f6',
  'e2e4 c7c5 b1c3 b8c6 g2g3 g7g6 f1g2 f8g7 d2d3 d7d6',
  'e2e4 c7c5 c2c3 g8f6 e4e5 f6d5 d2d4 c5d4 g1f3 b8c6',
  // French.
  'e2e4 e7e6 d2d4 d7d5 b1c3 g8f6 c1g5 f8e7 e4e5 f6d7',
  'e2e4 e7e6 d2d4 d7d5 b1c3 f8b4 e4e5 c7c5 a2a3 b4c3',
  'e2e4 e7e6 d2d4 d7d5 e4e5 c7c5 c2c3 b8c6 g1f3 d8b6',
  'e2e4 e7e6 d2d4 d7d5 b1d2 g8f6 e4e5 f6d7 f1d3 c7c5',
  'e2e4 e7e6 d2d4 d7d5 e4d5 e6d5 g1f3 g8f6 f1d3 f8d6',
  // Caro-Kann.
  'e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 c8f5 e4g3 f5g6',
  'e2e4 c7c6 d2d4 d7d5 e4e5 c8f5 g1f3 e7e6 f1e2 c6c5',
  'e2e4 c7c6 d2d4 d7d5 e4d5 c6d5 c2c4 g8f6 b1c3 e7e6',
  // Other answers to the king's pawn.
  'e2e4 d7d5 e4d5 d8d5 b1c3 d5a5 d2d4 g8f6 g1f3 c7c6',
  'e2e4 d7d6 d2d4 g8f6 b1c3 g7g6 g1f3 f8g7 f1e2 e8g8',
  'e2e4 g7g6 d2d4 f8g7 b1c3 d7d6 g1f3 g8f6',
  'e2e4 g8f6 e4e5 f6d5 d2d4 d7d6 g1f3 c8g4',
  // Queen's pawn, answered in kind.
  'd2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8',
  'd2d4 d7d5 c2c4 e7e6 g1f3 g8f6 b1c3 f8e7 c1f4 e8g8',
  'd2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3 e7e6 e2e3 b8d7',
  'd2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3 d5c4 a2a4 c8f5',
  'd2d4 d7d5 c2c4 d5c4 g1f3 g8f6 e2e3 e7e6 f1c4 c7c5',
  'd2d4 d7d5 g1f3 g8f6 c1f4 e7e6 e2e3 c7c5 c2c3 b8c6',
  'd2d4 d7d5 c1f4 g8f6 e2e3 c7c5 c2c3 b8c6 g1f3 e7e6',
  // Indian defenses.
  'd2d4 g8f6 c2c4 e7e6 b1c3 f8b4 e2e3 e8g8 f1d3 d7d5',
  'd2d4 g8f6 c2c4 e7e6 b1c3 f8b4 d1c2 e8g8 a2a3 b4c3',
  'd2d4 g8f6 c2c4 e7e6 g1f3 b7b6 g2g3 c8b7 f1g2 f8e7',
  'd2d4 g8f6 c2c4 e7e6 g1f3 d7d5 b1c3 f8e7 c1g5 e8g8',
  'd2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3 e8g8',
  'd2d4 g8f6 c2c4 g7g6 b1c3 d7d5 c4d5 f6d5 e2e4 d5c3',
  'd2d4 g8f6 c2c4 c7c5 d4d5 e7e6 b1c3 e6d5 c4d5 d7d6',
  'd2d4 g8f6 g1f3 e7e6 c1f4 d7d5 e2e3 c7c5',
  'd2d4 f7f5 g2g3 g8f6 f1g2 e7e6 g1f3 f8e7',
  // Flank openings.
  'c2c4 e7e5 b1c3 g8f6 g1f3 b8c6 g2g3 d7d5 c4d5 f6d5',
  'c2c4 c7c5 g1f3 g8f6 b1c3 b8c6 g2g3 g7g6 f1g2 f8g7',
  'c2c4 g8f6 b1c3 e7e6 g1f3 d7d5 d2d4 f8e7',
  'c2c4 e7e6 b1c3 d7d5 d2d4 g8f6',
  'g1f3 d7d5 g2g3 g8f6 f1g2 e7e6 e1g1 f8e7 d2d3 e8g8',
  'g1f3 g8f6 c2c4 e7e6 b1c3 d7d5 d2d4 f8e7',
  'g1f3 d7d5 d2d4 g8f6 c2c4 e7e6 b1c3 f8e7',
];

const squareOf = (name: string): number =>
  (8 - Number(name[1])) * 8 + name.charCodeAt(0) - 97;

const keyOf = (position: Position): string => position.keyLo + ':' + position.keyHi;

/** The lines that could not be played: a typo in the book. Empty, or a test fails. */
export const BROKEN_BOOK_LINES: string[] = [];

/**
 * The moves the book knows from each position, by its key. A move that
 * more lines go through appears more times, and is picked more often.
 */
let book: Map<string, Move[]> | null = null;

function readBook(): Map<string, Move[]> {
  const read = new Map<string, Move[]>();
  for (const line of LINES) {
    const position = new Position();
    for (const name of line.split(' ')) {
      const move = position.findMove(squareOf(name.slice(0, 2)), squareOf(name.slice(2, 4)));
      if (move === 0) {
        BROKEN_BOOK_LINES.push(line);
        break;
      }
      const key = keyOf(position);
      const known = read.get(key);
      if (known) known.push(move);
      else read.set(key, [move]);
      position.make(move);
    }
  }
  return read;
}

/** How many moves into a game the book goes at most. */
export const BOOK_PLIES = 10;

/**
 * A move from the book for this position, or 0 when it is not in it.
 * `random` gives a number in [0, 1), like Math.random.
 */
export function bookMove(position: Position, random: () => number): Move {
  if (position.ply >= BOOK_PLIES) return 0;
  book ??= readBook();
  const moves = book.get(keyOf(position));
  if (!moves) return 0;
  return moves[Math.floor(random() * moves.length)];
}
