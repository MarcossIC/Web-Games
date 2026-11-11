import { BiomeType } from './chunk-plan';

/**
 * Every number that tunes how the world plays, in one place: changing a
 * value here never needs a change in the logic. Changing one changes the
 * world of every seed, so the reference seeds in world-generator's tests
 * have to be updated with it.
 */

// --- Difficulty curve ---

export interface DifficultyLevel {
  /** World X where the level is reached in full. */
  from: number;
  gapChance: number;
  minGapWidth: number;
  maxGapWidth: number;
  minCenterTiles: number;
  maxCenterTiles: number;
  obstacleChance: number;
  coinChance: number;
  patternChance: number;
}

/** Between two levels every value is interpolated by X. */
export const DIFFICULTY_LEVELS: readonly DifficultyLevel[] = [
  {
    from: 0,
    gapChance: 0,
    minGapWidth: 40,
    maxGapWidth: 70,
    minCenterTiles: 7,
    maxCenterTiles: 14,
    obstacleChance: 0,
    coinChance: 0.5,
    patternChance: 0.1,
  },
  {
    from: 800,
    gapChance: 0.15,
    minGapWidth: 40,
    maxGapWidth: 80,
    minCenterTiles: 6,
    maxCenterTiles: 12,
    obstacleChance: 0,
    coinChance: 0.5,
    patternChance: 0.2,
  },
  {
    from: 2000,
    gapChance: 0.2,
    minGapWidth: 50,
    maxGapWidth: 100,
    minCenterTiles: 5,
    maxCenterTiles: 10,
    obstacleChance: 0.08,
    coinChance: 0.45,
    patternChance: 0.3,
  },
  {
    from: 4000,
    gapChance: 0.25,
    minGapWidth: 60,
    maxGapWidth: 120,
    minCenterTiles: 4,
    maxCenterTiles: 8,
    obstacleChance: 0.15,
    coinChance: 0.4,
    patternChance: 0.35,
  },
  {
    from: 7000,
    gapChance: 0.3,
    minGapWidth: 70,
    maxGapWidth: 150,
    minCenterTiles: 3,
    maxCenterTiles: 7,
    obstacleChance: 0.2,
    coinChance: 0.4,
    patternChance: 0.4,
  },
  {
    from: 11000,
    gapChance: 0.35,
    minGapWidth: 80,
    // Measured from the end of one floor to the start of the next; the
    // hole itself is the end tile narrower (185 px).
    maxGapWidth: 200,
    minCenterTiles: 2,
    maxCenterTiles: 6,
    obstacleChance: 0.25,
    coinChance: 0.45,
    patternChance: 0.45,
  },
];

/**
 * A wave over X lowers the hazards for a while and then lets them back:
 * every WAVE_PERIOD px, half of it is calmer.
 */
export const WAVE = {
  PERIOD: 3000,
  /** How much of the hazards the calm half takes away at its lowest. */
  STRENGTH: 0.25,
  /** The calm half has more coins, up to this chance. */
  COIN_BONUS: 0.2,
  MAX_COIN_CHANCE: 0.7,
} as const;

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

/** A gap's chance of a bridge, per unit of obstacle chance. */
export const BRIDGE_CHANCE_PER_OBSTACLE = 2;
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

// --- What things cost ---

/**
 * The cost of a chunk is how hard what it holds really is. A gap costs the
 * share of the jump its hole takes; the rest are fixed.
 */
export const COST = {
  STONE: 0.3,
  BRIDGE: 0.25,
  PATTERN: 0.2,
} as const;

/** A chunk this costly or more is hard. */
export const HARD_CHUNK_COST = 0.25;
/** After this many hard chunks in a row a rest zone may come. */
export const REST_AFTER_HARD_CHUNKS = 2;
export const REST_CHANCE = 0.7;

/** The share of the jump the generator lets a crossing take. */
export const JUMP_SAFETY = 0.85;

/** Times a chunk is planned again when validation rejects it. */
export const MAX_ATTEMPTS = 3;
