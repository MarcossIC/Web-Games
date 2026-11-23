import { evaluate, PIECE_VALUE } from './evaluate';
import {
  FLAG_EN_PASSANT,
  MAX_MOVES,
  Move,
  PAWN,
  Position,
  WHITE,
  moveFlag,
  moveFrom,
  movePromotion,
  moveTo,
} from './position';

/**
 * Looks ahead: tries its moves, the replies to each, the replies to those,
 * and keeps the move that leaves it best off when the rival also plays its
 * best (alpha-beta). It looks one move deeper each round until the depth
 * or the time it was given runs out, and what it learned in a round puts
 * the promising moves first in the next, which is what makes it fast.
 */

/** What being mated is worth; a mate found sooner is worth a little more. */
export const MATE = 30000;
/** Any score beyond this is a forced mate. */
export const MATE_BOUND = MATE - 1000;
const INFINITY = 32000;
/** The deepest line the search can follow. */
const MAX_PLY = 64;
/** Room a position needs, over the moves of the game, to be searched. */
export const SEARCH_ROOM = MAX_PLY + 8;

export interface SearchLimits {
  /** How many moves ahead it looks at most, counting both sides'. */
  depth: number;
  /** Time to think; the first round always finishes, so there is always a move. */
  timeMs?: number;
  /** Positions to look at, for a limit that does not depend on the machine. */
  nodes?: number;
  /**
   * Besides the best move, every move within this much of it (hundredths
   * of a pawn) comes back with its real score.
   */
  margin?: number;
}

export interface ScoredMove {
  move: Move;
  /** What the move leads to, for who plays it. */
  score: number;
}

export interface SearchResult {
  /** The best move and those within the margin of it, best first. Empty: no legal move. */
  moves: ScoredMove[];
  /** The last depth that was searched to the end. */
  depth: number;
  nodes: number;
}

// The memory of positions already searched, found by their key: what they
// were worth, how deep that was looked at and the best move from them.
const TABLE_SIZE = 1 << 19;
const TABLE_MASK = TABLE_SIZE - 1;
const EXACT = 1;
/** The real score is this or more: the search stopped at a move that was good enough. */
const AT_LEAST = 2;
/** The real score is this or less: no move reached what was already in hand. */
const AT_MOST = 3;

const ORDER_REMEMBERED = 1 << 30;
const ORDER_CAPTURE = 1_000_000;
const ORDER_PROMOTION = 900_000;
const ORDER_KILLER = 800_000;
const ORDER_HISTORY_MAX = 700_000;

const now = (): number => performance.now();

export class Search {
  private readonly tableKey = new Int32Array(TABLE_SIZE);
  private readonly tableMove = new Int32Array(TABLE_SIZE);
  private readonly tableScore = new Int16Array(TABLE_SIZE);
  private readonly tableDepth = new Int8Array(TABLE_SIZE);
  private readonly tableKind = new Uint8Array(TABLE_SIZE);

  /** Two quiet moves per depth that refuted a line: likely to refute its siblings too. */
  private readonly killers = new Int32Array(MAX_PLY * 2);
  /** How often a quiet move (piece and target square) turned out best. */
  private readonly history = new Int32Array(13 * 64);
  private readonly moveLists = Array.from({ length: MAX_PLY }, () => new Int32Array(MAX_MOVES));
  private readonly moveOrders = Array.from({ length: MAX_PLY }, () => new Int32Array(MAX_MOVES));

  private nodes = 0;
  private stopped = false;
  private deadline = Infinity;
  private nodeLimit = Infinity;

  /** `position` comes back as it was given. */
  public run(position: Position, limits: SearchLimits): SearchResult {
    const start = now();
    const margin = limits.margin ?? 0;
    this.nodes = 0;
    this.stopped = false;
    this.deadline = Infinity;
    this.nodeLimit = Infinity;
    this.killers.fill(0);
    this.history.fill(0);

    let root: ScoredMove[] = position.legalMoves().map((move) => ({ move, score: 0 }));
    if (root.length <= 1) return { moves: root, depth: 0, nodes: 0 };

    let reached = 0;
    for (let depth = 1; depth <= limits.depth; depth++) {
      const scored = this.searchRoot(position, root, depth, margin);
      if (this.stopped) break;
      // The sort keeps equal moves in the order they had: the next round
      // tries them best first.
      root = scored.sort((a, b) => b.score - a.score);
      reached = depth;

      // The limits only count once there is a move to answer with.
      const timeMs = limits.timeMs ?? Infinity;
      this.deadline = start + timeMs;
      this.nodeLimit = limits.nodes ?? Infinity;
      // A round takes several times the one before: with half the time
      // gone, the next would not finish.
      if (now() - start > timeMs / 2 || this.nodes >= this.nodeLimit) break;
      // A mate this many moves away, seen by looking at least that far, is
      // the shortest there is. A longer one may only be the first found:
      // settling for it could go around in circles, never getting nearer.
      if (MATE - Math.abs(root[0].score) <= depth) break;
    }

    const top = root[0].score;
    return {
      moves: root.filter((scored) => scored.score >= top - margin),
      depth: reached,
      nodes: this.nodes,
    };
  }

