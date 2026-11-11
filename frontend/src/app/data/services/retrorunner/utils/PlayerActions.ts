import {
  RetroRunnerKey,
  RetroRunnerStates,
} from '@app/data/models/retro-runner/RetroRunnerKeys';
import { PhaserPlayerWithBody } from '@app/data/services/phaser/types';
import {
  APEX_GRAVITY_MULT,
  APEX_VELOCITY_THRESHOLD,
  BASE_WALK_SPEED,
  FALL_GRAVITY_MULT,
  JUMP_SPEED,
} from '@app/data/services/retrorunner/generation/jump-model';

// The speeds and gravities of the jump live in jump-model, which the world
// generator plans with: changing them here would build jumps nobody makes.

// --- Movement ---
const GROUND_ACCEL = 1200;    // px/s^2 — snappy on ground
const GROUND_DECEL = 1800;    // px/s^2 — quick stop
const AIR_ACCEL = 600;        // px/s^2 — reduced air control
const AIR_DECEL = 200;        // px/s^2 — keeps momentum in air

// --- Jump ---
const JUMP_VELOCITY = -JUMP_SPEED;
const VARIABLE_JUMP_CUTOFF = -200;
const FAST_FALL_SPEED = 250;

// --- Timers ---
const COYOTE_TIME_MS = 90;
const JUMP_BUFFER_MS = 100;

// --- Animation ---
// Frames of the spritesheet held in the air, by vertical speed.
const FRAME_RISING = 6;   // legs stretched out: the leap
const FRAME_APEX = 7;     // hanging at the top
const FRAME_FALLING = 8;  // legs gathering for the landing
// Leaving the floor for less than this (a seam between tiles, the lip of
// a step) keeps the run going instead of flashing an air pose.
const AIR_POSE_DELAY_MS = 70;
// Slower than this the capybara stands; faster, it runs.
const RUN_MIN_SPEED = 15;
// The run is drawn for the base speed. Its playback follows the real
// speed inside these limits, so the legs match the ground going past.
const RUN_ANIM_MIN_RATE = 0.55;
const RUN_ANIM_MAX_RATE = 1.5;

export class PlayerActions {
  private lastOnFloorTime: number = 0;
  private jumpBufferTime: number = 0;
  private wasOnFloor: boolean = false;
  private speedMultiplier: number = 1;
  private crouched: boolean = false;

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
    if (this.crouched) return;
    this.crouched = true;
    // The same hitbox at half the height, against the floor.
    const body = player.body;
    body.setSize(body.sourceWidth, player.height / 2, false);
    body.offset.y = player.height / 2;
    player.setVelocityX(0);
  }

  /** Gives the body its full height back after a crouch. */
  private standUp(player: PhaserPlayerWithBody) {
    if (!this.crouched) return;
    this.crouched = false;
    const body = player.body;
    body.setSize(body.sourceWidth, player.height, false);
    body.offset.y = 0;
  }

  /**
   * Picks what the capybara looks like from what its body is doing, in
   * one place and once per frame. Call it after all movement is applied.
   */
  updateAnimation(player: PhaserPlayerWithBody, isOnFloor: boolean, now: number) {
    const { x: vx, y: vy } = player.body.velocity;
    const airborne = !isOnFloor && now - this.lastOnFloorTime > AIR_POSE_DELAY_MS;

    if (airborne) {
      // A pose chosen by the speed of the jump reads as one movement; a
      // cycle looping in the air reads as running on nothing.
      let frame = FRAME_APEX;
      if (vy < -APEX_VELOCITY_THRESHOLD) frame = FRAME_RISING;
      else if (vy > APEX_VELOCITY_THRESHOLD) frame = FRAME_FALLING;
      player.anims.stop();
      player.setFrame(frame);
      return;
    }

    if (this.crouched) {
      player.anims.timeScale = 1;
      if (player.anims.currentAnim?.key !== RetroRunnerKey.DOWN_KEY) {
        player.anims.play(RetroRunnerKey.DOWN_KEY);
      }
      return;
    }

    if (Math.abs(vx) > RUN_MIN_SPEED) {
      player.anims.timeScale = Math.min(
        RUN_ANIM_MAX_RATE,
        Math.max(RUN_ANIM_MIN_RATE, Math.abs(vx) / BASE_WALK_SPEED)
      );
      player.anims.play(RetroRunnerKey.WALK_KEY, true);
    } else {
      player.anims.timeScale = 1;
      player.anims.play(RetroRunnerKey.IDLE_KEY, true);
    }
  }

  /**
   * Acceleration-based horizontal movement.
   * Uses different accel/decel constants for ground vs air.
   */
  playerLeft(player: PhaserPlayerWithBody, isOnFloor: boolean, delta: number) {
    this.standUp(player);
    player.setState(RetroRunnerStates.RUNNER_STATE_WALK);
    player.flipX = false;

    const target = -this.walkSpeed;
    const accel = isOnFloor ? GROUND_ACCEL : AIR_ACCEL;
    this.accelerateX(player, target, accel, delta);
  }

  playerRight(player: PhaserPlayerWithBody, isOnFloor: boolean, delta: number) {
    this.standUp(player);
    player.setState(RetroRunnerStates.RUNNER_STATE_WALK);
    player.flipX = true;

    const target = this.walkSpeed;
    const accel = isOnFloor ? GROUND_ACCEL : AIR_ACCEL;
    this.accelerateX(player, target, accel, delta);
  }

  playerIdle(player: PhaserPlayerWithBody, isOnFloor: boolean, delta: number) {
    this.standUp(player);
    if (isOnFloor) {
      // Decelerate to zero on ground
      this.decelerateX(player, GROUND_DECEL, delta);
      if (Math.abs(player.body.velocity.x) < 5) {
        player.setVelocityX(0);
      }
      player.setState(RetroRunnerStates.RUNNER_STATE_IDLE);
    } else {
      // Gentle air deceleration — preserves momentum
      this.decelerateX(player, AIR_DECEL, delta);
    }
  }

  playerJump(player: PhaserPlayerWithBody) {
    this.standUp(player);
    player.setState(RetroRunnerStates.RUNNER_STATE_JUMP);
    player.setVelocityY(JUMP_VELOCITY);

    // If jumping while falling (coyote time / edge jump), reduce horizontal
    // momentum slightly — makes the jump more vertical and realistic
    if (player.body.velocity.y > 0) {
      player.body.velocity.x *= 0.7;
    }

    this.lastOnFloorTime = 0;
  }

  fastFall(player: PhaserPlayerWithBody) {
    this.standUp(player);
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
