import * as Phaser from 'phaser';
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
import { RESTART_HOLD_MS, RunnerEvents, SceneKeys } from '@app/data/services/retrorunner/main';
import { BiomeType } from '@app/data/services/retrorunner/generation/chunk-plan';
import { biomeAt, speedMultiplierAt } from '@app/data/services/retrorunner/generation/difficulty-curve';
import { BASE_WALK_SPEED, PLAYER_GRAVITY } from '@app/data/services/retrorunner/generation/jump-model';
import { WorldGenerator } from '@app/data/services/retrorunner/generation/world-generator';
import CoinManager from '@app/data/services/retrorunner/utils/CoinManager';
import CollapsingPlatformManager from '@app/data/services/retrorunner/utils/CollapsingPlatformManager';
import DecorationManager from '@app/data/services/retrorunner/utils/DecorationManager';
import GameBackgroundManager from '@app/data/services/retrorunner/utils/GameBackgroundManager';
import Joystick from '@app/data/services/retrorunner/utils/JoyStick';
import ObstacleManager from '@app/data/services/retrorunner/utils/ObstacleManager';
import { PlayerActions } from '@app/data/services/retrorunner/utils/PlayerActions';
import ScoreManager from '@app/data/services/retrorunner/utils/ScoreManager';
import SeededRandom from '@app/data/services/retrorunner/utils/SeededRandom';
import { followScroll, lerpForDelta } from '@app/data/services/retrorunner/utils/camera-smoothing';
import PlayerView from '@app/data/services/retrorunner/utils/PlayerView';
import WorldBuilder from '@app/data/services/retrorunner/utils/WorldBuilder';
import HoldBar from '@app/data/services/retrorunner/utils/HoldBar';
import { HoldToConfirm, isFreshPress } from '@app/data/services/retrorunner/utils/hold-to-confirm';
import { Scene, GameObjects } from 'phaser';

// How fast the camera catches up with the player, tuned at 60 fps.
const CAMERA_LERP = 0.1;
// Width of the band in the middle of the screen where the player moves
// without dragging the camera along.
const CAMERA_DEADZONE = 80;
// How much each parallax layer moves per pixel of camera scroll.
const PARALLAX_SPEEDS = [0.08, 0.15, 0.25, 0.35];
// Chunks left behind are released once per this many pixels of scroll,
// not on every frame: nothing visible depends on when it happens.
const RECYCLE_EVERY_PX = 64;

export class GameScene extends Scene {
  public player!: PhaserPlayerWithBody;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  public background!: GameObjects.TileSprite;
  public jumpSound!: PhaserSound;

  public actions!: PlayerActions;
  public backgroundManager!: GameBackgroundManager;
  /** The world: planned from the seed alone, built from the plans. */
  public world!: WorldBuilder;
  public joystick!: Joystick;
  public scoreManager!: ScoreManager;
  public obstacleManager!: ObstacleManager;
  public coinManager!: CoinManager;
  public decorationManager!: DecorationManager;
  public collapsingManager!: CollapsingPlatformManager;

  private floorY!: number;
  private dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private ambientEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private prevOnFloor: boolean = false;
  private parallaxLayers: GameObjects.TileSprite[] = [];
  private lastLandTime: number = 0;
  private currentBiome: BiomeType = BiomeType.PLAINS;
  private lastRecycleX: number = 0;
  /** What the player sees of the capybara; `player` is its hidden body. */
  private playerView!: PlayerView;
  /** The camera position with decimals; it is drawn at its rounding. */
  private cameraX: number = 0;
  /** How long the current frame took, for the work done before drawing. */
  private frameDelta: number = 0;
  /** Holding R throws the run away and starts one with a new seed. */
  private restartHold!: HoldToConfirm;
  private restartBar!: HoldBar;
  /** The R down now was pressed in this run, not held from the last one. */
  private restartPressFresh = false;
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

    // Score
    this.scoreManager = new ScoreManager(this, this.player.x);
    this.scoreManager.createHUD();

