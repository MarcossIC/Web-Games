import {
  RetroRunnerKey,
  RetroRunnerMedia,
} from '@app/data/models/retro-runner/RetroRunnerKeys';
import { SceneKeys } from '@app/data/services/retrorunner/main';
import { Scene } from 'phaser';

export class PreloaderScene extends Scene {
  constructor() {
    super(SceneKeys.PRELOADER);
  }

  init() {
    this.add.image(512, 384, 'background');
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

    this.load.spritesheet(RetroRunnerKey.RUNNER, 'entities/mario.png', {
      frameWidth: 18,
      frameHeight: 16,
      startFrame: 0,
    });

    this.load.image(
      RetroRunnerMedia.CLOUD_DEFAULT,
      'scenery/overworld/cloud1.png'
    );

    this.load.image(
      RetroRunnerMedia.FLOORBRICKS_DEFAULT,
      'scenery/overworld/floorbricks.png'
    );
    this.load.audio(
      RetroRunnerMedia.GAMEOVER_SOUND,
      'sound/music/gameover.mp3'
    );
  }
}
