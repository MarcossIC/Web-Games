import { ArrayAxis, AxisTypeArray } from '@app/data/models/Axis';
import {
  PlatformType,
  RetroRunnerFloor,
  RetroRunnerMedia,
} from '@app/data/models/retro-runner/RetroRunnerKeys';
import { Physics } from 'phaser';

class GameFloorManager {
  private floorSizeX: number;
  private defaultFloorY: number;
  private lastFloorStartX: number;

  constructor() {
    this.floorSizeX = 0;
    this.defaultFloorY = 0;
    this.lastFloorStartX = 0;
  }

  public createWorld(
    floor: Physics.Arcade.StaticGroup,
    floorPositionY: number
  ) {
    this.defaultFloorY = floorPositionY;
    this.generateGrassFloorIndf(floor, floorPositionY, 7);

    let platformCoords = this.loadFirstPlatforms();
    this.generatePlatforms(floor, platformCoords);

    this.floorSizeX += 100;
    this.generateGrassFloorIndf(floor, floorPositionY, 1);
    this.floorSizeX += 140;
    this.generateGrassFloorIndf(floor, floorPositionY, 9);
    platformCoords = this.loadSecondPlatforms();
    this.generatePlatforms(floor, platformCoords);
  }

  private generateGrassFloorIndf(
    floor: Physics.Arcade.StaticGroup,
    floorPositionY: number,
    chunks: number
  ) {
    this.lastFloorStartX = this.floorSizeX;
    floor
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
      floor
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

    floor
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

  public generatePlatforms(
    floor: Physics.Arcade.StaticGroup,
    platformCoords: AxisTypeArray[]
  ) {
    for (const [y, x, type] of platformCoords) {
      if (type === PlatformType.GRASS_BLOCK) {
        this.generateGrassBlock(floor, y, x);
      } else {
        this.generateGrassSmallFloor(floor, y, x);
      }
    }
  }

  public generateGrassSmallFloor(
    floor: Physics.Arcade.StaticGroup,
    floorFlyY: number,
    floorFlyX: number
  ) {
    floor
      .create(floorFlyX, floorFlyY, RetroRunnerMedia.FLOORGRASS_SMALL, 1)
      .setOrigin(0, 0.5)
      .refreshBody();
  }

  public generateGrassBlock(
    floor: Physics.Arcade.StaticGroup,
    floorFlyY: number,
    floorFlyX: number
  ) {
    floor
      .create(floorFlyX, floorFlyY, RetroRunnerMedia.GRASS_BLOCK, 1)
      .setOrigin(0, 0.5)
      .refreshBody();
  }
}

export default GameFloorManager;
