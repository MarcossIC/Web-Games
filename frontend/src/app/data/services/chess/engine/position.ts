/**
 * The board the bot thinks on. Plain TypeScript and numbers only: it knows
 * the rules of chess, nothing about Angular or the game's services, so it
 * can run inside a worker.
 *
 * Squares are numbered like the game's board, row by row from the top:
 * `row * 8 + column`, with row 0 the rank of the black pieces (rank 8) and
 * column 0 the a-file. White pawns move towards row 0.
 */

export const WHITE = 1;
export const BLACK = -1;
export type Color = typeof WHITE | typeof BLACK;

export const PAWN = 1;
export const KNIGHT = 2;
export const BISHOP = 3;
export const ROOK = 4;
export const QUEEN = 5;
export const KING = 6;

/**
 * A move packed in a number: where from (6 bits), where to (6 bits), the
 * piece a pawn becomes (3 bits, 0 when it does not promote) and what kind
 * of move it is.
 */
export type Move = number;

export const FLAG_NONE = 0;
/** A pawn's first step of two squares: the only move that allows en passant. */
export const FLAG_DOUBLE = 1;
export const FLAG_EN_PASSANT = 2;
export const FLAG_CASTLE = 3;

export const moveFrom = (move: Move): number => move & 63;
export const moveTo = (move: Move): number => (move >> 6) & 63;
export const movePromotion = (move: Move): number => (move >> 12) & 7;
export const moveFlag = (move: Move): number => move >> 15;

const encode = (from: number, to: number, promotion: number, flag: number): Move =>
  from | (to << 6) | (promotion << 12) | (flag << 15);

// Castling rights, one bit each.
const WHITE_SHORT = 1;
const WHITE_LONG = 2;
const BLACK_SHORT = 4;
const BLACK_LONG = 8;

const A8 = 0;
const E8 = 4;
const H8 = 7;
const A1 = 56;
const E1 = 60;
const H1 = 63;

/** The rights that survive a move from or to each square. */
const KEEPS_RIGHTS = new Uint8Array(64).fill(15);
KEEPS_RIGHTS[E1] = 15 & ~(WHITE_SHORT | WHITE_LONG);
KEEPS_RIGHTS[H1] = 15 & ~WHITE_SHORT;
KEEPS_RIGHTS[A1] = 15 & ~WHITE_LONG;
KEEPS_RIGHTS[E8] = 15 & ~(BLACK_SHORT | BLACK_LONG);
KEEPS_RIGHTS[H8] = 15 & ~BLACK_SHORT;
KEEPS_RIGHTS[A8] = 15 & ~BLACK_LONG;

// ---- Where each piece can go from each square, worked out once ----------

const KNIGHT_STEPS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1],
];
/** Straight lines first (0 to 3), diagonals after (4 to 7). */
const DIRECTIONS = [
  [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1],
];

const onBoard = (row: number, column: number): boolean =>
  row >= 0 && row < 8 && column >= 0 && column < 8;

function stepsFrom(square: number, steps: number[][]): number[] {
  const row = square >> 3;
  const column = square & 7;
  return steps
    .filter(([dr, dc]) => onBoard(row + dr, column + dc))
    .map(([dr, dc]) => (row + dr) * 8 + column + dc);
}

function rayFrom(square: number, [dr, dc]: number[]): number[] {
  const ray: number[] = [];
  let row = (square >> 3) + dr;
  let column = (square & 7) + dc;
  while (onBoard(row, column)) {
    ray.push(row * 8 + column);
    row += dr;
    column += dc;
  }
  return ray;
}

const SQUARES = Array.from({ length: 64 }, (_, square) => square);
const KNIGHT_TARGETS = SQUARES.map((square) => stepsFrom(square, KNIGHT_STEPS));
const KING_TARGETS = SQUARES.map((square) => stepsFrom(square, DIRECTIONS));
/** RAYS[square][direction]: the squares in that direction, nearest first. */
const RAYS = SQUARES.map((square) => DIRECTIONS.map((dir) => rayFrom(square, dir)));
/** Squares a white pawn standing on `square` attacks. */
const WHITE_PAWN_ATTACKS = SQUARES.map((square) => stepsFrom(square, [[-1, -1], [-1, 1]]));
const BLACK_PAWN_ATTACKS = SQUARES.map((square) => stepsFrom(square, [[1, -1], [1, 1]]));

