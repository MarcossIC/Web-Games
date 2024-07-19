import {
  RetroRunnerFloor,
  RetroRunnerMedia,
} from '@app/data/models/retro-runner/RetroRunnerKeys';
import { Physics } from 'phaser';

class GameFloorManager {
  private floorSizeX;
  constructor() {
    this.floorSizeX = 0;
  }

  public generateGrassFloorIndf(
    floor: Physics.Arcade.StaticGroup,
    floorPositionY: number,
    chunks: number
  ) {
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

  public initWorldFloor(
    floor: Physics.Arcade.StaticGroup,
    floorPositionY: number
  ) {
    this.generateGrassFloorIndf(floor, floorPositionY, 6);
    this.floorSizeX += 100;
    this.generateGrassFloorIndf(floor, floorPositionY, 1);
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
