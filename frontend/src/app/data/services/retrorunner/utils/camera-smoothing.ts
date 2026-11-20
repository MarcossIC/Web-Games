const FRAME_60_MS = 1000 / 60;

/**
 * Phaser applies the camera follow lerp once per rendered frame, so a fixed
 * value follows 2.4 times faster on a 144 Hz screen than on a 60 Hz one.
 * This turns a value tuned at 60 fps into the one for a frame that took
 * `deltaMs`, so the camera covers the same distance in the same time.
 */
export function lerpForDelta(lerpAt60: number, deltaMs: number): number {
  if (deltaMs <= 0) return 0;
  return 1 - Math.pow(1 - lerpAt60, deltaMs / FRAME_60_MS);
}

/**
 * Where the camera should be this frame to keep `targetX` inside a dead
 * zone on the screen. Inside the zone the camera rests; past an edge it
 * covers `lerp` of the distance the target is past it.
 * The zone is centred on `anchor` of the view: 0.5 is the middle; less
 * rests the target further left, which shows more of what is coming.
 * The result is exact (it has decimals): keep it, and draw at its rounding.
 */
export function followScroll(
  scroll: number,
  targetX: number,
  viewWidth: number,
  deadzoneWidth: number,
  lerp: number,
  anchor: number = 0.5
): number {
  const left = scroll + viewWidth * anchor - deadzoneWidth / 2;
  const right = left + deadzoneWidth;
  let next = scroll;
  if (targetX > right) next += (targetX - right) * lerp;
  else if (targetX < left) next += (targetX - left) * lerp;
  return Math.max(0, next);
}

/**
 * The world position that draws `worldX` on a whole pixel of the screen.
 *
 * The picture is 550 pixels wide and enlarged, so everything lands on
 * whole pixels anyway. Rounding the camera and an object separately makes
 * the object flicker one pixel sideways even when both move together;
 * rounding their distance instead keeps it still.
 * `exactScroll` is the camera before rounding, `drawnScroll` after.
 */
export function snapToScroll(
  worldX: number,
  exactScroll: number,
  drawnScroll: number = exactScroll
): number {
  return drawnScroll + Math.round(worldX - exactScroll);
}
