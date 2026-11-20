import { count, defineEntry } from '@app-persistence';

export interface TetrisRecords {
  bestScore: number;
  bestLevel: number;
  /** The longest game, in seconds. */
  bestTimeSeconds: number;
}

/** What Tetris keeps between visits. */
export const tetrisRecords = defineEntry<TetrisRecords>({
  game: 'tetris',
  name: 'records',
  version: 1,
  fallback: { bestScore: 0, bestLevel: 1, bestTimeSeconds: 0 },
  fields: { bestScore: count(), bestLevel: count(1), bestTimeSeconds: count() },
});
