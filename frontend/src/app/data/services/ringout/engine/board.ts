import {
  ARM,
  CLAMP_LENGTH,
  CLAMP_WIDTH,
  CLEARANCE,
  CLIP_LENGTH,
  CLIP_WIDTH,
  DEFAULT_GAP,
  RING_RADIUS,
  SAMPLE_STEP,
  TUBE,
} from './config';
import {
  add,
  angleOf,
  distance,
  distanceToPolyline,
  normalize,
  polar,
  radians,
  samplePolyline,
  scale,
  sub,
  TAU,
  type Vec,
  vec,
  wrapAngle,
} from './geometry';
import type { LevelSpec, PieceColor } from './types';

export interface Ring {
  readonly id: number;
  readonly center: Vec;
  readonly radius: number;
  /** Half the width of the opening, in radians; 0 for a closed ring. */
  readonly gapHalf: number;
  /** Where the opening faces, in radians. It grows as the ring turns clockwise and is never wrapped. */
  angle: number;
  readonly color: PieceColor;
  alive: boolean;
}

export interface Clip {
  readonly id: number;
  /** The ring whose arm holds the clip. */
  readonly from: number;
  /** The ring the clip is closed around. */
  readonly on: number;
  /** Where the sleeve sits on `on`, in radians. */
  readonly at: number;
  /** Middle of the sleeve, on the tube of `on`. */
  readonly sleeve: Vec;
  /** Where the arm meets the tube of `from`. */
  readonly weld: Vec;
  alive: boolean;
}

export interface Rod {
  readonly id: number;
  /** The rod at rest: tail, head and, if it is bent, the bend. */
  readonly points: readonly Vec[];
  /** The way it slides, as a vector of length 1. */
  readonly direction: Vec;
  /** Middle of the clamp, which never moves. */
  readonly clamp: Vec;
  /** How far it slides before its tail is out of the clamp. */
  readonly exitDistance: number;
  /** How far it has slid from rest. The view moves it; the rules only read it. */
  offset: number;
  readonly color: PieceColor;
  alive: boolean;
}

export type BoardEvent =
  | { readonly kind: 'release'; readonly clip: Clip }
  | { readonly kind: 'shatter'; readonly ring: Ring }
  | { readonly kind: 'rod-out'; readonly rod: Rod };

export interface TurnOutcome {
  /** How much the ring turned, in radians (clockwise is positive). */
  readonly turned: number;
  /** Something stopped it before it turned as far as it was asked. */
  readonly blocked: boolean;
  /** Clips it let go and rings that broke, in the order they happened. */
  readonly events: readonly BoardEvent[];
}

export interface SlidePlan {
  /** Nothing is in the way: the rod comes out of its clamp. */
  readonly free: boolean;
  /** How far it slides: out of its clamp if free, up to what stops it if not. */
  readonly distance: number;
}

/** How far a ring can turn from where it is, in radians each way. */
export interface TurnRange {
  readonly min: number;
  readonly max: number;
}

export type Piece = { readonly kind: 'ring'; readonly id: number } | { readonly kind: 'rod'; readonly id: number };

/** A round piece of something solid, for the collision checks. */
interface Blob {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

export interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** What a piece leaves out when it asks what is in its way: itself and what holds it. */
interface Except {
  readonly ring?: number;
  readonly rod?: number;
}

const NO_RANGE: TurnRange = { min: 0, max: 0 };

/**
 * The rules of Ring Out on one level: the rings, the clips between them
 * and the rods, where they are, and what they may do.
 *
 * - A ring with an opening turns around its center. A clip closed around
 *   its tube stays put while the tube slides through it, and lets go when
 *   the opening reaches it.
 * - A ring that holds a clip cannot turn: its arm would drag the other ring.
 * - A ring turns only as far as its tube does not run into anything: the
 *   tube of another ring, an arm, a clip, a rod or a clamp.
 * - A rod slides out of its clamp unless something is in its way.
 * - A ring that holds and is held by nothing any more breaks, and so does
 *   a rod that leaves its clamp. The level is cleared when nothing is left.
 *
 * Nothing is ever put back, and taking a piece away only gives the others
 * more room: a level that can be cleared can still be cleared after any
 * move.
 */
export class Board {
  readonly rings: Ring[];
  readonly clips: Clip[];
  readonly rods: Rod[];

  private constructor(rings: Ring[], clips: Clip[], rods: Rod[]) {
    this.rings = rings;
    this.clips = clips;
    this.rods = rods;
  }

