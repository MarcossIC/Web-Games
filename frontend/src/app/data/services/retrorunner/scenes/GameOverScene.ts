import {
  RetroRunnerKey,
  RetroRunnerMedia,
  RetroRunnerStates,
} from '@app/data/models/retro-runner/RetroRunnerKeys';
import { PhaserSound } from '@app/data/services/phaser/types';
import { SceneKeys } from '@app/data/services/retrorunner/main';
import { Scene } from 'phaser';

class GameOverScene extends Scene {
  public gameOverSound!: PhaserSound;
  public capibaraSound!: PhaserSound;
  constructor() {
    super(SceneKeys.GAME_OVER);
  }

  init() {
    this.gameOverSound = this.sound.add(RetroRunnerMedia.GAMEOVER_SOUND, {
      volume: 0.2,
    });
    this.capibaraSound = this.sound.add(RetroRunnerMedia.CAPIBARA_SOUND, {
      volume: 0.2,
    });
  }

  create() {
    this.gameOverSound.play();

    // overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.5);
    overlay.fillRect(
      this.cameras.main.scrollX,
      this.cameras.main.scrollY,
      this.cameras.main.width + 30,
      this.cameras.main.height
    );

    // Background para el texto en el centro de la camara
    const textBackground = this.add.graphics();
    textBackground.fillStyle(0x000000, 0.8);
    textBackground.fillRect(
      this.cameras.main.scrollX,
      this.cameras.main.scrollY + this.cameras.main.height / 2 - 30,
      this.cameras.main.width + 30,
      60
    );
    //Texto "Click here to continue"
    const clickToContinueText = this.add
      .text(
        this.cameras.main.scrollX + this.cameras.main.width / 2,
        this.cameras.main.scrollY + this.cameras.main.height / 2 + 35,
        'Click anywhere to continue',
        {
          fontSize: '12px',
          color: '#fff',
        }
      )
      .setOrigin(0.5, 0.5);
    this.tweens.add({
      targets: clickToContinueText,
      alpha: { from: 1, to: 0 }, // Cambiar de 1 (visible) a 0 (invisible)
      duration: 900, // Duración del ciclo de parpadeo
      yoyo: true, // Repetir el tween en reversa (hacer parpadear)
      loop: -1, // Hacer que el tween se repita indefinidamente
    });

    // Mensaje de "You died" en el centro de la camara
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

    // Se combinan y se agregan background y texto
    const gameOverTextContainer = this.add.container(0, 0);
    gameOverTextContainer.add([
      textBackground,
      gameOverText,
      clickToContinueText,
    ]);

    // Agregar listener de clic para reiniciar el juego
    this.input.on('pointerdown', () => {
      this.gameOverSound.stop();
      this.capibaraSound.stop();
      this.scene.start(SceneKeys.GAME);
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
