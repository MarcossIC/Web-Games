import { ELEVATION } from '../balance';
import { TILE } from '../geometry';
import { PatternPlanner, STEP_HEIGHT } from './pattern';

const BW = TILE.BLOCK_SIZE;
const STEP_WIDTH = 55;

/** Two or fewer steps of two blocks going up, and a landing at the new height. */
export const staircaseUp: PatternPlanner = (draft) => {
  const baseY = draft.entryY;
  const elevation = draft.entryElevation;
  const room = Math.floor(Math.abs(elevation - ELEVATION.MAX) / STEP_HEIGHT);
  const steps = Math.min(2, Math.max(1, room));

  const base = draft.ground(3, baseY);
  for (let i = 0; i < steps; i++) {
    const x = base.endX + 25 + i * STEP_WIDTH;
    const y = baseY - (i + 1) * STEP_HEIGHT;
    draft.block(x, y);
    draft.block(x + BW, y);
  }

  const exitY = draft.floorY + Math.max(ELEVATION.MAX, elevation - steps * STEP_HEIGHT);
  draft.x = base.endX + 25 + steps * STEP_WIDTH + BW * 2;
  draft.ground(3, exitY);
  return { exitY };
};

/** Steps of two blocks going down from the floor before, towards the lowest height. */
export const staircaseDown: PatternPlanner = (draft) => {
  const topY = draft.entryY;
  const elevation = draft.entryElevation;
  const steps = Math.min(2, Math.floor(Math.abs(elevation) / STEP_HEIGHT));

  for (let i = 0; i < steps; i++) {
    const x = draft.startX + i * STEP_WIDTH;
    const y = topY + (i + 1) * STEP_HEIGHT;
    draft.block(x, y);
    draft.block(x + BW, y);
  }

  const exitY = draft.floorY + Math.min(0, elevation + steps * STEP_HEIGHT);
  draft.x = draft.startX + steps * STEP_WIDTH + BW * 2 + 20;
  draft.ground(4, exitY);
  return { exitY };
};
