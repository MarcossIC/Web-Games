import { ArrayAxis, AxisTypeArray } from '@app/data/models/Axis';
import {
  PlatformType,
  RetroRunnerFloor,
  RetroRunnerMedia,
} from '@app/data/models/retro-runner/RetroRunnerKeys';
import { ramdomNumber } from '@app/data/services/util.service';
import { GameObjects, Physics, Scene } from 'phaser';

class GameFloorManager {
  private floorSizeX: number;
  private defaultFloorY: number;
  private lastFloorStartX: number;
  private readonly GRASS: [RetroRunnerMedia, number][] = [
    [RetroRunnerMedia.NATURA_GRASS_ON, 26],
    [RetroRunnerMedia.NATURA_GRASS_TW, 25],
    [RetroRunnerMedia.NATURA_GRASS_TH, 25],
    [RetroRunnerMedia.NATURA_GRASS_FO, 23],
    [RetroRunnerMedia.NATURA_GRASS_FI, 23],
  ];
  public floor: Physics.Arcade.StaticGroup;
  public grassGroup: GameObjects.Group;

  constructor(game: Scene) {
    this.floorSizeX = 0;
    this.defaultFloorY = 0;
    this.lastFloorStartX = 0;

    this.floor = game.physics.add.staticGroup();
    this.grassGroup = game.add.group();

    this.floor.world.checkCollision.down = true;
    this.floor.world.checkCollision.up = true;
    this.floor.world.checkCollision.left = true;
    this.floor.world.checkCollision.right = true;
  }

  public createWorld(floorPositionY: number) {
    this.defaultFloorY = floorPositionY;
    this.generateGrassFloorIndf(floorPositionY, 7);
    this.generateGrass(floorPositionY, 6, 100);

    let platformCoords = this.loadFirstPlatforms();
    this.generatePlatforms(platformCoords);

    this.floorSizeX += 100;
    this.generateGrassFloorIndf(floorPositionY, 1);
    this.generateGrass(floorPositionY, 2, 50);
    this.floorSizeX += 140;
    this.generateGrassFloorIndf(floorPositionY, 9);
    platformCoords = this.loadSecondPlatforms();
    this.generatePlatforms(platformCoords);
  }

  private generateGrass(
    floorPositionY: number,
    chunks: number,
    maxSpacing: number
  ) {
    let grassSpace = this.lastFloorStartX;
    for (let i = 1; i <= chunks; i++) {
      const [grassKey, yOffset] = this.getRamdomGrass();
      grassSpace += i + ramdomNumber(false, maxSpacing) + 15;
      const grassPositionY = floorPositionY - yOffset;
      if (grassSpace >= this.floorSizeX) return;
      this.grassGroup
        .create(grassSpace, grassPositionY, grassKey, 1, true, true)
        .setOrigin(0, 0.5);
    }
  }

  private generateGrassFloorIndf(floorPositionY: number, chunks: number) {
    this.lastFloorStartX = this.floorSizeX;
    this.floor
      .create(
        this.floorSizeX,
        floorPositionY,
        RetroRunnerMedia.FLOORGRASS_START,
        1
      )
      .setOrigin(0, 0.5)
      .refreshBody();

    this.floorSizeX += RetroRunnerFloor.FLOORGRASS_START_WIDTH;

    for (let i = 1; i <= chunks; i++) {
      this.floor
        .create(
          this.floorSizeX,
          floorPositionY,
          RetroRunnerMedia.FLOORGRASS_CENTER,
          1
        )
        .setOrigin(0, 0.5)
        .refreshBody();

      this.floorSizeX += RetroRunnerFloor.FLOORGRASS_CENTER_WIDTH;
    }

    this.floor
      .create(
        this.floorSizeX,
        floorPositionY,
        RetroRunnerMedia.FLOORGRASS_END,
        1
      )
      .setOrigin(0, 0.5)
      .refreshBody();
  }

  private loadFirstPlatforms(): AxisTypeArray[] {
    let platformStartDY = this.defaultFloorY - 90;
    let platformStartDX = this.lastFloorStartX + 210;
    return [
      [platformStartDY, platformStartDX, PlatformType.GRASS_BLOCK],
      [platformStartDY, platformStartDX + 120, PlatformType.FLOOR_GRASS_SMALL],
      [
        platformStartDY - 70,
        platformStartDX + 120 + 200,
        PlatformType.GRASS_BLOCK,
      ],
    ];
  }

  private loadSecondPlatforms(): AxisTypeArray[] {
    let platformStartDY = this.defaultFloorY - 90;
    let platformStartDX = this.lastFloorStartX + 275;
    const sum = 55 + RetroRunnerFloor.GRASS_BLOCK_WIDTH;
    const coords: AxisTypeArray[] = [
      [platformStartDY, platformStartDX, PlatformType.GRASS_BLOCK],
    ];

    platformStartDX += sum;
    coords.push([platformStartDY, platformStartDX, PlatformType.GRASS_BLOCK]);
    coords.push([
      platformStartDY - 90,
      platformStartDX - sum / 2,
      PlatformType.GRASS_BLOCK,
    ]);
    platformStartDX += sum;
    coords.push([platformStartDY, platformStartDX, PlatformType.GRASS_BLOCK]);
    coords.push([
      platformStartDY - 90,
      platformStartDX - sum / 2,
      PlatformType.GRASS_BLOCK,
    ]);

    return coords;
  }

  public generatePlatforms(platformCoords: AxisTypeArray[]) {
    for (const [y, x, type] of platformCoords) {
      if (type === PlatformType.GRASS_BLOCK) {
        this.generateGrassBlock(y, x);
      } else {
        this.generateGrassSmallFloor(y, x);
      }
    }
  }

  public generateGrassSmallFloor(floorFlyY: number, floorFlyX: number) {
    this.floor
      .create(floorFlyX, floorFlyY, RetroRunnerMedia.FLOORGRASS_SMALL, 1)
      .setOrigin(0, 0.5)
      .refreshBody();
  }

  public generateGrassBlock(floorFlyY: number, floorFlyX: number) {
    this.floor
      .create(floorFlyX, floorFlyY, RetroRunnerMedia.GRASS_BLOCK, 1)
      .setOrigin(0, 0.5)
      .refreshBody();
  }

  private getRamdomGrass() {
    const ramdomGrass = ramdomNumber(true, 4);
    console.log({ ramdomGrass });
    return this.GRASS[ramdomGrass];
  }
}

export default GameFloorManager;
