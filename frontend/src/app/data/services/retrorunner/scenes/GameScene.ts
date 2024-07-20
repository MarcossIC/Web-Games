import { AxisTypeArray } from '@app/data/models/Axis';
import {
  PlatformType,
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
import GameBackgroundManager from '@app/data/services/retrorunner/utils/GameBackgroundManager';
import GameFloorManager from '@app/data/services/retrorunner/utils/GameFloorManager';
import Joystick from '@app/data/services/retrorunner/utils/JoyStick';
import { PlayerActions } from '@app/data/services/retrorunner/utils/PlayerActions';
import { Scene, Physics, GameObjects } from 'phaser';

export class GameScene extends Scene {
  public floor!: Physics.Arcade.StaticGroup;
  public player!: PhaserPlayerWithBody;
  private keys!: any;
  public background!: GameObjects.TileSprite;
  public jumpSound!: PhaserSound;

  public actions!: PlayerActions;
  public backgroundManager!: GameBackgroundManager;
  public floorManager!: GameFloorManager;
  public joystick!: Joystick;

  constructor() {
    super(SceneKeys.GAME);
  }

  init() {
    this.actions = new PlayerActions();
    this.backgroundManager = new GameBackgroundManager();
    this.floorManager = new GameFloorManager();
    this.background = this.add.tileSprite(
      0,
      0,
      this.scale.width,
      this.scale.height,
      RetroRunnerMedia.NATURA_BACKGROUND
    );
    this.background.setOrigin(0, 0).setScale(1);

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
      this.textures.get(RetroRunnerMedia.NATURA_BACKGROUND).getSourceImage(),
      this.scale
    );
    this.physics.enableUpdate();
    this.startPlayer();
    this.initFloor();
    this.startAnimations();

    this.physics.world.setBounds(0, 0, 2000, this.scale.height);
    this.physics.add.collider(this.player, this.floor);

    this.cameras.main.setBounds(0, 0, 2000, this.scale.height);
    this.cameras.main.startFollow(this.player);

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
    })!;

    EventBus.emit(SceneKeys.SCENE_READY, this);
  }

  private startPlayer() {
    this.player = this.physics.add
      .sprite(50, 100, RetroRunnerKey.RUNNER)
      .setOrigin(0, 1)
      .setCollideWorldBounds(true)
      .setGravityY(400)
      .setState(RetroRunnerStates.RUNNER_STATE_IDLE)
      .setScale(1.6, 1.6);
  }

  private initFloor() {
    this.floor = this.physics.add.staticGroup();
    const floorStartDY = this.scale.height - 16;
    this.floorManager.createWorld(this.floor, floorStartDY);

    this.floor.world.checkCollision.down = true;
    this.floor.world.checkCollision.up = true;
    this.floor.world.checkCollision.left = true;
    this.floor.world.checkCollision.right = true;
  }

  private startAnimations() {
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
        end: 20,
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

  override update() {
    if (this.player.state === RetroRunnerStates.RUNNER_STATE_DEAD) return;
    const keys = this.keys;
    const isMovingLeft =
      keys.left.isDown || keys.a.isDown || this.joystick?.isMovingLeft();

    const isMovingRight =
      keys.right.isDown || keys.d.isDown || this.joystick?.isMovingRight();
    const isJumping =
      keys.up.isDown ||
      keys.w.isDown ||
      keys.space.isDown ||
      this.joystick?.isJumping();
    const isCrouching =
      keys.down.isDown || keys.s.isDown || this.joystick?.isCrouching();

    if (isMovingLeft) {
      this.actions.playerLeft(this.player);
    } else if (isMovingRight) {
      this.actions.playerRight(this.player);
    } else if (isCrouching && this.player.body.onFloor()) {
      this.actions.playerCrouch(this.player);
    } else if (isCrouching && !this.player.body.onFloor()) {
      this.actions.fastFall(this.player);
    } else {
      this.actions.playerStandup(this.player);
    }
    if (isJumping && this.player.body.touching.down) {
      this.jumpSound.play();
      this.actions.playerJump(this.player);
    }
    this.physics.collide(this.player, this.floor);
    this.background.displayWidth = this.scale.width;
    this.background.displayHeight = this.scale.height;
    if (this.player.y >= this.scale.height) {
      if (this.jumpSound.isPlaying) {
        this.jumpSound.stop();
      }
      this.handlePlayerDied();
    }
  }

  private handlePlayerDied() {
    this.player.setState(RetroRunnerStates.RUNNER_STATE_DEAD);
    this.player.anims.play(RetroRunnerKey.DEAD_KEY);
    this.player.setCollideWorldBounds(false);

    setTimeout(() => {
      this.player.setVelocityY(-350);
    }, 100);

    this.time.delayedCall(
      200,
      () => {
        this.scene.launch(SceneKeys.GAME_OVER);
      },
      [],
      this
    );
  }
}