  private searchRoot(
    position: Position,
    root: ScoredMove[],
    depth: number,
    margin: number
  ): ScoredMove[] {
    const scored: ScoredMove[] = [];
    let best = -INFINITY;
    for (const { move } of root) {
      // A move further than the margin from the best so far only needs to
      // be proven that far: its exact score is of no use.
      const floor = Math.max(best - margin - 1, -INFINITY);
      position.make(move);
      let score: number;
      if (!this.hasLegalMove(position)) {
        // Seen here so that even one move ahead it takes a mate and
        // tells it from leaving the rival without moves.
        score = position.inCheck() ? MATE - 1 : 0;
      } else {
        score = -this.negamax(position, depth - 1, -INFINITY, -floor, 1, true);
      }
      position.unmake(move);
      if (this.stopped) break;
      scored.push({ move, score });
      if (score > best) best = score;
    }
    return scored;
  }

  private hasLegalMove(position: Position): boolean {
    const moves = this.moveLists[MAX_PLY - 1];
    const count = position.generate(moves);
    for (let i = 0; i < count; i++) {
      position.make(moves[i]);
      const legal = !position.leavesKingInCheck();
      position.unmake(moves[i]);
      if (legal) return true;
    }
    return false;
  }

  private checkLimits(): void {
    if (this.nodes >= this.nodeLimit || now() >= this.deadline) this.stopped = true;
  }

  /**
   * What the position is worth to the side to move, looking `depth` moves
   * ahead. Only scores between `alpha` and `beta` matter: at `beta` or
   * more the rival would never allow this position, so the search stops.
   */
  private negamax(
    position: Position,
    depth: number,
    alpha: number,
    beta: number,
    ply: number,
    canPass: boolean
  ): number {
    if ((++this.nodes & 1023) === 0) this.checkLimits();
    if (this.stopped) return 0;
    if (position.halfmoves >= 100 || position.isRepetition()) return 0;

    const inCheck = position.inCheck();
    // A check has few answers: it is cheap to follow, and costly to miss.
    if (inCheck) depth++;
    if (depth <= 0) return this.quiesce(position, alpha, beta, ply);
    if (ply >= MAX_PLY - 1) return evaluate(position);

    const alphaAtStart = alpha;
    const slot = position.keyLo & TABLE_MASK;
    let remembered = 0;
    if (this.tableKind[slot] !== 0 && this.tableKey[slot] === position.keyHi) {
      remembered = this.tableMove[slot];
      if (this.tableDepth[slot] >= depth) {
        // Mates are stored by their distance from the position, and read
        // back by their distance from the start of the search.
        let score = this.tableScore[slot];
        if (score >= MATE_BOUND) score -= ply;
        else if (score <= -MATE_BOUND) score += ply;
        const kind = this.tableKind[slot];
        if (kind === EXACT) return score;
        if (kind === AT_LEAST && score >= beta) return score;
        if (kind === AT_MOST && score <= alpha) return score;
      }
    }

    // If even passing the turn leaves it above beta, a real move will too.
    // Not with a piece or less besides pawns: there, having to move can be
    // what loses, and a rook's mate is made of exactly that.
    if (
      canPass &&
      !inCheck &&
      depth >= 3 &&
      beta < MATE_BOUND &&
      beta > -MATE_BOUND &&
      position.officers[position.side === WHITE ? 0 : 1] > 1 &&
      evaluate(position) >= beta
    ) {
      position.makeNull();
      const score = -this.negamax(position, depth - 3, -beta, -beta + 1, ply + 1, false);
      position.unmakeNull();
      if (this.stopped) return 0;
      if (score >= beta) return beta;
    }

    const board = position.board;
    const moves = this.moveLists[ply];
    const orders = this.moveOrders[ply];
    const count = position.generate(moves);
    this.orderMoves(position, moves, orders, count, remembered, ply);

    let best = -INFINITY;
    let bestMove = 0;
    let legal = 0;
    for (let i = 0; i < count; i++) {
      this.bringBestForward(moves, orders, i, count);
      const move = moves[i];
      const to = moveTo(move);
      const moved = board[moveFrom(move)];
      const quiet =
        board[to] === 0 && movePromotion(move) === 0 && moveFlag(move) !== FLAG_EN_PASSANT;

      position.make(move);
      if (position.leavesKingInCheck()) {
        position.unmake(move);
        continue;
      }
      legal++;

      let score: number;
      if (legal === 1) {
        score = -this.negamax(position, depth - 1, -beta, -alpha, ply + 1, true);
      } else {
        // The first move is most likely the best, so the others only have
        // to be shown worse, and the quiet ones tried late, with less
        // depth. One that turns out better is searched again in full.
        let reduction = 0;
        if (depth >= 3 && legal > 3 && quiet && !inCheck && !position.inCheck()) {
          reduction = legal > 10 ? 2 : 1;
        }
        score = -this.negamax(position, depth - 1 - reduction, -alpha - 1, -alpha, ply + 1, true);
        if (score > alpha && (reduction > 0 || score < beta)) {
          score = -this.negamax(position, depth - 1, -beta, -alpha, ply + 1, true);
        }
      }
      position.unmake(move);
      if (this.stopped) return 0;

      if (score > best) {
        best = score;
        bestMove = move;
        if (score > alpha) {
          alpha = score;
          if (alpha >= beta) {
            if (quiet) this.rememberRefutation(move, moved, to, depth, ply);
            break;
          }
        }
      }
    }

    if (legal === 0) return inCheck ? -MATE + ply : 0;

    let stored = best;
    if (best >= MATE_BOUND) stored = best + ply;
    else if (best <= -MATE_BOUND) stored = best - ply;
    this.tableKey[slot] = position.keyHi;
    this.tableMove[slot] = bestMove;
    this.tableScore[slot] = stored;
    this.tableDepth[slot] = depth;
    this.tableKind[slot] = best <= alphaAtStart ? AT_MOST : best >= beta ? AT_LEAST : EXACT;
    return best;
  }

