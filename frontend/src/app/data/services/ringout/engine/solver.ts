import { Board, type BoardEvent } from './board';
import { degrees, radians, TAU, wrapAngle } from './geometry';
import type { Move } from './types';

/** A little past the edge, so a move found exactly at a boundary still gets there. */
const NUDGE = 0.02;
/** The turns tried when looking for one that makes room for another piece. */
const TRY_EVERY = radians(15);

export interface PlayedMove {
  /** The move went as far as it was asked. */
  readonly ok: boolean;
  readonly events: readonly BoardEvent[];
}

/** Plays a move of a solution on the board, at once. */
export function playMove(board: Board, move: Move): PlayedMove {
  if ('rod' in move) {
    const { plan, events } = board.pullRod(move.rod);
    return { ok: plan.free, events };
  }
  const outcome = board.turn(move.ring, radians(move.turn));
  return { ok: !outcome.blocked, events: outcome.events };
}

/**
 * The moves that take something off the board right now: rods that slide
 * out freely, and the shortest turn of each ring that lets one of its clips
 * go. Shortest first.
 */
export function progressMoves(board: Board): Move[] {
  const moves: { move: Move; size: number }[] = [];
  for (const rod of board.rods) {
    if (rod.alive && board.slidePlan(rod.id).free) moves.push({ move: { rod: rod.id }, size: 0 });
  }
  for (const ring of board.rings) {
    if (!board.canTurn(ring.id)) continue;
    const range = board.turnRange(ring.id);
    const w = board.releaseWindow(ring);
    if (w <= 0) continue;
    let best: number | null = null;
    for (const clip of board.heldBy(ring.id)) {
      const s = wrapAngle(clip.at - ring.angle);
      const forward = mod(s - w, TAU) + NUDGE;
      const back = -(mod(-(s + w), TAU) + NUDGE);
      for (const turn of [forward, back]) {
        if (turn < range.min || turn > range.max) continue;
        if (best === null || Math.abs(turn) < Math.abs(best)) best = turn;
      }
    }
    if (best !== null) moves.push({ move: { ring: ring.id, turn: degrees(best) }, size: Math.abs(best) });
  }
  return moves.sort((a, b) => a.size - b.size).map(({ move }) => move);
}

/**
 * A good next move: one that takes something off the board, else a turn
 * that makes room for one. Null if neither is found, which a level that
 * needs several turns to make room can give.
 */
export function nextMove(board: Board): Move | null {
  const direct = progressMoves(board);
  if (direct.length > 0) return direct[0];

  for (const ring of board.rings) {
    if (!board.canTurn(ring.id)) continue;
    for (const turn of candidateTurns(board.turnRange(ring.id))) {
      const trial = board.clone();
      trial.turn(ring.id, turn);
      if (progressMoves(trial).length > 0) return { ring: ring.id, turn: degrees(turn) };
    }
  }
  return null;
}

/** Plays `nextMove` until the board is cleared or it finds nothing; returns the moves it played. */
export function autoplay(board: Board, limit = 200): { moves: Move[]; cleared: boolean } {
  const moves: Move[] = [];
  while (!board.cleared && moves.length < limit) {
    const move = nextMove(board);
    if (!move) break;
    playMove(board, move);
    moves.push(move);
  }
  return { moves, cleared: board.cleared };
}

function candidateTurns(range: { min: number; max: number }): number[] {
  const lo = Math.max(range.min, -Math.PI);
  const hi = Math.min(range.max, Math.PI);
  const turns: number[] = [];
  for (let t = TRY_EVERY; t <= hi; t += TRY_EVERY) turns.push(t);
  for (let t = -TRY_EVERY; t >= lo; t -= TRY_EVERY) turns.push(t);
  if (Number.isFinite(range.max) && range.max > NUDGE) turns.push(range.max);
  if (Number.isFinite(range.min) && range.min < -NUDGE) turns.push(range.min);
  return turns;
}

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}
