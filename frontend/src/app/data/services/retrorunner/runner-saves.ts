import { count, defineEntry } from '@app-persistence';

export interface RunnerRecords {
  bestScore: number;
}

/**
 * What Retro Runner keeps between visits. Bump the version when the scoring
 * changes: a best from another scoring does not compare.
 */
export const runnerRecords = defineEntry<RunnerRecords>({
  game: 'retro-runner',
  name: 'records',
  version: 1,
  fallback: { bestScore: 0 },
  fields: { bestScore: count() },
});
