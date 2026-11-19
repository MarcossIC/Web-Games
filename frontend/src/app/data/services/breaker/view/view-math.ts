/** Small numeric helpers of the view. Nothing here allocates. */

/** Draw position between the last two fixed steps: prev + (cur - prev) * alpha. */
export function lerp(prev: number, cur: number, alpha: number): number {
  return prev + (cur - prev) * alpha;
}

export function clamp01(value: number): number {
  if (!(value > 0)) return 0;
  return value > 1 ? 1 : value;
}

export function easeOutCubic(t: number): number {
  const u = 1 - clamp01(t);
  return 1 - u * u * u;
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const u = clamp01(t) - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
}

/** 0 -> 1 -> 0 over `periodMs`, smooth (a cosine). */
export function pulse(timeMs: number, periodMs: number): number {
  return 0.5 - 0.5 * Math.cos((timeMs / periodMs) * Math.PI * 2);
}

const squashOut = { x: 1, y: 1 };

/**
 * Paddle squash after a hit, `t` 0..1 through the animation: flat and wide
 * at once, springing back to 1. The result object is reused.
 */
export function squash(t: number): { readonly x: number; readonly y: number } {
  const k = 1 - easeOutCubic(t);
  // A little wobble on the way back, so it reads as rubber, not a scale tween.
  const wobble = Math.sin(clamp01(t) * Math.PI * 2) * 0.04 * k;
  squashOut.x = 1 + 0.1 * k - wobble;
  squashOut.y = 1 - 0.32 * k + wobble;
  return squashOut;
}
