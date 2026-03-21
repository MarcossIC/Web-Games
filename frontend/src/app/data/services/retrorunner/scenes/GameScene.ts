import {
  RetroRunnerKey,
  RetroRunnerMedia,
  RetroRunnerStates,
} from '@app/data/models/retro-runner/RetroRunnerKeys';
import { EventBus } from '@app/data/services/phaser/EventBus';
import {
  PhaserPlayerWithBody,
  PhaserSound,
} from '@app/data/services/phaser/types';
import { SceneKeys } from '@app/data/services/retrorunner/main';
import CoinManager from '@app/data/services/retrorunner/utils/CoinManager';
import CollapsingPlatformManager from '@app/data/services/retrorunner/utils/CollapsingPlatformManager';
import DecorationManager from '@app/data/services/retrorunner/utils/DecorationManager';
import DifficultyManager, { BiomeType } from '@app/data/services/retrorunner/utils/DifficultyManager';
import GameBackgroundManager from '@app/data/services/retrorunner/utils/GameBackgroundManager';
import GameFloorManager, { DualPathInfo } from '@app/data/services/retrorunner/utils/GameFloorManager';
import Joystick from '@app/data/services/retrorunner/utils/JoyStick';
import ObstacleManager from '@app/data/services/retrorunner/utils/ObstacleManager';
import { PlayerActions } from '@app/data/services/retrorunner/utils/PlayerActions';
import ScoreManager from '@app/data/services/retrorunner/utils/ScoreManager';
import SeededRandom from '@app/data/services/retrorunner/utils/SeededRandom';
import { Scene, GameObjects } from 'phaser';

// Speed ramp: player gradually gets faster
const BASE_SPEED_MULTIPLIER = 1;
const MAX_SPEED_MULTIPLIER = 1.4;
const SPEED_RAMP_DISTANCE = 15000; // distance to reach max speed

export class GameScene extends Scene {
  public player!: PhaserPlayerWithBody;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  public background!: GameObjects.TileSprite;
  public jumpSound!: PhaserSound;

  public actions!: PlayerActions;
  public backgroundManager!: GameBackgroundManager;
  public floorManager!: GameFloorManager;
  public joystick!: Joystick;
  public scoreManager!: ScoreManager;
  public obstacleManager!: ObstacleManager;
  public coinManager!: CoinManager;
  public decorationManager!: DecorationManager;
  public collapsingManager!: CollapsingPlatformManager;
  public difficultyManager!: DifficultyManager;

  private floorY!: number;
  private dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private ambientEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private prevOnFloor: boolean = false;
  private parallaxLayers: GameObjects.TileSprite[] = [];
  private lastLandTime: number = 0;
  private currentBiome: BiomeType = BiomeType.PLAINS;
  public rng!: SeededRandom;

  constructor() {
    super(SceneKeys.GAME);
  }

  init(data?: { seed?: string }) {
    // First load (from PreloaderScene): data is undefined
    //   → read seed from game registry (set by Angular from URL query param)
    // Restart from GameOver: data is { seed: string | undefined }
    //   - data.seed string → SHIFT+click replay
    //   - data.seed undefined → normal click, new random seed
    // Phaser passes {} from PreloaderScene (first load) vs { seed: ... } from GameOver
    // Use 'seed' in data to distinguish: property exists = restart, missing = first load
    const isFirstLoad = !data || !('seed' in data);
    let seed: string | undefined;

    if (isFirstLoad) {
      seed = this.game.registry.get('initialSeed') as string | undefined;
      this.game.registry.remove('initialSeed');
    } else {
      seed = data!.seed;
    }

    this.rng = new SeededRandom(seed);

    // Sync seed to Angular router → updates URL without reload
    EventBus.emit('seed-changed', this.rng.seedKey);

    this.actions = new PlayerActions();
    this.backgroundManager = new GameBackgroundManager();
    this.difficultyManager = new DifficultyManager();

    this.background = this.add.tileSprite(
      0,
      0,
      this.scale.width,
      this.scale.height,
      RetroRunnerMedia.BG_ALT
    );
    this.background.setOrigin(0, 0).setScale(1).setDepth(-10);

    this.jumpSound = this.sound.add(RetroRunnerMedia.BIT_JUMP, {
      volume: 0.1,
    });
  }

