/**
 * Continuous collision for the ball. A circle of radius r moving by (dx, dy)
 * hits a rect exactly when its center, a point, crosses the rect grown by r
 * on every side with rounded corners (the Minkowski sum). So the sweep is a
 * ray against that rounded rect: flat faces where the contact is on a side,
 * a circle of radius r around each corner where it is on a corner. This is
 * what keeps a fast ball from tunneling: the whole path of the step is
 * tested, not just where it ends.
 */

export interface SweepHit {
  /** Share of the displacement travelled before the contact, 0..1. */
  t: number;
  /** Unit normal of the surface at the contact, pointing out of the rect. */
  nx: number;
  ny: number;
  /**
   * 0 for a real sweep hit. When the ball already overlaps the rect at the
   * start, t is 0 and this is how far to move it along the normal to get out.
   */
  depth: number;
}

/** Distances under this count as touching: float noise after a bounce. */
const TOUCH_EPS = 1e-6;

function makeHit(out: SweepHit | undefined, t: number, nx: number, ny: number, depth: number): SweepHit {
  const hit = out ?? { t: 0, nx: 0, ny: 0, depth: 0 };
  hit.t = t;
  hit.nx = nx;
  hit.ny = ny;
  hit.depth = depth;
  return hit;
}

/**
 * Earliest time a ray from (px, py) along (dx, dy) meets the circle around
 * (cx, cy) with radius r, in [0, 1], or -1. The start is known to be outside.
 */
function rayCircle(px: number, py: number, dx: number, dy: number, cx: number, cy: number, r: number): number {
  const ox = px - cx;
  const oy = py - cy;
  const a = dx * dx + dy * dy;
  if (a === 0) return -1;
  const b = ox * dx + oy * dy;
  const c = ox * ox + oy * oy - r * r;
  const disc = b * b - a * c;
  if (disc < 0) return -1;
  const t = (-b - Math.sqrt(disc)) / a;
  return t >= 0 && t <= 1 ? t : -1;
}

/**
 * Sweeps a circle against the axis-aligned rect (left, top, w, h).
 * Returns the earliest contact in [0, 1] with its normal, or null.
 * Pass `out` to have it filled instead of a new object (the engine does).
 *
 * A ball that starts touching the rect only counts as a hit when it moves
 * into it, so a ball resting where the last bounce left it is free to leave.
 * A ball that starts overlapping is always a hit at t = 0, with `depth` to
 * push it out: along the shallowest axis when its center is inside the rect,
 * along the line from the closest point otherwise.
 */
export function sweepCircleRect(
  px: number,
  py: number,
  dx: number,
  dy: number,
  r: number,
  left: number,
  top: number,
  w: number,
  h: number,
  out?: SweepHit
): SweepHit | null {
  const right = left + w;
  const bottom = top + h;

  // Where the ball starts, against the rect itself.
  const qx = px < left ? left : px > right ? right : px;
  const qy = py < top ? top : py > bottom ? bottom : py;
  const ox = px - qx;
  const oy = py - qy;
  const dist2 = ox * ox + oy * oy;

  if (dist2 < (r + TOUCH_EPS) * (r + TOUCH_EPS)) {
    let nx: number;
    let ny: number;
    let depth: number;
    if (dist2 === 0) {
      // The center is inside: leave through the closest face.
      const toLeft = px - left;
      const toRight = right - px;
      const toTop = py - top;
      const toBottom = bottom - py;
      const min = Math.min(toLeft, toRight, toTop, toBottom);
      if (min === toTop) [nx, ny, depth] = [0, -1, toTop + r];
      else if (min === toBottom) [nx, ny, depth] = [0, 1, toBottom + r];
      else if (min === toLeft) [nx, ny, depth] = [-1, 0, toLeft + r];
      else [nx, ny, depth] = [1, 0, toRight + r];
    } else {
      const dist = Math.sqrt(dist2);
      // Exact axis normals on a face, so a face hit reads as (0, -1), not (-0, -1).
      nx = ox === 0 ? 0 : ox / dist;
      ny = oy === 0 ? 0 : oy / dist;
      depth = Math.max(0, r - dist);
    }
    const overlapping = depth > TOUCH_EPS;
    const movingIn = dx * nx + dy * ny < 0;
    return overlapping || movingIn ? makeHit(out, 0, nx, ny, overlapping ? depth : 0) : null;
  }

  // The center is outside the rounded rect: a ray against the grown box first.
  const eLeft = left - r;
  const eRight = right + r;
  const eTop = top - r;
  const eBottom = bottom + r;

  let tEnter = Number.NEGATIVE_INFINITY;
  let tExit = Number.POSITIVE_INFINITY;
  let axis = 0; // 1: entered through x, 2: through y

  if (dx === 0) {
    if (px < eLeft || px > eRight) return null;
  } else {
    const a = (eLeft - px) / dx;
    const b = (eRight - px) / dx;
    const t1 = a < b ? a : b;
    const t2 = a < b ? b : a;
    if (t1 > tEnter) {
      tEnter = t1;
      axis = 1;
    }
    if (t2 < tExit) tExit = t2;
  }
  if (dy === 0) {
    if (py < eTop || py > eBottom) return null;
  } else {
    const a = (eTop - py) / dy;
    const b = (eBottom - py) / dy;
    const t1 = a < b ? a : b;
    const t2 = a < b ? b : a;
    if (t1 > tEnter) {
      tEnter = t1;
      axis = 2;
    }
    if (t2 < tExit) tExit = t2;
  }
  if (tEnter > tExit || tExit < 0 || tEnter > 1) return null;

  // Where the center enters the grown box (or starts, if already in it).
  const tFrom = tEnter > 0 ? tEnter : 0;
  const ex = px + dx * tFrom;
  const ey = py + dy * tFrom;
  const inCornerX = ex < left || ex > right;
  const inCornerY = ey < top || ey > bottom;

  if (inCornerX && inCornerY) {
    // A corner region: the real surface there is the circle around the corner.
    // Missing it means missing the rect, since the flat bands next to it can
    // only be reached through the circle.
    const cx = ex < left ? left : right;
    const cy = ey < top ? top : bottom;
    const t = rayCircle(px, py, dx, dy, cx, cy, r);
    if (t < 0) return null;
    const hx = px + dx * t - cx;
    const hy = py + dy * t - cy;
    return makeHit(out, t, hx / r, hy / r, 0);
  }

  if (tEnter < 0) {
    // Inside the grown box but outside the rounded rect and not in a corner
    // cannot happen: that is the overlap case handled above.
    return null;
  }
  if (axis === 1) return makeHit(out, tEnter, dx > 0 ? -1 : 1, 0, 0);
  return makeHit(out, tEnter, 0, dy > 0 ? -1 : 1, 0);
}

/**
 * Mirrors a velocity on a unit normal, only when it moves into the surface:
 * a ball already leaving is left alone, so a double contact never sends it back in.
 */
export function reflect(v: { x: number; y: number }, nx: number, ny: number): void {
  const dot = v.x * nx + v.y * ny;
  if (dot >= 0) return;
  v.x -= 2 * dot * nx;
  v.y -= 2 * dot * ny;
}
