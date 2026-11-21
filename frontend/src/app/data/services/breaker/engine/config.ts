import type { BrickKind, TimedEffectKind } from './types';

/**
 * Every tunable number of Nova Breaker in one place. The rest of the engine
 * reads from here, so balancing the game never means hunting for constants.
 * Pixels of the 960x720 world, milliseconds, px/s for speeds.
 */

export const WORLD = {
  WIDTH: 960,
  HEIGHT: 720,
  /** The HUD band sits on top of the play field: the ceiling is its bottom edge. */
  HUD_HEIGHT: 64,
  CEILING_Y: 64,
  LEFT_WALL_X: 0,
  RIGHT_WALL_X: 960,
  /** Past this y a ball or a capsule is gone (the bottom is open). */
  LOST_Y: 720,
} as const;

export const GRID = {
  COLS: 13,
  MAX_ROWS: 14,
  BRICK_W: 66,
  BRICK_H: 26,
  STRIDE_X: 70,
  STRIDE_Y: 30,
  /** 27 + 12 * 70 + 66 = 933: the same 27 px margin on both sides. */
  LEFT: 27,
  TOP: 104,
} as const;

export const PADDLE = {
  Y: 664,
  H: 18,
  /** Keyboard steering: top speed and how fast it gets there (1/s). */
  KEY_SPEED: 1100,
  KEY_EASE: 22,
  /**
   * Pointer steering: how fast the center closes on the pointer (1/s). Close
   * to it the ease is gentle (it soaks up the hand's tremor); it grows with
   * the gap up to POINTER_EASE_FAR at POINTER_FAR_GAP px, so a fast flick
   * does not trail behind the cursor.
   */
  POINTER_EASE: 34,
  POINTER_EASE_FAR: 70,
  POINTER_FAR_GAP: 64,
  /**
   * Its top speed. Kept modest (~28 px per 120 Hz step): the ball's paddle
   * test takes the paddle as standing still, so a bigger jump could land the
   * paddle on the ball and push it out sideways.
   */
  POINTER_MAX_SPEED: 3400,
  /** How fast the width eases to its target (1/s), so wide and shrink grow instead of popping. */
  WIDTH_EASE: 10,
  /** Bounce angle at the very edge of the paddle, from vertical. */
  MAX_BOUNCE_DEG: 62,
  /** "English": how much the paddle's own speed (at KEY_SPEED) tilts the bounce. */
  ENGLISH_RAD: 0.14,
  /** A hit closer to the center than this share of the half width is perfect. */
  PERFECT_SHARE: 0.12,
  PERFECT_POINTS: 100,
} as const;

export const BALL = {
  R: 8,
  CAP: 12,
  /** After every bounce |vy| is kept at least this share of the speed, so it never loops sideways. */
  MIN_VY_SHARE: 0.34,
  /** Speed grows a little with each paddle hit of the sector, up to a cap. */
  SPEEDUP_PER_PADDLE_HIT: 0.004,
  MAX_SPEEDUP: 0.15,
  /** Continuous collision resolves at most this many bounces per fixed step. */
  MAX_BOUNCES_PER_STEP: 4,
  /** Bounces plus bricks pierced: a hard stop for one ball in one step. */
  MAX_CONTACTS_PER_STEP: 12,
  /** A serve straight up is dull: the launch tilts at least this much. */
  MIN_LAUNCH_RAD: 0.16,
  /** Multi splits each ball into three at these angles. */
  MULTI_SPREAD_DEG: 20,
  /** Prism splits along the mirror angle; a ball too vertical to mirror tilts by this. */
  PRISM_TILT_DEG: 25,
} as const;

export const CAPSULE = {
  W: 56,
  H: 24,
  FALL_SPEED: 150,
  MAX_FALLING: 4,
} as const;

export const LASER = {
  W: 4,
  H: 18,
  SPEED: 900,
  FIRE_INTERVAL_MS: 220,
  /** The two bolts start this far in from the paddle's edges. */
  EDGE_INSET: 8,
} as const;

