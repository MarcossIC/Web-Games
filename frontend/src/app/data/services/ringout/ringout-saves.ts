import { count, defineEntry } from '@app-persistence';
import { emptyProgress, levelTimes, type RingOutProgress } from './ringout-progress';

/** What Ring Out keeps between visits: the levels open and the best time of each. */
export const ringOutProgress = defineEntry<RingOutProgress>({
  game: 'ringout',
  name: 'progress',
  version: 1,
  fallback: emptyProgress(),
  fields: { cleared: count(), bestTimes: levelTimes },
});
