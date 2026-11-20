import type { BrickKind } from './types';

/**
 * How hard a sector is, as a function of its number alone. The curve starts
 * very easy (a slow ball, a wide paddle, lots of capsules) and tightens a
 * little each sector until every parameter reaches its cap, so a long run
 * plateaus at hard instead of becoming impossible. Numbers from PLAN.md.
 */
export const DIFFICULTY = {
  /**
   * +7.5% a sector reaches the cap at sector 10. With +6% a bot measured the
   * curve flat until the boss of 10; +8% made sector 9 a wall before it.
   */
  BALL_SPEED: { BASE: 340, GROWTH: 1.075, MAX: 620 },
  PADDLE_WIDTH: { BASE: 170, STEP: 6, MIN: 112 },
  DROP_CHANCE: { BASE: 0.42, STEP: 0.03, MIN: 0.12 },
  /** Effects last 30% longer at first, down to their plain duration by sector 6. */
  DURATION_SCALE: { BASE: 1.3, STEP: 0.06, MIN: 1 },
  NEGATIVES: { FROM_SECTOR: 5, BASE: 0.06, STEP: 0.02, MAX: 0.25 },
  ROW_MOTION: {
    FROM_SECTOR: 6,
    BASE_AMPLITUDE: 18,
    AMPLITUDE_STEP: 4,
    MAX_AMPLITUDE: 56,
    /** Angular speed of the swing, rad/s. */
    BASE_SPEED: 0.7,
    SPEED_STEP: 0.06,
    MAX_SPEED: 1.8,
  },
  /** px/s the formation creeps down: a brick row every 20 s in sector 8, so a slow clear really feels the pressure. */
  CEILING: { FROM_SECTOR: 8, BASE_RATE: 1.5, STEP: 0.25, MAX_RATE: 4 },
  PAR: { BASE_MS: 50000, STEP_MS: 5000, MAX_MS: 120000 },
  /**
   * Share of each brick kind in a procedural sector. Everything but normal
   * grows from 0 (or a small constant) to a cap; normal takes the rest and
   * never drops under MIN_NORMAL, so a sector is always mostly breakable.
   */
  MIX: {
    TOUGH: { FROM: 2, STEP: 0.035, MAX: 0.26 },
    ARMORED: { FROM: 4, STEP: 0.02, MAX: 0.14 },
    STEEL: { FROM: 5, STEP: 0.012, MAX: 0.1 },
    EXPLOSIVE: { FROM: 2, STEP: 0.008, MAX: 0.08 },
    PRISM: { FROM: 4, STEP: 0.006, MAX: 0.05 },
    CAPSULE: 0.04,
    MIN_NORMAL: 0.3,
  },
  /** Every 5th sector is special: denser, with more explosives and prisms. */
  SPECIAL_EVERY: 5,
} as const;

export type BrickMix = Record<BrickKind, number>;

export interface SectorParams {
  /** Base ball speed, px/s, before the paddle-hit speedup and effects. */
  ballSpeed: number;
  paddleWidth: number;
  /** Chance a broken brick drops a capsule (capsule bricks always do). */
  dropChance: number;
  /** Multiplies every timed effect's duration. */
  durationScale: number;
  /** Share of drops that are negative (shrink, fast). */
  negativeWeight: number;
  brickMix: BrickMix;
  /** Max horizontal swing of a moving row, px; 0 when rows do not move. */
  rowMotionAmplitude: number;
  /** rad/s of that swing. */
  rowMotionSpeed: number;
  /** px/s the formation descends; 0 when the ceiling holds. */
  ceilingDescent: number;
  parTimeMs: number;
}

/** Grows by `step` per sector from sector `from` (0 before), up to `max`. */
function ramp(sector: number, from: number, step: number, max: number): number {
  return Math.min(max, Math.max(0, (sector - from + 1) * step));
}

export function sectorParams(sectorNumber: number): SectorParams {
  const sector = Math.max(1, Math.floor(sectorNumber));
  const k = sector - 1;
  const D = DIFFICULTY;
  const M = D.MIX;

  const tough = ramp(sector, M.TOUGH.FROM, M.TOUGH.STEP, M.TOUGH.MAX);
  const armored = ramp(sector, M.ARMORED.FROM, M.ARMORED.STEP, M.ARMORED.MAX);
  const steel = ramp(sector, M.STEEL.FROM, M.STEEL.STEP, M.STEEL.MAX);
  const explosive = ramp(sector, M.EXPLOSIVE.FROM, M.EXPLOSIVE.STEP, M.EXPLOSIVE.MAX);
  const prism = ramp(sector, M.PRISM.FROM, M.PRISM.STEP, M.PRISM.MAX);
  const capsule = M.CAPSULE;
  const normal = 1 - (tough + armored + steel + explosive + prism + capsule);

  const moving = sector >= D.ROW_MOTION.FROM_SECTOR;
  const R = D.ROW_MOTION;
  const descending = sector >= D.CEILING.FROM_SECTOR;

  return {
    ballSpeed: Math.min(D.BALL_SPEED.MAX, D.BALL_SPEED.BASE * Math.pow(D.BALL_SPEED.GROWTH, k)),
    paddleWidth: Math.max(D.PADDLE_WIDTH.MIN, D.PADDLE_WIDTH.BASE - D.PADDLE_WIDTH.STEP * k),
    dropChance: Math.max(D.DROP_CHANCE.MIN, D.DROP_CHANCE.BASE - D.DROP_CHANCE.STEP * k),
    durationScale: Math.max(D.DURATION_SCALE.MIN, D.DURATION_SCALE.BASE - D.DURATION_SCALE.STEP * k),
    negativeWeight:
      sector < D.NEGATIVES.FROM_SECTOR
        ? 0
        : Math.min(D.NEGATIVES.MAX, D.NEGATIVES.BASE + D.NEGATIVES.STEP * (sector - D.NEGATIVES.FROM_SECTOR)),
    brickMix: { normal, tough, armored, steel, explosive, capsule, prism },
    rowMotionAmplitude: moving
      ? Math.min(R.MAX_AMPLITUDE, R.BASE_AMPLITUDE + R.AMPLITUDE_STEP * (sector - R.FROM_SECTOR))
      : 0,
    rowMotionSpeed: moving ? Math.min(R.MAX_SPEED, R.BASE_SPEED + R.SPEED_STEP * (sector - R.FROM_SECTOR)) : 0,
    ceilingDescent: descending
      ? Math.min(D.CEILING.MAX_RATE, D.CEILING.BASE_RATE + D.CEILING.STEP * (sector - D.CEILING.FROM_SECTOR))
      : 0,
    parTimeMs: Math.min(D.PAR.MAX_MS, D.PAR.BASE_MS + D.PAR.STEP_MS * k),
  };
}

/**
 * Every 5th sector is denser and richer in explosives and prisms. This is
 * also where the boss sector of a later iteration will plug in.
 */
export function isSpecialSector(sector: number): boolean {
  return sector > 0 && sector % DIFFICULTY.SPECIAL_EVERY === 0;
}
