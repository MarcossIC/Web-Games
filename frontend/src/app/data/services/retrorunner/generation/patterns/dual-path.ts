import { BLOCK_TOP_ABOVE_Y, TILE } from '../geometry';
import { PatternPlanner } from './pattern';

const BW = TILE.BLOCK_SIZE;

/**
 * Two ways through: the ground, with a stone and few coins, or platforms
 * above it, with many coins and the risk of falling.
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
  const raisedY = baseY - terrain.intBetween(55, 70);
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

    const y = raisedY + terrain.range(-15, 15);
    draft.block(x, y);
    draft.block(x + BW, y);
    platforms.push({ x, y });
    lastEndX = x + BW * 2;
  }

  draft.stone(ground.startX + width * 0.3, ground.endX, baseY, 0.6);
  draft.decoration(
    ground.startX,
    ground.endX,
    baseY,
    platforms.map((p) => ({ x: p.x - 20, width: 104 }))
  );
  for (const platform of platforms) {
    // Coins sit over a floor; the platform's top is taken as one.
    draft.coins(platform.x, platform.x + BW * 2, platform.y - BLOCK_TOP_ABOVE_Y, 0.9);
  }

  return { exitY: baseY };
};
