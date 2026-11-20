/**
 * The player's physics, in one place: the game moves the player with these
 * numbers and the generator plans the world with them.
 *
 * The two gravities are twice what they were written as until the world
 * stopped stepping twice a frame (see GameScene.create): that step doubled
 * them, so these are the ones the jump always had.
 */

/** Arcade Physics' gravity for the whole world (main.ts). */
export const WORLD_GRAVITY = 600;
/** The player's own gravity, added to the world's. */
export const PLAYER_GRAVITY = 800;
/** Running speed at the start, before the speed ramp. */
export const BASE_WALK_SPEED = 190;
/** Upward speed at take-off. */
export const JUMP_SPEED = 510;
/** Letting go of the jump while rising faster than this cuts the rise down to it. */
export const JUMP_CUT_SPEED = 200;

/**
 * The player's hitbox (GameScene.startPlayer): the 26 x 21 px frame drawn
 * at 1.6, with 4 px of the frame shaved off each side.
 */
export const BODY_WIDTH = 28.8;
export const BODY_HEIGHT = 33.6;

// Asymmetric gravity: light near the apex, heavy on the way down.
export const APEX_GRAVITY_MULT = 0.55;
export const FALL_GRAVITY_MULT = 1.6;
/** Below this vertical speed the player is near the apex. */
export const APEX_VELOCITY_THRESHOLD = 80;

/*
 * The jump in three phases, each with its own gravity: rising until the
 * vertical speed drops under the threshold, through the apex, and falling.
 * Heights are measured up from the take-off.
 */
const RISE_GRAVITY = WORLD_GRAVITY + PLAYER_GRAVITY;
const APEX_GRAVITY = WORLD_GRAVITY + PLAYER_GRAVITY * APEX_GRAVITY_MULT;
const FALL_GRAVITY = WORLD_GRAVITY + PLAYER_GRAVITY * FALL_GRAVITY_MULT;
const V = APEX_VELOCITY_THRESHOLD;

const RISE_TIME = (JUMP_SPEED - V) / RISE_GRAVITY;
/** Where the rise ends and the apex begins, on the way up and down. */
const RISE_HEIGHT = (JUMP_SPEED * JUMP_SPEED - V * V) / (2 * RISE_GRAVITY);
const APEX_TIME = (2 * V) / APEX_GRAVITY;

/** The highest the player's feet get above the take-off: 94 px. */
export const JUMP_APEX = RISE_HEIGHT + (V * V) / (2 * APEX_GRAVITY);

/** How long the key has to be held to get the whole jump: 0.22 s. */
export const FULL_HOLD = (JUMP_SPEED - JUMP_CUT_SPEED) / RISE_GRAVITY;
/**
 * The press the world is planned with: a short one, not one held to the
 * end. It carries three quarters as far as the whole jump and rises 59 px.
 * What the whole jump adds is the player's margin: the world never asks
 * for it.
 */
export const PLANNED_HOLD = 0.1;

/** The rise while the key is held: one gravity, from the take-off. */
function riseAt(time: number): number {
  return JUMP_SPEED * time - 0.5 * RISE_GRAVITY * time * time;
}

/**
 * Letting go at `hold` skips the stretch of the rise from that moment to
 * the one the whole jump slows down to the cut speed at. The rest of the
 * jump is the same one, that much sooner and that much lower.
 */
function cutOf(hold: number): { skipped: number; lost: number } {
  const held = Math.min(Math.max(hold, 0), FULL_HOLD);
  return { skipped: FULL_HOLD - held, lost: riseAt(FULL_HOLD) - riseAt(held) };
}

