import type { TrailRing } from './trail-ring';

/** Floats per streak point in the `out` buffer: left x, left y, right x, right y. */
export const STREAK_STRIDE = 4;

/**
 * The outline of the tapered streak behind a ball: the ball's drawn
 * position first, then the ring's samples from newest to oldest. Each point
 * gets a left and a right edge, `halfWidth` wide at the ball and narrowing
 * to a point at the tail, written into `out` (STREAK_STRIDE floats a point).
 * Returns how many points were written: 0 when there is nothing to draw
 * (a ball that has not moved yet). The newest sample is skipped when the
 * ball still sits on it (it was just taken), so the streak keeps its width
 * at the ball. Nothing here allocates.
 */
export function buildStreak(
  ring: TrailRing,
  headX: number,
  headY: number,
  halfWidth: number,
  out: Float32Array
): number {
  const max = Math.floor(out.length / STREAK_STRIDE);
  let skip = 0;
  if (ring.count > 0) {
    const dx = ring.xAt(0) - headX;
    const dy = ring.yAt(0) - headY;
    if (dx * dx + dy * dy < SAME_POINT * SAME_POINT) skip = 1;
  }
  const n = Math.min(ring.count + 1 - skip, max);
  if (n < 2) return 0;

  // Last normal used, so a point whose neighbours coincide keeps a sane edge.
  let nx = 0;
  let ny = 0;
  for (let k = 0; k < n; k++) {
    const px = pointX(ring, headX, k, skip);
    const py = pointY(ring, headY, k, skip);
    // Direction of travel at k: from the older neighbour to the newer one.
    const ax = pointX(ring, headX, Math.max(0, k - 1), skip);
    const ay = pointY(ring, headY, Math.max(0, k - 1), skip);
    const bx = pointX(ring, headX, Math.min(n - 1, k + 1), skip);
    const by = pointY(ring, headY, Math.min(n - 1, k + 1), skip);
    const dx = ax - bx;
    const dy = ay - by;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 1e-6) {
      nx = -dy / len;
      ny = dx / len;
    }
    const w = halfWidth * streakTaper(k / (n - 1));
    const o = k * STREAK_STRIDE;
    out[o] = px + nx * w;
    out[o + 1] = py + ny * w;
    out[o + 2] = px - nx * w;
    out[o + 3] = py - ny * w;
  }
  return n;
}

/** Width share at `t` along the streak (0 at the ball, 1 at the tail): full at the ball, a point at the tail. */
export function streakTaper(t: number): number {
  const u = 1 - Math.min(1, Math.max(0, t));
  return Math.sqrt(u);
}

/** Opacity share at `t` along the streak: bright at the ball, gone at the tail. */
export function streakFade(t: number): number {
  const u = 1 - Math.min(1, Math.max(0, t));
  return u * u;
}

/** Closer than this (px) to the ball, the newest sample is the ball itself. */
const SAME_POINT = 0.5;

/** Point k of the streak: the ball, then the ring's samples from `skip` on. */
function pointX(ring: TrailRing, headX: number, k: number, skip: number): number {
  return k === 0 ? headX : ring.xAt(k - 1 + skip);
}

function pointY(ring: TrailRing, headY: number, k: number, skip: number): number {
  return k === 0 ? headY : ring.yAt(k - 1 + skip);
}
