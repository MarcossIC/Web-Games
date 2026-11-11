import { RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';

export enum BiomeType {
  PLAINS = 'plains',
  FOREST = 'forest',
  DUSK = 'dusk',
}

/**
 * What a chunk is for. Hazards go only on plain ground: a rest zone is a
 * breather, a gap is a hole and a pattern carries its own structure.
 */
export type ChunkKind = 'ground' | 'rest' | 'gap' | 'pattern';

export type PatternName =
  | 'staircase-up'
  | 'staircase-down'
  | 'pyramid'
  | 'floating-chain'
  | 'house-scene'
  | 'dual-path'
  | 'fishing-hut';

/**
 * A run of floor tiles: a start tile at `x`, `centerTiles` centre tiles and
 * an end tile. `y` is the centre of the tiles, as everywhere in the world.
 */
export interface FloorPiece {
  type: 'floor';
  x: number;
  y: number;
  centerTiles: number;
}

/** A 32x32 grass block; `x` is its left edge and `y` its centre. */
export interface BlockPiece {
  type: 'block';
  x: number;
  y: number;
}

/** An invisible body to stand on; `x` and `y` are its top-left corner. */
export interface PlatformPiece {
  type: 'platform';
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Collapsing blocks across a hole, level with both edges. */
export interface BridgePiece {
  type: 'bridge';
  /** Where the floor on the left ends. */
  startX: number;
  /** Where the floor on the right starts. */
  endX: number;
  /** The centre of the floor tiles on both sides. */
  floorY: number;
}

/** A stone standing on the floor, centred on `x`. */
export interface StonePiece {
  type: 'stone';
  x: number;
  floorY: number;
  key: RetroRunnerMedia;
}

export interface CoinPiece {
  type: 'coin';
  x: number;
  y: number;
}

/** Decorative grass; `x` is its left edge and `y` its centre. */
export interface GrassPiece {
  type: 'grass';
  x: number;
  y: number;
  key: RetroRunnerMedia;
}

/**
 * A decoration standing on the floor at `y`, centred on `x`. The builder
 * keeps the whole picture between `clampStartX` and `clampEndX`: only it
 * knows how wide the picture is.
 */
export interface DecoPiece {
  type: 'deco';
  x: number;
  y: number;
  key: RetroRunnerMedia;
  depth: number;
  scale: number;
  alpha: number;
  tint: number | null;
  clampStartX: number;
  clampEndX: number;
}

/** The fishing hut's picture; `x` and `y` are its top-left corner. */
export interface HutPiece {
  type: 'hut';
  x: number;
  y: number;
}

/** Water from `y` down to the bottom of the screen. */
export interface WaterPiece {
  type: 'water';
  x: number;
  y: number;
  width: number;
}

export type Piece =
  | FloorPiece
  | BlockPiece
  | PlatformPiece
  | BridgePiece
  | StonePiece
  | CoinPiece
  | GrassPiece
  | DecoPiece
  | HutPiece
  | WaterPiece;

/** Pieces that only change how the world looks, never how it plays. */
export const COSMETIC_PIECES: readonly Piece['type'][] = ['grass', 'deco', 'hut', 'water'];

/** Somewhere the player can stand: a horizontal line from left to right. */
export interface Surface {
  left: number;
  right: number;
  top: number;
}

/** What a chunk hands down to the next one, besides its end and height. */
export interface Carry {
  /** Hard chunks in a row up to this one: decides the rest zones. */
  hardStreak: number;
  /** Stones keep their distance across chunks. */
  lastObstacleX: number;
  /** Trees and large decorations keep their distance across chunks. */
  lastTreeX: number;
  lastLargeDecoX: number;
}

/** Everything a chunk depends on, besides the seed. */
export interface ChunkContext {
  index: number;
  startX: number;
  /** The height of the floor the player arrives on. */
  entryY: number;
  /** null for the first chunk. */
  previousKind: ChunkKind | null;
  previousPattern: PatternName | null;
  /**
   * Where the player stands when the chunk begins: the last floor of the
   * chunk before, or the landing a gap promised.
   */
  entrySurface: Surface;
  carry: Carry;
}

/** A piece of the world as data: what is where, with no Phaser in it. */
export interface ChunkPlan {
  index: number;
  /** 0 unless validation sent the chunk back to be planned again. */
  attempt: number;
  startX: number;
  /** Where the next chunk starts. */
  endX: number;
  /** The height of the floor it starts from (the centre of the tiles). */
  entryY: number;
  /** The height the next chunk starts from. */
  exitY: number;
  biome: BiomeType;
  kind: ChunkKind;
  pattern: PatternName | null;
  /** How hard what was built actually is: decides the rest zones. */
  cost: number;
  pieces: Piece[];
  carry: Carry;
}