  static load(level: LevelSpec): Board {
    const rings: Ring[] = level.rings.map((spec, id) => ({
      id,
      center: vec(spec.x, spec.y),
      radius: spec.r ?? RING_RADIUS,
      gapHalf: radians(spec.gap ?? DEFAULT_GAP) / 2,
      angle: radians(spec.facing ?? 0),
      color: spec.color,
      alive: true,
    }));
    const clips: Clip[] = level.clips.map((spec, id) => {
      const from = rings[spec.from];
      const on = rings[spec.on];
      if (!from || !on) throw new Error(`Clip ${id} names a ring that is not there.`);
      const at = spec.at === undefined ? angleOf(on.center, from.center) : radians(spec.at);
      const sleeve = polar(on.center, on.radius, at);
      const weld = polar(from.center, from.radius, angleOf(from.center, sleeve));
      return { id, from: spec.from, on: spec.on, at, sleeve, weld, alive: true };
    });
    const rods: Rod[] = (level.rods ?? []).map((spec, id) => {
      const tail = vec(spec.tail[0], spec.tail[1]);
      const head = vec(spec.head[0], spec.head[1]);
      const points = spec.bend ? [tail, head, vec(spec.bend[0], spec.bend[1])] : [tail, head];
      const direction = normalize(sub(head, tail));
      const along = distance(tail, head) * (spec.clamp ?? 0.5);
      const clamp = add(tail, scale(direction, along));
      const exitDistance = along + CLAMP_LENGTH / 2 + TUBE / 2 + 2;
      return { id, points, direction, clamp, exitDistance, offset: 0, color: spec.color, alive: true };
    });
    return new Board(rings, clips, rods);
  }

  /** A copy to try moves on: what happens to it does not touch this board. */
  clone(): Board {
    return new Board(
      this.rings.map((ring) => ({ ...ring })),
      this.clips.map((clip) => ({ ...clip })),
      this.rods.map((rod) => ({ ...rod }))
    );
  }

  get cleared(): boolean {
    return this.rings.every((ring) => !ring.alive) && this.rods.every((rod) => !rod.alive);
  }

  /** The pieces still on the board. */
  get remaining(): number {
    return this.rings.filter((ring) => ring.alive).length + this.rods.filter((rod) => rod.alive).length;
  }

  /** The clips a ring holds with its arms: while there is one, it cannot turn. */
  holding(ringId: number): Clip[] {
    return this.clips.filter((clip) => clip.alive && clip.from === ringId);
  }

  /** The clips closed around a ring's tube. */
  heldBy(ringId: number): Clip[] {
    return this.clips.filter((clip) => clip.alive && clip.on === ringId);
  }

  /** The ring is on the board, has an opening and holds no clip. */
  canTurn(ringId: number): boolean {
    const ring = this.rings[ringId];
    return !!ring && ring.alive && ring.gapHalf > 0 && this.holding(ringId).length === 0;
  }

  /** How far the ring can turn each way before its tube touches something. */
  turnRange(ringId: number): TurnRange {
    if (!this.canTurn(ringId)) return NO_RANGE;
    const ring = this.rings[ringId];
    let min = -Infinity;
    let max = Infinity;
    for (const blob of this.blobs({ ring: ringId })) {
      const span = this.spanOn(ring, blob);
      if (!span) continue;
      // Beside the tube, not in the opening: the tube slides past it.
      if (Math.abs(span.a) - span.half >= ring.gapHalf) continue;
      // The blob must stay inside the opening: |a - turn| + half <= gapHalf.
      let lo = span.a + span.half - ring.gapHalf;
      let hi = span.a - span.half + ring.gapHalf;
      // At the edge of the opening, touching: it may stay, not go deeper.
      lo = Math.min(lo, 0);
      hi = Math.max(hi, 0);
      if (lo > min) min = lo;
      if (hi < max) max = hi;
    }
    return { min, max };
  }

  /**
   * Turns a ring by `by` radians, or as far as it goes that way. Clips
   * the opening reaches on the way let go, and rings left with nothing
   * break; if the turning ring breaks, it stops there.
   */
  turn(ringId: number, by: number): TurnOutcome {
    const ring = this.rings[ringId];
    const range = this.turnRange(ringId);
    const turned = Math.max(range.min, Math.min(range.max, by));
    const blocked = Math.abs(turned - by) > 1e-9;
    if (turned === 0) return { turned: 0, blocked, events: [] };

    const releases = this.heldBy(ringId)
      .map((clip) => ({ clip, when: this.releasePoint(ring, clip, turned) }))
      .filter((release): release is { clip: Clip; when: number } => release.when !== null)
      .sort((a, b) => Math.abs(a.when) - Math.abs(b.when));

    const events: BoardEvent[] = [];
    for (const { clip, when } of releases) {
      events.push(...this.release(clip));
      if (!ring.alive) {
        ring.angle += when;
        return { turned: when, blocked: false, events };
      }
    }
    ring.angle += turned;
    return { turned, blocked, events };
  }

