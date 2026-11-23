import { evaluate } from './evaluate';
import { PIECE_VALUE } from './piece-squares';
import {
  FLAG_EN_PASSANT,
  KNIGHT,
  MAX_MOVES,
  Move,
  PAWN,
  Position,
  QUEEN,
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
 * or the time it was given runs out.
 *
 * Nearly all of its strength comes from what it does not look at. The
 * promising moves go first, so the rest can be shown worse with little
 * work; lines that are plainly lost or plainly won are cut short; and the
 * moves tried late, which are rarely the best, are looked at less deep
 * unless they turn out better than expected.
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
  /**
   * The longest it may think. It answers sooner when another round would
   * not fit, and sooner still when its move has stopped changing or no
   * other comes close. The first round always finishes, so there is
   * always a move.
   */
  timeMs?: number;
  /** Positions to look at, for a limit that does not depend on the machine. */
  nodes?: number;
  /**
   * Besides the best move, every move within this much of it (hundredths
   * of a pawn) comes back with its real score.
   */
  margin?: number;
  /**
   * Looks at every move down to its depth, leaving out only what cannot
   * change the answer. Without it the search gives up early on the lines
   * that look hopeless and on most quiet moves near their end: far deeper
   * in the same time, and stronger for it, but at a low depth it would
   * miss replies as plain as moving an attacked piece away. For the
   * levels that look a set number of moves ahead.
   */
  everyMove?: boolean;
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

// The order moves are tried in, highest first.
const ORDER_REMEMBERED = 1 << 30;
/** Captures that do not lose material, the biggest prize for the smallest piece first. */
const ORDER_CAPTURE = 1_000_000;
const ORDER_KILLER = 20_000;
/** The move that last answered the rival's move well. */
const ORDER_REPLY = ORDER_KILLER - 2;
/** Quiet moves go by their history, which stays within this of zero. */
const HISTORY_MAX = 16_384;
const ORDER_KNIGHT_PROMOTION = -20_000;
/** Captures that lose material, by how much. Anything below `ORDER_LOSING` is one. */
const ORDER_LOSING = -50_000;
const ORDER_BAD_CAPTURE = -100_000;
/** A rook or a bishop where a queen was to be had. */
const ORDER_WASTED_PROMOTION = -300_000;

/** `evals` of a position in check: it is not judged, only played out. */
const NO_EVAL = -INFINITY;

/** How much less deep a move tried late is looked at, by depth and by its place in the list. */
const REDUCTIONS = new Int8Array(64 * 64);
for (let depth = 1; depth < 64; depth++) {
  for (let tried = 1; tried < 64; tried++) {
    REDUCTIONS[depth * 64 + tried] = Math.floor(0.75 + (Math.log(depth) * Math.log(tried)) / 2.25);
  }
}

// How far the first move of a round may land from the last round's score
// before it is searched again without bounds.
const ASPIRATION = 25;
/** A move this much better than every other is played without thinking it over. */
const ALONE_GAP = 130;

const now = (): number => performance.now();

export class Search {
  private readonly tableKey = new Int32Array(TABLE_SIZE);
  private readonly tableMove = new Int32Array(TABLE_SIZE);
  private readonly tableScore = new Int16Array(TABLE_SIZE);
  private readonly tableDepth = new Int8Array(TABLE_SIZE);
  /** The kind of score in the two low bits, the search it was written by above. */
  private readonly tableKind = new Uint8Array(TABLE_SIZE);
  /** Which search this is, to tell fresh memories from those of earlier moves. */
  private round = 0;
  /** Whether it may skip unlikely moves: see `SearchLimits.everyMove`. */
  private selective = true;

  /** Two quiet moves per depth that refuted a line: likely to refute its siblings too. */
  private readonly killers = new Int32Array(MAX_PLY * 2);
  /**
   * How well a quiet move (piece and target square) has done: up when it
   * refutes a line, down when it is tried in vain.
   */
  private readonly history = new Int32Array(13 * 64);
  /** The quiet move that refuted each move (piece and target square) last time. */
  private readonly replies = new Int32Array(13 * 64);
  private readonly moveLists = Array.from({ length: MAX_PLY }, () => new Int32Array(MAX_MOVES));
  private readonly moveOrders = Array.from({ length: MAX_PLY }, () => new Int32Array(MAX_MOVES));
  /** The quiet moves tried at each depth, as places in `history`. */
  private readonly quietLists = Array.from({ length: MAX_PLY }, () => new Int32Array(MAX_MOVES));
  /** How the position looked at each depth of the line being followed. */
  private readonly evals = new Int32Array(MAX_PLY + 2);
  /** The move that led to each depth, as a place in `history`. -1: a pass. */
  private readonly arrivals = new Int32Array(MAX_PLY + 2);

  private nodes = 0;
  private stopped = false;
  private deadline = Infinity;
  private nodeLimit = Infinity;

  /** `position` comes back as it was given. */
  public run(position: Position, limits: SearchLimits): SearchResult {
    const start = now();
    const margin = limits.margin ?? 0;
    const timeMs = limits.timeMs ?? Infinity;
    this.nodes = 0;
    this.stopped = false;
    this.deadline = Infinity;
    this.nodeLimit = Infinity;
    this.round = (this.round + 1) & 63;
    const selective = !limits.everyMove;
    if (selective !== this.selective) {
      // What one way of searching remembers is not what the other would have found.
      this.selective = selective;
      this.tableKind.fill(0);
    }
    this.killers.fill(0);
    // What was learned for the last move still says something about this one.
    for (let i = 0; i < this.history.length; i++) this.history[i] >>= 2;

    let root: ScoredMove[] = position.legalMoves().map((move) => ({ move, score: 0 }));
    if (root.length <= 1) return { moves: root, depth: 0, nodes: 0 };
    this.evals[0] = position.inCheck() ? NO_EVAL : evaluate(position);

    let reached = 0;
    /** Rounds in a row that ended on the same move. */
    let unchanged = 0;
    for (let depth = 1; depth <= limits.depth; depth++) {
      const scored = this.searchRoot(position, root, depth, margin);
      if (this.stopped) {
        // A round cut short still counts when it had already found a
        // move better than the one it started with.
        const better = margin === 0 ? betterThanFirst(scored) : null;
        if (better) return { moves: [better], depth: reached, nodes: this.nodes };
        break;
      }
      const before = root[0].move;
      // The sort keeps equal moves in the order they had: the next round
      // tries them best first.
      root = scored.sort((a, b) => b.score - a.score);
      reached = depth;
      unchanged = root[0].move === before && depth > 1 ? unchanged + 1 : 0;

      // The limits only count once there is a move to answer with.
      this.deadline = start + timeMs;
      this.nodeLimit = limits.nodes ?? Infinity;
      if (this.nodes >= this.nodeLimit) break;
      // A mate this many moves away, seen by looking at least that far, is
      // the shortest there is. A longer one may only be the first found:
      // settling for it could go around in circles, never getting nearer.
      if (MATE - Math.abs(root[0].score) <= depth) break;

      if (timeMs !== Infinity) {
        const elapsed = now() - start;
        // A round takes several times the one before: with half the time
        // gone, the next would not finish. A move that has not changed
        // for several rounds is unlikely to: it is given less.
        const share = unchanged >= 6 ? 0.3 : unchanged >= 4 ? 0.4 : 0.5;
        if (elapsed > timeMs * share) break;
        if (
          margin === 0 &&
          depth >= 6 &&
          unchanged >= 3 &&
          elapsed > timeMs * 0.12 &&
          this.standsAlone(position, root, depth)
        ) {
          break;
        }
      }
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
    for (let i = 0; i < root.length; i++) {
      const { move } = root[i];
      let score: number;
      if (i === 0) {
        // The best move of the last round rarely moves far from its score.
        const guess = root[0].score;
        if (depth >= 5 && guess > -MATE_BOUND && guess < MATE_BOUND) {
          score = this.searchMove(position, move, depth, guess - ASPIRATION, guess + ASPIRATION);
          if (!this.stopped && (score <= guess - ASPIRATION || score >= guess + ASPIRATION)) {
            score = this.searchMove(position, move, depth, -INFINITY, INFINITY);
          }
        } else {
          score = this.searchMove(position, move, depth, -INFINITY, INFINITY);
        }
      } else {
        // A move further than the margin from the best so far only needs
        // to be shown that far: its exact score is of no use. Most are,
        // and showing it is much cheaper than finding the score.
        const floor = best - margin - 1;
        score = this.searchMove(position, move, depth, floor, floor + 1);
        if (!this.stopped && score > floor) {
          score = this.searchMove(position, move, depth, floor, INFINITY);
        }
      }
      if (this.stopped) break;
      scored.push({ move, score });
      if (score > best) best = score;
    }
    return scored;
  }

  /** What a move of the position being searched leads to, as far as `alpha` and `beta` ask. */
  private searchMove(
    position: Position,
    move: Move,
    depth: number,
    alpha: number,
    beta: number
  ): number {
    const arrival = (position.board[moveFrom(move)] + 6) * 64 + moveTo(move);
    position.make(move);
    let score: number;
    if (!this.hasLegalMove(position)) {
      // Seen here so that even one move ahead it takes a mate and
      // tells it from leaving the rival without moves.
      score = position.inCheck() ? MATE - 1 : 0;
    } else {
      this.arrivals[1] = arrival;
      score = -this.negamax(position, depth - 1, -beta, -alpha, 1, position.inCheck(), true);
    }
    position.unmake(move);
    return score;
  }

  /**
   * Whether every other move is at least `ALONE_GAP` worse than the best:
   * a recapture, the only way out of a threat. Looked at less deep than
   * the round, and only as far as it takes to say yes or no.
   */
  private standsAlone(position: Position, root: ScoredMove[], depth: number): boolean {
    const bar = root[0].score - ALONE_GAP;
    if (bar <= -MATE_BOUND || bar >= MATE_BOUND) return false;
    const shallow = Math.max(depth - 3, 1);
    for (let i = 1; i < root.length; i++) {
      const score = this.searchMove(position, root[i].move, shallow, bar, bar + 1);
      if (this.stopped || score > bar) return false;
    }
    return true;
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
    inCheck: boolean,
    canPass: boolean
  ): number {
    if ((++this.nodes & 1023) === 0) this.checkLimits();
    if (this.stopped) return 0;
    if (position.halfmoves >= 100 || position.isRepetition()) return 0;

    // No line from here beats a mate already found nearer the start.
    if (alpha < ply - MATE) alpha = ply - MATE;
    if (beta > MATE - ply - 1) beta = MATE - ply - 1;
    if (alpha >= beta) return alpha;

    // A check has few answers: it is cheap to follow, and costly to miss.
    if (inCheck) depth++;
    if (depth <= 0) return this.quiesce(position, alpha, beta, ply);
    if (ply >= MAX_PLY - 1) return inCheck ? 0 : evaluate(position);

    /** On the line it expects to be played: the exact score matters. Elsewhere a yes or no does. */
    const onMainLine = beta - alpha > 1;
    const alphaAtStart = alpha;
    const slot = position.keyLo & TABLE_MASK;
    let remembered = 0;
    let rememberedKind = 0;
    let rememberedScore = 0;
    if (this.tableKind[slot] !== 0 && this.tableKey[slot] === position.keyHi) {
      remembered = this.tableMove[slot];
      rememberedKind = this.tableKind[slot] & 3;
      // Mates are stored by their distance from the position, and read
      // back by their distance from the start of the search.
      rememberedScore = this.tableScore[slot];
      if (rememberedScore >= MATE_BOUND) rememberedScore -= ply;
      else if (rememberedScore <= -MATE_BOUND) rememberedScore += ply;
      if (!onMainLine && this.tableDepth[slot] >= depth) {
        if (rememberedKind === EXACT) return rememberedScore;
        if (rememberedKind === AT_LEAST && rememberedScore >= beta) return rememberedScore;
        if (rememberedKind === AT_MOST && rememberedScore <= alpha) return rememberedScore;
      }
    }

    // How the position looks before searching it. What is remembered of
    // it, when it says more than the look, corrects it.
    let standing = NO_EVAL;
    let estimate = NO_EVAL;
    if (!inCheck) {
      standing = evaluate(position);
      estimate = standing;
      if (
        rememberedKind === EXACT ||
        (rememberedKind === AT_LEAST && rememberedScore > standing) ||
        (rememberedKind === AT_MOST && rememberedScore < standing)
      ) {
        estimate = rememberedScore;
      }
    }
    this.evals[ply] = standing;
    /** Better off than two moves ago: the line is going its way, so it deserves more care. */
    const improving = !inCheck && ply >= 2 && standing > this.evals[ply - 2];

    const selective = this.selective;
    if (!onMainLine && !inCheck && beta > -MATE_BOUND && beta < MATE_BOUND) {
      // So far above what the rival would allow that a few moves will not
      // bring it back down.
      if (
        selective &&
        depth <= 7 &&
        estimate < MATE_BOUND &&
        estimate - 80 * (depth - (improving ? 1 : 0)) >= beta
      ) {
        return estimate;
      }

      // If even passing the turn leaves it above beta, a real move will
      // too. Not with a piece or less besides pawns: there, having to move
      // can be what loses, and a rook's mate is made of exactly that.
      if (
        canPass &&
        depth >= 3 &&
        estimate >= beta &&
        position.officers[position.side === WHITE ? 0 : 1] > 1
      ) {
        const less = selective
          ? 3 + (depth >> 2) + Math.min(3, ((estimate - beta) / 200) | 0)
          : 3;
        position.makeNull();
        this.arrivals[ply + 1] = -1;
        const score = -this.negamax(position, depth - less, -beta, -beta + 1, ply + 1, false, false);
        position.unmakeNull();
        if (this.stopped) return 0;
        if (score >= beta) return score >= MATE_BOUND ? beta : score;
      }
    }

    // Nothing remembered to try first: a shallower look will find it sooner.
    if (selective && depth >= 4 && remembered === 0) depth--;

    const board = position.board;
    const moves = this.moveLists[ply];
    const orders = this.moveOrders[ply];
    const quiets = this.quietLists[ply];
    const count = position.generate(moves);
    this.orderMoves(position, moves, orders, count, remembered, ply);

    /** Near the end of a line, quiet moves cannot make up this much. */
    const hopeless = selective && depth <= 6 && standing + 100 + 90 * depth <= alpha;
    /** Near the end of a line, only this many quiet moves are worth a try. */
    const quietsWorthTrying =
      selective && depth <= 5 ? (3 + depth * depth) >> (improving ? 0 : 1) : MAX_MOVES;

    let best = -INFINITY;
    let bestMove = 0;
    let legal = 0;
    let quietsTried = 0;
    for (let i = 0; i < count; i++) {
      this.bringBestForward(moves, orders, i, count);
      const move = moves[i];
      const order = orders[i];
      const to = moveTo(move);
      const moved = board[moveFrom(move)];
      const quiet =
        board[to] === 0 && movePromotion(move) === 0 && moveFlag(move) !== FLAG_EN_PASSANT;

      // Once there is a move that does not lose, the unlikely ones near
      // the end of the line are not worth their cost. A check is never
      // unlikely: it is how a sacrifice ends in mate.
      if (selective && !inCheck && best > -MATE_BOUND) {
        if (quiet) {
          if ((hopeless || quietsTried >= quietsWorthTrying) && !position.checks(move)) continue;
        } else if (
          depth <= 6 &&
          order < ORDER_LOSING &&
          order - ORDER_BAD_CAPTURE < -90 * depth &&
          !position.checks(move)
        ) {
          continue;
        }
      }

      position.make(move);
      if (position.leavesKingInCheck()) {
        position.unmake(move);
        continue;
      }
      legal++;
      const index = (moved + 6) * 64 + to;
      if (quiet) quiets[quietsTried++] = index;
      const givesCheck = position.inCheck();
      this.arrivals[ply + 1] = index;

      let score: number;
      if (legal === 1) {
        score = -this.negamax(position, depth - 1, -beta, -alpha, ply + 1, givesCheck, true);
      } else {
        // The first move is most likely the best, so the others only have
        // to be shown worse, and the ones tried late with less depth: the
        // later and the less they have worked before, the less. One that
        // turns out better is searched again in full.
        let less = 0;
        if (!selective) {
          if (depth >= 3 && legal > 3 && quiet && !inCheck && !givesCheck) less = legal > 10 ? 2 : 1;
        } else if (depth >= 3 && legal > (onMainLine ? 3 : 2) && (quiet || order < ORDER_LOSING)) {
          less = REDUCTIONS[(depth > 63 ? 63 : depth) * 64 + (legal > 63 ? 63 : legal)];
          if (onMainLine) less--;
          if (!improving) less++;
          if (inCheck || givesCheck) less--;
          if (quiet) {
            if (order >= ORDER_REPLY) less--;
            else less -= (order / 6000) | 0;
          }
          if (less > depth - 2) less = depth - 2;
          if (less < 0) less = 0;
        }
        score = -this.negamax(position, depth - 1 - less, -alpha - 1, -alpha, ply + 1, givesCheck, true);
        if (score > alpha && less > 0) {
          score = -this.negamax(position, depth - 1, -alpha - 1, -alpha, ply + 1, givesCheck, true);
        }
        if (score > alpha && score < beta) {
          score = -this.negamax(position, depth - 1, -beta, -alpha, ply + 1, givesCheck, true);
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
            if (quiet) this.rememberRefutation(move, depth, ply, quiets, quietsTried);
            break;
          }
        }
      }
    }

    if (legal === 0) return inCheck ? ply - MATE : 0;

    const kind = best <= alphaAtStart ? AT_MOST : best >= beta ? AT_LEAST : EXACT;
    // A deeper memory of this same search is worth more than a shallow new one.
    const sameSearch = this.tableKind[slot] >> 2 === this.round;
    if (
      !sameSearch ||
      this.tableKey[slot] !== position.keyHi ||
      kind === EXACT ||
      depth + 2 >= this.tableDepth[slot]
    ) {
      let stored = best;
      if (best >= MATE_BOUND) stored = best + ply;
      else if (best <= -MATE_BOUND) stored = best - ply;
      // When no move reached alpha, none is known to be best: the one
      // remembered from before is a better first try than a guess.
      if (kind === AT_MOST && remembered !== 0 && this.tableKey[slot] === position.keyHi) {
        bestMove = remembered;
      }
      this.tableKey[slot] = position.keyHi;
      this.tableMove[slot] = bestMove;
      this.tableScore[slot] = stored;
      this.tableDepth[slot] = depth;
      this.tableKind[slot] = kind | (this.round << 2);
    }
    return best;
  }

  /**
   * At the end of a line the position is only judged once it is calm:
   * captures are played out first, or a queen about to be taken back
   * would count as a queen won. In check there is nothing to judge yet:
   * every way out is tried.
   */
  private quiesce(position: Position, alpha: number, beta: number, ply: number): number {
    if ((++this.nodes & 1023) === 0) this.checkLimits();
    if (this.stopped) return 0;

    const inCheck = position.inCheck();
    if (ply >= MAX_PLY - 1) return inCheck ? 0 : evaluate(position);

    const board = position.board;
    const moves = this.moveLists[ply];
    const orders = this.moveOrders[ply];
    let standing = 0;
    let best: number;
    let count: number;
    if (inCheck) {
      best = ply - MATE;
      count = position.generate(moves);
      this.orderMoves(position, moves, orders, count, 0, ply);
    } else {
      // Nobody has to capture: the position as it stands is the least it gets.
      standing = evaluate(position);
      if (standing >= beta) return standing;
      if (standing > alpha) alpha = standing;
      best = standing;
      count = position.generate(moves, true);
      this.orderCaptures(position, moves, orders, count);
    }

    for (let i = 0; i < count; i++) {
      this.bringBestForward(moves, orders, i, count);
      const move = moves[i];
      if (!inCheck) {
        const prize = PIECE_VALUE[Math.abs(board[moveTo(move)]) || PAWN];
        const promotes = movePromotion(move) !== 0;
        // Not even winning the piece for free gets near what is in hand.
        if (standing + prize + (promotes ? 800 : 0) + 200 <= alpha) continue;
        // Taking with a bigger piece what is defended loses material.
        if (
          !promotes &&
          PIECE_VALUE[Math.abs(board[moveFrom(move)])] > prize &&
          position.exchange(move) < 0
        ) {
          continue;
        }
      }

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
   * first the move remembered for this position, then the captures that
   * do not lose material (the most valuable piece with the least valuable
   * one) and queen promotions, the quiet moves that refuted the lines
   * beside this one or answered the rival's last move well, the rest of
   * the quiet moves by how they have done, and the losing captures last.
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
    const arrival = this.arrivals[ply];
    const reply = arrival >= 0 ? this.replies[arrival] : 0;
    for (let i = 0; i < count; i++) {
      const move = moves[i];
      const to = moveTo(move);
      const piece = board[moveFrom(move)];
      const taken = Math.abs(board[to]);
      const promotion = movePromotion(move);
      if (move === remembered) {
        orders[i] = ORDER_REMEMBERED;
      } else if (promotion !== 0 && promotion !== QUEEN) {
        orders[i] = promotion === KNIGHT ? ORDER_KNIGHT_PROMOTION : ORDER_WASTED_PROMOTION;
      } else if (taken !== 0 || moveFlag(move) === FLAG_EN_PASSANT) {
        const prize = PIECE_VALUE[taken || PAWN];
        const price = PIECE_VALUE[Math.abs(piece)];
        // Only a piece worth more than what it takes can lose by taking.
        const balance = price > prize && promotion === 0 ? position.exchange(move) : 0;
        orders[i] =
          balance < 0 ? ORDER_BAD_CAPTURE + balance : ORDER_CAPTURE + prize * 16 - price;
      } else if (promotion !== 0) {
        orders[i] = ORDER_CAPTURE + PIECE_VALUE[QUEEN] * 16;
      } else if (move === killer) {
        orders[i] = ORDER_KILLER;
      } else if (move === secondKiller) {
        orders[i] = ORDER_KILLER - 1;
      } else if (move === reply) {
        orders[i] = ORDER_REPLY;
      } else {
        orders[i] = this.history[(piece + 6) * 64 + to];
      }
    }
  }

  /** Captures alone: the most valuable piece with the least valuable one first. */
  private orderCaptures(
    position: Position,
    moves: Int32Array,
    orders: Int32Array,
    count: number
  ): void {
    const board = position.board;
    for (let i = 0; i < count; i++) {
      const move = moves[i];
      const prize = PIECE_VALUE[Math.abs(board[moveTo(move)]) || PAWN];
      orders[i] =
        prize * 16 - PIECE_VALUE[Math.abs(board[moveFrom(move)])] + (movePromotion(move) !== 0 ? 16_000 : 0);
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

  /**
   * A quiet move was good enough to end the search of a position: it is
   * tried sooner from now on, and the quiet moves tried before it later.
   * `quiets` ends with the move itself.
   */
  private rememberRefutation(
    move: Move,
    depth: number,
    ply: number,
    quiets: Int32Array,
    quietsTried: number
  ): void {
    if (this.killers[ply * 2] !== move) {
      this.killers[ply * 2 + 1] = this.killers[ply * 2];
      this.killers[ply * 2] = move;
    }
    const arrival = this.arrivals[ply];
    if (arrival >= 0) this.replies[arrival] = move;

    const bonus = Math.min(depth * depth * 24, 2400);
    this.adjustHistory(quiets[quietsTried - 1], bonus);
    for (let i = 0; i < quietsTried - 1; i++) this.adjustHistory(quiets[i], -bonus);
  }

  /** Moves a history value towards the top or the bottom, less the nearer it already is. */
  private adjustHistory(index: number, change: number): void {
    const value = this.history[index];
    this.history[index] = value + change - ((value * Math.abs(change)) / HISTORY_MAX) | 0;
  }
}

/** The move of a round cut short that beat the one the round started with, if any did. */
function betterThanFirst(scored: ScoredMove[]): ScoredMove | null {
  let best: ScoredMove | null = null;
  for (let i = 1; i < scored.length; i++) {
    if (scored[i].score > (best ?? scored[0]).score) best = scored[i];
  }
  return best;
}
