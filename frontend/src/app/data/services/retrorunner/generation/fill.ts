import { RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import SeededRandom from '../utils/SeededRandom';
import { BiomeType, Carry, CoinPiece, DecoPiece, GrassPiece, StonePiece } from './chunk-plan';
import { FLOOR_SURFACE_ABOVE_Y } from './geometry';
import { BASE_WALK_SPEED, JUMP_SPEED, PLAYER_GRAVITY, WORLD_GRAVITY } from './jump-model';

/*
 * What goes on top of the ground once it is laid: coins, stones,
 * decoration and grass. Each draws from its own stream, so none of them
 * moves another, and the looks never move anything that plays.
 */

// --- Grass ---

/** The 21 grass pictures, with how far above the floor's centre each sits. */
const GRASS: readonly [RetroRunnerMedia, number][] = [
  [RetroRunnerMedia.NATURA_GRASS_ON, 26],
  [RetroRunnerMedia.NATURA_GRASS_TW, 25],
  [RetroRunnerMedia.NATURA_GRASS_TH, 25],
  [RetroRunnerMedia.NATURA_GRASS_FO, 23],
  [RetroRunnerMedia.NATURA_GRASS_FI, 23],
  [RetroRunnerMedia.GRASS_6, 21],
  [RetroRunnerMedia.GRASS_7, 24],
  [RetroRunnerMedia.GRASS_8, 24],
  [RetroRunnerMedia.GRASS_9, 21],
  [RetroRunnerMedia.GRASS_10, 23],
  [RetroRunnerMedia.GRASS_11, 25],
  [RetroRunnerMedia.GRASS_12, 25],
  [RetroRunnerMedia.GRASS_13, 24],
  [RetroRunnerMedia.GRASS_14, 24],
  [RetroRunnerMedia.GRASS_15, 23],
  [RetroRunnerMedia.GRASS_16, 24],
  [RetroRunnerMedia.GRASS_17, 24],
  [RetroRunnerMedia.GRASS_18, 24],
  [RetroRunnerMedia.GRASS_19, 25],
  [RetroRunnerMedia.GRASS_20, 25],
  [RetroRunnerMedia.GRASS_21, 27],
];

export function planGrass(rng: SeededRandom, startX: number, endX: number, floorY: number): GrassPiece[] {
  const width = endX - startX;
  if (width < 80) return [];

  const grass: GrassPiece[] = [];
  const count = Math.floor(width / 70);
  let x = startX + 20;
  for (let i = 0; i < count; i++) {
    if (rng.chance(0.5)) {
      x += rng.intBetween(1, 50) + 20;
      continue;
    }
    const [key, above] = rng.pick(GRASS);
    if (x >= endX - 10) break;
    grass.push({ type: 'grass', x, y: floorY - above, key });
    x += rng.intBetween(1, 50) + 25;
  }
  return grass;
}

// --- Coins ---

const COIN_SPACING = 28;
const COIN_ABOVE_SURFACE = 40;

/** A short row of coins floating over a piece of floor. */
export function planCoins(
  rng: SeededRandom,
  startX: number,
  endX: number,
  floorY: number,
  chance: number
): CoinPiece[] {
  if (!rng.chance(chance)) return [];
  const width = endX - startX;
  if (width < 100) return [];

  const coins: CoinPiece[] = [];
  const count = rng.intBetween(1, 4);
  const firstX = startX + rng.intBetween(1, Math.floor(width * 0.3)) + 40;
  const y = floorY - FLOOR_SURFACE_ABOVE_Y - COIN_ABOVE_SURFACE;
  for (let i = 0; i < count; i++) {
    const x = firstX + i * COIN_SPACING;
    if (x >= endX - 20) break;
    coins.push({ type: 'coin', x, y });
  }
  return coins;
}

/*
 * I-15, left for D-08: the arc draws the rise of a full jump with one
 * gravity, cut at 110 px, not the parabola that joins both edges.
 */
const ARC_GRAVITY = WORLD_GRAVITY + PLAYER_GRAVITY;

/** Coins along a jump over a gap, from its left edge. */
export function planArcCoins(gapStartX: number, gapEndX: number, landingFloorY: number): CoinPiece[] {
  const width = gapEndX - gapStartX;
  if (width < 60) return [];

  const surfaceY = landingFloorY - FLOOR_SURFACE_ABOVE_Y;
  const totalTime = width / BASE_WALK_SPEED;
  const count = Math.min(5, Math.max(3, Math.floor(width / 40)));

  const coins: CoinPiece[] = [];
  for (let i = 0; i < count; i++) {
    const t = ((i + 0.5) / count) * totalTime;
    const rise = JUMP_SPEED * t - 0.5 * ARC_GRAVITY * t * t;
    const y = Math.max(surfaceY - 110, Math.min(surfaceY - 20, surfaceY - rise));
    coins.push({ type: 'coin', x: gapStartX + BASE_WALK_SPEED * t, y });
  }
  return coins;
}

// --- Stones ---

const STONES: readonly RetroRunnerMedia[] = [
  RetroRunnerMedia.STONE_1,
  RetroRunnerMedia.STONE_2,
  RetroRunnerMedia.STONE_3,
  RetroRunnerMedia.STONE_4,
  RetroRunnerMedia.STONE_5,
  RetroRunnerMedia.STONE_6,
  RetroRunnerMedia.STONE_7,
  RetroRunnerMedia.STONE_8,
  RetroRunnerMedia.STONE_9,
  RetroRunnerMedia.STONE_10,
  RetroRunnerMedia.STONE_11,
];

/** Two stones are never closer than this. */
const STONE_MIN_SPACING = 400;

/** Maybe a stone on a piece of floor; updates `carry.lastObstacleX`. */
export function planStone(
  rng: SeededRandom,
  startX: number,
  endX: number,
  floorY: number,
  chance: number,
  carry: Carry
): StonePiece | null {
  if (!rng.chance(chance)) return null;
  if (endX - startX < 150) return null;

  const x = startX + rng.intBetween(1, Math.floor((endX - startX) * 0.5)) + 50;
  if (x - carry.lastObstacleX < STONE_MIN_SPACING) return null;

  carry.lastObstacleX = x;
  return { type: 'stone', x, floorY, key: rng.pick(STONES) };
}

// --- Decoration ---

const BUSHES: readonly RetroRunnerMedia[] = [
  RetroRunnerMedia.BUSH_1, RetroRunnerMedia.BUSH_2, RetroRunnerMedia.BUSH_3,
  RetroRunnerMedia.BUSH_4, RetroRunnerMedia.BUSH_5, RetroRunnerMedia.BUSH_6,
  RetroRunnerMedia.BUSH_7, RetroRunnerMedia.BUSH_8, RetroRunnerMedia.BUSH_9,
  RetroRunnerMedia.BUSH_10, RetroRunnerMedia.BUSH_11, RetroRunnerMedia.BUSH_12,
  RetroRunnerMedia.BUSH_13, RetroRunnerMedia.BUSH_14,
];
const FENCES: readonly RetroRunnerMedia[] = [
  RetroRunnerMedia.FENCE_1, RetroRunnerMedia.FENCE_2, RetroRunnerMedia.FENCE_3,
  RetroRunnerMedia.FENCE_4, RetroRunnerMedia.FENCE_5, RetroRunnerMedia.FENCE_6,
];
const RIDGES: readonly RetroRunnerMedia[] = [
  RetroRunnerMedia.RIDGE_1, RetroRunnerMedia.RIDGE_2, RetroRunnerMedia.RIDGE_3,
  RetroRunnerMedia.RIDGE_4, RetroRunnerMedia.RIDGE_5, RetroRunnerMedia.RIDGE_6,
];
const POINTERS: readonly RetroRunnerMedia[] = [
  RetroRunnerMedia.POINTER_1, RetroRunnerMedia.POINTER_2, RetroRunnerMedia.POINTER_3,
  RetroRunnerMedia.POINTER_4, RetroRunnerMedia.POINTER_5, RetroRunnerMedia.POINTER_6,
  RetroRunnerMedia.POINTER_7, RetroRunnerMedia.POINTER_8, RetroRunnerMedia.POINTER_9,
  RetroRunnerMedia.POINTER_10, RetroRunnerMedia.POINTER_11, RetroRunnerMedia.POINTER_12,
  RetroRunnerMedia.POINTER_13, RetroRunnerMedia.POINTER_14, RetroRunnerMedia.POINTER_15,
  RetroRunnerMedia.POINTER_16, RetroRunnerMedia.POINTER_17,
];
const BOXES: readonly RetroRunnerMedia[] = [
  RetroRunnerMedia.BOX_1, RetroRunnerMedia.BOX_2, RetroRunnerMedia.BOX_3,
  RetroRunnerMedia.BOX_4, RetroRunnerMedia.BOX_5, RetroRunnerMedia.BOX_6,
  RetroRunnerMedia.BOX_7, RetroRunnerMedia.BOX_8,
];
const TREES: readonly RetroRunnerMedia[] = [
  RetroRunnerMedia.TREE_1, RetroRunnerMedia.TREE_2, RetroRunnerMedia.TREE_3,
  RetroRunnerMedia.TREE_4, RetroRunnerMedia.TREE_5, RetroRunnerMedia.TREE_6,
  RetroRunnerMedia.TREE_7, RetroRunnerMedia.TREE_8, RetroRunnerMedia.TREE_9,
];
const WILLOWS: readonly RetroRunnerMedia[] = [
  RetroRunnerMedia.WILLOW_1, RetroRunnerMedia.WILLOW_2, RetroRunnerMedia.WILLOW_3,
];
const FISHING: readonly RetroRunnerMedia[] = [
  RetroRunnerMedia.BOAT_1, RetroRunnerMedia.FISHBARREL_1, RetroRunnerMedia.FISHBARREL_2,
  RetroRunnerMedia.FISHBARREL_3, RetroRunnerMedia.FISHBARREL_4,
];
const LADDERS: readonly RetroRunnerMedia[] = [
  RetroRunnerMedia.LADDER_1, RetroRunnerMedia.LADDER_2, RetroRunnerMedia.LADDER_3,
];

interface BiomeDecoration {
  small: readonly RetroRunnerMedia[];
  trees: readonly RetroRunnerMedia[];
  large: readonly RetroRunnerMedia[];
  boxes: readonly RetroRunnerMedia[];
  /** The biome's own flavour. */
  accents: readonly RetroRunnerMedia[];
  smallChance: number;
  treeChance: number;
  largeChance: number;
  boxChance: number;
  accentChance: number;
  treeTint: number | null;
  largeTint: number | null;
}

const DECORATION: Record<BiomeType, BiomeDecoration> = {
  [BiomeType.PLAINS]: {
    small: [...BUSHES.slice(0, 9), ...FENCES, ...POINTERS.slice(0, 8)],
    trees: TREES,
    large: WILLOWS,
    boxes: BOXES,
    accents: [...POINTERS.slice(8), ...LADDERS],
    smallChance: 0.65,
    treeChance: 0.25,
    largeChance: 0.1,
    boxChance: 0.2,
    accentChance: 0.12,
    treeTint: null,
    largeTint: null,
  },
  [BiomeType.FOREST]: {
    // Dense undergrowth and ladders leaning on the trees.
    small: [...BUSHES, ...RIDGES],
    trees: TREES,
    large: WILLOWS,
    boxes: BOXES.slice(0, 4),
    accents: LADDERS,
    smallChance: 0.8,
    treeChance: 0.45,
    largeChance: 0.2,
    boxChance: 0.1,
    accentChance: 0.08,
    treeTint: 0x88bb66,
    largeTint: 0x77aa55,
  },
  [BiomeType.DUSK]: {
    // Barren: fences, ridges, broken signs, and the fishing village.
    small: [...FENCES, ...RIDGES, ...POINTERS.slice(0, 8)],
    trees: TREES.slice(0, 4),
    large: WILLOWS,
    boxes: BOXES,
    accents: FISHING,
    smallChance: 0.4,
    treeChance: 0.15,
    largeChance: 0.08,
    boxChance: 0.25,
    accentChance: 0.1,
    treeTint: 0xcc9966,
    largeTint: 0xbb8855,
  },
};

/** A stretch of floor where nothing tall may stand, like under a platform. */
export interface Exclusion {
  x: number;
  width: number;
}

/**
 * Decoration for a piece of floor: small plants and fences, boxes, trees,
 * the occasional willow or house. Trees and large pieces keep their
 * distance across chunks through `carry`.
 */
export function planDecoration(
  rng: SeededRandom,
  startX: number,
  endX: number,
  floorY: number,
  biome: BiomeType,
  carry: Carry,
  exclusions: readonly Exclusion[] = []
): DecoPiece[] {
  const width = endX - startX;
  if (width < 60) return [];

  const surfaceY = floorY - FLOOR_SURFACE_ABOVE_Y;
  const config = DECORATION[biome];
  const pieces: DecoPiece[] = [];

  const isExcluded = (x: number, pictureWidth = 40) =>
    exclusions.some((zone) => x + pictureWidth / 2 > zone.x && x - pictureWidth / 2 < zone.x + zone.width);
  const deco = (x: number, key: RetroRunnerMedia, depth: number, scale: number, alpha = 1, tint: number | null = null) =>
    pieces.push({ type: 'deco', x, y: surfaceY, key, depth, scale, alpha, tint, clampStartX: startX, clampEndX: endX });

  if (rng.chance(config.smallChance)) {
    const key = rng.pick(config.small);
    const x = startX + rng.intBetween(1, Math.floor(width * 0.6)) + 20;
    if (!isExcluded(x)) deco(x, key, 2, 0.7);
  }

  if (width > 180 && rng.chance(config.smallChance * 0.7)) {
    const key = rng.pick(config.small);
    const x = startX + Math.floor(width * 0.55) + rng.intBetween(1, 50);
    if (!isExcluded(x)) deco(x, key, 2, 0.65);
  }

  if (width > 120 && rng.chance(config.boxChance)) {
    const key = rng.pick(config.boxes);
    const x = startX + rng.intBetween(1, Math.floor(width * 0.5)) + 30;
    if (!isExcluded(x, 60)) deco(x, key, 2, 0.7);
  }

  if (width > 130 && rng.chance(config.treeChance) && startX - carry.lastTreeX > 250) {
    const key = rng.pick(config.trees);
    const x = startX + rng.intBetween(1, Math.floor(width * 0.4)) + 40;
    if (!isExcluded(x, 100)) {
      deco(x, key, 1, 1, 0.9, config.treeTint);
      carry.lastTreeX = x;
    }
  }

  if (width > 200 && rng.chance(config.largeChance) && startX - carry.lastLargeDecoX > 700) {
    const key = rng.pick(config.large);
    const x = startX + Math.floor(width * 0.3) + rng.intBetween(1, 60);
    if (!isExcluded(x, 120)) {
      deco(x, key, 0, 0.9, 0.75, config.largeTint);
      carry.lastLargeDecoX = x;
    }
  }

  if (width > 150 && rng.chance(config.accentChance)) {
    const key = rng.pick(config.accents);
    const x = startX + rng.intBetween(1, Math.floor(width * 0.5)) + 40;
    if (!isExcluded(x, 50)) deco(x, key, 2, 0.75);
  }

  if (width > 350 && rng.chance(0.05) && startX - carry.lastLargeDecoX > 1200) {
    const x = startX + Math.floor(width * 0.4);
    if (!isExcluded(x, 130)) {
      deco(x, RetroRunnerMedia.HOUSE, 0, 0.8, 0.85);
      carry.lastLargeDecoX = x;
    }
  }

  return pieces;
}

/** The house of a house scene, in the middle of its floor. */
export function planHouse(startX: number, endX: number, floorY: number): DecoPiece {
  return {
    type: 'deco',
    x: startX + (endX - startX) / 2,
    y: floorY - FLOOR_SURFACE_ABOVE_Y,
    key: RetroRunnerMedia.HOUSE,
    depth: 0,
    scale: 0.8,
    alpha: 1,
    tint: null,
    clampStartX: startX,
    clampEndX: endX,
  };
}
