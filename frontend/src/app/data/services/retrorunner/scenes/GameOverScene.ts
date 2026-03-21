import {
  RetroRunnerMedia,
} from '@app/data/models/retro-runner/RetroRunnerKeys';
import { PhaserSound } from '@app/data/services/phaser/types';
import { SceneKeys } from '@app/data/services/retrorunner/main';
import { Scene } from 'phaser';

class GameOverScene extends Scene {
  public gameOverSound!: PhaserSound;
  public capibaraSound!: PhaserSound;
  private finalScore: number = 0;
  private seedKey: string = '';

  constructor() {
    super(SceneKeys.GAME_OVER);
  }

  init(data: { score?: number; seed?: string }) {
    this.finalScore = data?.score ?? 0;
    this.seedKey = data?.seed ?? '';

    this.gameOverSound = this.sound.add(RetroRunnerMedia.GAMEOVER_SOUND, {
      volume: 0.2,
    });
    this.capibaraSound = this.sound.add(RetroRunnerMedia.CAPIBARA_SOUND, {
      volume: 0.2,
    });

    // Save high score
    const storedHigh = parseInt(localStorage.getItem('retroRunnerHighScore') ?? '0', 10);
    if (this.finalScore > storedHigh) {
      localStorage.setItem('retroRunnerHighScore', String(this.finalScore));
    }
  }

  create() {
    this.gameOverSound.play();

    const cam = this.cameras.main;
    const highScore = parseInt(localStorage.getItem('retroRunnerHighScore') ?? '0', 10);

    // Overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.5);
    overlay.fillRect(cam.scrollX, cam.scrollY, cam.width + 30, cam.height);

    // Background for text
    const textBackground = this.add.graphics();
    textBackground.fillStyle(0x000000, 0.8);
    textBackground.fillRect(
      cam.scrollX,
      cam.scrollY + cam.height / 2 - 55,
      cam.width + 30,
      115
    );

    // "You died" text
    const gameOverText = this.add
      .text(cam.scrollX + cam.width / 2, cam.scrollY + cam.height / 2 - 28, 'You died', {
        fontSize: '36px',
        color: '#ee3131',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5, 0.5);

    // Score text
    const scoreText = this.add
      .text(
        cam.scrollX + cam.width / 2,
        cam.scrollY + cam.height / 2 + 8,
        `Score: ${this.finalScore}  |  Best: ${highScore}`,
        {
          fontSize: '12px',
          color: '#ffd700',
          fontFamily: 'monospace',
        }
      )
      .setOrigin(0.5, 0.5);

    // Seed display
    const seedText = this.add
      .text(
        cam.scrollX + cam.width / 2,
        cam.scrollY + cam.height / 2 + 25,
        `Seed: ${this.seedKey}`,
        {
          fontSize: '9px',
          color: '#aabbcc',
          fontFamily: 'monospace',
        }
      )
      .setOrigin(0.5, 0.5);

    // "Click anywhere to continue"
    const clickToContinueText = this.add
      .text(
        cam.scrollX + cam.width / 2,
        cam.scrollY + cam.height / 2 + 45,
        'Click to retry  |  Hold SHIFT+Click to replay seed',
        {
          fontSize: '8px',
          color: '#fff',
          fontFamily: 'monospace',
        }
      )
      .setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: clickToContinueText,
      alpha: { from: 1, to: 0 },
      duration: 900,
      yoyo: true,
      loop: -1,
    });

    // Container
    const gameOverTextContainer = this.add.container(0, 0);
    gameOverTextContainer.add([
      textBackground,
      gameOverText,
      scoreText,
      seedText,
      clickToContinueText,
    ]);

    // Click to restart — SHIFT+click replays the same seed
    this.input.on('pointerdown', (_pointer: Phaser.Input.Pointer) => {
      this.gameOverSound.stop();
      this.capibaraSound.stop();
      this.scene.stop(SceneKeys.GAME);

      const replaySeed = _pointer.event.shiftKey ? this.seedKey : undefined;
      this.scene.start(SceneKeys.GAME, { seed: replaySeed });
    });

    this.time.delayedCall(
      5000,
      () => {
        this.gameOverSound.stop();
        this.capibaraSound.play({ loop: true });
      },
      [],
      this
    );
  }
}

export default GameOverScene;