/** {@link airTime} of the whole jump. */
function wholeAirTime(drop: number): number | null {
  const height = -drop;
  if (height > JUMP_APEX) return null;

  if (height >= RISE_HEIGHT) {
    // Coming down through the apex: h = RISE_HEIGHT + V t - g t^2 / 2.
    const discriminant = Math.max(0, V * V - 2 * APEX_GRAVITY * (height - RISE_HEIGHT));
    return RISE_TIME + (V + Math.sqrt(discriminant)) / APEX_GRAVITY;
  }

  // Falling from RISE_HEIGHT, already at V downwards.
  const fall = RISE_HEIGHT - height;
  return RISE_TIME + APEX_TIME + (-V + Math.sqrt(V * V + 2 * FALL_GRAVITY * fall)) / FALL_GRAVITY;
}

/** {@link jumpHeightAt} of the whole jump. */
function wholeHeightAt(time: number): number {
  if (time <= RISE_TIME) return riseAt(time);

  const apex = time - RISE_TIME;
  if (apex <= APEX_TIME) return RISE_HEIGHT + V * apex - 0.5 * APEX_GRAVITY * apex * apex;

  const fall = apex - APEX_TIME;
  return RISE_HEIGHT - V * fall - 0.5 * FALL_GRAVITY * fall * fall;
}

/**
 * The highest the feet get with the key held for `hold` s: 30 px for a tap,
 * the whole apex once it is held through the rise.
 */
export function jumpApex(hold = FULL_HOLD): number {
  return JUMP_APEX - cutOf(hold).lost;
}

/**
 * How long a jump lasts until the feet come back down through a landing
 * `drop` px below the take-off (negative: above it).
 * @param hold - how long the key is held, in seconds; the whole jump by default
 * @returns seconds, or null if the landing is higher than the apex
 */
export function airTime(drop: number, hold = FULL_HOLD): number | null {
  const { skipped, lost } = cutOf(hold);
  const whole = wholeAirTime(drop - lost);
  return whole === null ? null : whole - skipped;
}

/**
 * How high the feet are above the take-off `time` s into a jump, through
 * the rise, the apex and the fall. Negative once they drop below it.
 * @param hold - how long the key is held, in seconds; the whole jump by default
 */
export function jumpHeightAt(time: number, hold = FULL_HOLD): number {
  const { skipped, lost } = cutOf(hold);
  if (time <= FULL_HOLD - skipped) return riseAt(time);
  return wholeHeightAt(time + skipped) - lost;
}

/**
 * How far a jump at full running speed carries the player before landing
 * `drop` px below the take-off (negative: above it).
 * @param speedMultiplier - the speed ramp at that point of the world
 * @param hold - how long the key is held, in seconds; the whole jump by default
 * @returns pixels, or 0 if the landing is out of reach
 */
export function jumpReach(drop: number, speedMultiplier = 1, hold = FULL_HOLD): number {
  const time = airTime(drop, hold);
  return time === null ? 0 : BASE_WALK_SPEED * speedMultiplier * time;
}

/**
 * How long the player takes to fall `drop` px after running off an edge. It
 * leaves at rest, so the light gravity of the apex comes first.
 */
export function fallTime(drop: number): number {
  if (drop <= 0) return 0;
  const hang = (V * V) / (2 * APEX_GRAVITY);
  if (drop <= hang) return Math.sqrt((2 * drop) / APEX_GRAVITY);
  return V / APEX_GRAVITY + (-V + Math.sqrt(V * V + 2 * FALL_GRAVITY * (drop - hang))) / FALL_GRAVITY;
}

/**
 * The shortest press whose jump carries the player `distance` px to a
 * landing `drop` px below the take-off.
 * @returns seconds: 0 when a tap is enough, FULL_HOLD when nothing reaches
 */
export function holdToReach(distance: number, drop: number, speedMultiplier = 1): number {
  if (jumpReach(drop, speedMultiplier, 0) >= distance) return 0;
  if (jumpReach(drop, speedMultiplier) <= distance) return FULL_HOLD;

  let short = 0;
  let long = FULL_HOLD;
  for (let i = 0; i < 40; i++) {
    const middle = (short + long) / 2;
    if (jumpReach(drop, speedMultiplier, middle) >= distance) long = middle;
    else short = middle;
  }
  return long;
}
