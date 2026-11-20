import {
  APEX_GRAVITY_MULT,
  APEX_VELOCITY_THRESHOLD,
  FALL_GRAVITY_MULT,
  FULL_HOLD,
  JUMP_APEX,
  JUMP_CUT_SPEED,
  JUMP_SPEED,
  PLANNED_HOLD,
  PLAYER_GRAVITY,
  WORLD_GRAVITY,
  airTime,
  fallTime,
  holdToReach,
  jumpApex,
  jumpHeightAt,
  jumpReach,
} from './jump-model';

/**
 * The feet's height above the take-off after `time` s, stepped like the
 * game. With the key let go `hold` s in, a rise faster than the cut speed
 * is cut down to it, as the game does on every frame the key is up.
 */
function simulatedHeightAt(time: number, fps: number, hold = Infinity): number {
  const dt = 1 / fps;
  let vy = -JUMP_SPEED;
  let y = 0;
  for (let t = 0; t < time - dt / 2; t += dt) {
    if (t >= hold && vy < -JUMP_CUT_SPEED) vy = -JUMP_CUT_SPEED;
    let multiplier = 1;
    if (Math.abs(vy) < APEX_VELOCITY_THRESHOLD) multiplier = APEX_GRAVITY_MULT;
    else if (vy > 0) multiplier = FALL_GRAVITY_MULT;
    vy += (WORLD_GRAVITY + PLAYER_GRAVITY * multiplier) * dt;
    y += vy * dt;
  }
  return -y;
}

/**
 * The game's own rule, stepped frame by frame the way Arcade Physics does
 * it: the gravity is chosen from the speed, then the speed moves, then the
 * position. Returns the time the feet come down through `drop` px below the
 * take-off (negative is above), or null if they never get there.
 */
