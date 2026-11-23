import { BISHOP, KING, KNIGHT, PAWN, Position, QUEEN, ROOK, WHITE } from './position';

/**
 * How good a position looks without looking ahead, in hundredths of a pawn
 * and for the side to move: above zero, it is better off.
 *
 * It counts material, where each piece stands, the shape of the pawns and
 * how far the passed ones are, and, to finish a won game, how cornered the
 * losing king is.
 */

/** What each piece is worth, by its number. The king is never traded. */
export const PIECE_VALUE = [0, 100, 320, 330, 500, 900, 0];

// Where each piece is well placed, seen from white's side with rank 8 on
// top, as the board is numbered. Black reads them upside down.
const PAWN_SQUARES = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];
const KNIGHT_SQUARES = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];
const BISHOP_SQUARES = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];
const ROOK_SQUARES = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, 10, 10, 10, 10, 5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 5, 5, 0, 0, 0,
];
const QUEEN_SQUARES = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];
/** With the board full the king hides behind its pawns. */
const KING_SQUARES_OPENING = [
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
const KING_SQUARES_ENDGAME = [
  -50, -40, -30, -20, -20, -30, -40, -50,
  -30, -20, -10, 0, 0, -10, -20, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -30, 0, 0, 0, 0, -30, -30,
  -50, -30, -30, -30, -30, -30, -30, -50,
];

const SQUARE_TABLES = [
  [],
  PAWN_SQUARES,
  KNIGHT_SQUARES,
  BISHOP_SQUARES,
  ROOK_SQUARES,
  QUEEN_SQUARES,
];

/** How much each piece counts towards "the board is still full". */
const PHASE_WEIGHT = [0, 0, 1, 1, 2, 4, 0];
/** The phase of the starting position: every officer on the board. */
const FULL_PHASE = 24;

/** A pawn no rival pawn can stop, by the rank it stands on (index 1: its starting one). */
const PASSED_PAWN = [0, 10, 15, 25, 45, 80, 130, 0];
const DOUBLED_PAWN = 12;
const ISOLATED_PAWN = 12;
const BISHOP_PAIR = 30;
const ROOK_OPEN_FILE = 15;
const ROOK_HALF_OPEN_FILE = 8;
/** Half moves without a capture or a pawn move before an advantage starts to fade. */
const IDLE_HALFMOVES_ALLOWED = 40;
/** Having the move is worth a little. */
const TEMPO = 10;

// Pawn counts and reach per column, with one spare column on each side so
// the neighbors of the a and h files need no special case.
const whitePawns = new Int8Array(10);
const blackPawns = new Int8Array(10);
/** The row of white's most backward pawn on each column (-1: none). */
const whiteRear = new Int8Array(10);
/** The row of black's most backward pawn on each column (8: none). */
const blackRear = new Int8Array(10);

const distanceToCenter = (square: number): number => {
  const row = square >> 3;
  const column = square & 7;
  return Math.max(3 - row, row - 4) + Math.max(3 - column, column - 4);
};

const distanceBetween = (a: number, b: number): number =>
  Math.abs((a >> 3) - (b >> 3)) + Math.abs((a & 7) - (b & 7));

export function evaluate(position: Position): number {
  const board = position.board;
  whitePawns.fill(0);
  blackPawns.fill(0);
  whiteRear.fill(-1);
  blackRear.fill(8);

  /** Everything below is added up for white; the sign is set at the end. */
  let score = 0;
  let phase = 0;
  let whiteBishops = 0;
  let blackBishops = 0;
  let whiteKnights = 0;
  let blackKnights = 0;
  let heavy = 0;
  let whiteMaterial = 0;
  let blackMaterial = 0;

  for (let square = 0; square < 64; square++) {
    const piece = board[square];
    if (piece === 0) continue;
    if (piece > 0) {
      if (piece === KING) continue;
      whiteMaterial += PIECE_VALUE[piece];
      score += SQUARE_TABLES[piece][square];
      phase += PHASE_WEIGHT[piece];
      if (piece === PAWN) {
        const column = (square & 7) + 1;
        whitePawns[column]++;
        if (square >> 3 > whiteRear[column]) whiteRear[column] = square >> 3;
      } else if (piece === BISHOP) whiteBishops++;
      else if (piece === KNIGHT) whiteKnights++;
      else heavy++;
    } else {
      const kind = -piece;
      if (kind === KING) continue;
      blackMaterial += PIECE_VALUE[kind];
      score -= SQUARE_TABLES[kind][square ^ 56];
      phase += PHASE_WEIGHT[kind];
      if (kind === PAWN) {
        const column = (square & 7) + 1;
        blackPawns[column]++;
        if (square >> 3 < blackRear[column]) blackRear[column] = square >> 3;
      } else if (kind === BISHOP) blackBishops++;
      else if (kind === KNIGHT) blackKnights++;
      else heavy++;
    }
  }

  const pawns = whiteMaterial + blackMaterial > 0 && hasPawns();
  if (!pawns && heavy === 0) {
    // Nobody can give mate with a lone knight or bishop, nor with two knights.
    const whiteMinors = whiteBishops + whiteKnights;
    const blackMinors = blackBishops + blackKnights;
    if (whiteMinors + blackMinors <= 1) return 0;
    if (blackMinors === 0 && whiteBishops === 0 && whiteKnights === 2) return 0;
    if (whiteMinors === 0 && blackBishops === 0 && blackKnights === 2) return 0;
  }

  score += whiteMaterial - blackMaterial;
  if (whiteBishops >= 2) score += BISHOP_PAIR;
  if (blackBishops >= 2) score -= BISHOP_PAIR;

  if (phase > FULL_PHASE) phase = FULL_PHASE;
  /** 0 with the board full, 1 with only kings and pawns. */
  const endgame = (FULL_PHASE - phase) / FULL_PHASE;

  // Pawns and rooks need the whole pawn picture, so they get a second pass.
  for (let square = 0; square < 64; square++) {
    const piece = board[square];
    if (piece !== PAWN && piece !== -PAWN && piece !== ROOK && piece !== -ROOK) continue;
    const row = square >> 3;
    const column = (square & 7) + 1;
    if (piece === PAWN) {
      if (whitePawns[column] > 1) score -= DOUBLED_PAWN;
      if (whitePawns[column - 1] === 0 && whitePawns[column + 1] === 0) score -= ISOLATED_PAWN;
      // Passed: no black pawn ahead of it, on its column or the ones beside.
      if (blackRear[column] >= row && blackRear[column - 1] >= row && blackRear[column + 1] >= row) {
        score += PASSED_PAWN[7 - row] * (0.5 + endgame / 2);
      }
    } else if (piece === -PAWN) {
      if (blackPawns[column] > 1) score += DOUBLED_PAWN;
      if (blackPawns[column - 1] === 0 && blackPawns[column + 1] === 0) score += ISOLATED_PAWN;
      if (whiteRear[column] <= row && whiteRear[column - 1] <= row && whiteRear[column + 1] <= row) {
        score -= PASSED_PAWN[row] * (0.5 + endgame / 2);
      }
    } else if (piece === ROOK) {
      if (whitePawns[column] === 0) {
        score += blackPawns[column] === 0 ? ROOK_OPEN_FILE : ROOK_HALF_OPEN_FILE;
      }
    } else if (blackPawns[column] === 0) {
      score -= whitePawns[column] === 0 ? ROOK_OPEN_FILE : ROOK_HALF_OPEN_FILE;
    }
  }

  const whiteKing = position.kings[0];
  const blackKing = position.kings[1];
  let whiteKingEndgame = KING_SQUARES_ENDGAME[whiteKing];
  let blackKingEndgame = KING_SQUARES_ENDGAME[blackKing ^ 56];

  // Winning by a rook or more with few pieces left: the way to mate is to
  // push the other king to the edge and walk the own king up to it. The
  // winner's king is then well placed next to the other one, wherever
  // that is, and no longer in the center.
  const lead = whiteMaterial - blackMaterial;
  if (endgame > 0.5 && (lead >= 400 || lead <= -400)) {
    const loser = lead > 0 ? blackKing : whiteKing;
    const corner =
      10 * distanceToCenter(loser) + 10 * (14 - distanceBetween(whiteKing, blackKing));
    score += (lead > 0 ? corner : -corner) * endgame;
    if (lead > 0) whiteKingEndgame = 0;
    else blackKingEndgame = 0;
  }

  score +=
    (KING_SQUARES_OPENING[whiteKing] - KING_SQUARES_OPENING[blackKing ^ 56]) * (1 - endgame) +
    (whiteKingEndgame - blackKingEndgame) * endgame;

  // An advantage is worth less the longer nothing is taken and no pawn
  // moves: after fifty moves like that the game is a draw, so whoever is
  // ahead has to make progress, not just keep what it has. It only starts
  // to count after twenty moves: before, it would cancel out the small
  // steps a mate is built from.
  const idle = position.halfmoves - IDLE_HALFMOVES_ALLOWED;
  if (idle > 0) score *= 1 - idle / 120;
  score = Math.round(score);
  return (position.side === WHITE ? score : -score) + TEMPO;
}

function hasPawns(): boolean {
  for (let column = 1; column <= 8; column++) {
    if (whitePawns[column] !== 0 || blackPawns[column] !== 0) return true;
  }
  return false;
}
