import { RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import { GameObjects, Scene } from 'phaser';

/** Floor tiles, blocks and grass are all drawn at this depth. */
const DEPTH = 0;

/**
 * Pictures that only show: floor tiles, blocks and grass. None has a body;
 * what the player stands on is in WorldBuilder.floor. A released picture
 * waits hidden until a new one is needed.
 */
class PicturePool {
  private readonly pictures: GameObjects.Group;
  private readonly free: GameObjects.Image[] = [];

  constructor(private readonly scene: Scene) {
    this.pictures = scene.add.group();
  }

  /** A picture with its left edge at `x` and its centre at `y`. */
  take(x: number, y: number, key: RetroRunnerMedia): GameObjects.Image {
    let picture = this.free.pop();
    if (picture) {
      picture.setTexture(key).setPosition(x, y).setActive(true).setVisible(true);
      // Drawn over everything built before it, as a new picture would be:
      // the first tile of a chunk covers the last tile of the chunk before,
      // and grass covers the tiles under it. setDepth sorts the list again,
      // so the picture stays under what is drawn at a higher depth.
      picture.setToTop().setDepth(DEPTH);
    } else {
      picture = this.scene.add.image(x, y, key).setDepth(DEPTH);
      this.pictures.add(picture);
    }
    return picture.setOrigin(0, 0.5);
  }

  release(picture: GameObjects.Image) {
    picture.setActive(false).setVisible(false);
    this.free.push(picture);
  }

  getGroup(): GameObjects.Group {
    return this.pictures;
  }
}

export default PicturePool;