export const STEP = {
  MS: 1000 / 120,
  MAX_STEPS_PER_UPDATE: 8,
  /** A longer frame (a tab that slept) is cut to this, so the ball does not jump. */
  MAX_FRAME_MS: 100,
} as const;

export const BRICK_POINTS: Readonly<Record<BrickKind, number>> = {
  normal: 50,
  tough: 80,
  armored: 120,
  steel: 0,
  explosive: 100,
  capsule: 60,
  prism: 150,
};

/**
 * Steel never breaks; its hp stays at 1 so the view can still compute
 * cracks as maxHp - hp without an Infinity. Tell it apart by its kind.
 */
export const BRICK_HP: Readonly<Record<BrickKind, number>> = {
  normal: 1,
  tough: 2,
  armored: 3,
  steel: 1,
  explosive: 1,
  capsule: 1,
  prism: 1,
};

export const BRICK = {
  FLASH_MS: 120,
  /** The explosion reaches the 8 neighbors: the radius is for the view's ring. */
  EXPLOSION_RADIUS: 105,
} as const;

/** Base duration of each timed effect, before the sector's duration scale. */
export const EFFECT_MS: Readonly<Record<TimedEffectKind, number>> = {
  wide: 15000,
  laser: 10000,
  magnet: 15000,
  slow: 12000,
  fire: 8000,
  barrier: 25000,
  shrink: 10000,
  fast: 10000,
};

export const EFFECTS = {
  WIDE_FACTOR_PER_STACK: 0.5,
  WIDE_MAX_STACKS: 2,
  SHRINK_FACTOR: 0.65,
  SLOW_FACTOR: 0.65,
  FAST_FACTOR: 1.25,
  /** A ball caught by the magnet launches on its own after this long. */
  MAGNET_HOLD_MS: 2500,
  /** The barrier line: a falling ball that reaches it is sent back up. */
  BARRIER_Y: 704,
} as const;

export const OVERDRIVE = {
  PER_BRICK: 0.04,
  PER_PERFECT: 0.08,
  NOVA_MS: 6000,
  NOVA_SPEED_FACTOR: 1.1,
} as const;

export const LIVES = {
  START: 3,
  MAX: 5,
} as const;

export const DROPS = {
  /** The first bricks broken in sector 1 always drop: the player meets power-ups at once. */
  GUARANTEED_FIRST_BRICKS: 3,
  /** Losing this many lives within the window turns on the mercy boost. */
  MERCY_LIVES: 2,
  MERCY_WINDOW_MS: 30000,
  MERCY_MS: 30000,
  MERCY_FACTOR: 1.5,
} as const;

export const CLEARING = {
  /** Real time of the slow-motion outro after the last brick. */
  MS: 1600,
  TIME_SCALE: 0.25,
} as const;

export const CEILING = {
  /** A breakable brick whose bottom edge reaches this y costs a life... */
  DANGER_Y: 600,
  /** ...and pushes the whole formation back up by this much. */
  PUSH_BACK: 90,
} as const;

/** Row motion keeps this far from the walls at the end of its swing. */
export const ROW_MOTION_WALL_GAP = 4;

/**
 * THE CORE, the boss of every 5th sector (5, 10, 15, ...). Its numbers are
 * per boss number n (1 at sector 5): hp = 24 + 12 (n - 1), bonus = 5000 n.
 * Phase tuples are indexed by phase - 1 (1: full health, 2: < 60%, 3: < 30%).
 */
