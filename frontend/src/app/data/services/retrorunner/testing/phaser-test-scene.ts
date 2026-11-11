import * as Phaser from 'phaser';
import { RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';

/** Same internal size as the real game (see main.ts). */
export const TEST_WIDTH = 550;
export const TEST_HEIGHT = 330;
/** Where GameScene puts the floor: 16 px above the bottom. */
export const TEST_FLOOR_Y = TEST_HEIGHT - 16;

export interface TestScene {
  scene: Phaser.Scene;
  /** Waits until the game is gone, so the next spec starts clean. */
  destroy(): Promise<void>;
}

/**
 * Boots a real Phaser game with arcade physics and the sprites the world is
 * built from, then stops its loop: nothing moves, falls or tweens unless a
 * test calls it. Sizes come from the real images, so hitboxes and tile
 * widths match the game.
 */
export function startTestScene(): Promise<TestScene> {
  return new Promise((resolve, reject) => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    let game: Phaser.Game;

    const destroy = () =>
      new Promise<void>((done) => {
        game.events.once(Phaser.Core.Events.DESTROY, () => {
          parent.remove();
          done();
        });
        // A game is torn down on its next step, and the loop is asleep.
        game.destroy(true);
        game.loop.wake();
      });

    class Harness extends Phaser.Scene {
      constructor() {
        super('retro-runner-test');
      }

      private failed: string[] = [];

      preload() {
        this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
          this.failed.push(`${file.key} (${file.src})`);
        });
        this.load.setPath('assets/images/retro-runner');
        this.load.image(RetroRunnerMedia.FLOORGRASS_START, 'scenery/overworld/floorgrassStart.png');
        this.load.image(RetroRunnerMedia.FLOORGRASS_CENTER, 'scenery/overworld/floorgrassCenter.png');
        this.load.image(RetroRunnerMedia.FLOORGRASS_END, 'scenery/overworld/floorgrassEnd.png');
        this.load.image(RetroRunnerMedia.GRASS_BLOCK, 'scenery/overworld/grassBlock.png');
        // Not the fishing hut: Karma's server answers 404 to the space in
        // "Fishing Hut/". Nothing measured here depends on its picture; its
        // platforms are invisible bodies of a fixed size.
        for (let i = 1; i <= 21; i++) {
          this.load.image(`grass${i}`, `entities/natural/Grass/${i}.png`);
        }
        for (let i = 1; i <= 11; i++) {
          this.load.image(`stone${i}`, `entities/natural/Stones/${i}.png`);
        }
      }

      create() {
        game.loop.sleep();
        if (this.failed.length > 0) {
          // Without the real images every size in the world is wrong.
          destroy().then(() => reject(new Error(`Could not load: ${this.failed.join(', ')}`)));
          return;
        }
        resolve({ scene: this, destroy });
      }
    }

    game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent,
      width: TEST_WIDTH,
      height: TEST_HEIGHT,
      banner: false,
      audio: { noAudio: true },
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 300 } },
      },
      scene: Harness,
    });
  });
}
