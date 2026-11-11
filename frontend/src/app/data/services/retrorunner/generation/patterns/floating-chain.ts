import { PatternPlanner } from './pattern';

/** Three or four blocks floating over a hole between two floors. */
export const floatingChain: PatternPlanner = (draft) => {
  const terrain = draft.rng.terrain;
  const baseY = draft.entryY;
  const blocks = terrain.intBetween(3, 4);

  const base = draft.ground(2, baseY);
  let x = base.endX + 40;
  for (let i = 0; i < blocks; i++) {
    draft.block(x, baseY - terrain.intBetween(35, 75));
    x += terrain.intBetween(50, 75);
  }

  draft.x = x + 15;
  draft.ground(4, baseY);
  return { exitY: baseY };
};
