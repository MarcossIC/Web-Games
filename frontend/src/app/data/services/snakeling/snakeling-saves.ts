import { count, defineEntry } from '@app-persistence';

export interface SnakelingRecords {
  /**
   * Best score in Portal mode. It keeps its first name: Portal is how the
   * game was always played, so records saved before modes existed are
   * Portal records.
   */
  bestScore: number;
  /** Best score in Classic mode, with walls. */
  bestClassic: number;
  /** Best score in Time Attack, one minute against the clock. */
  bestTimeAttack: number;
  /** Best score in Hard mode, with walls and rocks. */
  bestHard: number;
}

/**
 * What Snakeling keeps between visits.
 *
 * `bestClassic`, `bestTimeAttack` and `bestHard` came later without a version bump on
 * purpose: the shape only grew, a value saved without them reads them as
 * 0, and the records already saved are kept.
 *
 * Version 2: the combo and the golden apple changed the scoring, so the
 * records of the old scoring are not kept.
 */
export const snakelingRecords = defineEntry<SnakelingRecords>({
  game: 'snakeling',
  name: 'records',
  version: 2,
  fallback: { bestScore: 0, bestClassic: 0, bestTimeAttack: 0, bestHard: 0 },
  fields: {
    bestScore: count(),
    bestClassic: count(),
    bestTimeAttack: count(),
    bestHard: count(),
  },
});
