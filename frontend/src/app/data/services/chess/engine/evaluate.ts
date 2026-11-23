import { FULL_PHASE, KING_SQUARE_ENDGAME, PIECE_VALUE } from './piece-squares';
import {
  BISHOP,
  BLACK_PAWN_ATTACKS,
  KING,
  KNIGHT,
  KNIGHT_TARGETS,
  PAWN,
  Position,
  QUEEN,
  RAYS,
  ROOK,
  WHITE,
  WHITE_PAWN_ATTACKS,
} from './position';

export { PIECE_VALUE } from './piece-squares';

/**
 * How good a position looks without looking ahead, in hundredths of a pawn
 * and for the side to move: above zero, it is better off.
 *
 * Material and where each piece stands come already added up from the
 * position. To that it adds what depends on the rest of the board: how
 * many squares each piece can go to, the shape of the pawns and how far
 * the passed ones are, how exposed each king is and what bears down on
 * it, and, to finish a won game, how cornered the losing king is.
 *
 * Most things are worth one amount with the board full and another in an
 * endgame: they come in pairs, opening first.
 */

/** A pawn no rival pawn can stop, by the rank it stands on (index 1: its starting one). */
const PASSED_PAWN = [0, 5, 10, 20, 40, 70, 120, 0];
/**
 * In an endgame a passed pawn is worth more the further the rival king is
 * from the square in front of it, and the nearer its own: per square of
 * distance, by the pawn's rank.
 */
const PASSED_PAWN_KINGS = [0, 0, 1, 3, 6, 10, 15, 0];
const DOUBLED_PAWN = [10, 20];
const ISOLATED_PAWN = [12, 14];
/** A pawn with another beside it, or defended by one. */
const SUPPORTED_PAWN = [7, 4];
const BISHOP_PAIR = [30, 45];
const ROOK_OPEN_FILE = [22, 10];
const ROOK_HALF_OPEN_FILE = [10, 5];
/** A rook on the rank the rival's pawns start from, with something there to attack. */
const ROOK_ON_SEVENTH = [15, 25];
/** A knight in the rival's half that a pawn defends and no pawn can chase away. */
const KNIGHT_OUTPOST = [22, 10];

// Each square a piece can go to, over a number it is expected to have.
const KNIGHT_MOBILITY = [4, 4];
const KNIGHT_SQUARES_EXPECTED = 4;
const BISHOP_MOBILITY = [4, 4];
const BISHOP_SQUARES_EXPECTED = 6;
const ROOK_MOBILITY = [2, 4];
const ROOK_SQUARES_EXPECTED = 7;
const QUEEN_MOBILITY = [1, 2];
const QUEEN_SQUARES_EXPECTED = 13;

// What bears down on a king: each square next to it that a piece attacks
// counts by the piece, and the total grows faster than the count.
const KNIGHT_ATTACK = 2;
const BISHOP_ATTACK = 2;
const ROOK_ATTACK = 3;
const QUEEN_ATTACK = 5;
/** What an attack is worth, by its total. One piece alone is no attack. */
const KING_ATTACK = Int16Array.from({ length: 64 }, (_, total) =>
  Math.min(Math.round((total * total) / 3), 400)
);

// A king's cover, column by column over the three it stands behind.
/** No pawn of its own on the column, and none of the rival's either. */
const SHIELD_OPEN_FILE = 25;
const SHIELD_NO_PAWN = 18;
/** The pawn is beside the king or behind it. */
const SHIELD_PAWN_BEHIND = 12;
/** The pawn has moved two squares up from the king, or further. */
const SHIELD_PAWN_FAR = [0, 0, 6, 14, 14, 14, 14, 14];

/** Half moves without a capture or a pawn move before an advantage starts to fade. */
const IDLE_HALFMOVES_ALLOWED = 40;
/** Having the move is worth a little. */
const TEMPO = 10;

// The pawns of each side, column by column, with one spare column on each
// side so the neighbors of the a and h files need no special case.
// White's ten first, then black's.
const pawnCount = new Int8Array(20);
/**
 * How far up its own side of the board each side's least advanced pawn of
 * a column is: 1 on its starting rank, 8 when the column has none.
 */
const pawnRear = new Int8Array(20);
/** The squares pawns attack: 1 for white's, 2 for black's, 3 for both. */
const pawnAttacks = new Uint8Array(64);