// ---- Position keys ------------------------------------------------------
// Each position gets a 64-bit key, kept as two 32-bit halves: XOR of one
// random number per piece on its square, plus the turn, the castling rights
// and the en passant column. Equal keys mean a repeated position.

function randomSource(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) | 0;
  };
}

const random = randomSource(0x5eed);
const randomTable = (size: number) => Int32Array.from({ length: size }, random);

const PIECE_KEYS_LO = randomTable(13 * 64);
const PIECE_KEYS_HI = randomTable(13 * 64);
const CASTLING_KEYS_LO = randomTable(16);
const CASTLING_KEYS_HI = randomTable(16);
const EN_PASSANT_KEYS_LO = randomTable(8);
const EN_PASSANT_KEYS_HI = randomTable(8);
const TURN_KEY_LO = random();
const TURN_KEY_HI = random();

const START_ROWS = [
  [-ROOK, -KNIGHT, -BISHOP, -QUEEN, -KING, -BISHOP, -KNIGHT, -ROOK],
  [-PAWN, -PAWN, -PAWN, -PAWN, -PAWN, -PAWN, -PAWN, -PAWN],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [PAWN, PAWN, PAWN, PAWN, PAWN, PAWN, PAWN, PAWN],
  [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK],
];

const FEN_PIECES = 'PNBRQK';

/** The most moves a position can offer is 218; a list never needs more room. */
export const MAX_MOVES = 256;

export class Position {
  /** What stands on each square: the piece times its color, 0 when empty. */
  public readonly board = new Int8Array(64);
  public side: Color = WHITE;
  public castling = 0;
  /** The square a pawn can capture en passant on, or -1. */
  public enPassant = -1;
  /** Half moves since the last capture or pawn move, for the fifty-move rule. */
  public halfmoves = 0;
  /** Moves made so far, taken back ones not counted. */
  public ply = 0;
  public keyLo = 0;
  public keyHi = 0;
  /** Where the kings are: white's first. */
  public readonly kings = new Int8Array(2);
  /** Knights, bishops, rooks and queens of each side: white's first. */
  public readonly officers = new Int8Array(2);

  // What each move changed that the move itself cannot tell, to take it back.
  private undoCaptured: Int8Array;
  private undoCastling: Int8Array;
  private undoEnPassant: Int8Array;
  private undoHalfmoves: Int16Array;
  /** The key before each move: also the list of positions the game went through. */
  private undoKeyLo: Int32Array;
  private undoKeyHi: Int32Array;
  /** How many moves fit before the lists above have to grow. */
  private capacity: number;

  /** `capacity`: how many moves it has room for at first, the game's and the search's. */
  constructor(capacity = 256) {
    this.capacity = capacity;
    this.undoCaptured = new Int8Array(capacity);
    this.undoCastling = new Int8Array(capacity);
    this.undoEnPassant = new Int8Array(capacity);
    this.undoHalfmoves = new Int16Array(capacity);
    this.undoKeyLo = new Int32Array(capacity);
    this.undoKeyHi = new Int32Array(capacity);
    this.set(START_ROWS.flat(), WHITE, 15, -1, 0);
  }

  /** Doubles the room for moves. A list that ran out would forget what to put back. */
  private grow(): void {
    const capacity = this.capacity * 2;
    const longer = <T extends Int8Array | Int16Array | Int32Array>(
      list: T,
      make: new (length: number) => T
    ): T => {
      const copy = new make(capacity);
      copy.set(list);
      return copy;
    };
    this.undoCaptured = longer(this.undoCaptured, Int8Array);
    this.undoCastling = longer(this.undoCastling, Int8Array);
    this.undoEnPassant = longer(this.undoEnPassant, Int8Array);
    this.undoHalfmoves = longer(this.undoHalfmoves, Int16Array);
    this.undoKeyLo = longer(this.undoKeyLo, Int32Array);
    this.undoKeyHi = longer(this.undoKeyHi, Int32Array);
    this.capacity = capacity;
  }

