import type { RunSummary } from './types';

/**
 * The records kept between visits, in localStorage under one versioned
 * JSON key. Everything read back is checked value by value: a missing key,
 * a hand-edited value or a record from another version falls back to empty
 * instead of showing NaN (the Snakeling bug this design avoids).
 */
export const RECORDS_KEY = 'breaker-records-v1';
export const RECORDS_VERSION = 1;

export interface BestRun {
  score: number;
  sector: number;
  timeMs: number;
  /** ISO date of the run. */
  date: string;
}

export interface BreakerRecords {
  version: 1;
  best: BestRun | null;
  /** Fastest clear of each sector, ms, by sector number. */
  bestSectorTimes: Record<number, number>;
  bestCombo: number;
}

export interface RecordOutcome {
  records: BreakerRecords;
  newBestScore: boolean;
  /** Sectors whose best time this run improved, ascending. */
  newSectorBests: number[];
}

export function emptyRecords(): BreakerRecords {
  return { version: RECORDS_VERSION, best: null, bestSectorTimes: {}, bestCombo: 0 };
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseBest(value: unknown): BestRun | null {
  if (!isObject(value)) return null;
  const { score, sector, timeMs, date } = value as Record<string, unknown>;
  if (!isCount(score) || !isCount(timeMs)) return null;
  if (!isCount(sector) || sector < 1) return null;
  return { score, sector, timeMs, date: typeof date === 'string' ? date : '' };
}

function parseSectorTimes(value: unknown): Record<number, number> {
  const times: Record<number, number> = {};
  if (!isObject(value)) return times;
  for (const key of Object.keys(value)) {
    const sector = Number(key);
    const time = value[key];
    // A time of 0 cannot be a real clear: drop it with the rest of the noise.
    if (Number.isInteger(sector) && sector >= 1 && isCount(time) && time > 0) times[sector] = time;
  }
  return times;
}

export function loadRecords(storage: Pick<Storage, 'getItem'>): BreakerRecords {
  try {
    const raw = storage.getItem(RECORDS_KEY);
    if (raw === null) return emptyRecords();
    const data: unknown = JSON.parse(raw);
    if (!isObject(data) || data['version'] !== RECORDS_VERSION) return emptyRecords();
    return {
      version: RECORDS_VERSION,
      best: parseBest(data['best']),
      bestSectorTimes: parseSectorTimes(data['bestSectorTimes']),
      bestCombo: isCount(data['bestCombo']) ? data['bestCombo'] : 0,
    };
  } catch {
    return emptyRecords();
  }
}

/**
 * Folds a finished run into the saved records, saves them and says what the
 * run beat. A storage that cannot be written (private mode, quota) still
 * gets an answer: the records are only not kept.
 */
export function recordRun(
  summary: RunSummary,
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  now: Date
): RecordOutcome {
  const previous = loadRecords(storage);
  const records: BreakerRecords = {
    version: RECORDS_VERSION,
    best: previous.best,
    bestSectorTimes: { ...previous.bestSectorTimes },
    bestCombo: previous.bestCombo,
  };

  const newBestScore = isCount(summary.score) && summary.score > 0 && summary.score > (previous.best?.score ?? 0);
  if (newBestScore) {
    records.best = { score: summary.score, sector: summary.sector, timeMs: summary.timeMs, date: now.toISOString() };
  }

  const newSectorBests: number[] = [];
  const times = parseSectorTimes(summary.sectorTimes);
  for (const key of Object.keys(times)) {
    const sector = Number(key);
    const time = times[sector];
    const old = records.bestSectorTimes[sector];
    if (old === undefined || time < old) {
      records.bestSectorTimes[sector] = time;
      newSectorBests.push(sector);
    }
  }
  newSectorBests.sort((a, b) => a - b);

  if (isCount(summary.maxCombo) && summary.maxCombo > records.bestCombo) records.bestCombo = summary.maxCombo;

  try {
    storage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {
    // Nothing to do: the run is still reported, just not remembered.
  }
  return { records, newBestScore, newSectorBests };
}

/** A time as m:ss.cc, hundredths cut, not rounded: 62345 -> "1:02.34". */
export function formatTime(ms: number): string {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const hundredths = Math.floor(safe / 10);
  const minutes = Math.floor(hundredths / 6000);
  const seconds = Math.floor(hundredths / 100) % 60;
  const cc = hundredths % 100;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(cc).padStart(2, '0')}`;
}
