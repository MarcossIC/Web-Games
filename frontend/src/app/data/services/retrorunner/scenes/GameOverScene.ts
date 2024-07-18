import {
  RetroRunnerKey,
  RetroRunnerMedia,
  RetroRunnerStates,
} from '@app/data/models/retro-runner/RetroRunnerKeys';
import { SceneKeys } from '@app/data/services/retrorunner/main';
import { Scene } from 'phaser';

class GameOverScene extends Scene {
  constructor() {
    super(SceneKeys.GAME_OVER);
  }

  create() {
    const sound = this.sound.add(RetroRunnerMedia.GAMEOVER_SOUND, {
      volume: 0.2,
    });
    sound.play();

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
    gameOverTextContainer.add([textBackground, gameOverText]);

    //Destruimos todo y volvemos al juego despues de 2350ms
    this.time.delayedCall(
      2350,
      () => {
        sound.stop();
        this.scene.start(SceneKeys.GAME);
      },
      [],
      this
    );
  }
}

export default GameOverScene;