export const BOSS = {
  W: 280,
  H: 60,
  /** Top of the core: 52 px under the ceiling, room for a ball to get behind it. */
  Y: 116,
  BASE_HP: 24,
  HP_PER_BOSS: 12,
  /** Phase 2 under this share of max hp, phase 3 under the next. */
  PHASE_2_SHARE: 0.6,
  PHASE_3_SHARE: 0.3,
  /** The eye: this wide, centered on the bottom face. A hit there deals +1. */
  WEAK_W: 64,
  BALL_DAMAGE: 1,
  /** Fire or nova balls hit harder (they still bounce off the core). */
  PIERCE_DAMAGE: 2,
  WEAK_BONUS: 1,
  LASER_DAMAGE: 1,
  /** An explosive shield brick going off next to the core. */
  EXPLOSIVE_DAMAGE: 2,
  /** No damage for this long after a hit: the core flashes. */
  INVULN_MS: 120,
  /** Lasers come in pairs every 220 ms: a longer guard keeps them from melting the core. */
  LASER_INVULN_MS: 250,
  POINTS_PER_DAMAGE: 50,
  /** Glide between waypoints (eased), then hold a moment. */
  GLIDE_MS: [2800, 2100, 1450],
  HOLD_MS: [700, 450, 250],
  MIN_TRAVEL: 140,
  /** Range of the core's center x, so the side shields stay inside the walls. */
  MIN_CENTER_X: 220,
  MAX_CENTER_X: 740,
  /** The first volley waits after every serve. */
  FIRST_SHOT_MS: 3000,
  SHOT_EVERY_MS: [2600, 2000, 1500],
  PELLET_SPEED: [180, 205, 235],
  PELLET_R: 7,
  /** Angle between the pellets of one volley. */
  PELLET_SPREAD_DEG: 18,
  /** Phase 3 aims its middle pellet at the paddle, at most this far from straight down. */
  MAX_AIM_DEG: 30,
  MAX_PELLETS: 16,
  /** A pellet on the paddle jams it this long (it cannot move). */
  STUN_MS: 600,
  /** After a jam wears off the paddle cannot be jammed again for this long: no stun-lock in phase 3. */
  STUN_GUARD_MS: 500,
  /** Shields grow back one by one when the core goes this long without damage... */
  SHIELD_REGEN_IDLE_MS: 6000,
  SHIELD_REGEN_EVERY_MS: 3500,
  /** ...at most this many times in a fight. */
  SHIELD_REGEN_CAP: 6,
  BONUS_PER_BOSS: 5000,
  /** The outro after the core falls is longer than a normal clear: the explosion plays. */
  CLEARING_MS: 2600,
} as const;

/** Anti-stall help, for the last few bricks that take forever. */
export const RESCUE = {
  /** No brick (or core) damaged for this long while playing: a capsule falls. */
  IDLE_MS: 12000,
  /** After this many paddle hits in a row without damaging a brick, bounces bend towards one. */
  DRY_PADDLE_HITS: 8,
  /** How much each bent bounce may turn, at most. */
  NUDGE_DEG: 6,
} as const;

/** The world never gets shorter than the desktop one, nor taller than this (a very tall phone). */
export const WORLD_HEIGHT_RANGE = { MIN: 720, MAX: 2080 } as const;

/**
 * Tall worlds (phones held upright) leave this much empty room under the
 * paddle, so a finger dragging below it never covers the paddle or the ball.
 */
export const THUMB_ROOM = 160;

/**
 * A phone held upright shows the 960 px wide world on ~390 CSS px: at that
 * 0.4x a desktop-sized ball is a 6 px dot, the bricks are thin slivers and the
 * long empty field makes every trip feel slow. Tall worlds therefore draw the
 * pieces bigger (the 13 columns still fill the width, so bricks only grow in
 * height) and start the formation a little lower, closer to the paddle.
 */
export const TALL = {
  /** Row stride at most (the brick is 4 px shorter); less when the formation would not fit. */
  STRIDE_Y: 40,
  BALL_R: 13,
  PADDLE_H: 26,
  PADDLE_WIDTH_SCALE: 1.25,
  CAPSULE_SCALE: 1.35,
  /** The formation and the core start this share of the extra height lower, up to GRID_PUSH_MAX px. */
  GRID_PUSH_SHARE: 0.14,
  GRID_PUSH_MAX: 170,
} as const;

