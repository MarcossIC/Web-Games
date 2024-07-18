import {
  RetroRunnerKey,
  RetroRunnerMedia,
  RetroRunnerStates,
} from '@app/data/models/retro-runner/RetroRunnerKeys';
import { EventBus } from '@app/data/services/phaser/EventBus';
import { SceneKeys } from '@app/data/services/retrorunner/main';
import { Scene, Types, Physics, GameObjects } from 'phaser';

export class GameScene extends Scene {
  public floor!: Physics.Arcade.StaticGroup;
  public player!: any;
  private keys!: any;
  private overlay!: GameObjects.Graphics;
  private gameOverText!: GameObjects.Text;
  private gameOverTextContainer!: GameObjects.Container;

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

  create() {
    this.add
      .image(100, 50, RetroRunnerMedia.CLOUD_DEFAULT)
      .setOrigin(0, 0)
      .setScale(0.15);

    this.initFloor();
    this.startPlayer();

    this.startAnimations();

    this.physics.world.setBounds(0, 0, 2000, SceneKeys.HEIGHT);
    this.physics.add.collider(this.player, this.floor);

    this.cameras.main.setBounds(0, 0, 2000, SceneKeys.HEIGHT);
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

  private initFloor() {
    this.floor = this.physics.add.staticGroup();

    this.floor
      .create(0, SceneKeys.HEIGHT - 16, RetroRunnerMedia.FLOORBRICKS_DEFAULT)
      .setOrigin(0, 0.5)
      .refreshBody();

    this.floor
      .create(150, SceneKeys.HEIGHT - 16, RetroRunnerMedia.FLOORBRICKS_DEFAULT)
      .setOrigin(0, 0.5)
      .refreshBody();
  }

  private startAnimations() {
    this.anims.create({
      key: RetroRunnerKey.WALK_KEY,
      frames: this.anims.generateFrameNumbers(RetroRunnerKey.RUNNER, {
        start: 1,
        end: 3,
      }),
      frameRate: 12,
      repeat: -1,
      defaultTextureKey: '',
    });

    this.anims.create({
      key: RetroRunnerKey.IDLE_KEY,
      frames: [{ key: RetroRunnerKey.RUNNER, frame: 0 }],
    });

    this.anims.create({
      key: RetroRunnerKey.JUMP_KEY,
      frames: [{ key: RetroRunnerKey.RUNNER, frame: 5 }],
    });

    this.anims.create({
      key: RetroRunnerKey.DEAD_KEY,
      frames: [{ key: RetroRunnerKey.RUNNER, frame: 4 }],
    });
  }

  override update() {
    const keys = this.keys;
    if (this.player.state === RetroRunnerStates.RUNNER_STATE_DEAD) return;

    if (keys.left.isDown || keys.a.isDown) {
      this.player.setState(RetroRunnerStates.RUNNER_STATE_WALK);
      this.player.anims.play(RetroRunnerKey.WALK_KEY, true);
      this.player.x -= 2;
      this.player.flipX = true;
    } else if (keys.right.isDown || keys.d.isDown) {
      this.player.setState(RetroRunnerStates.RUNNER_STATE_WALK);
      this.player.anims.play(RetroRunnerKey.WALK_KEY, true);
      this.player.x += 2;
      this.player.flipX = false;
    } else {
      this.player.setState(RetroRunnerStates.RUNNER_STATE_IDLE);
      this.player.anims.play(RetroRunnerKey.IDLE_KEY, true);
    }
    if (
      (keys.up.isDown || keys.w.isDown || keys.space.isDown) &&
      this.player.body.touching.down
    ) {
      this.player.setVelocityY(-300);
      this.player.setState(RetroRunnerStates.RUNNER_STATE_JUMP);
      this.player.anims.play(RetroRunnerKey.JUMP_KEY, true);
    }

    if (this.player.y >= SceneKeys.HEIGHT) {
      this.handlePlayerDeath();
    }
  }

  private handlePlayerDeath() {
    this.player.setState(RetroRunnerStates.RUNNER_STATE_DEAD);
    this.player.anims.play(RetroRunnerKey.DEAD_KEY);
    this.player.setCollideWorldBounds(false);
    const sound = this.sound.add(RetroRunnerMedia.GAMEOVER_SOUND, {
      volume: 0.2,
    });
    sound.play();

    // Añadir overlay
    this.overlay = this.add.graphics();
    this.overlay.fillStyle(0x000000, 0.5);
    this.overlay.fillRect(
      this.cameras.main.scrollX,
      this.cameras.main.scrollY,
      this.cameras.main.width + 30,
      this.cameras.main.height
    );

    // Añadir texto
    const textBackground = this.add.graphics();
    textBackground.fillStyle(0x000000, 0.8);
    textBackground.fillRect(
      this.cameras.main.scrollX,
      this.cameras.main.scrollY + this.cameras.main.height / 2 - 30,
      this.cameras.main.width + 30,
      60
    );

    const gameOverText = this.add
      .text(
        this.cameras.main.scrollX + this.cameras.main.width / 2,
        this.cameras.main.scrollY + this.cameras.main.height / 2,
        'You died',
        {
          fontSize: '48px',
          color: '#ee3131',
        }
      )
      .setOrigin(0.5, 0.5);

    this.gameOverTextContainer = this.add.container(0, 0);
    this.gameOverTextContainer.add([textBackground, gameOverText]);

    setTimeout(() => {
      this.player.setVelocityY(-350);
    }, 100);
    // Reiniciar escena después de 2 segundos
    this.time.delayedCall(
      2350,
      () => {
        sound.stop();
        this.scene.restart();
      },
      [],
      this
    );
  }

  shutdown() {
    if (this.overlay) {
      this.overlay.destroy();
    }
    if (this.gameOverText) {
      this.gameOverText.destroy();
    }
  }
}
