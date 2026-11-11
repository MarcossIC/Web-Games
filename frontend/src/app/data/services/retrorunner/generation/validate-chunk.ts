import { JUMP_SAFETY } from './balance';
import { ChunkPlan, Piece, Surface } from './chunk-plan';
import { BLOCK_TOP_ABOVE_Y, FLOOR_SURFACE_ABOVE_Y, floorRunEnd, TILE } from './geometry';
import { JUMP_APEX, jumpReach } from './jump-model';

export type { Surface } from './chunk-plan';

/** Where the player stands on a piece, or null if it is not ground. */
function surfaceOf(piece: Piece): Surface | null {
  switch (piece.type) {
    case 'floor':
      return {
        left: piece.x,
        right: floorRunEnd(piece.x, piece.centerTiles) + TILE.END_WIDTH,
        top: piece.y - FLOOR_SURFACE_ABOVE_Y,
      };
    case 'block':
      return { left: piece.x, right: piece.x + TILE.BLOCK_SIZE, top: piece.y - BLOCK_TOP_ABOVE_Y };
    case 'platform':
      return { left: piece.x, right: piece.x + piece.width, top: piece.y };
    case 'bridge':
      // It holds a player who keeps moving.
      return { left: piece.startX, right: piece.endX, top: piece.floorY - FLOOR_SURFACE_ABOVE_Y };
    default:
      return null;
  }
}

export function surfacesOf(plan: ChunkPlan): Surface[] {
  const surfaces: Surface[] = [];
  for (const piece of plan.pieces) {
    const surface = surfaceOf(piece);
    if (surface) surfaces.push(surface);
  }
  return surfaces;
}

/** The landing a gap promises the next chunk will start with. */
function promisedLanding(startX: number, floorY: number): Surface {
  return { left: startX, right: startX + TILE.START_WIDTH, top: floorY - FLOOR_SURFACE_ABOVE_Y };
}

/**
 * Where a chunk leaves the player: its last floor, which ends where the
 * next chunk starts, or for a gap the landing it promises. Null when the
 * chunk does not end on a floor at its exit height.
 */
export function exitSurfaceOf(plan: ChunkPlan): Surface | null {
  if (plan.kind === 'gap') return promisedLanding(plan.endX, plan.exitY);
  for (const piece of plan.pieces) {
    if (piece.type === 'floor' && piece.y === plan.exitY && floorRunEnd(piece.x, piece.centerTiles) === plan.endX) {
      return surfaceOf(piece);
    }
  }
  return null;
}

/**
 * Where the player stands when a chunk starts: the exit of the chunk
 * before, or for the first chunk the floor the player is dropped on.
 */
export function entrySurfaceAfter(previous: ChunkPlan | null, startX: number, floorY: number): Surface {
  if (!previous) return promisedLanding(startX, floorY);
  return exitSurfaceOf(previous) ?? promisedLanding(startX, floorY);
}

/**
 * Whether a player standing anywhere on `from` can get onto `to`: walking
 * or dropping when they touch, jumping otherwise. Measured with the reach
 * and the height of a jump at that speed, cut by the safety margin.
 */
export function canJump(from: Surface, to: Surface, speedMultiplier = 1): boolean {
  const dx = Math.max(0, to.left - from.right, from.left - to.right);
  const drop = to.top - from.top;
  if (dx === 0 && drop >= 0) return true;
  if (-drop > JUMP_APEX * JUMP_SAFETY) return false;
  return dx <= jumpReach(drop, speedMultiplier) * JUMP_SAFETY;
}

function reaches(from: Surface, to: Surface, surfaces: Surface[]): boolean {
  const seen = new Set<Surface>([from]);
  const queue: Surface[] = [from];
  while (queue.length > 0) {
    const current = queue.shift() as Surface;
    if (canJump(current, to)) return true;
    for (const next of surfaces) {
      if (!seen.has(next) && canJump(current, next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

/** The left and right of a piece the player can stand on or bump into. */
function solidSpan(piece: Piece): [number, number] | null {
  const surface = surfaceOf(piece);
  return surface ? [surface.left, surface.right] : null;
}

/**
 * The entry a chunk is checked from: the exit of the chunk before it.
 * @param mustLand - the chunk before was a gap (or there was none): this
 *                   chunk has to start with the floor it promised
 */
export interface ChunkEntry {
  startX: number;
  entryY: number;
  surface: Surface;
  mustLand: boolean;
}

/**
 * Checks that a chunk can be crossed: it continues the chunk before, its
 * exit can be reached from its entry with the jump at base speed, and it
 * keeps its ground inside itself.
 * @returns what is wrong, or nothing
 */
export function checkChunk(plan: ChunkPlan, entry: ChunkEntry): string[] {
  const problems: string[] = [];

  if (plan.startX !== entry.startX) {
    problems.push(`starts at ${plan.startX}, the chunk before ends at ${entry.startX}`);
  }
  if (plan.entryY !== entry.entryY) {
    problems.push(`starts at height ${plan.entryY}, the chunk before ends at height ${entry.entryY}`);
  }

  if (entry.mustLand) {
    const landing = plan.pieces.some((p) => p.type === 'floor' && p.x === plan.startX && p.y === plan.entryY);
    if (!landing) problems.push(`has no floor at ${plan.startX} for the landing the gap before promised`);
  }

  const exit = exitSurfaceOf(plan);
  if (!exit) {
    problems.push(`does not end on a floor at ${plan.endX} at height ${plan.exitY}`);
  } else if (!reaches(entry.surface, exit, surfacesOf(plan))) {
    problems.push('its exit cannot be reached from its entry');
  }

  for (const piece of plan.pieces) {
    const span = solidSpan(piece);
    if (span && (span[0] < plan.startX || span[1] > plan.endX + TILE.END_WIDTH)) {
      problems.push(`has a ${piece.type} at ${span[0]} outside its chunk`);
    }
  }

  return problems;
}

/** {@link checkChunk} against the chunk before, or the start of the world. */
export function validateChunk(plan: ChunkPlan, previous: ChunkPlan | null): string[] {
  const startX = previous ? previous.endX : plan.startX;
  const entryY = previous ? previous.exitY : plan.entryY;
  return checkChunk(plan, {
    startX,
    entryY,
    surface: entrySurfaceAfter(previous, startX, entryY),
    mustLand: !previous || previous.kind === 'gap',
  });
}
