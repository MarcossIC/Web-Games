/**
 * The player's physics, in one place: the game moves the player with these
 * numbers and the generator plans the world with them.
 */

/** Arcade Physics' gravity for the whole world (main.ts). */
export const WORLD_GRAVITY = 300;
/** The player's own gravity, added to the world's. */
export const PLAYER_GRAVITY = 400;
/** Running speed at the start, before the speed ramp. */
export const BASE_WALK_SPEED = 190;
/** Upward speed at take-off. */
export const JUMP_SPEED = 510;

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

/** The highest the player's feet get above the take-off: 187 px. */
export const JUMP_APEX = RISE_HEIGHT + (V * V) / (2 * APEX_GRAVITY);

/**
 * How long a jump lasts until the feet come back down through a landing
 * `drop` px below the take-off (negative: above it).
 * @returns seconds, or null if the landing is higher than the apex
 */
export function airTime(drop: number): number | null {
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

/**
 * How far a jump at full running speed carries the player before landing
 * `drop` px below the take-off (negative: above it).
 * @param speedMultiplier - the speed ramp at that point of the world
 * @returns pixels, or 0 if the landing is out of reach
 */
export function jumpReach(drop: number, speedMultiplier = 1): number {
  const time = airTime(drop);
  return time === null ? 0 : BASE_WALK_SPEED * speedMultiplier * time;
}
