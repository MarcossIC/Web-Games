/**
 * What each piece is worth and where it stands well, in hundredths of a
 * pawn. A position keeps the sum of these for every piece on the board up
 * to date as moves are made, so judging it never has to count them again.
 *
 * Each piece has two values per square: one for a full board ("opening")
 * and one for when few pieces are left ("endgame"). A position is judged
 * by both, mixed by how much is still on the board.
 */

/** What each piece is worth in an exchange, by its number. The king is never traded. */
export const PIECE_VALUE = [0, 100, 320, 330, 500, 900, 0];

/** How much each piece counts towards "the board is still full". */
export const PHASE_WEIGHT = [0, 0, 1, 1, 2, 4, 0];
/** The phase of the starting position: every officer on the board. */
export const FULL_PHASE = 24;

const MATERIAL_OPENING = [0, 100, 320, 330, 500, 900, 0];
const MATERIAL_ENDGAME = [0, 100, 320, 330, 500, 900, 0];

// Seen from white's side with rank 8 on top, as the board is numbered.
// Black reads them upside down.
const PAWN_OPENING = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];
const PAWN_ENDGAME = PAWN_OPENING;
const KNIGHT_OPENING = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];
const KNIGHT_ENDGAME = KNIGHT_OPENING;
const BISHOP_OPENING = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];
const BISHOP_ENDGAME = BISHOP_OPENING;
const ROOK_OPENING = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, 10, 10, 10, 10, 5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 5, 5, 0, 0, 0,
];
const ROOK_ENDGAME = ROOK_OPENING;
const QUEEN_OPENING = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];
const QUEEN_ENDGAME = QUEEN_OPENING;
/** With the board full the king hides behind its pawns. */
const KING_OPENING = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20,
];
/** With few pieces left it is one more piece, and belongs in the center. */
const KING_ENDGAME = [
  -50, -40, -30, -20, -20, -30, -40, -50,
  -30, -20, -10, 0, 0, -10, -20, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -30, 0, 0, 0, 0, -30, -30,
  -50, -30, -30, -30, -30, -30, -30, -50,
];

const OPENING_TABLES = [
  [], PAWN_OPENING, KNIGHT_OPENING, BISHOP_OPENING, ROOK_OPENING, QUEEN_OPENING, KING_OPENING,
];
const ENDGAME_TABLES = [
  [], PAWN_ENDGAME, KNIGHT_ENDGAME, BISHOP_ENDGAME, ROOK_ENDGAME, QUEEN_ENDGAME, KING_ENDGAME,
];

/**
 * What a piece on a square adds to the position, for white: its worth
 * plus how well it stands there. Found by `(piece + 6) * 64 + square`,
 * with `piece` negative for black, whose pieces count against white.
 */
export const SQUARE_OPENING = new Int16Array(13 * 64);
export const SQUARE_ENDGAME = new Int16Array(13 * 64);

for (let kind = 1; kind <= 6; kind++) {
  for (let square = 0; square < 64; square++) {
    const white = (kind + 6) * 64 + square;
    const black = (6 - kind) * 64 + (square ^ 56);
    SQUARE_OPENING[white] = MATERIAL_OPENING[kind] + OPENING_TABLES[kind][square];
    SQUARE_ENDGAME[white] = MATERIAL_ENDGAME[kind] + ENDGAME_TABLES[kind][square];
    SQUARE_OPENING[black] = -SQUARE_OPENING[white];
    SQUARE_ENDGAME[black] = -SQUARE_ENDGAME[white];
  }
}

/** The king's place alone, for white's king on `square` (black's reads `square ^ 56`). */
export const KING_SQUARE_ENDGAME = KING_ENDGAME;