  /** How far a rod would slide if it were pulled now. */
  slidePlan(rodId: number): SlidePlan {
    const rod = this.rods[rodId];
    if (!rod?.alive) return { free: false, distance: 0 };
    const d = rod.direction;
    const own = samplePolyline(this.rodPoints(rod), SAMPLE_STEP);
    let hit = Infinity;
    for (const blob of this.blobs({ rod: rodId })) {
      const reach = TUBE / 2 + blob.r + CLEARANCE;
      const reach2 = reach * reach;
      for (const p of own) {
        const wx = blob.x - p.x;
        const wy = blob.y - p.y;
        const w2 = wx * wx + wy * wy;
        if (w2 < reach2) continue; // touching at rest: a level drawn a hair too tight
        const along = wx * d.x + wy * d.y;
        if (along <= 0) continue;
        const across2 = w2 - along * along;
        if (across2 >= reach2) continue;
        const t = along - Math.sqrt(reach2 - across2);
        if (t < hit) hit = t;
      }
    }
    const left = rod.exitDistance - rod.offset;
    return hit >= left ? { free: true, distance: left } : { free: false, distance: Math.max(0, hit) };
  }

  /** Takes a rod off the board: it is out of its clamp. */
  removeRod(rodId: number): BoardEvent[] {
    const rod = this.rods[rodId];
    if (!rod?.alive) return [];
    rod.alive = false;
    return [{ kind: 'rod-out', rod }];
  }

  /**
   * Pulls a rod all the way, at once: out and off the board if nothing is
   * in its way. For the tests and the hints; the game slides it in steps.
   */
  pullRod(rodId: number): { plan: SlidePlan; events: BoardEvent[] } {
    const plan = this.slidePlan(rodId);
    return { plan, events: plan.free ? this.removeRod(rodId) : [] };
  }

  /** The rod where it is now, slid `offset` along. */
  rodPoints(rod: Rod): Vec[] {
    const shift = scale(rod.direction, rod.offset);
    return rod.points.map((p) => add(p, shift));
  }

  /**
   * The piece under a point, if any: a rod or the tube of a ring within
   * `slop` of it, the nearest one first; else the ring whose inside it is in.
   */
  pieceAt(point: Vec, slop: number): Piece | null {
    let best: Piece | null = null;
    let bestScore = Infinity;
    for (const rod of this.rods) {
      if (!rod.alive) continue;
      const near = Math.min(
        distanceToPolyline(point, this.rodPoints(rod)) - TUBE / 2,
        distance(point, rod.clamp) - CLAMP_WIDTH / 2
      );
      if (near <= slop && near < bestScore) {
        best = { kind: 'rod', id: rod.id };
        bestScore = near;
      }
    }
    for (const ring of this.rings) {
      if (!ring.alive) continue;
      const d = distance(point, ring.center);
      let near = Math.abs(d - ring.radius) - TUBE / 2;
      if (near > slop) continue;
      // A point in the opening counts, a little behind the tube itself.
      if (Math.abs(wrapAngle(angleOf(ring.center, point) - ring.angle)) < ring.gapHalf) near += slop / 2;
      if (near < bestScore) {
        best = { kind: 'ring', id: ring.id };
        bestScore = near;
      }
    }
    if (best) return best;

    let inside: Ring | null = null;
    for (const ring of this.rings) {
      if (!ring.alive) continue;
      const d = distance(point, ring.center);
      if (d < ring.radius && (!inside || d / ring.radius < distance(point, inside.center) / inside.radius)) {
        inside = ring;
      }
    }
    return inside ? { kind: 'ring', id: inside.id } : null;
  }

  /** The box around every piece as the level starts. */
  bounds(): Bounds {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const grow = (p: Vec, r: number) => {
      minX = Math.min(minX, p.x - r);
      minY = Math.min(minY, p.y - r);
      maxX = Math.max(maxX, p.x + r);
      maxY = Math.max(maxY, p.y + r);
    };
    for (const ring of this.rings) grow(ring.center, ring.radius + TUBE / 2);
    for (const clip of this.clips) grow(clip.sleeve, CLIP_WIDTH / 2);
    for (const rod of this.rods) {
      for (const p of rod.points) grow(p, TUBE / 2);
      grow(rod.clamp, CLAMP_WIDTH / 2);
    }
    return { minX, minY, maxX, maxY };
  }

  /** The points along a ring's tube, as it is now. */
  arcPoints(ring: Ring): Vec[] {
    if (ring.gapHalf <= 0) {
      const n = Math.ceil((TAU * ring.radius) / SAMPLE_STEP);
      return Array.from({ length: n }, (_, i) => polar(ring.center, ring.radius, (i / n) * TAU));
    }
    const sweep = TAU - 2 * ring.gapHalf;
    const n = Math.max(2, Math.ceil((sweep * ring.radius) / SAMPLE_STEP));
    const start = ring.angle + ring.gapHalf;
    return Array.from({ length: n + 1 }, (_, i) => polar(ring.center, ring.radius, start + (i / n) * sweep));
  }

