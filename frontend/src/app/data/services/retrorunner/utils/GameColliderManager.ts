import { PhaserPlayerWithBody } from '@app/data/services/phaser/types';
import { Scene, Physics, GameObjects } from 'phaser';

class GameCollider {
  constructor(
    scene: Scene,
    player: PhaserPlayerWithBody,
    floor: Physics.Arcade.StaticGroup
  ) {
    this.settingPlayerCollision(player);
    this.settingFloorCollision(floor);
    scene.physics.add.collider(
      player,
      floor,
      this.handleCollision,
      undefined,
      scene
    );
  }

  public settingPlayerCollision(player: PhaserPlayerWithBody) {
    player.setCollideWorldBounds(true);
    //player.body.setBounce(0);
  }
  public settingFloorCollision(floor: Physics.Arcade.StaticGroup) {
    floor.children.each((platform: GameObjects.GameObject) => {
      const parsed = platform as Physics.Arcade.Sprite;
      if (platform instanceof Physics.Arcade.Sprite) {
        const body = platform?.body;
        if (body) {
          body.checkCollision.up = true; // Habilitar colisiones desde arriba
          body.checkCollision.down = true; // Habilitar colisiones desde abajo
          body.checkCollision.left = true; // Habilitar colisiones desde la izquierda
          body.checkCollision.right = true; // Habilitar colisiones desde la derecha
        }
      }

      return true;
    }, this);
  }
  private handleCollision(player, platform) {}
}

export default GameCollider;