  create() {
    if (this.game.device.input.touch) {
      this.joystick = new Joystick(this, 100, this.scale.height - 100, 50);
    }

    this.backgroundManager.scaleBackground(
      this.background,
      this.textures.get(RetroRunnerMedia.BG_ALT).getSourceImage(),
      this.scale
    );

    // Multi-layer parallax
    this.createParallaxLayers();

    this.physics.enableUpdate();
    this.startPlayer();

    // Dust particle emitter
    this.createDustEmitter();

    // Floor
    this.floorY = this.scale.height - 16;
    // Independent RNG streams — prevents butterfly effect between systems
    this.floorManager = new GameFloorManager(this, this.rng.fork('terrain'));
    this.floorManager.setDifficultyManager(this.difficultyManager);
    const initialDifficulty = this.difficultyManager.getConfig(0);
    this.floorManager.createInitialWorld(this.floorY, initialDifficulty);

    // Decorations
    this.decorationManager = new DecorationManager(this, this.rng.fork('deco'));

    // Score
    this.scoreManager = new ScoreManager(this, this.player.x);
    this.scoreManager.createHUD();

    // Obstacles
    this.obstacleManager = new ObstacleManager(this, this.rng.fork('obstacles'));

    // Coins
    this.coinManager = new CoinManager(this, this.scoreManager, this.rng.fork('coins'));

    // Collapsing platforms
    this.collapsingManager = new CollapsingPlatformManager(this, this.rng.fork('collapse'));

    // Animations
    this.startAnimations();
    this.createCoinAnimation();

    // Physics world
    this.physics.world.setBounds(0, 0, Number.MAX_SAFE_INTEGER, this.scale.height);

    // Colliders
    this.physics.add.collider(this.player, this.floorManager.floor);
    this.physics.add.collider(
      this.player,
      this.collapsingManager.getGroup(),
      (_player, block) => {
        this.collapsingManager.onPlayerCollide(
          _player as Phaser.Physics.Arcade.Sprite,
          block as Phaser.Physics.Arcade.Sprite
        );
      },
      undefined,
      this
    );
    this.physics.add.overlap(
      this.player,
      this.obstacleManager.getGroup(),
      () => this.handlePlayerHitObstacle(),
      undefined,
      this
    );
    this.physics.add.overlap(
      this.player,
      this.coinManager.getGroup(),
      (_player, coin) =>
        this.coinManager.collectCoin(
          _player as Phaser.Physics.Arcade.Sprite,
          coin as Phaser.Physics.Arcade.Sprite
        ),
      undefined,
      this
    );

    // Camera
    this.cameras.main.setBounds(0, 0, Number.MAX_SAFE_INTEGER, this.scale.height);
    this.cameras.main.startFollow(this.player, false, 0.1, 0);
    this.cameras.main.setDeadzone(80, 0);

    // Input
    this.keys = this.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    }) as Record<string, Phaser.Input.Keyboard.Key>;


    this.prevOnFloor = false;

    EventBus.emit(SceneKeys.SCENE_READY, this);
  }

  private createDustEmitter() {
    // Create a tiny pixel texture for dust particles (only once)
    if (!this.textures.exists('dustPixel')) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0xccbbaa);
      gfx.fillRect(0, 0, 3, 3);
      gfx.generateTexture('dustPixel', 3, 3);
      gfx.destroy();
    }

    this.dustEmitter = this.add.particles(0, 0, 'dustPixel', {
      speed: { min: 10, max: 40 },
      angle: { min: 200, max: 340 },
      scale: { start: 1, end: 0 },
      lifespan: 300,
      alpha: { start: 0.7, end: 0 },
      gravityY: 50,
      emitting: false,
    });
    this.dustEmitter.setDepth(9);

    // Ambient particle emitter — changes per biome
    if (!this.textures.exists('ambientPixel')) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0xffffff);
      gfx.fillRect(0, 0, 2, 2);
      gfx.generateTexture('ambientPixel', 2, 2);
      gfx.destroy();
    }

    this.ambientEmitter = this.add.particles(0, 0, 'ambientPixel', {
      x: { min: 0, max: this.scale.width },
      y: { min: -10, max: this.scale.height * 0.7 },
      speedX: { min: -8, max: -20 },
      speedY: { min: 5, max: 15 },
      scale: { start: 0.6, end: 0 },
      lifespan: { min: 3000, max: 6000 },
      alpha: { start: 0.4, end: 0 },
      frequency: 400,
      quantity: 1,
      emitting: false,
    });
    this.ambientEmitter.setScrollFactor(0).setDepth(-5);
  }

  private createParallaxLayers() {
    const w = this.scale.width;
    const h = this.scale.height;
    const layerConfigs: [RetroRunnerMedia, number][] = [
      [RetroRunnerMedia.LAYER_CLOUDS, -9],
      [RetroRunnerMedia.LAYER_MOUNTAINS, -8],
      [RetroRunnerMedia.LAYER_GRASS_FAR, -7],
      [RetroRunnerMedia.LAYER_GRASS_NEAR, -6],
    ];

    this.parallaxLayers = [];
    for (const [key, depth] of layerConfigs) {
      const layer = this.add.tileSprite(0, 0, w, h, key);
      layer.setOrigin(0, 0).setScrollFactor(0).setDepth(depth);
      layer.displayWidth = w;
      layer.displayHeight = h;
      this.parallaxLayers.push(layer);
    }
  }

  private createCoinAnimation() {
    if (this.anims.exists(RetroRunnerKey.COIN_ANIM)) return;

    this.anims.create({
      key: RetroRunnerKey.COIN_ANIM,
      frames: this.anims.generateFrameNumbers(RetroRunnerMedia.COIN_SPRITE, {
        start: 0,
        end: 3,
      }),
      frameRate: 8,
      repeat: -1,
    });
  }

  private emitDust(count: number = 4) {
    this.dustEmitter.emitParticleAt(
      this.player.x + this.player.displayWidth * 0.5,
      this.player.y,
      count
    );
  }

  private startPlayer() {
    this.player = this.physics.add
      .sprite(50, 100, RetroRunnerKey.RUNNER)
      .setOrigin(0, 1)
      .setCollideWorldBounds(false)
      .setGravityY(400)
      .setState(RetroRunnerStates.RUNNER_STATE_IDLE)
      .setScale(1.6)
      .setDepth(10);

    // Chamfer: shrink hitbox horizontally to prevent ghost collisions on tile seams
    const body = this.player.body;
    const shrinkX = 4;
    body.setSize(this.player.width - shrinkX * 2, this.player.height);
    body.setOffset(shrinkX, 0);
  }

  private startAnimations() {
    // Only create animations once — they persist across scene restarts
    if (this.anims.exists(RetroRunnerKey.WALK_KEY)) return;

    this.anims.create({
      key: RetroRunnerKey.WALK_KEY,
      frames: this.anims.generateFrameNumbers(RetroRunnerKey.RUNNER, {
        start: 9,
        end: 5,
      }),
      frameRate: 12,
      repeat: -1,
    });

    this.anims.create({
      key: RetroRunnerKey.IDLE_KEY,
      frames: this.anims.generateFrameNumbers(RetroRunnerKey.RUNNER, {
        start: 2,
        end: 3,
      }),
      frameRate: 4,
      repeat: -1,
    });

    this.anims.create({
      key: RetroRunnerKey.JUMP_KEY,
      frames: this.anims.generateFrameNumbers(RetroRunnerKey.RUNNER, {
        start: 10,
        end: 6,
      }),
      frameRate: 12,
      repeat: -1,
    });

    this.anims.create({
      key: RetroRunnerKey.DEAD_KEY,
      frames: this.anims.generateFrameNumbers(RetroRunnerKey.RUNNER, {
        start: 17,
        end: 19, // spritesheet has frames 0-19 (20 total), frame 20 doesn't exist
      }),
      frameRate: 12,
      repeat: 1,
    });

    this.anims.create({
      key: RetroRunnerKey.DOWN_KEY,
      frames: this.anims.generateFrameNumbers(RetroRunnerKey.RUNNER, {
        start: 17,
        end: 18,
      }),
      frameRate: 5,
      repeat: 1,
    });
  }

  override update(_time: number, delta: number) {
    if (this.player.state === RetroRunnerStates.RUNNER_STATE_DEAD) return;

    const now = this.time.now;
    const keys = this.keys;

    const isMovingLeft =
      keys['left'].isDown || keys['a'].isDown || this.joystick?.isMovingLeft();
    const isMovingRight =
      keys['right'].isDown || keys['d'].isDown || this.joystick?.isMovingRight();
    const isJumpPressed =
      keys['up'].isDown ||
      keys['w'].isDown ||
      keys['space'].isDown ||
      this.joystick?.isJumping();
    const isCrouching =
      keys['down'].isDown || keys['s'].isDown || this.joystick?.isCrouching();

    const isOnFloor = this.player.body.onFloor() || this.player.body.touching.down;

    // Asymmetric gravity: different feel for rising / apex / falling
    this.actions.applyAsymmetricGravity(this.player, isOnFloor, 400);

    // Speed ramp based on distance
    const distance = Math.max(0, this.player.x - 50);
    const speedMult = Math.min(
      MAX_SPEED_MULTIPLIER,
      BASE_SPEED_MULTIPLIER + (distance / SPEED_RAMP_DISTANCE) * (MAX_SPEED_MULTIPLIER - BASE_SPEED_MULTIPLIER)
    );
    this.actions.setSpeedMultiplier(speedMult);

    // Update coyote/buffer timers
    this.actions.updateTimers(isOnFloor, now);

    // Landing detection with cooldown to prevent flickering
    if (isOnFloor && !this.prevOnFloor && now - this.lastLandTime > 150) {
      this.lastLandTime = now;
      this.emitDust(5);
      // Squash effect on landing — kill any ongoing scale tweens first
      this.tweens.killTweensOf(this.player);
      this.player.setScale(1.8, 1.3);
      this.tweens.add({
        targets: this.player,
        scaleX: 1.6,
        scaleY: 1.6,
        duration: 120,
        ease: 'Back.easeOut',
      });
    }
    this.prevOnFloor = isOnFloor;

    // Jump has PRIORITY — check before movement so crouch never blocks jump
    if (isJumpPressed) {
      this.actions.bufferJump(now);
    }

    const wantsToJump = isJumpPressed || this.actions.hasBufferedJump(now);
    if (wantsToJump && this.actions.canJump(isOnFloor, now)) {
      this.jumpSound.play();
      this.actions.playerJump(this.player);
      this.actions.consumeJumpBuffer();
      this.emitDust(3);
      // Stretch effect on jump — kill conflicting tweens first
      this.tweens.killTweensOf(this.player);
      this.player.setScale(1.4, 1.9);
      this.tweens.add({
        targets: this.player,
        scaleX: 1.6,
        scaleY: 1.6,
        duration: 150,
        ease: 'Sine.easeOut',
      });
    }

    // Variable jump height: releasing jump button cuts upward velocity
    if (!isJumpPressed) {
      this.actions.applyVariableJump(this.player, false);
    }

    // Horizontal movement + crouch (processed after jump so crouch never blocks jumping)
    if (isMovingLeft) {
      this.actions.playerLeft(this.player, isOnFloor, delta);
    } else if (isMovingRight) {
      this.actions.playerRight(this.player, isOnFloor, delta);
    } else if (isCrouching && isOnFloor) {
      this.actions.playerCrouch(this.player);
    } else if (isCrouching && !isOnFloor) {
      this.actions.fastFall(this.player);
    } else {
      this.actions.playerIdle(this.player, isOnFloor, delta);
    }

    // Update difficulty
    const difficulty = this.difficultyManager.getConfig(this.player.x);

    // Biome transition — changes visuals AND generation parameters
    if (difficulty.biome !== this.currentBiome) {
      this.currentBiome = difficulty.biome;
      this.decorationManager.setBiome(difficulty.biome);
      this.transitionBiome(difficulty.biome);
    }

    // Update managers
    const scrollX = this.cameras.main.scrollX;

    this.floorManager.update(scrollX, difficulty, {
      onSegmentCreated: (startX, endX, floorY, isPattern) => {
        // Pattern segments have their own structure — no extra spawning
        // (their internal buildGround() calls already place grass)
        if (isPattern) return;

        this.obstacleManager.trySpawnObstacle(startX, endX, floorY, difficulty.obstacleChance);
        this.coinManager.trySpawnCoins(startX, endX, floorY, difficulty.coinChance);
        this.decorationManager.spawnOnSegment(startX, endX, floorY);
        // Collapsing platforms — appear from FOREST biome onward
        if (difficulty.obstacleChance >= 0.08) {
          this.collapsingManager.trySpawn(startX, endX, floorY, difficulty.obstacleChance * 0.5);
        }
      },
      onGapCreated: (startX, endX, floorY) => {
        this.coinManager.spawnArcCoins(startX, endX, floorY);
      },
      onDualPathCreated: (info: DualPathInfo) => {
        // Build exclusion zones from elevated platforms (prevent decoration overlap)
        const exclusions = info.elevatedPlatforms.map(p => ({ x: p.x - 20, width: 104 }));

        // Ground path: obstacle + decorations (with exclusion zones)
        const midX = info.groundStartX + (info.groundEndX - info.groundStartX) * 0.3;
        this.obstacleManager.trySpawnObstacle(
          midX, info.groundEndX, info.groundFloorY, 0.6
        );
        this.decorationManager.spawnOnSegment(
          info.groundStartX, info.groundEndX, info.groundFloorY, exclusions
        );

        // Elevated path: coins on each platform (reward for taking the risk)
        for (const plat of info.elevatedPlatforms) {
          const platSurface = plat.y - 16;
          this.coinManager.trySpawnCoins(plat.x, plat.x + 64, platSurface, 0.9);
        }
      },
    });

    this.obstacleManager.update(scrollX);
    this.coinManager.update(scrollX);
    this.decorationManager.update(scrollX);
    this.collapsingManager.updateBlocks(now, scrollX);
    this.scoreManager.update(this.player.x);

    // Parallax background scroll
    this.background.tilePositionX = scrollX * 0.05;
    this.background.displayWidth = this.scale.width;
    this.background.displayHeight = this.scale.height;

    // Parallax layers at different speeds
    const speeds = [0.08, 0.15, 0.25, 0.35];
    for (let i = 0; i < this.parallaxLayers.length; i++) {
      this.parallaxLayers[i].tilePositionX = scrollX * speeds[i];
    }

    // Player fell off screen
    if (this.player.y >= this.scale.height) {
      if (this.jumpSound.isPlaying) {
        this.jumpSound.stop();
      }
      this.handlePlayerDied();
    }
  }

  private transitionBiome(biome: BiomeType) {
    const tints: Record<BiomeType, number> = {
      [BiomeType.PLAINS]: 0xffffff,
      [BiomeType.FOREST]: 0xbbddaa,
      [BiomeType.DUSK]: 0xeebb88,
    };

    const tint = tints[biome];

    // Configure ambient particles per biome
    this.configureAmbientParticles(biome);

    // Create a flash overlay for smooth transition
    const flash = this.add.rectangle(
      0, 0, this.scale.width, this.scale.height, 0xffffff
    ).setOrigin(0, 0).setScrollFactor(0).setDepth(200).setAlpha(0);

    this.tweens.add({
      targets: flash,
      alpha: { from: 0, to: 0.3 },
      duration: 500,
      yoyo: true,
      onYoyo: () => {
        this.background.setTint(tint);
        for (const layer of this.parallaxLayers) {
          layer.setTint(tint);
        }
      },
      onComplete: () => flash.destroy(),
    });
  }

  private configureAmbientParticles(biome: BiomeType) {
    switch (biome) {
      case BiomeType.PLAINS:
        // Subtle — almost nothing, just faint sparkles
        this.ambientEmitter.setConfig({
          frequency: 800,
          quantity: 1,
          lifespan: { min: 2000, max: 4000 },
          speedX: { min: -5, max: 5 },
          speedY: { min: 3, max: 8 },
          alpha: { start: 0.2, end: 0 },
          tint: 0xffffee,
          emitting: true,
        });
        break;

      case BiomeType.FOREST:
        // Falling leaves — more particles, drifting sideways
        this.ambientEmitter.setConfig({
          frequency: 300,
          quantity: 1,
          lifespan: { min: 4000, max: 7000 },
          speedX: { min: -25, max: -8 },
          speedY: { min: 8, max: 20 },
          alpha: { start: 0.5, end: 0 },
          tint: 0x88cc55,
          emitting: true,
        });
        break;

      case BiomeType.DUSK:
        // Ash / embers — warm tones, rising slowly
        this.ambientEmitter.setConfig({
          frequency: 250,
          quantity: 1,
          lifespan: { min: 3000, max: 5000 },
          speedX: { min: -10, max: 10 },
          speedY: { min: -12, max: -3 },
          alpha: { start: 0.45, end: 0 },
          tint: 0xff8844,
          emitting: true,
        });
        break;
    }
  }

  private handlePlayerHitObstacle() {
    if (this.player.state === RetroRunnerStates.RUNNER_STATE_DEAD) return;
    this.handlePlayerDied();
  }

  private handlePlayerDied() {
    this.player.setState(RetroRunnerStates.RUNNER_STATE_DEAD);
    this.player.anims.play(RetroRunnerKey.DEAD_KEY);
    this.player.setCollideWorldBounds(false);
    this.player.setVelocityX(0);


    // Camera shake for impact feedback
    this.cameras.main.shake(200, 0.01);

    // Player blink effect
    this.tweens.add({
      targets: this.player,
      alpha: { from: 1, to: 0.2 },
      duration: 80,
      yoyo: true,
      repeat: 3,
    });

    this.time.delayedCall(150, () => {
      this.player.setVelocityY(-350);
    });

    const finalScore = this.scoreManager.getScore();

    this.time.delayedCall(
      400,
      () => {
        this.scene.launch(SceneKeys.GAME_OVER, { score: finalScore, seed: this.rng.seedKey });
      },
      [],
      this
    );
  }

}
