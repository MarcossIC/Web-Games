import { RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import SeededRandom from '@app/data/services/retrorunner/utils/SeededRandom';
import { GameObjects, Scene } from 'phaser';
import { BiomeType } from '@app/data/services/retrorunner/utils/DifficultyManager';

// --- Asset pools ---

// All bushes (15)
const ALL_BUSHES: RetroRunnerMedia[] = [
  RetroRunnerMedia.BUSH_1, RetroRunnerMedia.BUSH_2, RetroRunnerMedia.BUSH_3,
  RetroRunnerMedia.BUSH_4, RetroRunnerMedia.BUSH_5, RetroRunnerMedia.BUSH_6,
  RetroRunnerMedia.BUSH_7, RetroRunnerMedia.BUSH_8, RetroRunnerMedia.BUSH_9,
  RetroRunnerMedia.BUSH_10, RetroRunnerMedia.BUSH_11, RetroRunnerMedia.BUSH_12,
  RetroRunnerMedia.BUSH_13, RetroRunnerMedia.BUSH_14,
];

// Fences (6) + Ridges (6)
const FENCES: RetroRunnerMedia[] = [
  RetroRunnerMedia.FENCE_1, RetroRunnerMedia.FENCE_2, RetroRunnerMedia.FENCE_3,
  RetroRunnerMedia.FENCE_4, RetroRunnerMedia.FENCE_5, RetroRunnerMedia.FENCE_6,
];
const RIDGES: RetroRunnerMedia[] = [
  RetroRunnerMedia.RIDGE_1, RetroRunnerMedia.RIDGE_2, RetroRunnerMedia.RIDGE_3,
  RetroRunnerMedia.RIDGE_4, RetroRunnerMedia.RIDGE_5, RetroRunnerMedia.RIDGE_6,
];

// Pointers / signs (17)
const POINTERS: RetroRunnerMedia[] = [
  RetroRunnerMedia.POINTER_1, RetroRunnerMedia.POINTER_2, RetroRunnerMedia.POINTER_3,
  RetroRunnerMedia.POINTER_4, RetroRunnerMedia.POINTER_5, RetroRunnerMedia.POINTER_6,
  RetroRunnerMedia.POINTER_7, RetroRunnerMedia.POINTER_8, RetroRunnerMedia.POINTER_9,
  RetroRunnerMedia.POINTER_10, RetroRunnerMedia.POINTER_11, RetroRunnerMedia.POINTER_12,
  RetroRunnerMedia.POINTER_13, RetroRunnerMedia.POINTER_14, RetroRunnerMedia.POINTER_15,
  RetroRunnerMedia.POINTER_16, RetroRunnerMedia.POINTER_17,
];

// Boxes (8)
const ALL_BOXES: RetroRunnerMedia[] = [
  RetroRunnerMedia.BOX_1, RetroRunnerMedia.BOX_2, RetroRunnerMedia.BOX_3,
  RetroRunnerMedia.BOX_4, RetroRunnerMedia.BOX_5, RetroRunnerMedia.BOX_6,
  RetroRunnerMedia.BOX_7, RetroRunnerMedia.BOX_8,
];

// Trees (9)
const ALL_TREES: RetroRunnerMedia[] = [
  RetroRunnerMedia.TREE_1, RetroRunnerMedia.TREE_2, RetroRunnerMedia.TREE_3,
  RetroRunnerMedia.TREE_4, RetroRunnerMedia.TREE_5, RetroRunnerMedia.TREE_6,
  RetroRunnerMedia.TREE_7, RetroRunnerMedia.TREE_8, RetroRunnerMedia.TREE_9,
];

// Willows (3)
const ALL_WILLOWS: RetroRunnerMedia[] = [
  RetroRunnerMedia.WILLOW_1, RetroRunnerMedia.WILLOW_2, RetroRunnerMedia.WILLOW_3,
];

// Fishing theme decorations
const FISHING_DECOS: RetroRunnerMedia[] = [
  RetroRunnerMedia.BOAT_1, RetroRunnerMedia.FISHBARREL_1, RetroRunnerMedia.FISHBARREL_2,
  RetroRunnerMedia.FISHBARREL_3, RetroRunnerMedia.FISHBARREL_4,
];

// Ladders (decorative)
const LADDERS: RetroRunnerMedia[] = [
  RetroRunnerMedia.LADDER_1, RetroRunnerMedia.LADDER_2, RetroRunnerMedia.LADDER_3,
];

interface BiomeDecoConfig {
  smallPool: RetroRunnerMedia[];
  treePool: RetroRunnerMedia[];
  largePool: RetroRunnerMedia[];
  boxPool: RetroRunnerMedia[];
  accentPool: RetroRunnerMedia[]; // special per-biome flavor decorations
  smallChance: number;
  treeChance: number;
  largeChance: number;
  boxChance: number;
  accentChance: number;
  treeTint?: number;
  largeTint?: number;
}

const BIOME_CONFIGS: Record<BiomeType, BiomeDecoConfig> = {
  [BiomeType.PLAINS]: {
    smallPool: [...ALL_BUSHES.slice(0, 9), ...FENCES, ...POINTERS.slice(0, 8)],
    treePool: ALL_TREES,
    largePool: ALL_WILLOWS,
    boxPool: ALL_BOXES,
    accentPool: [...POINTERS.slice(8), ...LADDERS], // signs and ladders
    smallChance: 0.65,
    treeChance: 0.25,
    largeChance: 0.1,
    boxChance: 0.2,
    accentChance: 0.12,
  },
  [BiomeType.FOREST]: {
    smallPool: [...ALL_BUSHES, ...RIDGES], // all bushes + ridges — dense undergrowth
    treePool: ALL_TREES,
    largePool: ALL_WILLOWS,
    boxPool: ALL_BOXES.slice(0, 4),
    accentPool: LADDERS, // ladders leaning on trees
    smallChance: 0.8,
    treeChance: 0.45,
    largeChance: 0.2,
    boxChance: 0.1,
    accentChance: 0.08,
    treeTint: 0x88bb66,
    largeTint: 0x77aa55,
  },
  [BiomeType.DUSK]: {
    smallPool: [...FENCES, ...RIDGES, ...POINTERS.slice(0, 8)], // barren: fences, ridges, broken signs
    treePool: ALL_TREES.slice(0, 4),
    largePool: ALL_WILLOWS,
    boxPool: ALL_BOXES,
    accentPool: FISHING_DECOS, // barrels and boats (hut is a floor pattern now)
    smallChance: 0.4,
    treeChance: 0.15,
    largeChance: 0.08,
    boxChance: 0.25,
    accentChance: 0.1,
    treeTint: 0xcc9966,
    largeTint: 0xbb8855,
  },
};

const RECYCLE_DISTANCE = 800;

class DecorationManager {
  private scene: Scene;
  private rng: SeededRandom;
  private decorations: GameObjects.Group;
  private lastLargeDecoX: number = 0;
  private lastTreeX: number = 0;
  private currentBiome: BiomeType = BiomeType.PLAINS;

  constructor(scene: Scene, rng: SeededRandom) {
    this.scene = scene;
    this.rng = rng;
    this.decorations = scene.add.group();
  }

  setBiome(biome: BiomeType) {
    this.currentBiome = biome;
  }

  /**
   * Clamp X so the full sprite width (after scale) stays within segment bounds.
   * Origin is (0.5, 1), so the sprite extends halfWidth to each side.
   */
  private clampX(x: number, startX: number, endX: number, textureWidth: number, scale: number): number {
    const halfW = (textureWidth * scale) / 2;
    const minX = startX + halfW;
    const maxX = endX - halfW;
    if (minX >= maxX) return (startX + endX) / 2; // segment too narrow, center it
    return Math.max(minX, Math.min(maxX, x));
  }

  private spawnDeco(x: number, y: number, key: RetroRunnerMedia, depth: number, scale: number, alpha: number = 1, tint?: number, segStartX?: number, segEndX?: number): GameObjects.Sprite {
    // Try to recycle an inactive decoration
    let deco = this.decorations.getFirstDead(false) as GameObjects.Sprite | null;

    if (deco) {
      deco.setTexture(key);
      deco.setPosition(x, y);
      deco.setActive(true).setVisible(true);
    } else {
      deco = this.decorations.create(x, y, key) as GameObjects.Sprite;
    }

    deco.setOrigin(0.5, 1).setDepth(depth).setScale(scale).setAlpha(alpha);
    deco.clearTint();
    if (tint) deco.setTint(tint);

    // Clamp position so the sprite doesn't hang off segment edges
    if (segStartX !== undefined && segEndX !== undefined) {
      const clampedX = this.clampX(deco.x, segStartX, segEndX, deco.width, scale);
      deco.setX(clampedX);
    }

    return deco;
  }

  /**
   * @param exclusionZones - array of {x, width} ranges where decorations should NOT be placed
   *                         (e.g., under elevated platforms to prevent visual overlap)
   */
  spawnOnSegment(segmentStartX: number, segmentEndX: number, floorY: number, exclusionZones?: { x: number; width: number }[]) {
    const segmentWidth = segmentEndX - segmentStartX;
    if (segmentWidth < 60) return;

    const surfaceY = floorY - 17;
    const sX = segmentStartX;
    const eX = segmentEndX;

    // Helper: check if an X position overlaps any exclusion zone
    const isExcluded = (x: number, spriteW: number = 40) => {
      if (!exclusionZones) return false;
      const halfW = spriteW / 2;
      return exclusionZones.some(z => x + halfW > z.x && x - halfW < z.x + z.width);
    };

    const cfg = BIOME_CONFIGS[this.currentBiome];

    // Small decoration(s) — bushes, fences, ridges (low, rarely overlap)
    if (this.rng.chance(cfg.smallChance) && cfg.smallPool.length > 0) {
      const key = this.rng.pick(cfg.smallPool);
      const x = sX + this.rng.integer(false, Math.floor(segmentWidth * 0.6)) + 20;
      if (!isExcluded(x)) {
        this.spawnDeco(x, surfaceY, key, 2, 0.7, 1, undefined, sX, eX);
      }
    }

    // Second small decoration on medium segments
    if (segmentWidth > 180 && this.rng.chance(cfg.smallChance * 0.7) && cfg.smallPool.length > 0) {
      const key = this.rng.pick(cfg.smallPool);
      const x = sX + Math.floor(segmentWidth * 0.55) + this.rng.integer(false, 50);
      if (!isExcluded(x)) {
        this.spawnDeco(x, surfaceY, key, 2, 0.65, 1, undefined, sX, eX);
      }
    }

    // Boxes — tall enough to overlap with platforms
    if (segmentWidth > 120 && this.rng.chance(cfg.boxChance) && cfg.boxPool.length > 0) {
      const key = this.rng.pick(cfg.boxPool);
      const x = sX + this.rng.integer(false, Math.floor(segmentWidth * 0.5)) + 30;
      if (!isExcluded(x, 60)) {
        this.spawnDeco(x, surfaceY, key, 2, 0.7, 1, undefined, sX, eX);
      }
    }

    // Medium tree — tall, check exclusion with wide margin
    if (segmentWidth > 130 && this.rng.chance(cfg.treeChance) && sX - this.lastTreeX > 250 && cfg.treePool.length > 0) {
      const key = this.rng.pick(cfg.treePool);
      const x = sX + this.rng.integer(false, Math.floor(segmentWidth * 0.4)) + 40;
      if (!isExcluded(x, 100)) {
        this.spawnDeco(x, surfaceY, key, 1, 1.0, 0.9, cfg.treeTint, sX, eX);
        this.lastTreeX = x;
      }
    }

    // Large willow/tree — very tall, wide exclusion check
    if (
      segmentWidth > 200 &&
      this.rng.chance(cfg.largeChance) &&
      sX - this.lastLargeDecoX > 700 &&
      cfg.largePool.length > 0
    ) {
      const key = this.rng.pick(cfg.largePool);
      const x = sX + Math.floor(segmentWidth * 0.3) + this.rng.integer(false, 60);
      if (!isExcluded(x, 120)) {
        this.spawnDeco(x, surfaceY, key, 0, 0.9, 0.75, cfg.largeTint, sX, eX);
        this.lastLargeDecoX = x;
      }
    }

    // Accent decorations
    if (segmentWidth > 150 && this.rng.chance(cfg.accentChance) && cfg.accentPool.length > 0) {
      const key = this.rng.pick(cfg.accentPool);
      const x = sX + this.rng.integer(false, Math.floor(segmentWidth * 0.5)) + 40;
      if (!isExcluded(x, 50)) {
        this.spawnDeco(x, surfaceY, key, 2, 0.75, 1, undefined, sX, eX);
      }
    }

    // House — very large, wide exclusion
    if (
      segmentWidth > 350 &&
      this.rng.chance(0.05) &&
      sX - this.lastLargeDecoX > 1200
    ) {
      const x = sX + Math.floor(segmentWidth * 0.4);
      if (!isExcluded(x, 130)) {
        this.spawnDeco(x, surfaceY, RetroRunnerMedia.HOUSE, 0, 0.8, 0.85, undefined, sX, eX);
        this.lastLargeDecoX = x;
      }
    }
  }

  update(cameraScrollX: number) {
    this.decorations.children.each((child) => {
      const sprite = child as GameObjects.Sprite;
      if (sprite.active && sprite.x < cameraScrollX - RECYCLE_DISTANCE) {
        // Pool instead of destroy
        sprite.setActive(false).setVisible(false);
      }
      return true;
    });
  }
}

export default DecorationManager;
