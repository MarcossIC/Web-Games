import { PatternName } from '../chunk-plan';
import { ChunkDraft } from '../chunk-draft';
import { isUnlocked } from '../difficulty-curve';
import { dualPath } from './dual-path';
import { fishingHut } from './fishing-hut';
import { floatingChain } from './floating-chain';
import { houseScene } from './house-scene';
import { PatternPlanner } from './pattern';
import { pyramid } from './pyramid';
import { staircaseDown, staircaseUp } from './stairs';

export type { PatternPlanner, PatternResult } from './pattern';

export const PATTERNS: Record<PatternName, PatternPlanner> = {
  'staircase-up': staircaseUp,
  'staircase-down': staircaseDown,
  pyramid,
  'floating-chain': floatingChain,
  'house-scene': houseScene,
  'dual-path': dualPath,
  'fishing-hut': fishingHut,
};

/**
 * The patterns a chunk may draw from, in a fixed order: the draw picks by
 * position. The fishing hut is not one of them: it takes a gap's place.
 */
export function availablePatterns(draft: ChunkDraft): PatternName[] {
  const patterns: PatternName[] = ['staircase-up', 'pyramid', 'floating-chain'];
  // Going down needs height to lose, and a floor to start from: after a gap
  // its first block would stand where the gap promised a landing.
  if (draft.entryElevation < -20 && !draft.mustStartLevel) patterns.push('staircase-down');
  if (isUnlocked('houseScene', draft.startX)) patterns.push('house-scene');
  if (isUnlocked('dualPath', draft.startX)) patterns.push('dual-path');
  return patterns;
}
