import { count, defineEntry } from '@app-persistence';
import { emptyInfinite, emptyProgress, levelTimes, type InfiniteProgress, type RingOutProgress } from './ringout-progress';

/** What Ring Out keeps between visits: the levels open and the best time of each. */
export const ringOutProgress = defineEntry<RingOutProgress>({
  game: 'ringout',
  name: 'progress',
  version: 1,
  fallback: emptyProgress(),
  fields: { cleared: count(), bestTimes: levelTimes },
});

/**
 * What Ring Out keeps of Infinite: the furthest stage cleared and the best
 * time of each, with the version of the generator that built them.
 */
export const ringOutInfinite = defineEntry<InfiniteProgress>({
  game: 'ringout',
  name: 'infinite',
  version: 1,
  fallback: emptyInfinite(0),
  fields: { cleared: count(), bestTimes: levelTimes, generator: count() },
});
