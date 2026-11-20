import { noStoneUnder } from '../fill';
import { BLOCK_TOP_ABOVE_Y, TILE } from '../geometry';
import { PatternPlanner } from './pattern';

const BW = TILE.BLOCK_SIZE;
/**
 * How far over the centre of the floor's tiles the platforms hang, give or
 * take SWAY: 40 to 47 px of air under them, which the player (34 px tall)
 * runs through, and their top 72 to 79 px up: a short jump from the ramp,
 * or the whole jump from the ground.
 */
const RAISED = { MIN: 75, MAX: 78, SWAY: 2 } as const;

/**
 * Two ways through: the ground, with a stone and no coins, or platforms
 * above it, with coins and the risk of falling. The ground path runs under
 * the platforms, and its stone stands in the open, where it can be jumped.
 *
 *   coins  coins  coins        ← platforms
 *   ████   ████   ████
 *
 *   ██████████████████████████  ← ground
 */
export const dualPath: PatternPlanner = (draft) => {
  const terrain = draft.rng.terrain;
  const baseY = draft.entryY;

  const ground = draft.ground(terrain.intBetween(10, 14), baseY);
  const raisedY = baseY - terrain.intBetween(RAISED.MIN, RAISED.MAX);
  const count = terrain.intBetween(3, 5);
  const width = ground.endX - ground.startX;
  const spacing = width / (count + 1);

  // A lower block that invites the player up.
  const rampX = ground.startX + spacing * 0.4 + terrain.range(-10, 10);
  draft.block(rampX, baseY - 30);

  const platforms: { x: number; y: number }[] = [];
  let lastEndX = rampX + BW;
  for (let i = 0; i < count; i++) {
    const evenX = ground.startX + spacing * (i + 1) - BW;
    const x = Math.max(evenX + terrain.range(-0.25, 0.25) * spacing, lastEndX + 25);
    if (x + BW * 2 > ground.endX - 20) break;

    const y = raisedY + terrain.range(-RAISED.SWAY, RAISED.SWAY);
    draft.block(x, y);
    draft.block(x + BW, y);
    platforms.push({ x, y });
    lastEndX = x + BW * 2;
  }

  draft.stone(ground.startX + width * 0.3, ground.endX, baseY, 0.6, [
    noStoneUnder(rampX),
    ...platforms.map((p) => noStoneUnder(p.x, BW * 2)),
  ]);
  draft.decoration(
    ground.startX,
    ground.endX,
    baseY,
    platforms.map((p) => ({ x: p.x - 20, width: 104 }))
  );
  for (const platform of platforms) {
    draft.platformCoins(platform.x, BW * 2, platform.y - BLOCK_TOP_ABOVE_Y, 0.9);
  }

  return { exitY: baseY };
};
