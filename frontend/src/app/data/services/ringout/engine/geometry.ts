/**
 * The little geometry Ring Out needs. The board is in its own units with y
 * pointing down, as on screen, so a growing angle turns clockwise.
 */
export interface Vec {
  readonly x: number;
  readonly y: number;
}

export const TAU = Math.PI * 2;

export function vec(x: number, y: number): Vec {
  return { x, y };
}

export function add(a: Vec, b: Vec): Vec {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Vec, k: number): Vec {
  return { x: a.x * k, y: a.y * k };
}

export function dot(a: Vec, b: Vec): number {
  return a.x * b.x + a.y * b.y;
}

export function length(a: Vec): number {
  return Math.hypot(a.x, a.y);
}

export function distance(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** `a` as a vector of length 1; the zero vector stays zero. */
export function normalize(a: Vec): Vec {
  const l = length(a);
  return l === 0 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}

/** The point at `radius` from `center` in the direction `angle`. */
export function polar(center: Vec, radius: number, angle: number): Vec {
  return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) };
}

export function angleOf(from: Vec, to: Vec): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/** The same angle in (-π, π]. */
export function wrapAngle(angle: number): number {
  let a = angle % TAU;
  if (a <= -Math.PI) a += TAU;
  else if (a > Math.PI) a -= TAU;
  return a;
}

export function degrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** The point of segment ab nearest to p. */
export function nearestOnSegment(p: Vec, a: Vec, b: Vec): Vec {
  const ab = sub(b, a);
  const len2 = dot(ab, ab);
  if (len2 === 0) return a;
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / len2));
  return add(a, scale(ab, t));
}

/** How far p is from the polyline through `points`. */
export function distanceToPolyline(p: Vec, points: readonly Vec[]): number {
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    best = Math.min(best, distance(p, nearestOnSegment(p, points[i - 1], points[i])));
  }
  return best;
}

/** Points along the polyline, at most `step` apart, both ends included. */
export function samplePolyline(points: readonly Vec[], step: number): Vec[] {
  const out: Vec[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const n = Math.max(1, Math.ceil(distance(a, b) / step));
    for (let k = 1; k <= n; k++) out.push(add(a, scale(sub(b, a), k / n)));
  }
  return out;
}

/** A small random number source with a seed, so a run can be replayed (and tested). */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    // xorshift32
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}
