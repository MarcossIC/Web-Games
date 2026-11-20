import { count, defineEntry } from '@app-persistence';

export interface SnakelingRecords {
  bestScore: number;
}

/** What Snakeling keeps between visits. */
export const snakelingRecords = defineEntry<SnakelingRecords>({
  game: 'snakeling',
  name: 'records',
  version: 1,
  fallback: { bestScore: 0 },
  fields: { bestScore: count() },
});
