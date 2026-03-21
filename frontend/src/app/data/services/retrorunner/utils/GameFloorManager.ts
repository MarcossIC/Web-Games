import {
  RetroRunnerFloor,
  RetroRunnerMedia,
} from '@app/data/models/retro-runner/RetroRunnerKeys';
import DifficultyManager, { BiomeType, DifficultyConfig } from '@app/data/services/retrorunner/utils/DifficultyManager';
import SeededRandom from '@app/data/services/retrorunner/utils/SeededRandom';
import SimplexNoise from '@app/data/services/retrorunner/utils/SimplexNoise';
import { GameObjects, Physics, Scene } from 'phaser';

// All 24 grass variants with Y offset from floor center (places bottom near surface)
const GRASS_DECORATIONS: [RetroRunnerMedia, number][] = [
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

const RECYCLE_DISTANCE = 600;
const MAX_DIRECT_JUMP = 210;
const MAX_ELEVATION = -80;
const BW = RetroRunnerFloor.GRASS_BLOCK_WIDTH; // 32

enum PatternType {
  STAIRCASE_UP,
  STAIRCASE_DOWN,
  PYRAMID,
  FLOATING_CHAIN,
  HOUSE_SCENE,
  DUAL_PATH,
}

interface SegmentResult {
  startX: number;
  endX: number;
  floorY: number;
  isPattern: boolean;
}

// Noise sampling scale — lower = smoother hills, higher = jagged
const NOISE_SCALE = 0.003;
// Maximum elevation offset from noise (pixels)
const NOISE_AMPLITUDE = 60;

// Player physics constants (must match PlayerActions)
const PLAYER_VX = 190;       // BASE_WALK_SPEED
const PLAYER_JUMP_VY = 510;  // absolute JUMP_VELOCITY
const GRAVITY = 700;         // arcade gravity (300) + player gravityY (400)
const SAFETY_MARGIN = 0.85;  // 85% of theoretical max — accounts for human error

export interface DualPathInfo {
  groundStartX: number;
  groundEndX: number;
  groundFloorY: number;
  elevatedPlatforms: { x: number; y: number }[];
}

class GameFloorManager {
  private scene: Scene;
  private rng: SeededRandom;
  private noise: SimplexNoise;
  private difficultyManager: DifficultyManager | null = null;
  private lastChunkEndX: number = 0;
  private chunkCount: number = 0;
  private defaultFloorY: number = 0;
  private lastWasGap: boolean = false;
  private currentElevation: number = 0;
  private pendingDualPath: DualPathInfo | null = null;

  public floor: Physics.Arcade.StaticGroup;
  public grassGroup: GameObjects.Group;

  constructor(scene: Scene, rng: SeededRandom) {
    this.scene = scene;
    this.rng = rng;
    this.noise = new SimplexNoise(Math.floor(rng.next() * 0x7fffffff));
    this.floor = scene.physics.add.staticGroup();
    this.grassGroup = scene.add.group();

    // Create a 1x1 pixel texture for invisible collision platforms
    if (!scene.textures.exists('invisBlock')) {
      const gfx = scene.add.graphics();
      gfx.fillStyle(0x000000, 0);
      gfx.fillRect(0, 0, 1, 1);
      gfx.generateTexture('invisBlock', 1, 1);
      gfx.destroy();
    }
  }

  setDifficultyManager(dm: DifficultyManager) {
    this.difficultyManager = dm;
  }

  createInitialWorld(floorPositionY: number, difficulty: DifficultyConfig) {
    this.defaultFloorY = floorPositionY;
    this.lastChunkEndX = 0;
    this.chunkCount = 0;
    this.lastWasGap = false;
    this.currentElevation = 0;

    const targetX = this.scene.scale.width + 400;
    while (this.lastChunkEndX < targetX) {
      this.generateChunk(difficulty, true);
    }
  }

  update(
    cameraScrollX: number,
    difficulty: DifficultyConfig,
    callbacks?: {
      onSegmentCreated?: (startX: number, endX: number, floorY: number, isPattern: boolean) => void;
      onGapCreated?: (startX: number, endX: number, floorY: number) => void;
      onDualPathCreated?: (info: DualPathInfo) => void;
    }
  ) {
    const viewWidth = this.scene.scale.width;

    while (this.lastChunkEndX < cameraScrollX + viewWidth + 500) {
      const beforeX = this.lastChunkEndX;
      const segment = this.generateChunk(difficulty, false);
      if (segment && callbacks?.onSegmentCreated) {
        callbacks.onSegmentCreated(segment.startX, segment.endX, segment.floorY, segment.isPattern);
      }
      if (!segment && callbacks?.onGapCreated && this.lastChunkEndX > beforeX) {
        callbacks.onGapCreated(beforeX, this.lastChunkEndX, this.getFloorY());
      }
      if (this.pendingDualPath && callbacks?.onDualPathCreated) {
        callbacks.onDualPathCreated(this.pendingDualPath);
        this.pendingDualPath = null;
      }
    }

    this.destroyBehindCamera(cameraScrollX);
  }

  private destroyBehindCamera(cameraScrollX: number) {
    const threshold = cameraScrollX - RECYCLE_DISTANCE;

    const floorToDestroy: Physics.Arcade.Sprite[] = [];
    this.floor.children.each((child) => {
      const sprite = child as Physics.Arcade.Sprite;
      if (sprite.active && sprite.x < threshold) {
        floorToDestroy.push(sprite);
      }
      return true;
    });
    for (const s of floorToDestroy) s.destroy();

    const grassToDestroy: GameObjects.Sprite[] = [];
    this.grassGroup.children.each((child) => {
      const sprite = child as GameObjects.Sprite;
      if (sprite.active && sprite.x < threshold) {
        grassToDestroy.push(sprite);
      }
      return true;
    });
    for (const s of grassToDestroy) s.destroy();
  }

  private getFloorY(): number {
    return this.defaultFloorY + this.currentElevation;
  }

  private generateChunk(
    difficulty: DifficultyConfig,
    isSafe: boolean
  ): SegmentResult | null {
    this.chunkCount++;

    // Markov rest zone: after consecutive hard segments, force a safe ground
    if (!isSafe && this.difficultyManager) {
      const restChance = this.difficultyManager.markSegmentDifficulty(
        difficulty.gapChance > 0.2 || difficulty.obstacleChance > 0.1
      );
      if (restChance > 0 && this.rng.chance(restChance)) {
        // Force a long safe ground segment (rest zone)
        this.lastWasGap = false;
        return this.generateRestZone();
      }
    }

    const canGap = !isSafe && this.chunkCount > 2 && !this.lastWasGap;
    const isGap = canGap && this.rng.chance(difficulty.gapChance);

    if (isGap) {
      this.lastWasGap = true;

      // In DUSK biome, sometimes replace gap with fishing hut bridge
      if (difficulty.biome === BiomeType.DUSK
        && this.currentElevation > -20
        && this.rng.chance(0.25)) {
        return this.patternFishingHutBridge();
      }

      this.generateGap(difficulty);
      return null;
    }

    this.lastWasGap = false;

    const canPattern = !isSafe && this.currentElevation > MAX_ELEVATION;
    if (canPattern && this.rng.chance(difficulty.patternChance)) {
      return this.generatePattern(difficulty);
    }

    return this.generateGroundSegment(difficulty);
  }

  /** Forced rest zone: long flat segment with lots of coin potential, no hazards */
  private generateRestZone(): SegmentResult {
    const startX = this.lastChunkEndX;
    this.currentElevation = Math.min(0, this.currentElevation + 40);
    const floorY = this.getFloorY();
    const segment = this.buildGround(8 + this.rng.integer(true, 4), floorY);
    return { startX, endX: segment.endX, floorY, isPattern: false };
  }

  // --- GAP ---

  private generateGap(difficulty: DifficultyConfig) {
    const gapRange = difficulty.maxGapWidth - difficulty.minGapWidth;
    let gapWidth = difficulty.minGapWidth + this.rng.integer(true, Math.max(1, gapRange));

    // Return elevation to ground during gaps
    if (this.currentElevation < 0) {
      this.currentElevation = Math.min(0, this.currentElevation + 40);
    }

    // Ballistic validation: clamp gap to what the player can actually jump
    const maxJump = this.maxJumpDistance(0);
    const safeDirectJump = Math.min(MAX_DIRECT_JUMP, maxJump);

    if (gapWidth <= safeDirectJump) {
      this.lastChunkEndX += gapWidth;
      return;
    }

    // If gap exceeds safe direct jump, place stepping stones
    // Also clamp total gap to prevent impossible generation
    const maxTotalGap = maxJump * 3; // 3 chained jumps max
    gapWidth = Math.min(gapWidth, maxTotalGap);

    this.placeSteppingStones(gapWidth);
  }

  private placeSteppingStones(totalGap: number) {
    const gapStart = this.lastChunkEndX;
    let remaining = totalGap;
    let currentX = gapStart;
    const safeJump = this.maxJumpDistance(0);

    while (remaining > safeJump) {
      // Place stones at 50-80% of safe jump distance for comfortable gameplay
      const jumpDist = safeJump * 0.5 + this.rng.integer(true, Math.floor(safeJump * 0.3));
      currentX += jumpDist;
      const heightOffset = 30 + this.rng.integer(true, 30);
      this.createGrassBlock(currentX, this.getFloorY() - heightOffset);
      remaining = (gapStart + totalGap) - (currentX + BW);
    }

    this.lastChunkEndX = gapStart + totalGap;
  }

  // --- PATTERNS ---

  private generatePattern(difficulty: DifficultyConfig): SegmentResult {
    const patterns = [
      PatternType.STAIRCASE_UP,
      PatternType.PYRAMID,
      PatternType.FLOATING_CHAIN,
    ];

    // Only allow staircase down if elevated
    if (this.currentElevation < -20) {
      patterns.push(PatternType.STAIRCASE_DOWN);
    }

    if (difficulty.obstacleChance > 0.1) {
      patterns.push(PatternType.HOUSE_SCENE);
    }

    // Dual path available once difficulty has some obstacles (not too early)
    if (difficulty.obstacleChance >= 0.08) {
      patterns.push(PatternType.DUAL_PATH);
    }

    const pattern = this.rng.pick(patterns);

    switch (pattern) {
      case PatternType.STAIRCASE_UP:
        return this.patternStaircaseUp();
      case PatternType.STAIRCASE_DOWN:
        return this.patternStaircaseDown();
      case PatternType.PYRAMID:
        return this.patternPyramid();
      case PatternType.FLOATING_CHAIN:
        return this.patternFloatingChain();
      case PatternType.HOUSE_SCENE:
        return this.patternHouseScene();
      case PatternType.DUAL_PATH:
        return this.patternDualPath();
      default:
        return { ...this.generateGroundSegment({} as DifficultyConfig), isPattern: false };
    }
  }

  // Ascending stairs: 2-3 steps going up
  private patternStaircaseUp(): SegmentResult {
    const startX = this.lastChunkEndX;
    const baseY = this.getFloorY();
    const stepH = 25;
    const maxSteps = Math.max(1, Math.floor(Math.abs(this.currentElevation - MAX_ELEVATION) / stepH));
    const steps = Math.min(2, maxSteps);
    const stepW = 55;

    // Base ground
    const base = this.buildGround(3, baseY);

    // Steps ascending from base
    for (let i = 0; i < steps; i++) {
      const bx = base.endX + 25 + i * stepW;
      const by = baseY - (i + 1) * stepH;
      this.createGrassBlock(bx, by);
      this.createGrassBlock(bx + BW, by);
    }

    this.currentElevation = Math.max(MAX_ELEVATION, this.currentElevation - steps * stepH);
    this.lastChunkEndX = base.endX + 25 + steps * stepW + BW * 2;

    // Landing at new elevation
    const landing = this.buildGround(3, this.getFloorY());

    return { startX, endX: landing.endX, floorY: this.getFloorY(), isPattern: true };
  }

  // Descending stairs back toward ground level
  private patternStaircaseDown(): SegmentResult {
    const startX = this.lastChunkEndX;
    const topY = this.getFloorY();
    const stepH = 25;
    const steps = Math.min(2, Math.floor(Math.abs(this.currentElevation) / stepH));

    for (let i = 0; i < steps; i++) {
      const bx = startX + i * 55;
      const by = topY + (i + 1) * stepH; // going DOWN (increasing Y)
      this.createGrassBlock(bx, by);
      this.createGrassBlock(bx + BW, by);
    }

    this.currentElevation = Math.min(0, this.currentElevation + steps * stepH);
    this.lastChunkEndX = startX + steps * 55 + BW * 2 + 20;

    // Landing at new (lower) elevation
    const landing = this.buildGround(4, this.getFloorY());

    return { startX, endX: landing.endX, floorY: this.getFloorY(), isPattern: true };
  }

  // Pyramid: up then down, self-contained
  private patternPyramid(): SegmentResult {
    const startX = this.lastChunkEndX;
    const baseY = this.getFloorY();
    const stepH = 25;
    const stepW = 48;

    const base = this.buildGround(2, baseY);

    // Up 2 steps
    for (let i = 0; i < 2; i++) {
      const bx = base.endX + 20 + i * stepW;
      this.createGrassBlock(bx, baseY - (i + 1) * stepH);
    }

    // Peak
    const peakX = base.endX + 20 + 2 * stepW;
    const peakY = baseY - 3 * stepH;
    this.createGrassBlock(peakX, peakY);
    this.createGrassBlock(peakX + BW, peakY);

    // Down 2 steps
    for (let i = 0; i < 2; i++) {
      const bx = peakX + BW * 2 + 15 + i * stepW;
      this.createGrassBlock(bx, baseY - (2 - i) * stepH);
    }

    this.lastChunkEndX = peakX + BW * 2 + 15 + 2 * stepW + BW + 25;

    // Landing at same elevation (pyramid is self-contained)
    const landing = this.buildGround(3, baseY);

    return { startX, endX: landing.endX, floorY: baseY, isPattern: true };
  }

  // Floating chain: blocks above ground
  private patternFloatingChain(): SegmentResult {
    const startX = this.lastChunkEndX;
    const baseY = this.getFloorY();
    const blockCount = 3 + this.rng.integer(true, 1); // 3-4

    const base = this.buildGround(2, baseY);

    let cx = base.endX + 40;
    for (let i = 0; i < blockCount; i++) {
      const h = 35 + this.rng.integer(true, 40); // 35-75px above
      this.createGrassBlock(cx, baseY - h);
      cx += 50 + this.rng.integer(true, 25);
    }

    this.lastChunkEndX = cx + 15;
    const landing = this.buildGround(4, baseY);

    return { startX, endX: landing.endX, floorY: baseY, isPattern: true };
  }

  /**
   * Fishing Hut Bridge: a dock house on stilts over a gap.
   * Player walks up via step blocks → across bridge over gap → jumps to landing.
   *
   * Sprite: 192x122 px
   *   y=57  → bridge/platform walkable surface
   *   y=78  → stairs touch ground (align with surfaceY)
   *   y=101 → bottom of house body
   *   y=116 → pilotes (hidden below ground)
   */
  private patternFishingHutBridge(): SegmentResult {
    const startX = this.lastChunkEndX;
    this.currentElevation = 0;
    const baseY = this.defaultFloorY;
    const surfaceY = baseY - 17;

    // Sprite 192x122. Stairs at y=81, bridge surface at y=57.
    const spriteTopY = surfaceY - 81;
    const bridgeSurfaceY = spriteTopY + 57; // = surfaceY - 24

    // Skip past the previous FLOORGRASS_END tile (~80px) so the hut
    // doesn't overlap with visible ground from the previous segment.
    // This creates a visible gap before the stairs.
    const gapBeforeHut = 90;
    const hutX = startX + gapBeforeHut;

    const hutSprite = this.scene.add.sprite(hutX, spriteTopY, RetroRunnerMedia.FISHING_HUT)
      .setOrigin(0, 0).setDepth(11);
    this.grassGroup.add(hutSprite);

    // Invisible step platform — staircase
    this.createInvisiblePlatform(hutX + 18, surfaceY - 12, 35, 8);

    // Invisible bridge platform — house floor + full dock
    this.createInvisiblePlatform(hutX + 42, bridgeSurfaceY, 155, 8);

    // Water fill — covers void under hut + gap before + gap after
    const waterY = surfaceY + 2;
    const waterW = 192 + gapBeforeHut + 120;
    const waterH = this.scene.scale.height - waterY + 20;
    const water = this.scene.add.rectangle(
      startX, waterY, waterW, waterH, 0x1a5276, 0.4
    ).setOrigin(0, 0).setDepth(-1);
    this.grassGroup.add(water);

    // Gap after bridge — player jumps from dock end to landing
    this.lastChunkEndX = hutX + 192 + 100 + this.rng.integer(true, 40);

    // Landing
    const landing = this.buildGround(4, baseY);

    return { startX, endX: landing.endX, floorY: baseY, isPattern: true };
  }

  /**
   * Invisible thin static body for walkable surfaces.
   * Uses a 1x1 texture scaled to the desired size — body matches perfectly.
   * @param x - left edge of the platform
   * @param surfaceY - Y where the player's feet should land (top of body)
   * @param width - platform width in pixels
   * @param height - body thickness (6-10px recommended)
   */
  private createInvisiblePlatform(x: number, surfaceY: number, width: number, height: number) {
    const plat = this.floor.create(x, surfaceY, 'invisBlock') as Physics.Arcade.Sprite;
    plat.setVisible(false);
    plat.setOrigin(0, 0);
    plat.setDisplaySize(width, height);
    plat.body!.setSize(width, height);
    plat.body!.setOffset(0, 0);
    plat.refreshBody();
  }

  /**
   * Dual Path: ground floor (safe, fewer coins) + elevated platforms (risky, more coins).
   * Player chooses: stay low and safe, or jump up for reward.
   *
   *   coins  coins  coins        ← elevated path (risky, lots of coins)
   *   ████   ████   ████
   *
   *   ██████████████████████████  ← ground path (safe, obstacles, fewer coins)
   */
  private patternDualPath(): SegmentResult {
    const startX = this.lastChunkEndX;
    const baseY = this.getFloorY();

    // Ground path — long flat segment (safe route)
    const ground = this.buildGround(10 + this.rng.integer(true, 4), baseY);

    // Elevated path — noise-based offsets for organic, non-uniform spacing
    const baseElevatedY = baseY - 55 - this.rng.integer(true, 15);
    const platCount = 3 + this.rng.integer(true, 2); // 3-5 platforms
    const totalWidth = ground.endX - ground.startX;
    const avgSpacing = totalWidth / (platCount + 1);

    // Entry ramp — lower block to invite the player upward
    const rampX = ground.startX + avgSpacing * 0.4 + this.rng.range(-10, 10);
    const rampY = baseY - 30;
    this.createGrassBlock(rampX, rampY);

    const platforms: { x: number; y: number }[] = [];
    let lastPlatEndX = rampX + BW;

    for (let i = 0; i < platCount; i++) {
      // Base position from even spacing, then add noise offset
      const baseX = ground.startX + avgSpacing * (i + 1) - BW;
      const noiseOffset = this.noise.noise2D(baseX * 0.01, i * 0.5) * avgSpacing * 0.25;
      let px = baseX + noiseOffset;

      // Ensure minimum gap from previous platform
      px = Math.max(px, lastPlatEndX + 25);
      // Don't go past segment end
      if (px + BW * 2 > ground.endX - 20) break;

      // Vary height with noise too
      const heightNoise = this.noise.noise2D(px * 0.015, 100) * 15;
      const py = baseElevatedY + heightNoise;

      this.createGrassBlock(px, py);
      this.createGrassBlock(px + BW, py);
      platforms.push({ x: px, y: py });
      lastPlatEndX = px + BW * 2;
    }

    this.pendingDualPath = {
      groundStartX: ground.startX,
      groundEndX: ground.endX,
      groundFloorY: baseY,
      elevatedPlatforms: platforms,
    };

    return { startX, endX: ground.endX, floorY: baseY, isPattern: true };
  }

  // House scene: long flat area, reset elevation
  private patternHouseScene(): SegmentResult {
    const startX = this.lastChunkEndX;
    this.currentElevation = 0;
    const baseY = this.defaultFloorY;

    const segment = this.buildGround(10, baseY);

    return { startX, endX: segment.endX, floorY: baseY, isPattern: true };
  }

  // --- GROUND SEGMENT ---

  /**
   * Ballistic validation: compute the max horizontal distance a player can
   * cover in a single jump given the height difference.
   * Uses parabolic trajectory: x = vx * t, y = vy*t - 0.5*g*t^2
   * @param deltaY - height difference (positive = landing is LOWER = easier)
   * @returns max jumpable horizontal distance in pixels (with safety margin)
   */
  private maxJumpDistance(deltaY: number = 0): number {
    // Time of flight: solve -0.5*g*t^2 + vy*t + deltaY = 0
    // t = (vy + sqrt(vy^2 + 2*g*deltaY)) / g
    const discriminant = PLAYER_JUMP_VY * PLAYER_JUMP_VY + 2 * GRAVITY * deltaY;
    if (discriminant < 0) return 0; // can't reach (landing is too high above)
    const tFlight = (PLAYER_JUMP_VY + Math.sqrt(discriminant)) / GRAVITY;
    return PLAYER_VX * tFlight * SAFETY_MARGIN;
  }

  /** Sample terrain elevation from Simplex noise at a given X position */
  private sampleElevation(worldX: number): number {
    // FBM with 3 octaves: smooth hills with small bumps
    const n = this.noise.fbm(worldX * NOISE_SCALE, 0, 3, 2.0, 0.5);
    // Map [-1,1] to [0, NOISE_AMPLITUDE] — only elevate upward (negative Y)
    return -Math.max(0, (n + 0.3)) * NOISE_AMPLITUDE;
  }

  private generateGroundSegment(difficulty: DifficultyConfig): SegmentResult {
    // Use noise-based elevation instead of random coin-flip
    const noiseElev = this.sampleElevation(this.lastChunkEndX);
    this.currentElevation = Math.max(MAX_ELEVATION, noiseElev);

    const tileRange = (difficulty.maxCenterTiles || 10) - (difficulty.minCenterTiles || 4);
    const centerTiles = (difficulty.minCenterTiles || 4) + this.rng.integer(true, Math.max(1, tileRange));
    const floorY = this.getFloorY();

    const segment = this.buildGround(centerTiles, floorY);

    // Elevated platform above long segments — high enough to not clip ground decorations
    if (centerTiles >= 6 && this.rng.chance(0.25)) {
      const platX = segment.startX + this.rng.integer(false, Math.floor((segment.endX - segment.startX) * 0.4)) + 80;
      const platY = floorY - 75 - this.rng.integer(true, 20);
      this.createGrassBlock(platX, platY);
    }

    return { startX: segment.startX, endX: segment.endX, floorY, isPattern: false };
  }

  // --- HELPERS ---

  /**
   * Build a ground segment at an explicit Y position.
   * All tiles and grass use this Y — no reliance on getFloorY().
   */
  private buildGround(centerTiles: number, floorY: number): { startX: number; endX: number } {
    const startX = this.lastChunkEndX;

    this.createFloorTile(this.lastChunkEndX, floorY, RetroRunnerMedia.FLOORGRASS_START);
    this.lastChunkEndX += RetroRunnerFloor.FLOORGRASS_START_WIDTH;

    for (let i = 0; i < centerTiles; i++) {
      this.createFloorTile(this.lastChunkEndX, floorY, RetroRunnerMedia.FLOORGRASS_CENTER);
      this.lastChunkEndX += RetroRunnerFloor.FLOORGRASS_CENTER_WIDTH;
    }

    this.createFloorTile(this.lastChunkEndX, floorY, RetroRunnerMedia.FLOORGRASS_END);
    const endX = this.lastChunkEndX;

    // Grass decorations at the correct Y
    this.placeGrass(startX, endX, floorY);

    return { startX, endX };
  }

  private createFloorTile(x: number, y: number, key: RetroRunnerMedia) {
    const tile = this.floor.create(x, y, key) as Physics.Arcade.Sprite;
    tile.setOrigin(0, 0.5).refreshBody();
  }

  private createGrassBlock(x: number, y: number) {
    const block = this.floor.create(x, y, RetroRunnerMedia.GRASS_BLOCK) as Physics.Arcade.Sprite;
    block.setOrigin(0, 0.5).refreshBody();
  }

  private placeGrass(startX: number, endX: number, floorY: number) {
    const segmentWidth = endX - startX;
    if (segmentWidth < 80) return;

    const count = Math.floor(segmentWidth / 70);
    let cx = startX + 20;

    for (let i = 0; i < count; i++) {
      if (this.rng.chance(0.5)) {
        cx += this.rng.integer(false, 50) + 20;
        continue;
      }
      const [key, yOff] = this.rng.pick(GRASS_DECORATIONS);
      if (cx >= endX - 10) break;
      this.grassGroup.create(cx, floorY - yOff, key).setOrigin(0, 0.5);
      cx += this.rng.integer(false, 50) + 25;
    }
  }
}

export default GameFloorManager;
