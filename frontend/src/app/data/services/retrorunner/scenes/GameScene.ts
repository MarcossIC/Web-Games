import {
  RetroRunnerKey,
  RetroRunnerMedia,
  RetroRunnerStates,
} from '@app/data/models/retro-runner/RetroRunnerKeys';
import { EventBus } from '@app/data/services/phaser/EventBus';
import { SceneKeys } from '@app/data/services/retrorunner/main';
import { Scene, Sound, Physics, GameObjects } from 'phaser';

export class GameScene extends Scene {
  public floor!: Physics.Arcade.StaticGroup;
  public player!: any;
  private keys!: any;
  public background!: GameObjects.TileSprite;
  public jumpSound!:
    | Sound.NoAudioSound
    | Sound.HTML5AudioSound
    | Sound.WebAudioSound;

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
  scaleBackground() {
    // Obtener dimensiones de la imagen de fondo
    const bgWidth = this.textures
      .get(RetroRunnerMedia.NATURA_BACKGROUND)
      .getSourceImage().width;
    const bgHeight = this.textures
      .get(RetroRunnerMedia.NATURA_BACKGROUND)
      .getSourceImage().height;

    // Calcular la escala
    const scaleX = this.scale.width / bgWidth;
    const scaleY = this.scale.height / bgHeight;
    const scale = Math.max(scaleX, scaleY);

    // Ajustar la escala del fondo
    this.background.setScale(scale).setScrollFactor(0);

    // Ajustar el tamaño del tileSprite para cubrir toda la pantalla
    this.background.displayWidth = this.scale.width;
    this.background.displayHeight = SceneKeys.HEIGHT;
  }

  create() {
    this.scaleBackground();

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
    let floorSizeX = 0;
    this.floor
      .create(
        floorSizeX,
        SceneKeys.HEIGHT - 16,
        RetroRunnerMedia.FLOORGRASS_START,
        1
      )
      .setOrigin(0, 0.5)
      .refreshBody();
    floorSizeX += 81;
    this.floor
      .create(
        floorSizeX,
        SceneKeys.HEIGHT - 16,
        RetroRunnerMedia.FLOORGRASS_CENTER,
        1
      )
      .setOrigin(0, 0.5)
      .refreshBody();

    floorSizeX += 65;
    this.floor
      .create(
        floorSizeX,
        SceneKeys.HEIGHT - 16,
        RetroRunnerMedia.FLOORGRASS_CENTER,
        1
      )
      .setOrigin(0, 0.5)
      .refreshBody();
    floorSizeX += 65;
    this.floor
      .create(
        floorSizeX,
        SceneKeys.HEIGHT - 16,
        RetroRunnerMedia.FLOORGRASS_CENTER,
        1
      )
      .setOrigin(0, 0.5)
      .refreshBody();
    floorSizeX += 65;
    this.floor
      .create(
        floorSizeX,
        SceneKeys.HEIGHT - 16,
        RetroRunnerMedia.FLOORGRASS_CENTER,
        1
      )
      .setOrigin(0, 0.5)
      .refreshBody();
    floorSizeX += 65;
    this.floor
      .create(
        floorSizeX,
        SceneKeys.HEIGHT - 16,
        RetroRunnerMedia.FLOORGRASS_END,
        1
      )
      .setOrigin(0, 0.5)
      .refreshBody();
    floorSizeX += 100;
    this.floor
      .create(
        floorSizeX,
        SceneKeys.HEIGHT - 16,
        RetroRunnerMedia.FLOORGRASS_START,
        1
      )
      .setOrigin(0, 0.5)
      .refreshBody();
    floorSizeX += 81;
    this.floor
      .create(
        floorSizeX,
        SceneKeys.HEIGHT - 16,
        RetroRunnerMedia.FLOORGRASS_CENTER,
        1
      )
      .setOrigin(0, 0.5)
      .refreshBody();
    floorSizeX += 65;
    this.floor
      .create(
        floorSizeX,
        SceneKeys.HEIGHT - 16,
        RetroRunnerMedia.FLOORGRASS_END,
        1
      )
      .setOrigin(0, 0.5)
      .refreshBody();
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
  }

  override update() {
    if (this.player.state === RetroRunnerStates.RUNNER_STATE_DEAD) return;
    const keys = this.keys;

    if (keys.left.isDown || keys.a.isDown) {
      if (this.player.state !== RetroRunnerStates.RUNNER_STATE_JUMP) {
        this.player.setState(RetroRunnerStates.RUNNER_STATE_WALK);
        this.player.anims.play(RetroRunnerKey.WALK_KEY, true);
      }

      this.player.x -= 2;
      this.player.flipX = false;
    } else if (keys.right.isDown || keys.d.isDown) {
      if (this.player.state !== RetroRunnerStates.RUNNER_STATE_JUMP) {
        this.player.setState(RetroRunnerStates.RUNNER_STATE_WALK);
        this.player.anims.play(RetroRunnerKey.WALK_KEY, true);
      }

      this.player.x += 2;
      this.player.flipX = true;
    } else {
      this.player.setState(RetroRunnerStates.RUNNER_STATE_IDLE);
      this.player.anims.play(RetroRunnerKey.IDLE_KEY, true);
    }
    if (
      (keys.up.isDown || keys.w.isDown || keys.space.isDown) &&
      this.player.body.touching.down
    ) {
      this.jumpSound.play();
      this.player.setVelocityY(-300);
      this.player.setState(RetroRunnerStates.RUNNER_STATE_JUMP);
      this.player.anims.play(RetroRunnerKey.JUMP_KEY, true);
    }

    this.background.displayWidth = this.scale.width;
    this.background.displayHeight = this.scale.height;
    if (this.player.y >= SceneKeys.HEIGHT) {
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