/** King moves between two squares, found by `a * 64 + b`. */
const KING_STEPS = new Uint8Array(64 * 64);
for (let a = 0; a < 64; a++) {
  for (let b = 0; b < 64; b++) {
    KING_STEPS[a * 64 + b] = Math.max(Math.abs((a >> 3) - (b >> 3)), Math.abs((a & 7) - (b & 7)));
  }
}

const distanceToCenter = (square: number): number => {
  const row = square >> 3;
  const column = square & 7;
  return Math.max(3 - row, row - 4) + Math.max(3 - column, column - 4);
};

const distanceBetween = (a: number, b: number): number =>
  Math.abs((a >> 3) - (b >> 3)) + Math.abs((a & 7) - (b & 7));

// What `scoreSide` and `slide` hand back.
let sideOpening = 0;
let sideEndgame = 0;
let slideSquares = 0;
let slideKingHits = 0;

export function evaluate(position: Position): number {
  const board = position.board;
  const squares = position.pieceSquares;
  const whiteEnd = position.pieceCount[0];
  const blackEnd = 16 + position.pieceCount[1];
  pawnCount.fill(0);
  pawnRear.fill(8);
  pawnAttacks.fill(0);

  let whiteMinors = 0;
  let blackMinors = 0;
  let whiteBishops = 0;
  let blackBishops = 0;
  let heavy = 0;
  let pawns = 0;
  let whiteMaterial = 0;
  let blackMaterial = 0;

  for (let index = 0; index < whiteEnd; index++) {
    const square = squares[index];
    const piece = board[square];
    whiteMaterial += PIECE_VALUE[piece];
    if (piece === PAWN) {
      const column = (square & 7) + 1;
      const rank = 7 - (square >> 3);
      pawns++;
      pawnCount[column]++;
      if (rank < pawnRear[column]) pawnRear[column] = rank;
      const attacked = WHITE_PAWN_ATTACKS[square];
      for (let i = 0; i < attacked.length; i++) pawnAttacks[attacked[i]] |= 1;
    } else if (piece === BISHOP) {
      whiteMinors++;
      whiteBishops++;
    } else if (piece === KNIGHT) whiteMinors++;
    else if (piece !== KING) heavy++;
  }
  for (let index = 16; index < blackEnd; index++) {
    const square = squares[index];
    const kind = -board[square];
    blackMaterial += PIECE_VALUE[kind];
    if (kind === PAWN) {
      const column = (square & 7) + 11;
      const rank = square >> 3;
      pawns++;
      pawnCount[column]++;
      if (rank < pawnRear[column]) pawnRear[column] = rank;
      const attacked = BLACK_PAWN_ATTACKS[square];
      for (let i = 0; i < attacked.length; i++) pawnAttacks[attacked[i]] |= 2;
    } else if (kind === BISHOP) {
      blackMinors++;
      blackBishops++;
    } else if (kind === KNIGHT) blackMinors++;
    else if (kind !== KING) heavy++;
  }

  if (pawns === 0 && heavy === 0) {
    // Nobody can give mate with a lone knight or bishop, nor with two knights.
    if (whiteMinors + blackMinors <= 1) return 0;
    if (blackMinors === 0 && whiteBishops === 0 && whiteMinors === 2) return 0;
    if (whiteMinors === 0 && blackBishops === 0 && blackMinors === 2) return 0;
  }

  /** Everything below is added up for white; the sign is set at the end. */
  let opening = position.opening;
  let endgame = position.endgame;
  scoreSide(position, 0);
  opening += sideOpening;
  endgame += sideEndgame;
  scoreSide(position, 1);
  opening -= sideOpening;
  endgame -= sideEndgame;

  const phase = position.phase > FULL_PHASE ? FULL_PHASE : position.phase;

  // Winning by a rook or more with few pieces left: the way to mate is to
  // push the other king to the edge and walk the own king up to it. The
  // winner's king is then well placed next to the other one, wherever
  // that is, and no longer in the center.
  const lead = whiteMaterial - blackMaterial;
  if (phase * 2 < FULL_PHASE && (lead >= 400 || lead <= -400)) {
    const whiteKing = position.kings[0];
    const blackKing = position.kings[1];
    const loser = lead > 0 ? blackKing : whiteKing;
    const corner =
      10 * distanceToCenter(loser) + 10 * (14 - distanceBetween(whiteKing, blackKing));
    if (lead > 0) endgame += corner - KING_SQUARE_ENDGAME[whiteKing];
    else endgame -= corner - KING_SQUARE_ENDGAME[blackKing ^ 56];
  }

  let score = (opening * phase + endgame * (FULL_PHASE - phase)) / FULL_PHASE;

  // An advantage is worth less the longer nothing is taken and no pawn
  // moves: after fifty moves like that the game is a draw, so whoever is
  // ahead has to make progress, not just keep what it has. It only starts
  // to count after twenty moves: before, it would cancel out the small
  // steps a mate is built from.
  const idle = position.halfmoves - IDLE_HALFMOVES_ALLOWED;
  if (idle > 0) score *= 1 - idle / 120;
  // Cut towards zero, so that the same position mirrored is worth exactly the same.
  score = Math.trunc(score);
  return (position.side === WHITE ? score : -score) + TEMPO;
}

