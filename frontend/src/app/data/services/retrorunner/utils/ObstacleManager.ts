import { RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import SeededRandom from '@app/data/services/retrorunner/utils/SeededRandom';
import { Physics, Scene } from 'phaser';

const STONE_KEYS: RetroRunnerMedia[] = [
  RetroRunnerMedia.STONE_1,
  RetroRunnerMedia.STONE_2,
  RetroRunnerMedia.STONE_3,
  RetroRunnerMedia.STONE_4,
  RetroRunnerMedia.STONE_5,
  RetroRunnerMedia.STONE_6,
  RetroRunnerMedia.STONE_7,
  RetroRunnerMedia.STONE_8,
  RetroRunnerMedia.STONE_9,
  RetroRunnerMedia.STONE_10,
  RetroRunnerMedia.STONE_11,
];

const RECYCLE_DISTANCE = 600;
const MIN_SPACING = 400;
const OBSTACLE_SCALE = 0.45;
// Share of the drawn stone that kills: its middle and its lower part.
const HITBOX_WIDTH = 0.6;
const HITBOX_HEIGHT = 0.7;

class ObstacleManager {
  private scene: Scene;
  private rng: SeededRandom;
  public obstacles: Physics.Arcade.StaticGroup;
  private lastObstacleX: number = 0;

  constructor(scene: Scene, rng: SeededRandom) {
    this.scene = scene;
    this.rng = rng;
    this.obstacles = scene.physics.add.staticGroup();
  }

  trySpawnObstacle(
    segmentStartX: number,
    segmentEndX: number,
    floorY: number,
    obstacleChance: number
  ) {
    if (!this.rng.chance(obstacleChance)) return;
    if (segmentEndX - segmentStartX < 150) return;

    const spawnX =
      segmentStartX +
      this.rng.intBetween(1, Math.floor((segmentEndX - segmentStartX) * 0.5)) +
      50;

    if (spawnX - this.lastObstacleX < MIN_SPACING) return;

    const stoneKey = this.rng.pick(STONE_KEYS);

    // Try to recycle a pooled (inactive) obstacle first
    let stone = this.obstacles.getFirstDead(false) as Physics.Arcade.Sprite | null;

    if (stone) {
      stone.setTexture(stoneKey);
      stone.setPosition(spawnX, floorY - 17);
      stone.setActive(true).setVisible(true);
      (stone as any).enableBody(true, spawnX, floorY - 17, true, true);
    } else {
      stone = this.obstacles.create(
        spawnX,
        floorY - 17,
        stoneKey
      ) as Physics.Arcade.Sprite;
    }

    stone.setOrigin(0.5, 1).setScale(OBSTACLE_SCALE);
    this.fitHitbox(stone);

    this.lastObstacleX = spawnX;
  }

  /**
   * Shrinks the body to the middle of the stone, standing on its base, so
   * grazing a corner of the picture does not kill.
   *
   * A static body keeps its own copy of the size and position. The order
   * matters: `refreshBody()` copies the whole picture into the body and
   * drops its offset, so it goes first. A static body's offset is in world
   * pixels, measured on the scaled picture, and a recycled stone still
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

  update(cameraScrollX: number) {
    this.obstacles.children.forEach((child) => {
      const sprite = child as Physics.Arcade.Sprite;
      if (sprite.active && sprite.x < cameraScrollX - RECYCLE_DISTANCE) {
        // Pool instead of destroy: deactivate and hide
        sprite.setActive(false).setVisible(false);
        sprite.body!.enable = false;
      }
    });
  }

  getGroup(): Physics.Arcade.StaticGroup {
    return this.obstacles;
  }
}

export default ObstacleManager;
