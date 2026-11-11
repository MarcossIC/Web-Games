import {
  APEX_GRAVITY_MULT,
  APEX_VELOCITY_THRESHOLD,
  FALL_GRAVITY_MULT,
  JUMP_APEX,
  JUMP_SPEED,
  PLAYER_GRAVITY,
  WORLD_GRAVITY,
  airTime,
  jumpReach,
} from './jump-model';

/**
 * The game's own rule, stepped frame by frame the way Arcade Physics does
 * it: the gravity is chosen from the speed, then the speed moves, then the
 * position. Returns the time the feet come down through `drop` px below the
 * take-off (negative is above), or null if they never get there.
 */
function simulatedAirTime(drop: number, fps: number): number | null {
  const dt = 1 / fps;
  let vy = -JUMP_SPEED;
  let y = 0;
  let t = 0;
  // Screen Y grows downwards: above the landing is a smaller Y.
  let wasAbove = 0 < drop;
  while (t < 5) {
    let multiplier = 1;
    if (Math.abs(vy) < APEX_VELOCITY_THRESHOLD) multiplier = APEX_GRAVITY_MULT;
    else if (vy > 0) multiplier = FALL_GRAVITY_MULT;
    vy += (WORLD_GRAVITY + PLAYER_GRAVITY * multiplier) * dt;
    y += vy * dt;
    t += dt;
    wasAbove ||= y < drop;
    if (vy > 0 && wasAbove && y >= drop) return t;
  }
  return null;
}

describe('jump model', () => {
  it('measures the jump the plan was written with', () => {
    expect(airTime(0)).toBeCloseTo(1.46, 2);
    expect(jumpReach(0)).toBeCloseTo(278, 0);
    expect(jumpReach(0, 1.4)).toBeCloseTo(389, 0);
    expect(JUMP_APEX).toBeCloseTo(187.4, 1);
  });

  // A model with one gravity for the whole jump is off by 0.06 s at 150 px
  // up, and agrees on flat ground by chance: the tolerance tells them apart.
  it("agrees with the game's gravity stepped at 60 and 144 fps", () => {
    for (const fps of [60, 144]) {
      for (const drop of [-150, -100, -60, -20, 0, 30, 90]) {
        const simulated = simulatedAirTime(drop, fps);
        expect(simulated).withContext(`drop ${drop} at ${fps} fps`).not.toBeNull();
        expect(Math.abs((airTime(drop) ?? Infinity) - (simulated ?? 0)))
          .withContext(`drop ${drop} at ${fps} fps`)
          .toBeLessThan(0.04);
      }
    }
  });

  it('goes farther to a lower landing and less far to a higher one', () => {
    expect(jumpReach(40)).toBeGreaterThan(jumpReach(0));
    expect(jumpReach(-60)).toBeLessThan(jumpReach(0));
    expect(jumpReach(-60)).toBeGreaterThan(0);
  });

  it('cannot reach what is higher than its apex', () => {
    expect(airTime(-JUMP_APEX - 1)).toBeNull();
    expect(jumpReach(-JUMP_APEX - 1)).toBe(0);
    expect(simulatedAirTime(-JUMP_APEX - 3, 144)).toBeNull();
  });

  it('scales its reach with the speed', () => {
    expect(jumpReach(25, 1.2)).toBeCloseTo(jumpReach(25) * 1.2, 6);
  });
});
