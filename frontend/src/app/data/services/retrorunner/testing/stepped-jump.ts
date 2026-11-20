import {
  APEX_GRAVITY_MULT,
  APEX_VELOCITY_THRESHOLD,
  BASE_WALK_SPEED,
  BODY_HEIGHT,
  BODY_WIDTH,
  FALL_GRAVITY_MULT,
  JUMP_CUT_SPEED,
  JUMP_SPEED,
  PLAYER_GRAVITY,
  WORLD_GRAVITY,
} from '../generation/jump-model';

/** A coin's body: the 10 px picture at the scale CoinManager draws it. */
const COIN_SIZE = 7;
/** How deep Arcade Physics lets a body sink into another and still land on it. */
const OVERLAP_BIAS = 4;

export interface HoleJump {
  /** Where the floor before the hole ends, and where the one after it starts. */
  takeoffX: number;
  landingX: number;
  /** The top of each floor. */
  takeoffTop: number;
  landingTop: number;
  speedMultiplier: number;
  /** Where the middle of the body is when the key goes down: its X. */
  pressAt: number;
  /** How long the key is held, in seconds. */
  hold: number;
  coins?: readonly { x: number; y: number }[];
  fps?: number;
}

export interface HoleJumpResult {
  /** The player ended up standing on the floor after the hole. */
  landed: boolean;
  /** How many of the coins its body touched on the way. */
  coins: number;
}

/**
 * One jump over one hole, stepped frame by frame the way the game moves the
 * player: running at the speed of the place, the gravity chosen from the
 * vertical speed, the rise cut when the key is let go, and landing the way
 * Arcade Physics separates a body from a floor.
 */
export function jumpOverHole(jump: HoleJump): HoleJumpResult {
  const dt = 1 / (jump.fps ?? 60);
  const speed = BASE_WALK_SPEED * jump.speedMultiplier;
  const touched = new Set<number>();

  // The body's left edge and its feet.
  let x = Math.min(jump.pressAt, jump.takeoffX) - BODY_WIDTH / 2 - speed * 0.2;
  let y = jump.takeoffTop;
  let vy = 0;
  let onFloor = true;
  let gravity = PLAYER_GRAVITY;
  let pressedFor = -1;
  let jumped = false;

  for (let frame = 0; frame < 600; frame++) {
    // The physics step.
    vy += (WORLD_GRAVITY + gravity) * dt;
    const fall = vy * dt;
    x += speed * dt;
    y += fall;

    onFloor = false;
    if (x < jump.takeoffX && y > jump.takeoffTop && fall > 0 && y - jump.takeoffTop <= fall + OVERLAP_BIAS) {
      y = jump.takeoffTop;
      vy = 0;
      onFloor = true;
    }
    if (x + BODY_WIDTH > jump.landingX && y > jump.landingTop) {
      // Too deep to land on: it ran into the side of the floor.
      if (fall <= 0 || y - jump.landingTop > fall + OVERLAP_BIAS) return { landed: false, coins: touched.size };
      return { landed: true, coins: touched.size };
    }
    if (y > Math.max(jump.takeoffTop, jump.landingTop) + 80) return { landed: false, coins: touched.size };

    (jump.coins ?? []).forEach((coin, i) => {
      const half = COIN_SIZE / 2;
      if (x + BODY_WIDTH > coin.x - half && x < coin.x + half && y > coin.y - half && y - BODY_HEIGHT < coin.y + half) {
        touched.add(i);
      }
    });

    // What the scene does after it.
    if (onFloor) gravity = PLAYER_GRAVITY;
    else if (Math.abs(vy) < APEX_VELOCITY_THRESHOLD) gravity = PLAYER_GRAVITY * APEX_GRAVITY_MULT;
    else if (vy > 0) gravity = PLAYER_GRAVITY * FALL_GRAVITY_MULT;
    else gravity = PLAYER_GRAVITY;

    if (!jumped && onFloor && x + BODY_WIDTH / 2 >= jump.pressAt) {
      jumped = true;
      pressedFor = 0;
      vy = -JUMP_SPEED;
    }
    const held = jumped && pressedFor < jump.hold;
    if (jumped) pressedFor += dt;
    if (!held && vy < -JUMP_CUT_SPEED) vy = -JUMP_CUT_SPEED;
  }
  return { landed: false, coins: touched.size };
}