/**
 * How much of the extra field depth makes the ball faster, as a power of
 * `fallScale`. 1 would cross the long field in the desktop time (frantic),
 * 0 would keep the desktop speed (a very slow trip). 0.8 keeps a trip only
 * a little longer than on desktop: at 0.5 phones felt sluggish.
 */
export const BALL_SPEED_SCALE_EXPONENT = 0.8;

/**
 * Everything that depends on the height of the world, computed once per
 * engine. The HUD and the ceiling never move; the formation and the core
 * start a little lower on a tall world, and what hangs from the bottom moves
 * with the paddle.
 */
export interface WorldLayout {
  height: number;
  /** Past this y a ball, a capsule or a pellet is gone. */
  lostY: number;
  paddleY: number;
  barrierY: number;
  /** A breakable brick whose bottom edge reaches this y costs a life. */
  dangerY: number;
  /** Top of the first brick row. */
  gridTop: number;
  brickH: number;
  /** Brick height plus the gap between rows. */
  strideY: number;
  /** Top of the core in boss sectors. */
  bossY: number;
  ballR: number;
  paddleH: number;
  /** Multiplies the sector's paddle width. */
  paddleWidthScale: number;
  /** Multiplies the capsule's size (catch box and art). */
  capsuleScale: number;
  /**
   * Capsules and boss pellets fall this many times faster than on desktop, so
   * they take the same time to reach the paddle.
   */
  fallScale: number;
  /** Multiplies the ball's speed: `fallScale ** BALL_SPEED_SCALE_EXPONENT`. */
  ballSpeedScale: number;
}

/** The layout of a world `height` px tall. 720 (the default) is exactly the legacy desktop one. */
export function worldLayout(height: number = WORLD.HEIGHT): WorldLayout {
  const h = Number.isFinite(height)
    ? Math.round(Math.max(WORLD_HEIGHT_RANGE.MIN, Math.min(WORLD_HEIGHT_RANGE.MAX, height)))
    : WORLD.HEIGHT;
  const tall = h > WORLD.HEIGHT;
  const thumb = tall ? THUMB_ROOM : 0;
  const paddleY = h - 56 - thumb;
  const push = tall ? Math.round(Math.min(TALL.GRID_PUSH_MAX, (h - WORLD.HEIGHT) * TALL.GRID_PUSH_SHARE)) : 0;
  const gridTop = GRID.TOP + push;
  const dangerY = paddleY - 64;
  // Taller rows only while the tallest formation (MAX_ROWS) keeps the
  // desktop's room above the danger line: a squarish portrait gets less.
  const room = CEILING.DANGER_Y - (GRID.TOP + GRID.MAX_ROWS * GRID.STRIDE_Y);
  const fit = Math.floor((dangerY - room - gridTop) / GRID.MAX_ROWS);
  const strideY = tall ? Math.max(GRID.STRIDE_Y, Math.min(TALL.STRIDE_Y, fit)) : GRID.STRIDE_Y;
  const fallScale = (paddleY - gridTop) / (PADDLE.Y - GRID.TOP);
  return {
    height: h,
    lostY: h,
    paddleY,
    barrierY: paddleY + 40,
    dangerY,
    gridTop,
    brickH: strideY - (GRID.STRIDE_Y - GRID.BRICK_H),
    strideY,
    bossY: BOSS.Y + push,
    ballR: tall ? TALL.BALL_R : BALL.R,
    paddleH: tall ? TALL.PADDLE_H : PADDLE.H,
    paddleWidthScale: tall ? TALL.PADDLE_WIDTH_SCALE : 1,
    capsuleScale: tall ? TALL.CAPSULE_SCALE : 1,
    fallScale,
    ballSpeedScale: Math.pow(fallScale, BALL_SPEED_SCALE_EXPONENT),
  };
}
