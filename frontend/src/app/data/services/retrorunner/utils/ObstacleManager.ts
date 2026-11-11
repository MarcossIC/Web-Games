import { RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import { FLOOR_SURFACE_ABOVE_Y } from '@app/data/services/retrorunner/generation/geometry';
import { Physics, Scene } from 'phaser';

const OBSTACLE_SCALE = 0.45;
// Share of the drawn stone that kills: its middle and its lower part.
const HITBOX_WIDTH = 0.6;
const HITBOX_HEIGHT = 0.7;

/**
 * The stones: a pool that puts each one where the world's plan says. A
 * released stone waits in the pool until a new one is needed.
 */
class ObstacleManager {
  public obstacles: Physics.Arcade.StaticGroup;
  private free: Physics.Arcade.Sprite[] = [];

  constructor(scene: Scene) {
    this.obstacles = scene.physics.add.staticGroup();
  }

  /** A stone standing on the floor, centred on `x`. */
  spawn(x: number, floorY: number, key: RetroRunnerMedia): Physics.Arcade.Sprite {
    const y = floorY - FLOOR_SURFACE_ABOVE_Y;
    let stone = this.free.pop();
    if (stone) {
      stone.setTexture(key);
      stone.enableBody(true, x, y, true, true);
    } else {
      stone = this.obstacles.create(x, y, key) as Physics.Arcade.Sprite;
    }

    stone.setOrigin(0.5, 1).setScale(OBSTACLE_SCALE);
    this.fitHitbox(stone);
    return stone;
  }

  release(stone: Physics.Arcade.Sprite) {
    stone.setActive(false).setVisible(false);
    stone.body!.enable = false;
    this.free.push(stone);
  }

  /**
   * Shrinks the body to the middle of the stone, standing on its base, so
   * grazing a corner of the picture does not kill.
   *
   * A static body keeps its own copy of the size and position. The order
   * matters: `refreshBody()` copies the whole picture into the body and
   * drops its offset, so it goes first. A static body's offset is in world
   * pixels, measured on the scaled picture, and a reused stone still
   * carries the offset of its previous use, so it is cleared before.
   */
  private fitHitbox(stone: Physics.Arcade.Sprite) {
    const body = stone.body as Physics.Arcade.StaticBody;
    body.setOffset(0, 0);
    stone.refreshBody();

    const width = stone.displayWidth * HITBOX_WIDTH;
    const height = stone.displayHeight * HITBOX_HEIGHT;
    body.setSize(width, height, false);
    body.setOffset((stone.displayWidth - width) / 2, stone.displayHeight - height);
  }

  getGroup(): Physics.Arcade.StaticGroup {
    return this.obstacles;
  }
}

export default ObstacleManager;