/**
 * What one side's pieces add beyond their material and their squares,
 * into `sideOpening` and `sideEndgame`. `us`: 0 for white, 1 for black.
 * Ranks are counted from the side's own back rank (0) to the rival's (7),
 * so the same code reads the board from either side.
 */
function scoreSide(position: Position, us: number): void {
  const board = position.board;
  const squares = position.pieceSquares;
  const sign = us === 0 ? 1 : -1;
  const first = us * 16;
  const end = first + position.pieceCount[us];
  const mine = us * 10;
  const theirs = 10 - mine;
  const ownPawnBit = us === 0 ? 1 : 2;
  const rivalPawnBit = 3 - ownPawnBit;
  const ownKing = position.kings[us];
  const rivalKing = position.kings[1 - us];
  const pawn = PAWN * sign;

  let opening = 0;
  let endgame = 0;
  let bishops = 0;
  let queens = 0;
  /** Pieces that attack a square next to the rival king, and what they add up to. */
  let attackers = 0;
  let attack = 0;

  for (let index = first; index < end; index++) {
    const square = squares[index];
    const kind = board[square] * sign;
    const column = (square & 7) + 1;
    const rank = us === 0 ? 7 - (square >> 3) : square >> 3;

    if (kind === PAWN) {
      if (pawnCount[mine + column] > 1) {
        opening -= DOUBLED_PAWN[0];
        endgame -= DOUBLED_PAWN[1];
      }
      if (pawnCount[mine + column - 1] === 0 && pawnCount[mine + column + 1] === 0) {
        opening -= ISOLATED_PAWN[0];
        endgame -= ISOLATED_PAWN[1];
      } else if (
        (pawnAttacks[square] & ownPawnBit) !== 0 ||
        (column > 1 && board[square - 1] === pawn) ||
        (column < 8 && board[square + 1] === pawn)
      ) {
        opening += SUPPORTED_PAWN[0];
        endgame += SUPPORTED_PAWN[1];
      }
      // Passed: no rival pawn ahead of it, on its column or the ones beside.
      const ahead = 7 - rank;
      if (
        pawnRear[theirs + column] >= ahead &&
        pawnRear[theirs + column - 1] >= ahead &&
        pawnRear[theirs + column + 1] >= ahead
      ) {
        const bonus = PASSED_PAWN[rank];
        const front = square - 8 * sign;
        opening += bonus >> 1;
        endgame += bonus;
        endgame +=
          PASSED_PAWN_KINGS[rank] *
          (2 * KING_STEPS[rivalKing * 64 + front] - KING_STEPS[ownKing * 64 + front]);
        // A piece standing in its way holds it up.
        if (board[front] !== 0) endgame -= bonus >> 2;
      }
    } else if (kind === KNIGHT) {
      const targets = KNIGHT_TARGETS[square];
      let free = 0;
      let hits = 0;
      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        if (board[target] * sign <= 0 && (pawnAttacks[target] & rivalPawnBit) === 0) free++;
        if (KING_STEPS[target * 64 + rivalKing] <= 1) hits++;
      }
      opening += KNIGHT_MOBILITY[0] * (free - KNIGHT_SQUARES_EXPECTED);
      endgame += KNIGHT_MOBILITY[1] * (free - KNIGHT_SQUARES_EXPECTED);
      if (hits !== 0) {
        attackers++;
        attack += KNIGHT_ATTACK * hits;
      }
      if (
        rank >= 3 &&
        rank <= 5 &&
        (pawnAttacks[square] & ownPawnBit) !== 0 &&
        pawnRear[theirs + column - 1] >= 7 - rank &&
        pawnRear[theirs + column + 1] >= 7 - rank
      ) {
        opening += KNIGHT_OUTPOST[0];
        endgame += KNIGHT_OUTPOST[1];
      }
    } else if (kind === BISHOP) {
      bishops++;
      slide(board, square, 4, 8, sign, rivalPawnBit, rivalKing);
      opening += BISHOP_MOBILITY[0] * (slideSquares - BISHOP_SQUARES_EXPECTED);
      endgame += BISHOP_MOBILITY[1] * (slideSquares - BISHOP_SQUARES_EXPECTED);
      if (slideKingHits !== 0) {
        attackers++;
        attack += BISHOP_ATTACK * slideKingHits;
      }
    } else if (kind === ROOK) {
      slide(board, square, 0, 4, sign, rivalPawnBit, rivalKing);
      opening += ROOK_MOBILITY[0] * (slideSquares - ROOK_SQUARES_EXPECTED);
      endgame += ROOK_MOBILITY[1] * (slideSquares - ROOK_SQUARES_EXPECTED);
      if (slideKingHits !== 0) {
        attackers++;
        attack += ROOK_ATTACK * slideKingHits;
      }
      if (pawnCount[mine + column] === 0) {
        const file = pawnCount[theirs + column] === 0 ? ROOK_OPEN_FILE : ROOK_HALF_OPEN_FILE;
        opening += file[0];
        endgame += file[1];
      }
      if (rank === 6) {
        const rivalKingRank = us === 0 ? 7 - (rivalKing >> 3) : rivalKing >> 3;
        if (rivalKingRank === 7 || hasPawnOnStartRank(theirs)) {
          opening += ROOK_ON_SEVENTH[0];
          endgame += ROOK_ON_SEVENTH[1];
        }
      }
    } else if (kind === QUEEN) {
      queens++;
      slide(board, square, 0, 8, sign, rivalPawnBit, rivalKing);
      opening += QUEEN_MOBILITY[0] * (slideSquares - QUEEN_SQUARES_EXPECTED);
      endgame += QUEEN_MOBILITY[1] * (slideSquares - QUEEN_SQUARES_EXPECTED);
      if (slideKingHits !== 0) {
        attackers++;
        attack += QUEEN_ATTACK * slideKingHits;
      }
    }
  }

  if (bishops >= 2) {
    opening += BISHOP_PAIR[0];
    endgame += BISHOP_PAIR[1];
  }

  // An attack on a king needs more than one piece, and is half as
  // dangerous without a queen. It only counts with the board full: with
  // few pieces left the king has to come out anyway.
  if (attackers >= 2) {
    const danger = KING_ATTACK[attack > 63 ? 63 : attack];
    opening += queens !== 0 ? danger : danger >> 1;
  }

  // The pawns a king hides behind.
  const kingColumn = (ownKing & 7) + 1;
  const kingRank = us === 0 ? 7 - (ownKing >> 3) : ownKing >> 3;
  const from = kingColumn === 1 ? 1 : kingColumn - 1;
  const to = kingColumn === 8 ? 8 : kingColumn + 1;
  for (let column = from; column <= to; column++) {
    const rear = pawnRear[mine + column];
    if (rear === 8) {
      opening -= pawnCount[theirs + column] === 0 ? SHIELD_OPEN_FILE : SHIELD_NO_PAWN;
    } else if (rear <= kingRank) {
      opening -= SHIELD_PAWN_BEHIND;
    } else {
      opening -= SHIELD_PAWN_FAR[rear - kingRank];
    }
  }

  sideOpening = opening;
  sideEndgame = endgame;
}

