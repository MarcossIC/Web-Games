import { Board, type BoardEvent } from './board';
import { degrees, radians, TAU, wrapAngle } from './geometry';
import type { Move } from './types';

/** A little past the edge, so a move found exactly at a boundary still gets there. */
const NUDGE = 0.02;
/** The turns tried when looking for one that makes room for another piece. */
const TRY_EVERY = radians(15);
/** The turns tried at each step of a longer search for room: coarser, as the boards multiply. */
const SEARCH_EVERY = radians(30);
/** Two boards whose rings face within this of each other count as the same, in degrees. */
const SAME_ANGLE = 2;
/** Further than any piece reaches beside a tube: a clip, its arm and a rod side by side. */
const NEAR = 60;

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
    const best = releaseTurn(board, ring.id);
    if (best !== null) moves.push({ move: { ring: ring.id, turn: degrees(best) }, size: Math.abs(best) });
  }
  return moves.sort((a, b) => a.size - b.size).map(({ move }) => move);
}

/** The shortest turn of a ring, in radians, that lets one of its clips go, if it can turn that far. */
function releaseTurn(board: Board, ringId: number): number | null {
  if (!board.canTurn(ringId)) return null;
  const ring = board.rings[ringId];
  const w = board.releaseWindow(ring);
  if (w <= 0) return null;
  const range = board.turnRange(ringId);
  let best: number | null = null;
  for (const clip of board.heldBy(ringId)) {
    const s = wrapAngle(clip.at - ring.angle);
    const forward = mod(s - w, TAU) + NUDGE;
    const back = -(mod(-(s + w), TAU) + NUDGE);
    for (const turn of [forward, back]) {
      if (turn < range.min || turn > range.max) continue;
      if (best === null || Math.abs(turn) < Math.abs(best)) best = turn;
    }
  }
  return best;
}

/**
 * Whether turning ring `turned` freed something, on a board where nothing
 * was free before. Only what lies near its tube can have changed: a ring
 * whose tube comes near it, a rod whose way out passes by. The ring itself
 * reaches what it reached before: it can turn as far as before, from
 * elsewhere in the same room.
 */
function freedNear(board: Board, turned: number): boolean {
  const ring = board.rings[turned];
  const near = ring.radius * 2 + NEAR;
  for (const other of board.rings) {
    if (other.id === turned || !other.alive) continue;
    if (Math.hypot(other.center.x - ring.center.x, other.center.y - ring.center.y) > near + other.radius - ring.radius) continue;
    if (releaseTurn(board, other.id) !== null) return true;
  }
  for (const rod of board.rods) {
    if (!rod.alive || !passesBy(board, rod, ring.center, ring.radius + NEAR)) continue;
    if (board.slidePlan(rod.id).free) return true;
  }
  return false;
}