  /**
   * At the end of a line the position is only judged once it is calm:
   * captures are played out first, or a queen about to be taken back
   * would count as a queen won.
   */
  private quiesce(position: Position, alpha: number, beta: number, ply: number): number {
    if ((++this.nodes & 1023) === 0) this.checkLimits();
    if (this.stopped) return 0;

    // Nobody has to capture: the position as it stands is the least it gets.
    const standing = evaluate(position);
    if (ply >= MAX_PLY - 1 || standing >= beta) return standing;
    if (standing > alpha) alpha = standing;

    const board = position.board;
    const moves = this.moveLists[ply];
    const orders = this.moveOrders[ply];
    const count = position.generate(moves, true);
    this.orderMoves(position, moves, orders, count, 0, ply);

    let best = standing;
    for (let i = 0; i < count; i++) {
      this.bringBestForward(moves, orders, i, count);
      const move = moves[i];
      const taken = Math.abs(board[moveTo(move)]) || PAWN;
      const gain = PIECE_VALUE[taken] + (movePromotion(move) !== 0 ? 800 : 0);
      // Not even winning the piece for free gets near what is in hand.
      if (standing + gain + 200 <= alpha) continue;

      position.make(move);
      if (position.leavesKingInCheck()) {
        position.unmake(move);
        continue;
      }
      const score = -this.quiesce(position, -beta, -alpha, ply + 1);
      position.unmake(move);
      if (this.stopped) return 0;

      if (score > best) {
        best = score;
        if (score > alpha) {
          alpha = score;
          if (alpha >= beta) break;
        }
      }
    }
    return best;
  }

  /**
   * The sooner the best move is tried, the more of the rest is skipped:
   * first the move remembered for this position, then captures (the most
   * valuable piece with the least valuable one), promotions, the moves
   * that refuted the lines beside this one, and the rest by how often
   * they proved best.
   */
  private orderMoves(
    position: Position,
    moves: Int32Array,
    orders: Int32Array,
    count: number,
    remembered: Move,
    ply: number
  ): void {
    const board = position.board;
    const killer = this.killers[ply * 2];
    const secondKiller = this.killers[ply * 2 + 1];
    for (let i = 0; i < count; i++) {
      const move = moves[i];
      const to = moveTo(move);
      const piece = board[moveFrom(move)];
      const taken = Math.abs(board[to]);
      if (move === remembered) {
        orders[i] = ORDER_REMEMBERED;
      } else if (taken !== 0 || moveFlag(move) === FLAG_EN_PASSANT) {
        orders[i] = ORDER_CAPTURE + PIECE_VALUE[taken || PAWN] * 16 - PIECE_VALUE[Math.abs(piece)];
      } else if (movePromotion(move) !== 0) {
        orders[i] = ORDER_PROMOTION + movePromotion(move);
      } else if (move === killer) {
        orders[i] = ORDER_KILLER;
      } else if (move === secondKiller) {
        orders[i] = ORDER_KILLER - 1;
      } else {
        orders[i] = this.history[(piece + 6) * 64 + to];
      }
    }
  }

  /** Moves the best of what is left to `start`: most lists are cut short, so they are never sorted whole. */
  private bringBestForward(
    moves: Int32Array,
    orders: Int32Array,
    start: number,
    count: number
  ): void {
    let top = start;
    for (let i = start + 1; i < count; i++) {
      if (orders[i] > orders[top]) top = i;
    }
    if (top === start) return;
    const move = moves[start];
    moves[start] = moves[top];
    moves[top] = move;
    const order = orders[start];
    orders[start] = orders[top];
    orders[top] = order;
  }

  private rememberRefutation(
    move: Move,
    piece: number,
    to: number,
    depth: number,
    ply: number
  ): void {
    if (this.killers[ply * 2] !== move) {
      this.killers[ply * 2 + 1] = this.killers[ply * 2];
      this.killers[ply * 2] = move;
    }
    const index = (piece + 6) * 64 + to;
    this.history[index] += depth * depth;
    if (this.history[index] >= ORDER_HISTORY_MAX) {
      for (let i = 0; i < this.history.length; i++) this.history[i] >>= 1;
    }
  }
}