function simulatedAirTime(drop: number, fps: number, hold = Infinity): number | null {
  const dt = 1 / fps;
  let vy = -JUMP_SPEED;
  let y = 0;
  let t = 0;
  // Screen Y grows downwards: above the landing is a smaller Y.
  let wasAbove = 0 < drop;
  while (t < 5) {
    if (t >= hold && vy < -JUMP_CUT_SPEED) vy = -JUMP_CUT_SPEED;
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
    expect(airTime(0)).toBeCloseTo(0.73, 2);
    expect(jumpReach(0)).toBeCloseTo(139, 0);
    expect(jumpReach(0, 1.4)).toBeCloseTo(195, 0);
    expect(JUMP_APEX).toBeCloseTo(93.7, 1);
  });

  // A model with one gravity for the whole jump agrees on flat ground by
  // chance and is off near the apex: the tolerance tells them apart.
  it("agrees with the game's gravity stepped at 60 and 144 fps", () => {
    for (const fps of [60, 144]) {
      for (const drop of [-80, -60, -40, -20, 0, 30, 90]) {
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

  // Running off an edge is a fall from rest: the light gravity of the apex
  // first, then the heavy one.
  it('knows how long a fall off an edge takes', () => {
    expect(fallTime(0)).toBe(0);
    expect(fallTime(40)).toBeCloseTo(0.24, 2);
    for (const drop of [3, 20, 40, 80]) {
      const dt = 1 / 1000;
      let vy = 0;
      let y = 0;
      let t = 0;
      while (y < drop) {
        const multiplier = Math.abs(vy) < APEX_VELOCITY_THRESHOLD ? APEX_GRAVITY_MULT : FALL_GRAVITY_MULT;
        vy += (WORLD_GRAVITY + PLAYER_GRAVITY * multiplier) * dt;
        y += vy * dt;
        t += dt;
      }
      expect(Math.abs(fallTime(drop) - t)).withContext(`drop ${drop}`).toBeLessThan(0.005);
    }
  });

  it('scales its reach with the speed', () => {
    expect(jumpReach(25, 1.2)).toBeCloseTo(jumpReach(25) * 1.2, 6);
  });

  // D-08: the coins over a gap follow the jump, so the jump has to be known
  // at every moment, not only where it lands.
  describe('height over time', () => {
    it('starts at the take-off and tops out at the apex', () => {
      expect(jumpHeightAt(0)).toBe(0);
      let highest = 0;
      for (let t = 0; t <= 1.5; t += 0.005) highest = Math.max(highest, jumpHeightAt(t));
      expect(highest).toBeCloseTo(JUMP_APEX, 1);
    });

    it('comes down through each landing when its air time says', () => {
      for (const drop of [-80, -60, 0, 40, 90]) {
        expect(jumpHeightAt(airTime(drop) as number)).withContext(`drop ${drop}`).toBeCloseTo(-drop, 6);
      }
    });

    // The fine step is the physics itself. The game steps each frame and
    // drifts on its own, up to 5 px late in the fall at 144 fps: less than
    // half a coin.
    it("agrees with the game's gravity, stepped finely and at 144 fps", () => {
      for (const t of [0.05, 0.2, 0.33, 0.4, 0.55, 0.7]) {
        expect(Math.abs(jumpHeightAt(t) - simulatedHeightAt(t, 1000))).withContext(`at ${t} s`).toBeLessThan(1);
        expect(Math.abs(jumpHeightAt(t) - simulatedHeightAt(t, 144))).withContext(`at ${t} s`).toBeLessThan(6);
      }
    });
  });

  // The key decides how high: let go while rising and the rise is cut short.
  // A world planned with the key held to the end asks for the one press
  // nobody makes by accident.
  describe('a jump let go early', () => {
    it('is the whole jump once the key is held through its rise', () => {
      for (const hold of [FULL_HOLD, 0.6, 2]) {
        expect(airTime(0, hold)).withContext(`held ${hold} s`).toBeCloseTo(airTime(0) as number, 9);
        expect(jumpHeightAt(0.5, hold)).withContext(`held ${hold} s`).toBeCloseTo(jumpHeightAt(0.5), 9);
        expect(jumpApex(hold)).withContext(`held ${hold} s`).toBeCloseTo(JUMP_APEX, 9);
      }
    });

    it('is a hop when the key is only tapped', () => {
      expect(jumpApex(0)).toBeCloseTo(15.1, 1);
      expect(jumpReach(0, 1, 0)).toBeCloseTo(60.4, 1);
    });

    it("agrees with the game's cut, stepped finely and at 60 fps", () => {
      for (const hold of [0, 0.05, PLANNED_HOLD, 0.18, 0.4]) {
        for (const t of [0.05, 0.15, 0.3, 0.45, 0.6]) {
          expect(Math.abs(jumpHeightAt(t, hold) - simulatedHeightAt(t, 1000, hold)))
            .withContext(`held ${hold} s, at ${t} s`)
            .toBeLessThan(1.5);
        }
        for (const drop of [-10, 0, 40]) {
          const simulated = simulatedAirTime(drop, 60, hold);
          expect(simulated).withContext(`held ${hold} s, drop ${drop}`).not.toBeNull();
          expect(Math.abs((airTime(drop, hold) ?? Infinity) - (simulated ?? 0)))
            .withContext(`held ${hold} s, drop ${drop}`)
            .toBeLessThan(0.04);
        }
      }
    });

    it('reaches less far and less high the sooner the key is let go', () => {
      const holds = [0, 0.05, 0.1, 0.15, 0.2, FULL_HOLD];
      for (let i = 1; i < holds.length; i++) {
        expect(jumpReach(0, 1, holds[i])).toBeGreaterThan(jumpReach(0, 1, holds[i - 1]));
        expect(jumpApex(holds[i])).toBeGreaterThan(jumpApex(holds[i - 1]));
      }
      expect(airTime(-jumpApex(0.1) - 1, 0.1)).toBeNull();
      expect(jumpReach(-jumpApex(0.1) - 1, 1, 0.1)).toBe(0);
    });

    it('plans with a short press, which leaves a quarter of the jump to the player', () => {
      const share = jumpReach(0, 1, PLANNED_HOLD) / jumpReach(0);
      expect(share).toBeGreaterThan(0.72);
      expect(share).toBeLessThan(0.77);
      expect(jumpApex(PLANNED_HOLD)).toBeCloseTo(59.1, 1);
    });

    it('finds the press that carries the jump a given distance', () => {
      for (const multiplier of [1, 1.4]) {
        for (const drop of [0, 40]) {
          const shortest = jumpReach(drop, multiplier, 0);
          const longest = jumpReach(drop, multiplier);
          for (const share of [0.1, 0.5, 0.9]) {
            const distance = shortest + (longest - shortest) * share;
            const hold = holdToReach(distance, drop, multiplier);
            expect(Math.abs(jumpReach(drop, multiplier, hold) - distance))
              .withContext(`${distance} px, drop ${drop}, x${multiplier}`)
              .toBeLessThan(0.5);
          }
          expect(holdToReach(shortest - 20, drop, multiplier)).toBe(0);
          expect(holdToReach(longest + 20, drop, multiplier)).toBe(FULL_HOLD);
        }
      }
    });
  });
});
