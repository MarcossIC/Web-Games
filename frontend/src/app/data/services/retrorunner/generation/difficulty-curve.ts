import {
  BIOMES,
  BUDGET,
  COIN_CHANCE,
  FLOOR_TILES,
  FULL_BUDGET,
  GAP,
  SAFE_START_END_X,
  SPEED,
  UNLOCKS,
} from './balance';
import { BiomeType } from './chunk-plan';

/**
 * How hard the world is at a point, as a function of the X alone: a chunk
 * asks with its own X, never with the player's, so the same seed always
 * plans the same world.
 */
export interface Difficulty {
  /** What a chunk here gets to spend on hazards, on average. */
  budget: number;
  /** The narrowest and the widest gap asked for here, as a share of the jump at this speed. */
  minGapFraction: number;
  maxGapFraction: number;
  minCenterTiles: number;
  maxCenterTiles: number;
  coinChance: number;
}

export type Feature = keyof typeof UNLOCKS;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** The budget a chunk starting at x is paid: see {@link BUDGET}. */
export function budgetAt(x: number): number {
  const distance = x - SAFE_START_END_X;
  return distance <= 0 ? 0 : BUDGET.SCALE * Math.log1p(distance / BUDGET.RAMP);
}

export function difficultyAt(x: number): Difficulty {
  const budget = budgetAt(x);
  const hardness = Math.min(1, budget / FULL_BUDGET);
  const { EASY, HARD } = FLOOR_TILES;

  return {
    budget,
    minGapFraction: Math.min(
      GAP.LATE_MIN_FRACTION,
      GAP.MIN_FRACTION + Math.max(0, budget - FULL_BUDGET) * GAP.FRACTION_PER_BUDGET
    ),
    maxGapFraction: Math.min(GAP.MAX_FRACTION, GAP.MIN_FRACTION + budget * GAP.FRACTION_PER_BUDGET),
    minCenterTiles: Math.round(lerp(EASY.minCenterTiles, HARD.minCenterTiles, hardness)),
    maxCenterTiles: Math.round(lerp(EASY.maxCenterTiles, HARD.maxCenterTiles, hardness)),
    coinChance: COIN_CHANCE,
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
