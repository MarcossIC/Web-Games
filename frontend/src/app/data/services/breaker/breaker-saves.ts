import { defineEntry, flag, nullable, number } from '@app-persistence';
import { bestRun, type BreakerRecords, emptyRecords, sectorTimes } from './engine/records';

/** What Nova Breaker keeps between visits. */
export const breakerRecords = defineEntry<BreakerRecords>({
  game: 'breaker',
  name: 'records',
  version: 1,
  fallback: emptyRecords(),
  fields: { best: nullable(bestRun), bestSectorTimes: sectorTimes, bestCombo: number({ min: 0 }) },
});

export interface BreakerSettings {
  muted: boolean;
  /** Keep the mouse locked inside the canvas while playing. */
  captureMouse: boolean;
}

/** The player's choices, kept between visits. */
export const breakerSettings = defineEntry<BreakerSettings>({
  game: 'breaker',
  name: 'settings',
  version: 1,
  fallback: { muted: false, captureMouse: true },
  fields: { muted: flag(), captureMouse: flag() },
});
