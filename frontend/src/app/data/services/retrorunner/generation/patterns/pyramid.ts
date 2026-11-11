import { TILE } from '../geometry';
import { PatternPlanner, STEP_HEIGHT } from './pattern';

const BW = TILE.BLOCK_SIZE;
const STEP_WIDTH = 48;

/** Blocks up to a peak and down again over a hole, back at the same height. */
export const pyramid: PatternPlanner = (draft) => {
  const baseY = draft.entryY;
  const base = draft.ground(2, baseY);

  for (let i = 0; i < 2; i++) {
    draft.block(base.endX + 20 + i * STEP_WIDTH, baseY - (i + 1) * STEP_HEIGHT);
  }

  const peakX = base.endX + 20 + 2 * STEP_WIDTH;
  const peakY = baseY - 3 * STEP_HEIGHT;
  draft.block(peakX, peakY);
  draft.block(peakX + BW, peakY);

  for (let i = 0; i < 2; i++) {
    draft.block(peakX + BW * 2 + 15 + i * STEP_WIDTH, baseY - (2 - i) * STEP_HEIGHT);
  }

  draft.x = peakX + BW * 2 + 15 + 2 * STEP_WIDTH + BW + 25;
  draft.ground(3, baseY);
  return { exitY: baseY };
};