/** Whether a rod, on its way out, comes within `reach` of `center`. */
function passesBy(board: Board, rod: Board['rods'][number], center: { x: number; y: number }, reach: number): boolean {
  const left = rod.exitDistance - rod.offset;
  const shift = { x: rod.direction.x * left, y: rod.direction.y * left };
  const now = board.rodPoints(rod);
  const out = now.map((p) => ({ x: p.x + shift.x, y: p.y + shift.y }));
  const xs = [...now, ...out].map((p) => p.x);
  const ys = [...now, ...out].map((p) => p.y);
  return (
    center.x >= Math.min(...xs) - reach &&
    center.x <= Math.max(...xs) + reach &&
    center.y >= Math.min(...ys) - reach &&
    center.y <= Math.max(...ys) + reach
  );
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

export interface PlanOptions {
  /** How many turns in a row it tries to make room before it gives up. 3 when left out. */
  readonly depth?: number;
  /** How many boards one search for room may look at. 4000 when left out. */
  readonly budget?: number;
}

/**
 * A way to clear the board from where it is, or null if none is found.
 *
 * A move that takes something off is never a mistake: nothing is put
 * back, and a piece gone only leaves the others more room. So it plays one
 * as soon as there is one, and only when there is none does it look for
 * turns that make room: one, then two in a row, up to `depth`. It finds
 * what `autoplay` finds and the levels that need several turns to open a
 * way, which `autoplay` gives up on. Null only says that it did not find a
 * way; the board is not changed.
 */
export function plan(board: Board, options: PlanOptions = {}): Move[] | null {
  const depth = options.depth ?? 3;
  const budget = options.budget ?? 4000;
  const trial = board.clone();
  const moves: Move[] = [];
  while (!trial.cleared) {
    const direct = progressMoves(trial);
    if (direct.length > 0) {
      // A move that was to take something off and did not would come back forever.
      if (playMove(trial, direct[0]).events.length === 0) return null;
      moves.push(direct[0]);
      continue;
    }
    const steps = roomFor(trial, depth, budget);
    if (!steps) return null;
    for (const move of steps) {
      playMove(trial, move);
      moves.push(move);
    }
  }
  return moves;
}

/** The next move of `plan`, for the hint: null if it finds no way, or the board is cleared. */
export function planNext(board: Board, options: PlanOptions = {}): Move | null {
  const direct = progressMoves(board);
  if (direct.length > 0) return direct[0];
  return roomFor(board, options.depth ?? 3, options.budget ?? 4000)?.[0] ?? null;
}

/**
 * Turns that make room for a move that takes something off, the fewest
 * first, or null if none is found within `depth` turns and `budget` boards.
 * Only rings turn here: a rod that hits something slides back to where it
 * was, so pulling one never changes the board.
 */
function roomFor(start: Board, depth: number, budget: number): Move[] | null {
  let frontier: { board: Board; path: Move[] }[] = [{ board: start, path: [] }];
  const seen = new Set([boardKey(start)]);
  let looked = 0;
  for (let step = 0; step < depth && frontier.length > 0; step++) {
    const next: typeof frontier = [];
    for (const { board, path } of frontier) {
      for (const ring of board.rings) {
        if (!board.canTurn(ring.id)) continue;
        for (const turn of searchTurns(board.turnRange(ring.id))) {
          const trial = board.clone();
          const outcome = trial.turn(ring.id, turn);
          if (Math.abs(outcome.turned) < 1e-6) continue;
          const moves = [...path, { ring: ring.id, turn: degrees(outcome.turned) }];
          // Only the turned ring changed: what it freed, if anything, lies near it.
          if (outcome.events.length > 0 || freedNear(trial, ring.id)) return moves;
          const key = boardKey(trial);
          if (seen.has(key)) continue;
          seen.add(key);
          if (++looked > budget) return null;
          next.push({ board: trial, path: moves });
        }
      }
    }
    frontier = next;
  }
  return null;
}

/** What tells two boards apart while rings only turn: the pieces left and where each opening faces. */
function boardKey(board: Board): string {
  let key = '';
  for (const ring of board.rings) {
    if (!ring.alive) key += 'x,';
    else if (ring.gapHalf > 0) key += `${Math.round(mod(degrees(ring.angle), 360) / SAME_ANGLE) % (360 / SAME_ANGLE)},`;
    else key += 'o,';
  }
  for (const rod of board.rods) key += rod.alive ? 'r' : 'x';
  return key;
}

function candidateTurns(range: { min: number; max: number }): number[] {
  return turnsEvery(TRY_EVERY, range);
}

function searchTurns(range: { min: number; max: number }): number[] {
  return turnsEvery(SEARCH_EVERY, range);
}

/** Turns `every` apart up to half a turn each way, and as far as the ring goes each way. */
function turnsEvery(every: number, range: { min: number; max: number }): number[] {
  const lo = Math.max(range.min, -Math.PI);
  const hi = Math.min(range.max, Math.PI);
  const turns: number[] = [];
  for (let t = every; t <= hi; t += every) turns.push(t);
  for (let t = -every; t >= lo; t -= every) turns.push(t);
  if (Number.isFinite(range.max) && range.max > NUDGE) turns.push(range.max);
  if (Number.isFinite(range.min) && range.min < -NUDGE) turns.push(range.min);
  return turns;
}

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}