    // What the world places and takes back
    this.decorationManager = new DecorationManager(this);
    this.obstacleManager = new ObstacleManager(this);
    this.coinManager = new CoinManager(this, this.scoreManager);
    this.collapsingManager = new CollapsingPlatformManager(this);

    // The world. Everything in it comes from the seed: the generator plans
    // each chunk from it, the builder only draws the plans.
    this.floorY = this.scale.height - 16;
    this.world = new WorldBuilder(
      this,
      new WorldGenerator({ key: this.rng.seedKey, floorY: this.floorY }),
      {
        stones: this.obstacleManager,
        coins: this.coinManager,
        decoration: this.decorationManager,
        bridges: this.collapsingManager,
      }
    );
    this.world.fillAhead(0);

    // Animations
    this.startAnimations();
    this.createCoinAnimation();

    // Physics world
    this.physics.world.setBounds(0, 0, Number.MAX_SAFE_INTEGER, this.scale.height);

    // Colliders
    this.physics.add.collider(this.player, this.world.floor);
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
    // The camera is moved by hand in placeCamera(), on whole pixels.
    this.cameraX = 0;
    this.frameDelta = 0;
    this.events.on(Phaser.Scenes.Events.PRE_RENDER, this.placeCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.PRE_RENDER, this.placeCamera, this);
    });

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
      r: Phaser.Input.Keyboard.KeyCodes.R,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    // Pause: Esc or P here; while paused this scene hears nothing, so the
    // pause screen reads them. A key held down repeats: only a new press
    // counts, or holding P would pause and resume over and over.
    const onPauseKey = (event: KeyboardEvent) => {
      if (!event.repeat) this.togglePause();
    };
    this.input.keyboard?.on('keydown-ESC', onPauseKey);
    this.input.keyboard?.on('keydown-P', onPauseKey);
    this.restartHold = new HoldToConfirm(RESTART_HOLD_MS);
    this.restartBar = new HoldBar(this, this.scale.width / 2, 30, 'Restart');
    this.restartPressFresh = false;
    this.keys['r'].on(Phaser.Input.Keyboard.Events.DOWN, (_key: unknown, event: KeyboardEvent) => {
      this.restartPressFresh = isFreshPress(event);
    });

    // The page's pause button and the pause screen ask through the EventBus.
    EventBus.on(RunnerEvents.TOGGLE_PAUSE, this.togglePause, this);
    EventBus.on(RunnerEvents.RESTART, this.restartWithNewSeed, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(RunnerEvents.TOGGLE_PAUSE, this.togglePause, this);
      EventBus.off(RunnerEvents.RESTART, this.restartWithNewSeed, this);
    });


    this.prevOnFloor = false;
    this.lastRecycleX = 0;

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
      .setGravityY(PLAYER_GRAVITY)
      .setState(RetroRunnerStates.RUNNER_STATE_IDLE)
      .setScale(1.6)
      .setDepth(10);

    // Chamfer: shrink hitbox horizontally to prevent ghost collisions on tile seams
    const body = this.player.body;
    const shrinkX = 4;
    body.setSize(this.player.width - shrinkX * 2, this.player.height);
    body.setOffset(shrinkX, 0);

    this.playerView = new PlayerView(this, this.player);
  }

  /**
   * Runs right before each frame is drawn, once physics has moved the
   * player: follows it with the camera and places what scrolls with it.
   *
   * The camera only ever sits on whole pixels. The picture is small and
   * enlarged, so each object is drawn on whole pixels anyway; with the
   * camera between two of them, each object rounds on its own and the
   * scenery shivers as it scrolls.
   */
  private placeCamera() {
    // A paused scene is still drawn: the camera stays where the run stopped.
    if (this.sys.isPaused()) return;
    const camera = this.cameras.main;
    this.cameraX = followScroll(
      this.cameraX,
      this.player.x,
      this.scale.width,
      CAMERA_DEADZONE,
      lerpForDelta(CAMERA_LERP, this.frameDelta)
    );
    const scrollX = Math.round(this.cameraX);
    camera.scrollX = scrollX;

    this.playerView.sync(this.cameraX, scrollX);

    this.background.tilePositionX = scrollX * 0.05;
    for (let i = 0; i < this.parallaxLayers.length; i++) {
      this.parallaxLayers[i].tilePositionX = scrollX * PARALLAX_SPEEDS[i];
    }
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

    // There is no jump animation: in the air PlayerActions holds one frame
    // chosen by the vertical speed.

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
    this.frameDelta = delta;
    if (this.player.state === RetroRunnerStates.RUNNER_STATE_DEAD) return;

    const now = this.time.now;
    const keys = this.keys;

    if (this.restartHold.update(keys['r'].isDown && this.restartPressFresh, delta)) {
      this.restartWithNewSeed();
      return;
    }
    this.restartBar.setProgress(this.restartHold.progress);

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
    this.actions.applyAsymmetricGravity(this.player, isOnFloor, PLAYER_GRAVITY);

    // The player gets faster with the distance; the world is planned for it.
    const speedMultiplier = speedMultiplierAt(this.player.x);
    this.actions.setSpeedMultiplier(speedMultiplier);

    // Update coyote/buffer timers
    this.actions.updateTimers(isOnFloor, now);

    // Landing detection with cooldown to prevent flickering
    if (isOnFloor && !this.prevOnFloor && now - this.lastLandTime > 150) {
      this.lastLandTime = now;
      this.emitDust(5);
      // Squash on landing: wider and shorter, then it springs back.
      this.playerView.squash(1.125, 0.8, 140, 'Back.easeOut');
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
      // Stretch on take-off: thinner and taller.
      this.playerView.squash(0.875, 1.19, 150, 'Sine.easeOut');
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

    this.actions.updateAnimation(this.player, isOnFloor, now);

    // Biome transition: only the sky and particles follow the player. The
    // world's biome comes from each chunk's own position.
    const biome = biomeAt(this.player.x);
    if (biome !== this.currentBiome) {
      this.currentBiome = biome;
      this.transitionBiome(biome);
    }

    // Update managers
    const scrollX = this.cameras.main.scrollX;

    this.world.fillAhead(scrollX);

    if (scrollX - this.lastRecycleX >= RECYCLE_EVERY_PX) {
      this.lastRecycleX = scrollX;
      this.world.releaseBehind(scrollX);
    }
    this.collapsingManager.updateBlocks(now);
    // Keeping the running speed of the place is the rhythm the score rewards.
    this.scoreManager.update(this.player.x, delta, BASE_WALK_SPEED * speedMultiplier);


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

  /**
   * Pauses the run, or resumes it. Once the player is dead there is nothing
   * to pause: the game over screen is coming.
   */
  togglePause() {
    if (this.player.state === RetroRunnerStates.RUNNER_STATE_DEAD) return;
    if (this.scene.isPaused()) {
      this.scene.stop(SceneKeys.PAUSE);
      this.scene.resume();
    } else {
      this.scene.pause();
      this.scene.launch(SceneKeys.PAUSE);
    }
  }

  /** Throws the run away and starts a new one, with a new seed. */
  restartWithNewSeed() {
    if (this.jumpSound.isPlaying) this.jumpSound.stop();
    this.scene.stop(SceneKeys.PAUSE);
    this.scene.restart({ seed: undefined });
  }

  private handlePlayerHitObstacle() {
    if (this.player.state === RetroRunnerStates.RUNNER_STATE_DEAD) return;
    this.handlePlayerDied();
  }

  private handlePlayerDied() {
    this.player.setState(RetroRunnerStates.RUNNER_STATE_DEAD);
    this.player.anims.timeScale = 1;
    this.player.anims.play(RetroRunnerKey.DEAD_KEY);
    this.player.setCollideWorldBounds(false);
    this.player.setVelocityX(0);


    // Camera shake for impact feedback
    this.cameras.main.shake(200, 0.01);

    this.playerView.blink();

    this.time.delayedCall(150, () => {
      this.player.setVelocityY(-350);
    });

    const run = this.scoreManager.getSummary();

    this.time.delayedCall(
      400,
      () => {
        this.scene.launch(SceneKeys.GAME_OVER, { run, seed: this.rng.seedKey });
      },
      [],
      this
    );
  }

}