/**
 * Counts, into `slideSquares`, the squares a bishop, rook or queen can go
 * to along the directions `first` to `last`, leaving out the ones a rival
 * pawn attacks; and into `slideKingHits`, how many squares next to the
 * rival king it attacks.
 */
function slide(
  board: Int8Array,
  square: number,
  first: number,
  last: number,
  sign: number,
  rivalPawnBit: number,
  rivalKing: number
): void {
  const rays = RAYS[square];
  const nearKing = rivalKing * 64;
  let free = 0;
  let hits = 0;
  for (let direction = first; direction < last; direction++) {
    const ray = rays[direction];
    for (let i = 0; i < ray.length; i++) {
      const target = ray[i];
      const occupant = board[target] * sign;
      if (KING_STEPS[nearKing + target] <= 1) hits++;
      if (occupant > 0) break;
      if ((pawnAttacks[target] & rivalPawnBit) === 0) free++;
      if (occupant < 0) break;
    }
  }
  slideSquares = free;
  slideKingHits = hits;
}

/** Whether the side whose pawns start at `side` in the pawn lists still has one at home. */
function hasPawnOnStartRank(side: number): boolean {
  for (let column = 1; column <= 8; column++) {
    if (pawnRear[side + column] === 1) return true;
  }
  return false;
}
