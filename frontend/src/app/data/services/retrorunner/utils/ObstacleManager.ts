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
      this.rng.integer(false, Math.floor((segmentEndX - segmentStartX) * 0.5)) +
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

    // Shrink the physics body to the visible scaled size and center it
    const bodyW = stone.width * OBSTACLE_SCALE * 0.6;
    const bodyH = stone.height * OBSTACLE_SCALE * 0.7;
    const offsetX = (stone.width - bodyW) / 2;
    const offsetY = stone.height - bodyH;
    stone.body!.setSize(bodyW, bodyH);
    stone.body!.setOffset(offsetX, offsetY);

    stone.refreshBody();

    this.lastObstacleX = spawnX;
  }

  update(cameraScrollX: number) {
    this.obstacles.children.each((child) => {
      const sprite = child as Physics.Arcade.Sprite;
      if (sprite.active && sprite.x < cameraScrollX - RECYCLE_DISTANCE) {
        // Pool instead of destroy: deactivate and hide
        sprite.setActive(false).setVisible(false);
        sprite.body!.enable = false;
      }
      return true;
    });
  }

  getGroup(): Physics.Arcade.StaticGroup {
    return this.obstacles;
  }
}

export default ObstacleManager;
