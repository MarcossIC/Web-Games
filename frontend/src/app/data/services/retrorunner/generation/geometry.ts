import { RetroRunnerFloor } from '@app/data/models/retro-runner/RetroRunnerKeys';

/** Sizes of the pictures the world is built from, measured on the images. */
export const TILE = {
  START_WIDTH: RetroRunnerFloor.FLOORGRASS_START_WIDTH, // 81
  CENTER_WIDTH: RetroRunnerFloor.FLOORGRASS_CENTER_WIDTH, // 65
  END_WIDTH: RetroRunnerFloor.FLOORGRASS_END_WIDTH, // 15
  BLOCK_SIZE: RetroRunnerFloor.GRASS_BLOCK_WIDTH, // 32
} as const;

/** The floor's surface is this far above the centre of its tiles. */
export const FLOOR_SURFACE_ABOVE_Y = 17;
/** A grass block's top is this far above its centre. */
export const BLOCK_TOP_ABOVE_Y = TILE.BLOCK_SIZE / 2;

/**
 * Where a run of floor starting at `x` puts its end tile. The next chunk
 * starts there, its first tile over that end tile.
 */
export function floorRunEnd(x: number, centerTiles: number): number {
  return x + TILE.START_WIDTH + centerTiles * TILE.CENTER_WIDTH;
}

/**
 * The fishing hut's picture ('Fishing Hut/1.png', 192x122), measured on its
 * pixels: columns from its left edge, rows from its top.
 */
export const HUT = {
  WIDTH: 192,
  /** First row below the stairs and the house's base: where they stand. */
  BASE_BOTTOM: 84,
  /** Top of the planks of the house floor and the dock. */
  DECK_TOP: 62,
  /** Where the foot of the stairs starts. */
  STAIRS_BOTTOM: 1,
  /** Where the stairs reach the planks. */
  STAIRS_TOP: 14,
  /** Where the house's base ends and the stilts begin. */
  BASE_RIGHT: 73,
  /** Where the shore ends: past the base, before the first stilt (94). */
  SHORE_EDGE: 86,
} as const;
