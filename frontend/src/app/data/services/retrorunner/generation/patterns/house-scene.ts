import { planHouse } from '../fill';
import { PatternPlanner } from './pattern';

/**
 * A long flat stretch at the lowest height with a house on it. After a
 * gap it stays at the landing's height instead: the gap promised it.
 */
export const houseScene: PatternPlanner = (draft) => {
  const y = draft.mustStartLevel ? draft.entryY : draft.floorY;
  const floor = draft.ground(10, y);
  draft.add(planHouse(floor.startX, floor.endX, y));
  return { exitY: y };
};
