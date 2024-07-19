import {
  RetroRunnerKey,
  RetroRunnerMedia,
} from '@app/data/models/retro-runner/RetroRunnerKeys';
import { SceneKeys } from '@app/data/services/retrorunner/main';
import { Scene, GameObjects } from 'phaser';

export class PreloaderScene extends Scene {
  constructor() {
    super(SceneKeys.PRELOADER);
  }

  init() {
    this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

    //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
    const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

    this.load.on('progress', (progress: number) => {
      bar.width = 4 + 460 * progress;
    });
  }

  create() {
    this.scene.start(SceneKeys.GAME);
  }

  preload() {
    this.load.setPath('assets/images/retro-runner');

    this.load.spritesheet(RetroRunnerKey.RUNNER, 'entities/minicapy.png', {
      frameWidth: 26,
      frameHeight: 21,
      startFrame: 0,
    });

    this.load.image(
      RetroRunnerMedia.FLOORGRASS_START,
      'scenery/overworld/floorgrassStart.png'
    );
    this.load.image(
      RetroRunnerMedia.FLOORGRASS_CENTER,
      'scenery/overworld/floorgrassCenter.png'
    );
    this.load.image(
      RetroRunnerMedia.FLOORGRASS_END,
      'scenery/overworld/floorgrassEnd.png'
    );

    this.load.image(
      RetroRunnerMedia.NATURA_BACKGROUND,
      'scenery/background.png'
    );

    this.load.audio(
      RetroRunnerMedia.GAMEOVER_SOUND,
      'sound/music/cripy-gameover.mp3'
    );
    this.load.audio(
      RetroRunnerMedia.CAPIBARA_SOUND,
      'sound/music/capibara-gameover.mp3'
    );

    this.load.audio(RetroRunnerMedia.BIT_JUMP, 'sound/effects/bit-jump.mp3');
  }
}
