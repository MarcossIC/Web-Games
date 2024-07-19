import { RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import { Physics } from 'phaser';

class GameFloorManager {
  private floorSizeX;
  constructor() {
    this.floorSizeX = 0;
  }

  public initFloor(floor: Physics.Arcade.StaticGroup, floorPositionY: number) {
    floor
      .create(
        this.floorSizeX,
        floorPositionY,
        RetroRunnerMedia.FLOORGRASS_START,
        1
      )
      .setOrigin(0, 0.5)
      .refreshBody();
    this.floorSizeX += 81;
    floor
      .create(
        this.floorSizeX,
        floorPositionY,
        RetroRunnerMedia.FLOORGRASS_CENTER,
        1
      )
      .setOrigin(0, 0.5)
      .refreshBody();

    this.floorSizeX += 65;
    floor
      .create(
        this.floorSizeX,
        floorPositionY,
        RetroRunnerMedia.FLOORGRASS_CENTER,
        1
      )
      .setOrigin(0, 0.5)
      .refreshBody();
    this.floorSizeX += 65;
    floor
      .create(
        this.floorSizeX,
        floorPositionY,
        RetroRunnerMedia.FLOORGRASS_CENTER,
        1
      )
      .setOrigin(0, 0.5)
      .refreshBody();
    this.floorSizeX += 65;
    floor
      .create(
        this.floorSizeX,
        floorPositionY,
        RetroRunnerMedia.FLOORGRASS_CENTER,
        1
      )
      .setOrigin(0, 0.5)
      .refreshBody();
    this.floorSizeX += 65;
    floor
      .create(
        this.floorSizeX,
        floorPositionY,
        RetroRunnerMedia.FLOORGRASS_END,
        1
      )
      .setOrigin(0, 0.5)
      .refreshBody();
    this.floorSizeX += 100;
    floor
      .create(
        this.floorSizeX,
        floorPositionY,
        RetroRunnerMedia.FLOORGRASS_START,
        1
      )
      .setOrigin(0, 0.5)
      .refreshBody();
    this.floorSizeX += 81;
    floor
      .create(
        this.floorSizeX,
        floorPositionY,
        RetroRunnerMedia.FLOORGRASS_CENTER,
        1
      )
      .setOrigin(0, 0.5)
      .refreshBody();
    this.floorSizeX += 65;
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
}

export default GameFloorManager;