  /** A position from its FEN, the notation chess programs share. */
  public static fromFen(fen: string, capacity?: number): Position {
    const [rows, turn, rights, target, halfmoves] = fen.trim().split(/\s+/);
    const squares: number[] = [];
    for (const char of rows.replace(/\//g, '')) {
      if (char >= '1' && char <= '8') {
        for (let i = 0; i < Number(char); i++) squares.push(0);
      } else {
        const piece = FEN_PIECES.indexOf(char.toUpperCase()) + 1;
        squares.push(char === char.toUpperCase() ? piece : -piece);
      }
    }
    let castling = 0;
    if (rights.includes('K')) castling |= WHITE_SHORT;
    if (rights.includes('Q')) castling |= WHITE_LONG;
    if (rights.includes('k')) castling |= BLACK_SHORT;
    if (rights.includes('q')) castling |= BLACK_LONG;
    const enPassant =
      !target || target === '-'
        ? -1
        : (8 - Number(target[1])) * 8 + target.charCodeAt(0) - 97;

    const position = new Position(capacity);
    position.set(squares, turn === 'b' ? BLACK : WHITE, castling, enPassant, Number(halfmoves) || 0);
    return position;
  }

  private set(
    squares: number[],
    side: Color,
    castling: number,
    enPassant: number,
    halfmoves: number
  ): void {
    this.side = side;
    this.castling = castling;
    this.enPassant = enPassant;
    this.halfmoves = halfmoves;
    this.ply = 0;
    this.officers.fill(0);
    this.keyLo = CASTLING_KEYS_LO[castling];
    this.keyHi = CASTLING_KEYS_HI[castling];
    if (side === BLACK) {
      this.keyLo ^= TURN_KEY_LO;
      this.keyHi ^= TURN_KEY_HI;
    }
    if (enPassant !== -1) {
      this.keyLo ^= EN_PASSANT_KEYS_LO[enPassant & 7];
      this.keyHi ^= EN_PASSANT_KEYS_HI[enPassant & 7];
    }
    for (let square = 0; square < 64; square++) {
      const piece = squares[square];
      this.board[square] = piece;
      if (piece === 0) continue;
      this.toggle(piece, square);
      const kind = Math.abs(piece);
      const owner = piece > 0 ? 0 : 1;
      if (kind === KING) this.kings[owner] = square;
      else if (kind !== PAWN) this.officers[owner]++;
    }
  }

  /** Puts a piece in the key, or takes it out: XOR does both. */
  private toggle(piece: number, square: number): void {
    const index = (piece + 6) * 64 + square;
    this.keyLo ^= PIECE_KEYS_LO[index];
    this.keyHi ^= PIECE_KEYS_HI[index];
  }

  /** Plays a move. It may leave the mover's king in check: see `leavesKingInCheck`. */
  public make(move: Move): void {
    const from = move & 63;
    const to = (move >> 6) & 63;
    const promotion = (move >> 12) & 7;
    const flag = move >> 15;
    const board = this.board;
    const side = this.side;
    const mover = side === WHITE ? 0 : 1;
    const piece = board[from];
    const captured = board[to];
    const ply = this.ply;
    if (ply >= this.capacity) this.grow();

    this.undoCaptured[ply] = captured;
    this.undoCastling[ply] = this.castling;
    this.undoEnPassant[ply] = this.enPassant;
    this.undoHalfmoves[ply] = this.halfmoves;
    this.undoKeyLo[ply] = this.keyLo;
    this.undoKeyHi[ply] = this.keyHi;

    board[from] = 0;
    this.toggle(piece, from);
    if (captured !== 0) {
      this.toggle(captured, to);
      if (captured !== PAWN && captured !== -PAWN) this.officers[1 - mover]--;
    }

    let placed = piece;
    if (promotion !== 0) {
      placed = promotion * side;
      this.officers[mover]++;
    }
    board[to] = placed;
    this.toggle(placed, to);

    if (flag === FLAG_EN_PASSANT) {
      // The pawn taken is beside the one that takes, not where it lands.
      const taken = to + (side === WHITE ? 8 : -8);
      this.toggle(board[taken], taken);
      board[taken] = 0;
    } else if (flag === FLAG_CASTLE) {
      const rookFrom = to > from ? from + 3 : from - 4;
      const rookTo = to > from ? from + 1 : from - 1;
      const rook = board[rookFrom];
      board[rookFrom] = 0;
      board[rookTo] = rook;
      this.toggle(rook, rookFrom);
      this.toggle(rook, rookTo);
    }

    if (piece === KING || piece === -KING) this.kings[mover] = to;

    if (this.enPassant !== -1) {
      this.keyLo ^= EN_PASSANT_KEYS_LO[this.enPassant & 7];
      this.keyHi ^= EN_PASSANT_KEYS_HI[this.enPassant & 7];
    }
    this.enPassant = flag === FLAG_DOUBLE ? (from + to) >> 1 : -1;
    if (this.enPassant !== -1) {
      this.keyLo ^= EN_PASSANT_KEYS_LO[this.enPassant & 7];
      this.keyHi ^= EN_PASSANT_KEYS_HI[this.enPassant & 7];
    }

    const castling = this.castling & KEEPS_RIGHTS[from] & KEEPS_RIGHTS[to];
    if (castling !== this.castling) {
      this.keyLo ^= CASTLING_KEYS_LO[this.castling] ^ CASTLING_KEYS_LO[castling];
      this.keyHi ^= CASTLING_KEYS_HI[this.castling] ^ CASTLING_KEYS_HI[castling];
      this.castling = castling;
    }

    const resets =
      piece === PAWN || piece === -PAWN || captured !== 0 || flag === FLAG_EN_PASSANT;
    this.halfmoves = resets ? 0 : this.halfmoves + 1;

    this.side = -side as Color;
    this.keyLo ^= TURN_KEY_LO;
    this.keyHi ^= TURN_KEY_HI;
    this.ply = ply + 1;
  }

  /** Takes back the last move made, which has to be `move`. */
  public unmake(move: Move): void {
    const from = move & 63;
    const to = (move >> 6) & 63;
    const promotion = (move >> 12) & 7;
    const flag = move >> 15;
    const board = this.board;
    const ply = --this.ply;
    const side = -this.side as Color;
    const mover = side === WHITE ? 0 : 1;
    this.side = side;

    const captured = this.undoCaptured[ply];
    this.castling = this.undoCastling[ply];
    this.enPassant = this.undoEnPassant[ply];
    this.halfmoves = this.undoHalfmoves[ply];
    this.keyLo = this.undoKeyLo[ply];
    this.keyHi = this.undoKeyHi[ply];

    let piece = board[to];
    if (promotion !== 0) {
      piece = PAWN * side;
      this.officers[mover]--;
    }
    board[from] = piece;
    board[to] = captured;
    if (captured !== 0 && captured !== PAWN && captured !== -PAWN) {
      this.officers[1 - mover]++;
    }

    if (flag === FLAG_EN_PASSANT) {
      board[to + (side === WHITE ? 8 : -8)] = -PAWN * side;
    } else if (flag === FLAG_CASTLE) {
      const rookFrom = to > from ? from + 3 : from - 4;
      const rookTo = to > from ? from + 1 : from - 1;
      board[rookFrom] = board[rookTo];
      board[rookTo] = 0;
    }

    if (piece === KING || piece === -KING) this.kings[mover] = from;
  }

  /**
   * Passes the turn without moving. Not a move of chess: the search uses it
   * to ask "what if I did nothing here?".
   */
  public makeNull(): void {
    const ply = this.ply;
    if (ply >= this.capacity) this.grow();
    this.undoEnPassant[ply] = this.enPassant;
    this.undoHalfmoves[ply] = this.halfmoves;
    this.undoKeyLo[ply] = this.keyLo;
    this.undoKeyHi[ply] = this.keyHi;
    if (this.enPassant !== -1) {
      this.keyLo ^= EN_PASSANT_KEYS_LO[this.enPassant & 7];
      this.keyHi ^= EN_PASSANT_KEYS_HI[this.enPassant & 7];
      this.enPassant = -1;
    }
    // No position before a pass can be repeated after it.
    this.halfmoves = 0;
    this.side = -this.side as Color;
    this.keyLo ^= TURN_KEY_LO;
    this.keyHi ^= TURN_KEY_HI;
    this.ply = ply + 1;
  }

  public unmakeNull(): void {
    const ply = --this.ply;
    this.side = -this.side as Color;
    this.enPassant = this.undoEnPassant[ply];
    this.halfmoves = this.undoHalfmoves[ply];
    this.keyLo = this.undoKeyLo[ply];
    this.keyHi = this.undoKeyHi[ply];
  }

  /** Whether a piece of `by` attacks `square`. */
  public isAttacked(square: number, by: Color): boolean {
    const board = this.board;

    // A pawn of `by` attacks from where a pawn of the other color would attack to.
    const pawnOrigins = by === WHITE ? BLACK_PAWN_ATTACKS[square] : WHITE_PAWN_ATTACKS[square];
    const pawn = PAWN * by;
    for (let i = 0; i < pawnOrigins.length; i++) {
      if (board[pawnOrigins[i]] === pawn) return true;
    }

    const knight = KNIGHT * by;
    const knights = KNIGHT_TARGETS[square];
    for (let i = 0; i < knights.length; i++) {
      if (board[knights[i]] === knight) return true;
    }

    const king = KING * by;
    const around = KING_TARGETS[square];
    for (let i = 0; i < around.length; i++) {
      if (board[around[i]] === king) return true;
    }

    const queen = QUEEN * by;
    const rays = RAYS[square];
    for (let direction = 0; direction < 8; direction++) {
      const slider = (direction < 4 ? ROOK : BISHOP) * by;
      const ray = rays[direction];
      for (let i = 0; i < ray.length; i++) {
        const piece = board[ray[i]];
        if (piece === 0) continue;
        if (piece === slider || piece === queen) return true;
        break;
      }
    }
    return false;
  }

  /** Whether the side to move is in check. */
  public inCheck(): boolean {
    return this.isAttacked(this.kings[this.side === WHITE ? 0 : 1], -this.side as Color);
  }

  /** After `make`: whether the move left its own king to be taken, so it was not legal. */
  public leavesKingInCheck(): boolean {
    return this.isAttacked(this.kings[this.side === WHITE ? 1 : 0], this.side);
  }

  /**
   * Whether this position was already on the board since the last capture
   * or pawn move. The search takes the first repetition for a draw: who
   * can repeat once can repeat again.
   */
  public isRepetition(): boolean {
    const stop = Math.max(this.ply - this.halfmoves, 0);
    for (let ply = this.ply - 2; ply >= stop; ply -= 2) {
      if (this.undoKeyLo[ply] === this.keyLo && this.undoKeyHi[ply] === this.keyHi) {
        return true;
      }
    }
    return false;
  }

  /**
   * Writes into `moves` every move of the side to move, without checking
   * that its king stays safe (castling aside), and returns how many.
   * `capturesOnly` keeps the moves that win material at once: captures and
   * promotions to a queen.
   */
  public generate(moves: Int32Array, capturesOnly = false): number {
    const board = this.board;
    const side = this.side;
    let count = 0;

    for (let from = 0; from < 64; from++) {
      const piece = board[from] * side;
      if (piece <= 0) continue;

      if (piece === PAWN) {
        const row = from >> 3;
        const forward = side === WHITE ? -8 : 8;
        const promotes = row === (side === WHITE ? 1 : 6);
        const ahead = from + forward;

        if (board[ahead] === 0) {
          if (promotes) {
            moves[count++] = encode(from, ahead, QUEEN, FLAG_NONE);
            if (!capturesOnly) {
              moves[count++] = encode(from, ahead, ROOK, FLAG_NONE);
              moves[count++] = encode(from, ahead, BISHOP, FLAG_NONE);
              moves[count++] = encode(from, ahead, KNIGHT, FLAG_NONE);
            }
          } else if (!capturesOnly) {
            moves[count++] = encode(from, ahead, 0, FLAG_NONE);
            const onStartRow = row === (side === WHITE ? 6 : 1);
            if (onStartRow && board[ahead + forward] === 0) {
              moves[count++] = encode(from, ahead + forward, 0, FLAG_DOUBLE);
            }
          }
        }

        const attacks = side === WHITE ? WHITE_PAWN_ATTACKS[from] : BLACK_PAWN_ATTACKS[from];
        for (let i = 0; i < attacks.length; i++) {
          const to = attacks[i];
          if (board[to] * side < 0) {
            if (promotes) {
              moves[count++] = encode(from, to, QUEEN, FLAG_NONE);
              if (!capturesOnly) {
                moves[count++] = encode(from, to, ROOK, FLAG_NONE);
                moves[count++] = encode(from, to, BISHOP, FLAG_NONE);
                moves[count++] = encode(from, to, KNIGHT, FLAG_NONE);
              }
            } else {
              moves[count++] = encode(from, to, 0, FLAG_NONE);
            }
          } else if (to === this.enPassant) {
            moves[count++] = encode(from, to, 0, FLAG_EN_PASSANT);
          }
        }
        continue;
      }

      if (piece === KNIGHT || piece === KING) {
        const targets = piece === KNIGHT ? KNIGHT_TARGETS[from] : KING_TARGETS[from];
        for (let i = 0; i < targets.length; i++) {
          const to = targets[i];
          const target = board[to] * side;
          if (target < 0 || (target === 0 && !capturesOnly)) {
            moves[count++] = encode(from, to, 0, FLAG_NONE);
          }
        }
        continue;
      }

      const first = piece === BISHOP ? 4 : 0;
      const last = piece === ROOK ? 4 : 8;
      const rays = RAYS[from];
      for (let direction = first; direction < last; direction++) {
        const ray = rays[direction];
        for (let i = 0; i < ray.length; i++) {
          const to = ray[i];
          const target = board[to] * side;
          if (target === 0) {
            if (!capturesOnly) moves[count++] = encode(from, to, 0, FLAG_NONE);
            continue;
          }
          if (target < 0) moves[count++] = encode(from, to, 0, FLAG_NONE);
          break;
        }
      }
    }

    if (!capturesOnly) count = this.generateCastling(moves, count);
    return count;
  }

  /**
   * Castling needs the right to (neither king nor rook has moved), the
   * squares between them empty, and a king that is not in check and does
   * not cross an attacked square. Where it lands is checked like any move.
   */
  private generateCastling(moves: Int32Array, count: number): number {
    const board = this.board;
    const white = this.side === WHITE;
    const rival = -this.side as Color;
    const king = white ? E1 : E8;
    const short = white ? WHITE_SHORT : BLACK_SHORT;
    const long = white ? WHITE_LONG : BLACK_LONG;
    if ((this.castling & (short | long)) === 0) return count;
    if (this.isAttacked(king, rival)) return count;

    if (
      (this.castling & short) !== 0 &&
      board[king + 1] === 0 &&
      board[king + 2] === 0 &&
      !this.isAttacked(king + 1, rival)
    ) {
      moves[count++] = encode(king, king + 2, 0, FLAG_CASTLE);
    }
    if (
      (this.castling & long) !== 0 &&
      board[king - 1] === 0 &&
      board[king - 2] === 0 &&
      board[king - 3] === 0 &&
      !this.isAttacked(king - 1, rival)
    ) {
      moves[count++] = encode(king, king - 2, 0, FLAG_CASTLE);
    }
    return count;
  }

  /** Every move the rules allow in this position. */
  public legalMoves(): Move[] {
    const buffer = new Int32Array(MAX_MOVES);
    const count = this.generate(buffer);
    const legal: Move[] = [];
    for (let i = 0; i < count; i++) {
      this.make(buffer[i]);
      if (!this.leavesKingInCheck()) legal.push(buffer[i]);
      this.unmake(buffer[i]);
    }
    return legal;
  }

  /**
   * The legal move between two squares, or 0 when there is none. A pawn
   * reaching the last row becomes `promotion`, a queen unless told.
   */
  public findMove(from: number, to: number, promotion = 0): Move {
    for (const move of this.legalMoves()) {
      if (moveFrom(move) !== from || moveTo(move) !== to) continue;
      const becomes = movePromotion(move);
      if (becomes === 0 || becomes === (promotion || QUEEN)) return move;
    }
    return 0;
  }
}

/** A square as chess names it: "e4". */
export function squareName(square: number): string {
  return 'abcdefgh'[square & 7] + String(8 - (square >> 3));
}

/** A move as chess programs write it: "e2e4", "e7e8q". */
export function moveName(move: Move): string {
  const promotion = movePromotion(move);
  return (
    squareName(moveFrom(move)) +
    squareName(moveTo(move)) +
    (promotion ? '  nbrq'[promotion] : '')
  );
}