  /**
   * The solid parts of the board, as small discs, leaving out the piece
   * that asks and what it carries or is held by: a ring leaves out the
   * clips on its tube and those it holds, a rod its own clamp.
   */
  blobs(except: Except = {}): Blob[] {
    const out: Blob[] = [];
    for (const ring of this.rings) {
      if (!ring.alive || ring.id === except.ring) continue;
      for (const p of this.arcPoints(ring)) out.push({ x: p.x, y: p.y, r: TUBE / 2 });
    }
    for (const clip of this.clips) {
      if (!clip.alive || clip.on === except.ring || clip.from === except.ring) continue;
      for (const p of samplePolyline([clip.weld, clip.sleeve], SAMPLE_STEP)) out.push({ x: p.x, y: p.y, r: ARM / 2 });
      const tangent = vec(-Math.sin(clip.at), Math.cos(clip.at));
      const half = CLIP_LENGTH / 2 - CLIP_WIDTH / 4;
      for (const k of [-1, 0, 1]) {
        const p = add(clip.sleeve, scale(tangent, k * half));
        out.push({ x: p.x, y: p.y, r: CLIP_WIDTH / 2 - 1 });
      }
    }
    for (const rod of this.rods) {
      if (!rod.alive) continue;
      if (rod.id !== except.rod) {
        for (const p of samplePolyline(this.rodPoints(rod), SAMPLE_STEP)) out.push({ x: p.x, y: p.y, r: TUBE / 2 });
      }
      if (rod.id === except.rod) continue;
      const across = vec(-rod.direction.y, rod.direction.x);
      const along = CLAMP_LENGTH / 2 - CLAMP_WIDTH / 6;
      const wide = CLAMP_WIDTH / 2 - CLAMP_WIDTH / 6;
      for (const i of [-1, 0, 1]) {
        for (const j of [-1, 0, 1]) {
          const p = add(rod.clamp, add(scale(rod.direction, i * along), scale(across, j * wide)));
          out.push({ x: p.x, y: p.y, r: CLAMP_WIDTH / 6 + 1 });
        }
      }
    }
    return out;
  }

  /**
   * Where a blob crosses the circle of a ring's tube, if it does: its angle
   * from the middle of the opening (`a`) and half the angle it covers.
   */
  spanOn(ring: Ring, blob: Blob): { a: number; half: number } | null {
    const d = Math.hypot(blob.x - ring.center.x, blob.y - ring.center.y);
    const reach = TUBE / 2 + blob.r + CLEARANCE;
    if (Math.abs(d - ring.radius) >= reach || d === 0) return null;
    const cos = (ring.radius * ring.radius + d * d - reach * reach) / (2 * ring.radius * d);
    const half = Math.acos(Math.max(-1, Math.min(1, cos)));
    const a = wrapAngle(Math.atan2(blob.y - ring.center.y, blob.x - ring.center.x) - ring.angle);
    return { a, half };
  }

  /** How far a clip on a ring's tube is from where it lets go, in radians: 0 or less once inside the opening. */
  releaseWindow(ring: Ring): number {
    return ring.gapHalf - (CLIP_LENGTH / 2 + TUBE / 2) / ring.radius;
  }

  /**
   * How far into a turn of `by` radians the opening takes in the clip
   * whole, or null if it does not get there.
   */
  private releasePoint(ring: Ring, clip: Clip, by: number): number | null {
    const w = this.releaseWindow(ring);
    if (w <= 0) return null;
    const s = wrapAngle(clip.at - ring.angle);
    let best: number | null = null;
    for (let k = -2; k <= 2; k++) {
      const lo = s - w + k * TAU;
      const hi = s + w + k * TAU;
      if (by > 0) {
        if (hi < 0 || lo > by) continue;
        const when = Math.max(0, lo);
        if (best === null || when < best) best = when;
      } else {
        if (lo > 0 || hi < by) continue;
        const when = Math.min(0, hi);
        if (best === null || when > best) best = when;
      }
    }
    return best;
  }

  /** A clip lets go: the rings left holding and held by nothing break. */
  private release(clip: Clip): BoardEvent[] {
    clip.alive = false;
    const events: BoardEvent[] = [{ kind: 'release', clip }];
    for (const id of [clip.on, clip.from]) {
      const ring = this.rings[id];
      if (ring.alive && this.holding(id).length === 0 && this.heldBy(id).length === 0) {
        ring.alive = false;
        events.push({ kind: 'shatter', ring });
      }
    }
    return events;
  }
}
