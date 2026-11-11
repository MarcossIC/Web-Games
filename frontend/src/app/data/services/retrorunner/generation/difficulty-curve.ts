import { BIOMES, DIFFICULTY_LEVELS, DifficultyLevel, SPEED, UNLOCKS, WAVE } from './balance';
import { BiomeType } from './chunk-plan';

/**
 * How hard the world is at a point, as a function of the X alone: a chunk
 * asks with its own X, never with the player's, so the same seed always
 * plans the same world.
 */
export interface Difficulty {
  gapChance: number;
  minGapWidth: number;
  maxGapWidth: number;
  minCenterTiles: number;
  maxCenterTiles: number;
  obstacleChance: number;
  coinChance: number;
  patternChance: number;
}

export type Feature = keyof typeof UNLOCKS;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** The level reached at x, interpolated towards the next one. */
function levelAt(x: number): Difficulty {
  let index = 0;
  while (index + 1 < DIFFICULTY_LEVELS.length && x >= DIFFICULTY_LEVELS[index + 1].from) index++;

  const lower: DifficultyLevel = DIFFICULTY_LEVELS[index];
  const upper: DifficultyLevel = DIFFICULTY_LEVELS[Math.min(index + 1, DIFFICULTY_LEVELS.length - 1)];
  const range = upper.from - lower.from;
  const t = range > 0 ? Math.min(1, Math.max(0, (x - lower.from) / range)) : 1;

  return {
    gapChance: lerp(lower.gapChance, upper.gapChance, t),
    minGapWidth: lerp(lower.minGapWidth, upper.minGapWidth, t),
    maxGapWidth: lerp(lower.maxGapWidth, upper.maxGapWidth, t),
    minCenterTiles: Math.round(lerp(lower.minCenterTiles, upper.minCenterTiles, t)),
    maxCenterTiles: Math.round(lerp(lower.maxCenterTiles, upper.maxCenterTiles, t)),
    obstacleChance: lerp(lower.obstacleChance, upper.obstacleChance, t),
    coinChance: lerp(lower.coinChance, upper.coinChance, t),
    patternChance: lerp(lower.patternChance, upper.patternChance, t),
  };
}

export function difficultyAt(x: number): Difficulty {
  const level = levelAt(x);

  // The calm half of the wave takes hazards away and puts coins in.
  const calm = Math.max(0, -Math.sin((x / WAVE.PERIOD) * Math.PI * 2));
  const hazards = 1 - WAVE.STRENGTH * calm;

  return {
    ...level,
    gapChance: level.gapChance * hazards,
    obstacleChance: level.obstacleChance * hazards,
    patternChance: level.patternChance * hazards,
    coinChance: Math.min(WAVE.MAX_COIN_CHANCE, level.coinChance + WAVE.STRENGTH * calm * WAVE.COIN_BONUS),
  };
}

export function biomeAt(x: number): BiomeType {
  let biome = BIOMES[0].biome;
  for (const stage of BIOMES) {
    if (x >= stage.from) biome = stage.biome;
  }
  return biome;
}

export function isUnlocked(feature: Feature, x: number): boolean {
  return x >= UNLOCKS[feature];
}

/** How much faster than at the start the player runs at x. */
export function speedMultiplierAt(x: number): number {
  const distance = Math.max(0, x - SPEED.START_X);
  return Math.min(SPEED.MAX_MULTIPLIER, 1 + (distance / SPEED.RAMP_DISTANCE) * (SPEED.MAX_MULTIPLIER - 1));
}
