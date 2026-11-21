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
}

/**
 * What Snakeling keeps between visits.
 *
 * `bestClassic` came later without a version bump on purpose: the shape
 * only grew, a value saved without it reads it as 0, and the Portal
 * records already saved are kept.
 */
export const snakelingRecords = defineEntry<SnakelingRecords>({
  game: 'snakeling',
  name: 'records',
  version: 1,
  fallback: { bestScore: 0, bestClassic: 0 },
  fields: { bestScore: count(), bestClassic: count() },
});
