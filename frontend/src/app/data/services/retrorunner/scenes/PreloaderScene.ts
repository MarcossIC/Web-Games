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
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const barWidth = Math.min(this.scale.width * 0.7, 300);

    this.add.rectangle(cx, cy, barWidth, 16).setStrokeStyle(1, 0xffffff);
    const bar = this.add.rectangle(cx - barWidth / 2 + 2, cy, 4, 12, 0xffffff);

    this.load.on('progress', (progress: number) => {
      bar.width = 4 + (barWidth - 4) * progress;
    });
  }

  create() {
    this.scene.start(SceneKeys.GAME);
  }

  /**
   * Only what the game draws or plays today. The star, chest, flag, key,
   * fish, the second boat, the other sky layers and floors are in
   * RetroRunnerKeys but nothing uses them yet: each is loaded again with
   * the code that uses it.
   */
  preload() {
    this.load.setPath('assets/images/retro-runner');

    // Player spritesheet
    this.load.spritesheet(RetroRunnerKey.RUNNER, 'entities/minicapy.png', {
      frameWidth: 26,
      frameHeight: 21,
      startFrame: 0,
    });

    // --- Animated spritesheets ---
    this.load.spritesheet(RetroRunnerMedia.COIN_SPRITE, 'entities/Animated objects/Coin.png', {
      frameWidth: 10, frameHeight: 10,
    });

    // --- Floor tiles ---
    this.load.image(RetroRunnerMedia.FLOORGRASS_START, 'scenery/overworld/floorgrassStart.png');
    this.load.image(RetroRunnerMedia.FLOORGRASS_CENTER, 'scenery/overworld/floorgrassCenter.png');
    this.load.image(RetroRunnerMedia.FLOORGRASS_END, 'scenery/overworld/floorgrassEnd.png');
    this.load.image(RetroRunnerMedia.GRASS_BLOCK, 'scenery/overworld/grassBlock.png');

    // --- Background ---
    this.load.image(RetroRunnerMedia.BG_ALT, 'scenery/background-2.png');

    // --- Parallax layers ---
    this.load.image(RetroRunnerMedia.LAYER_CLOUDS, 'scenery/Layers/3.png');
    this.load.image(RetroRunnerMedia.LAYER_MOUNTAINS, 'scenery/Layers/4.png');
    this.load.image(RetroRunnerMedia.LAYER_GRASS_FAR, 'scenery/Layers/5.png');
    this.load.image(RetroRunnerMedia.LAYER_GRASS_NEAR, 'scenery/Layers/6.png');

    // --- Decorative grass (1-21) ---
    for (let i = 1; i <= 21; i++) {
      this.load.image(`grass${i}` as RetroRunnerMedia, `entities/natural/Grass/${i}.png`);
    }

    // --- Stones (obstacles) 1-11 ---
    for (let i = 1; i <= 11; i++) {
      this.load.image(`stone${i}` as RetroRunnerMedia, `entities/natural/Stones/${i}.png`);
    }

    // --- Bushes 1-14 ---
    for (let i = 1; i <= 14; i++) {
      this.load.image(`bush${i}` as RetroRunnerMedia, `entities/natural/Bushes/${i}.png`);
    }

    // --- Trees 1-9 ---
    for (let i = 1; i <= 9; i++) {
      this.load.image(`tree${i}` as RetroRunnerMedia, `entities/natural/Trees/${i}.png`);
    }

    // --- Willows 1-3 ---
    for (let i = 1; i <= 3; i++) {
      this.load.image(`willow${i}` as RetroRunnerMedia, `entities/natural/Willows/${i}.png`);
    }

    // --- Fences 1-6 ---
    for (let i = 1; i <= 6; i++) {
      this.load.image(`fence${i}` as RetroRunnerMedia, `entities/natural/Fence/${i}.png`);
    }

    // --- Ridges 1-6 ---
    for (let i = 1; i <= 6; i++) {
      this.load.image(`ridge${i}` as RetroRunnerMedia, `entities/natural/Ridges/${i}.png`);
    }

    // --- Boxes 1-8 ---
    for (let i = 1; i <= 8; i++) {
      this.load.image(`box${i}` as RetroRunnerMedia, `entities/natural/Boxes/${i}.png`);
    }

    // --- Pointers 1-17 ---
    for (let i = 1; i <= 17; i++) {
      this.load.image(`pointer${i}` as RetroRunnerMedia, `entities/natural/Pointers/${i}.png`);
    }

    // --- Ladders ---
    this.load.image(RetroRunnerMedia.LADDER_1, 'entities/natural/Ladder/1.png');
    this.load.image(RetroRunnerMedia.LADDER_2, 'entities/natural/Ladder/2.png');
    this.load.image(RetroRunnerMedia.LADDER_3, 'entities/natural/Ladder/3.png');

    // --- Fishing / water theme ---
    this.load.image(RetroRunnerMedia.BOAT_1, 'entities/natural/Boat/1.png');
    for (let i = 1; i <= 4; i++) {
      this.load.image(`fishbarrel${i}` as RetroRunnerMedia, `entities/natural/Fishbarrel/${i}.png`);
    }
    this.load.image(RetroRunnerMedia.FISHING_HUT, 'entities/natural/Fishing Hut/1.png');

    // --- House ---
    this.load.image(RetroRunnerMedia.HOUSE, 'entities/natural/House/1.png');

    // --- Sound effects ---
    this.load.audio(RetroRunnerMedia.GAMEOVER_SOUND, 'sound/music/cripy-gameover.mp3');
    this.load.audio(RetroRunnerMedia.CAPIBARA_SOUND, 'sound/music/capibara-gameover.mp3');
    this.load.audio(RetroRunnerMedia.BIT_JUMP, 'sound/effects/bit-jump.mp3');
    this.load.audio(RetroRunnerMedia.COIN_SOUND, 'sound/effects/coin.mp3');

  }
}
