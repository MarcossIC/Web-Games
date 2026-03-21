import {
  RetroRunnerKey,
  RetroRunnerStates,
} from '@app/data/models/retro-runner/RetroRunnerKeys';
import { PhaserPlayerWithBody } from '@app/data/services/phaser/types';

// --- Movement ---
const BASE_WALK_SPEED = 190;
const GROUND_ACCEL = 1200;    // px/s^2 — snappy on ground
const GROUND_DECEL = 1800;    // px/s^2 — quick stop
const AIR_ACCEL = 600;        // px/s^2 — reduced air control
const AIR_DECEL = 200;        // px/s^2 — keeps momentum in air

// --- Jump ---
const JUMP_VELOCITY = -510;
const VARIABLE_JUMP_CUTOFF = -200;
const FAST_FALL_SPEED = 250;

// --- Asymmetric gravity ---
const FALL_GRAVITY_MULT = 1.6;   // heavier when falling — snappy landings
const APEX_GRAVITY_MULT = 0.55;  // lighter near apex — hang time
const APEX_VELOCITY_THRESHOLD = 80; // |vy| below this = "near apex"

// --- Timers ---
const COYOTE_TIME_MS = 90;
const JUMP_BUFFER_MS = 100;

export class PlayerActions {
  private lastOnFloorTime: number = 0;
  private jumpBufferTime: number = 0;
  private wasOnFloor: boolean = false;
  private speedMultiplier: number = 1;

  setSpeedMultiplier(multiplier: number) {
    this.speedMultiplier = multiplier;
  }

  private get walkSpeed(): number {
    return BASE_WALK_SPEED * this.speedMultiplier;
  }

  updateTimers(isOnFloor: boolean, now: number) {
    if (isOnFloor) {
      this.lastOnFloorTime = now;
    }
    this.wasOnFloor = isOnFloor;
  }

  bufferJump(now: number) {
    this.jumpBufferTime = now;
  }

  canJump(isOnFloor: boolean, now: number): boolean {
    if (isOnFloor) return true;
    if (now - this.lastOnFloorTime < COYOTE_TIME_MS) return true;
    return false;
  }

  hasBufferedJump(now: number): boolean {
    return now - this.jumpBufferTime < JUMP_BUFFER_MS;
  }

  consumeJumpBuffer() {
    this.jumpBufferTime = 0;
  }

  /**
   * Asymmetric gravity: apply different gravity multipliers based on
   * whether the player is rising, near apex, or falling.
   * Call this every frame BEFORE movement logic.
   */
  applyAsymmetricGravity(player: PhaserPlayerWithBody, isOnFloor: boolean, baseGravity: number) {
    if (isOnFloor) {
      // Normal gravity on ground
      player.body.setGravityY(baseGravity);
      return;
    }

    const vy = player.body.velocity.y;

    if (Math.abs(vy) < APEX_VELOCITY_THRESHOLD) {
      // Near apex — reduce gravity for hang time
      player.body.setGravityY(baseGravity * APEX_GRAVITY_MULT);
    } else if (vy > 0) {
      // Falling — increase gravity for snappy descent
      player.body.setGravityY(baseGravity * FALL_GRAVITY_MULT);
    } else {
      // Rising — normal gravity
      player.body.setGravityY(baseGravity);
    }
  }

  /**
   * Variable jump: if the player releases jump while ascending,
   * cut the upward velocity for a shorter hop.
   */
  applyVariableJump(player: PhaserPlayerWithBody, isJumpHeld: boolean) {
    if (!isJumpHeld && player.body.velocity.y < VARIABLE_JUMP_CUTOFF) {
      player.body.velocity.y = VARIABLE_JUMP_CUTOFF;
    }
  }

  playerCrouch(player: PhaserPlayerWithBody) {
    if (player.anims?.currentAnim?.key !== RetroRunnerKey.DOWN_KEY) {
      player.anims.play(RetroRunnerKey.DOWN_KEY);
      player.body.setSize(player.width, player.height / 2);
      player.body.offset.y = player.height / 2;
      player.setVelocityX(0);
    }
  }

  /**
   * Acceleration-based horizontal movement.
   * Uses different accel/decel constants for ground vs air.
   */
  playerLeft(player: PhaserPlayerWithBody, isOnFloor: boolean, delta: number) {
    player.setState(RetroRunnerStates.RUNNER_STATE_WALK);
    player.anims.play(RetroRunnerKey.WALK_KEY, true);
    player.flipX = false;

    const target = -this.walkSpeed;
    const accel = isOnFloor ? GROUND_ACCEL : AIR_ACCEL;
    this.accelerateX(player, target, accel, delta);
  }

  playerRight(player: PhaserPlayerWithBody, isOnFloor: boolean, delta: number) {
    player.setState(RetroRunnerStates.RUNNER_STATE_WALK);
    player.anims.play(RetroRunnerKey.WALK_KEY, true);
    player.flipX = true;

    const target = this.walkSpeed;
    const accel = isOnFloor ? GROUND_ACCEL : AIR_ACCEL;
    this.accelerateX(player, target, accel, delta);
  }

  playerIdle(player: PhaserPlayerWithBody, isOnFloor: boolean, delta: number) {
    if (isOnFloor) {
      // Decelerate to zero on ground
      this.decelerateX(player, GROUND_DECEL, delta);
      if (Math.abs(player.body.velocity.x) < 5) {
        player.setVelocityX(0);
      }
      player.setState(RetroRunnerStates.RUNNER_STATE_IDLE);
      player.anims.play(RetroRunnerKey.IDLE_KEY, true);
    } else {
      // Gentle air deceleration — preserves momentum
      this.decelerateX(player, AIR_DECEL, delta);
    }

    if (player.anims?.currentAnim?.key === RetroRunnerKey.DOWN_KEY) {
      player.body.setSize(player.width, player.height);
      player.body.offset.y = 0;
    }
  }

  playerJump(player: PhaserPlayerWithBody) {
    player.setState(RetroRunnerStates.RUNNER_STATE_JUMP);
    player.anims.play(RetroRunnerKey.JUMP_KEY, true);
    player.setVelocityY(JUMP_VELOCITY);

    // If jumping while falling (coyote time / edge jump), reduce horizontal
    // momentum slightly — makes the jump more vertical and realistic
    if (player.body.velocity.y > 0) {
      player.body.velocity.x *= 0.7;
    }

    this.lastOnFloorTime = 0;
  }

  fastFall(player: PhaserPlayerWithBody) {
    if (player.body.velocity.y > 0) {
      player.setVelocityY(FAST_FALL_SPEED);
    }
  }

  // --- Internal helpers ---

  /** Accelerate toward a target velocity */
  private accelerateX(player: PhaserPlayerWithBody, target: number, accel: number, delta: number) {
    const dt = delta / 1000; // ms -> seconds
    const vx = player.body.velocity.x;
    const diff = target - vx;
    const step = accel * dt;

    if (Math.abs(diff) <= step) {
      player.body.velocity.x = target;
    } else {
      player.body.velocity.x += Math.sign(diff) * step;
    }
  }

  /** Decelerate toward zero */
  private decelerateX(player: PhaserPlayerWithBody, decel: number, delta: number) {
    const dt = delta / 1000;
    const vx = player.body.velocity.x;
    if (Math.abs(vx) < 1) return;

    const step = decel * dt;
    if (Math.abs(vx) <= step) {
      player.body.velocity.x = 0;
    } else {
      player.body.velocity.x -= Math.sign(vx) * step;
    }
  }
}
