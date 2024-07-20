import {
  RetroRunnerKey,
  RetroRunnerMedia,
  RetroRunnerStates,
} from '@app/data/models/retro-runner/RetroRunnerKeys';
import { PhaserPlayerWithBody } from '@app/data/services/phaser/types';
import { Types } from 'phaser';

export class PlayerActions {
  public playerCrouch(player: PhaserPlayerWithBody) {
    if (player.anims?.currentAnim?.key !== RetroRunnerKey.DOWN_KEY) {
      player.anims.play(RetroRunnerKey.DOWN_KEY);
      player.body.setSize(player.width, player.height / 2); // Ajustar tamaño del hitbox
      player.body.offset.y = player.height / 2; // Ajustar el offset del hitbox
      player.setVelocityX(0);
    }
  }
  public playerLeft(player: PhaserPlayerWithBody) {
    player.setState(RetroRunnerStates.RUNNER_STATE_WALK);
    player.anims.play(RetroRunnerKey.WALK_KEY, true);
    player.setVelocityX(!player.body.touching.down ? -150 : -190);
    //player.x -= 2;
    player.flipX = false;
  }

  public playerRight(player: PhaserPlayerWithBody) {
    player.setState(RetroRunnerStates.RUNNER_STATE_WALK);
    player.anims.play(RetroRunnerKey.WALK_KEY, true);
    player.setVelocityX(!player.body.touching.down ? 150 : 190);
    //player.x += 2;
    player.flipX = true;
  }

  public playerStandup(player: PhaserPlayerWithBody) {
    player.setVelocityX(0);
    if (player.anims?.currentAnim?.key === RetroRunnerKey.DOWN_KEY) {
      player.body.setSize(player.width, player.height);
      player.body.offset.y = 0;
    }

    player.setState(RetroRunnerStates.RUNNER_STATE_IDLE);
    player.anims.play(RetroRunnerKey.IDLE_KEY, true);
  }

  public playerJump(player: PhaserPlayerWithBody) {
    if (player.anims?.currentAnim?.key !== RetroRunnerKey.JUMP_KEY) {
      player.setState(RetroRunnerStates.RUNNER_STATE_JUMP);

      player.anims.play(RetroRunnerKey.JUMP_KEY, true);
      player.setVelocityY(-510);
    }
  }

  public fastFall(player: PhaserPlayerWithBody) {
    if (player.body.velocity.y > 0) {
      player.setVelocityY(250);
    }
  }
}
