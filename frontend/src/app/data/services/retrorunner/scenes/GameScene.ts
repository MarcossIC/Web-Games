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
import GameBackgroundManager from '@app/data/services/retrorunner/utils/GameBackgroundManager';
import GameFloorManager from '@app/data/services/retrorunner/utils/GameFloorManager';
import { PlayerActions } from '@app/data/services/retrorunner/utils/PlayerActions';
import { Scene, Physics, GameObjects } from 'phaser';

export class GameScene extends Scene {
  public floor!: Physics.Arcade.StaticGroup;
  public player!: PhaserPlayerWithBody;
  private keys!: any;
  public background!: GameObjects.TileSprite;
  public jumpSound!: PhaserSound;

  protected isJumping!: boolean;
  protected isCrouching!: boolean;
  protected isMovingLeft!: boolean;
  protected isMovingRight!: boolean;

  public actions!: PlayerActions;
  public backgroundManager!: GameBackgroundManager;
  public floorManager!: GameFloorManager;

  constructor() {
    super(SceneKeys.GAME);
  }

  private startPlayer() {
    this.player = this.physics.add
      .sprite(50, 100, RetroRunnerKey.RUNNER)
      .setOrigin(0, 1)
      .setCollideWorldBounds(true)
      .setGravityY(300)
      .setState(RetroRunnerStates.RUNNER_STATE_IDLE);
  }

  init() {
    this.actions = new PlayerActions();
    this.backgroundManager = new GameBackgroundManager();
    this.floorManager = new GameFloorManager();
    this.isJumping = false;
    this.isCrouching = false;
    this.isMovingLeft = false;
    this.isMovingRight = false;
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
    this.backgroundManager.scaleBackground(
      this.background,
      this.textures.get(RetroRunnerMedia.NATURA_BACKGROUND).getSourceImage(),
      this.scale
    );
    this.initFloor();
    this.startPlayer();
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

    this.createMobileControls();

    EventBus.emit(SceneKeys.SCENE_READY, this);
  }

  private initFloor() {
    this.floor = this.physics.add.staticGroup();
    const floorSizeY = this.scale.height - 16;
    this.floorManager.initFloor(this.floor, floorSizeY);
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

  createMobileControls() {
    const radioButton = 17;
    const buttonSpacing = -1;
    const buttonVericalX = this.scale.width - 55;
    const buttonHorizontalY = this.scale.height - 60;

    const buttonJumpY = buttonHorizontalY - radioButton * 2 - buttonSpacing;

    const buttonLextX = buttonVericalX - radioButton * 2 - buttonSpacing;

    const buttonCrouchY = buttonHorizontalY + radioButton * 2 + buttonSpacing;

    const buttonRightX = buttonVericalX + radioButton * 2 + buttonSpacing;

    // Botón de salto
    let jumpButton = this.add
      .circle(buttonVericalX, buttonJumpY, radioButton, 0xffff41, 0.5)
      .setInteractive()
      .on('pointerdown', () => (this.isJumping = true))
      .on('pointerup', () => (this.isJumping = false))
      .on('pointerout', () => (this.isJumping = false));

    // Botón de agacharse
    let crouchButton = this.add
      .circle(buttonVericalX, buttonCrouchY, radioButton, 0x0bb80b, 0.5)
      .setInteractive()
      .on('pointerdown', () => (this.isCrouching = true))
      .on('pointerup', () => (this.isCrouching = false))
      .on('pointerout', () => (this.isCrouching = false));

    // Botón de mover a la izquierda
    let leftButton = this.add
      .circle(buttonLextX, buttonHorizontalY, radioButton, 0x2424f5, 0.5)

      .setInteractive()
      .on('pointerdown', () => (this.isMovingLeft = true))
      .on('pointerup', () => (this.isMovingLeft = false))
      .on('pointerout', () => (this.isMovingLeft = false));

    // Botón de mover a la derecha
    let rightButton = this.add
      .circle(buttonRightX, buttonHorizontalY, radioButton, 0xf11c1c, 0.5)
      .setInteractive()
      .on('pointerdown', () => (this.isMovingRight = true))
      .on('pointerup', () => (this.isMovingRight = false))
      .on('pointerout', () => (this.isMovingRight = false));

    // Ajustar la posición de los botones según sea necesario
    jumpButton.setScrollFactor(0);
    crouchButton.setScrollFactor(0);
    leftButton.setScrollFactor(0);
    rightButton.setScrollFactor(0);

    // Agregar texto en el centro de cada botón
    this.add
      .text(buttonVericalX, buttonJumpY, 'W', {
        fontSize: '20px',
        color: '#000000',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.add
      .text(buttonVericalX, buttonCrouchY, 'S', {
        fontSize: '20px',
        color: '#000000',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.add
      .text(buttonLextX, buttonHorizontalY, 'A', {
        fontSize: '20px',
        color: '#000000',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.add
      .text(buttonRightX, buttonHorizontalY, 'D', {
        fontSize: '20px',
        color: '#000000',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
  }

  override update() {
    if (this.player.state === RetroRunnerStates.RUNNER_STATE_DEAD) return;
    const keys = this.keys;

    if (keys.left.isDown || keys.a.isDown || this.isMovingLeft) {
      this.actions.playerLeft(this.player);
    } else if (keys.right.isDown || keys.d.isDown || this.isMovingRight) {
      this.actions.playerRight(this.player);
    } else if (
      (keys.down.isDown || keys.s.isDown || this.isCrouching) &&
      this.player.body.onFloor()
    ) {
      this.actions.playerCrouch(this.player);
    } else if (
      (keys.down.isDown || keys.s.isDown || this.isCrouching) &&
      !this.player.body.onFloor()
    ) {
      this.actions.fastFall(this.player);
    } else {
      this.actions.playerStandup(this.player);
    }
    if (
      (keys.up.isDown ||
        keys.w.isDown ||
        keys.space.isDown ||
        this.isJumping) &&
      this.player.body.touching.down
    ) {
      this.jumpSound.play();
      this.actions.playerJump(this.player);
    }

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
