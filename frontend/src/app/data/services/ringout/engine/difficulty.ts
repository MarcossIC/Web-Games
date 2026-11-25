import { Board } from './board';
import { playMove, progressMoves } from './solver';
import type { LevelSpec, Move } from './types';

/**
 * How much the pieces of a level get in each other's way, measured by
 * playing a solution through.
 *
 * A piece is *ready* when the clips let it go: a rod always is, a ring once
 * it holds no clip. A ready piece that cannot come off yet is *blocked*:
 * something lies across its way (a ring, an arm, a clip, a rod). Whatever
 * moved when it came free was in its way. A level where every piece comes
 * off the moment it is ready is a chore, not a puzzle, however many pieces
 * it has.
 */
export interface LevelStats {
  /** Pieces that can move: rods and rings with an opening. Closed rings only hold. */
  readonly pieces: number;
  /** Moves of the solution measured. */
  readonly moves: number;
  /** Turns of it that take nothing off and only make room. */
  readonly setups: number;
  /** Pieces that were ready and could not come off, at some point. */
  readonly blocked: number;
  /** Pieces that held another back: what moved, or came off, when one came free. */
  readonly blockers: number;
  /** Pieces blocked or in the way of one, or both. */
  readonly involved: number;
  /** `involved` over `pieces`: how much of the board takes part in the puzzle. */
  readonly share: number;
  /** Pieces that come off at once at the start: many of them make an easy first look. */
  readonly freeAtStart: number;
  /** Rods that took no part: never held back, never in anyone's way. A board is no harder for them. */
  readonly looseRods: readonly number[];
}

type Key = string;

const ringKey = (id: number): Key => `ring:${id}`;
const rodKey = (id: number): Key => `rod:${id}`;

/** Measures a level along `solution`, which must clear it; throws if a move does not go all the way. */
export function measure(level: LevelSpec, solution: readonly Move[]): LevelStats {
  const board = Board.load(level);
  const pieces = board.rods.length + board.rings.filter((ring) => ring.gapHalf > 0).length;
  const freeAtStart = new Set(progressMoves(board).map(moveKey)).size;

  const blockedEver = new Set<Key>();
  const blockers = new Set<Key>();
  let blockedNow = blockedPieces(board);
  blockedNow.forEach((key) => blockedEver.add(key));
  let setups = 0;

  solution.forEach((move, n) => {
    const before = board.clone();
    const aliveBefore = alivePieces(board);
    const played = playMove(board, move);
    if (!played.ok) throw new Error(`Move ${n + 1} of the solution does not go all the way.`);
    if (played.events.length === 0) setups++;

    const after = alivePieces(board);
    const blockedAfter = blockedPieces(board);
    const freed = [...blockedNow].filter((key) => after.has(key) && !blockedAfter.has(key));
    if (freed.length > 0) {
      const changed = [...new Set([moveKey(move), ...[...aliveBefore].filter((key) => !after.has(key))])];
      for (const key of inTheWay(before, board, changed, freed)) blockers.add(key);
    }
    blockedAfter.forEach((key) => blockedEver.add(key));
    blockedNow = blockedAfter;
  });

  // A closed ring cannot be in the way by moving: it only counts if it held a piece back by being there.
  const movable = (key: Key) => key.startsWith('rod:') || board.rings[Number(key.slice(5))].gapHalf > 0;
  const involved = new Set([...blockedEver, ...blockers].filter(movable));
  return {
    pieces,
    moves: solution.length,
    setups,
    blocked: blockedEver.size,
    blockers: [...blockers].filter(movable).length,
    involved: involved.size,
    share: pieces === 0 ? 0 : involved.size / pieces,
    freeAtStart,
    looseRods: board.rods.filter((rod) => !involved.has(rodKey(rod.id))).map((rod) => rod.id),
  };
}

/**
 * Which of the pieces a move changed (the one moved, those that came off
 * with it) freed one of `freed` by themselves: each change is tried alone
 * on the board as it was. A ring that broke only because its partner let
 * go was not in anyone's way. If no change frees one alone, all count.
 */
function inTheWay(before: Board, after: Board, changed: readonly Key[], freed: readonly Key[]): Key[] {
  if (changed.length === 1) return [...changed];
  const found = changed.filter((key) => {
    const probe = before.clone();
    const id = Number(key.slice(key.indexOf(':') + 1));
    if (key.startsWith('rod:')) {
      probe.rods[id].alive = false;
    } else if (!after.rings[id].alive) {
      probe.rings[id].alive = false;
      for (const clip of probe.clips) if (clip.from === id || clip.on === id) clip.alive = false;
    } else {
      probe.rings[id].angle = after.rings[id].angle;
      for (const clip of probe.clips) if (clip.on === id && !after.clips[clip.id].alive) clip.alive = false;
    }
    const still = blockedPieces(probe);
    return freed.some((f) => !still.has(f));
  });
  return found.length > 0 ? found : [...changed];
}

/** The ready pieces that cannot come off now. */
function blockedPieces(board: Board): Set<Key> {
  const free = new Set(progressMoves(board).map(moveKey));
  const blocked = new Set<Key>();
  for (const rod of board.rods) if (rod.alive && !free.has(rodKey(rod.id))) blocked.add(rodKey(rod.id));
  for (const ring of board.rings) {
    if (board.canTurn(ring.id) && board.heldBy(ring.id).length > 0 && !free.has(ringKey(ring.id))) {
      blocked.add(ringKey(ring.id));
    }
  }
  return blocked;
}

function alivePieces(board: Board): Set<Key> {
  const keys = new Set<Key>();
  for (const ring of board.rings) if (ring.alive) keys.add(ringKey(ring.id));
  for (const rod of board.rods) if (rod.alive) keys.add(rodKey(rod.id));
  return keys;
}

function moveKey(move: Move): Key {
  return 'rod' in move ? rodKey(move.rod) : ringKey(move.ring);
}
