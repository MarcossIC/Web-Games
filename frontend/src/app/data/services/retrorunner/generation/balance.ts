import { BiomeType } from './chunk-plan';

/**
 * Every number that tunes how the world plays, in one place: changing a
 * value here never needs a change in the logic. Changing one changes the
 * world of every seed, so the reference seeds in world-generator's tests
 * have to be updated with it.
 */

// --- Difficulty curve ---

/**
 * What a chunk gets to spend on hazards at X, on average (D-01). One curve
 * with no levels and no ceiling (D-05): nothing during the safe start, then
 * it keeps growing, slower and slower.
 *
 *   budget(x) = SCALE * ln(1 + (x - SAFE_START_END_X) / RAMP)
 *
 * About 0.08 at x = 2000, 0.25 at x = 11000, 0.31 at x = 20000 and 0.375
 * at x = 40000.
 */
export const BUDGET = {
  SCALE: 0.096,
  RAMP: 800,
} as const;

/**
 * What the wallet holds when the run starts: the first challenge is saved
 * up already, so it comes right after the safe start.
 */
export const START_WALLET = 0.3;

/** Floors are as short as they get from this budget on. */
export const FULL_BUDGET = 0.25;
export const FLOOR_TILES = {
  EASY: { minCenterTiles: 7, maxCenterTiles: 14 },
  HARD: { minCenterTiles: 2, maxCenterTiles: 6 },
} as const;

/**
 * A gap as a share of the planned jump at the speed of its X (D-03): the
 * jump of a short press (PLANNED_HOLD in jump-model), which carries three
 * quarters as far as the whole one. The share is what the air between the
 * two edges takes of it: the hole is that plus the player's width, since
 * the body hangs over the edge it leaves and over the one it lands on.
 */
export const GAP = {
  MIN_FRACTION: 0.35,
  /**
   * The open decision "Hueco máximo": the hardest stretch asks for 85 % of
   * the planned jump. A short press from the very edge still makes it, and
   * with the key held to the end there is a fifth of a second of floor to
   * press it in, besides the moment the game forgives past the edge.
   */
  MAX_FRACTION: 0.85,
  /**
   * How much the widest gap grows per unit of budget: 0.85 at x = 11000.
   * Past FULL_BUDGET the narrowest grows at the same rate instead.
   */
  FRACTION_PER_BUDGET: 2,
  /** The narrowest gap stops growing here, so gaps never all look alike. */
  LATE_MIN_FRACTION: 0.7,
  /**
   * A hole down to a lower floor asks for this much more air than the fall
   * alone gives a player who runs off the edge: with less, it stays level.
   */
  PAST_WALK_OFF: 40,
} as const;

export const COIN_CHANCE = 0.45;
export const REST_COIN_CHANCE = 0.7;

/** Each biome starts at its X and lasts until the next one. */
export const BIOMES: readonly { from: number; biome: BiomeType }[] = [
  { from: 0, biome: BiomeType.PLAINS },
  { from: 3000, biome: BiomeType.FOREST },
  { from: 9000, biome: BiomeType.DUSK },
];

/**
 * Where each piece starts to appear. Once a piece appears it stays: none of
 * them depends on a chance that goes up and down.
 */
export const UNLOCKS = {
  bridges: 2000,
  dualPath: 2000,
  houseScene: 2600,
} as const;

/** The player gets faster with the distance. */
export const SPEED = {
  /** Where the player starts: the ramp counts from here. */
  START_X: 50,
  RAMP_DISTANCE: 15000,
  MAX_MULTIPLIER: 1.4,
} as const;

// --- Chunks ---

/** Chunks that start before this X are plain ground: the player just arrived. */
export const SAFE_START_END_X = 950;
/** The first chunks are never gaps. */
export const FIRST_GAP_INDEX = 2;

/** In the dusk, a gap's chance of becoming a fishing hut. */
export const HUT_CHANCE = 0.25;
/** The hut needs the floor close to its lowest height (an elevation). */
export const HUT_MAX_ELEVATION = -20;
/** Center tiles of the shore the hut stands on. */
export const HUT_SHORE_CENTER_TILES = 2;

/**
 * Heights are elevations: how far the floor is above its lowest height, in
 * screen pixels (negative is higher).
 */
export const ELEVATION = {
  /** No floor goes higher than this. */
  MAX: -80,
  /** Plain ground wanders up to here; stairs go higher. */
  MAX_GROUND: -60,
  /** The most a piece of ground moves from the floor before it. */
  STEP: 30,
  /** An open gap and a rest zone bring the floor this much down. */
  RETURN: 40,
} as const;

// --- What things cost, and how the budget is spent ---

/**
 * The cost of a chunk is how hard what it holds really is. A gap costs the
 * share of the jump its hole takes; the rest are fixed. The generator pays
 * it from what it saved (D-01).
 */
export const COST = {
  STONE: 0.3,
  BRIDGE: 0.25,
  PATTERN: 0.2,
} as const;

/**
 * What the generator saves up for next, by weight. A gap goal carries how
 * wide it will be, so the saving lasts as long as the gap is hard.
 */
export const GOAL_WEIGHTS = {
  gap: 0.35,
  pattern: 0.4,
  stone: 0.25,
} as const;
/** Once bridges are unlocked, a gap goal is a bridged gap this often. */
export const BRIDGE_SHARE = 0.35;

/**
 * Each chunk adds its cost to the tension and the tension fades by DECAY;
 * past REST_AT the next chunk is a rest zone, which clears it (D-02).
 */
export const TENSION = {
  DECAY: 0.7,
  REST_AT: 1.2,
} as const;

/** Nothing dangerous where a hole ends, for as long as a player takes to react (D-04). */
export const LANDING = {
  REACTION_TIME: 0.35,
} as const;

/**
 * Nor where it begins, for as long as it takes to come down from the hop
 * over a stone and get set for the jump: a hole waits until the last stone
 * is this far behind.
 */
export const TAKEOFF = {
  CLEAR_TIME: 1,
} as const;

/**
 * The jump the coins over a gap draw (D-08), by where the middle of the
 * player is: this far before the edge when the key goes down, its whole
 * body still on the floor, and this far past the far edge when it lands,
 * its whole body on the floor again. Where the whole jump is not that
 * long, it leaves and lands as much closer to both edges.
 */
export const ARC = {
  BEFORE_EDGE: 14,
  PAST_EDGE: 16,
} as const;

/** The share of the planned jump the generator lets a crossing take. */
export const JUMP_SAFETY = 0.85;

/** Times a chunk is planned again when validation rejects it. */
export const MAX_ATTEMPTS = 3;
