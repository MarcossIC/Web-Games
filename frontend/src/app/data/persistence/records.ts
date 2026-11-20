/**
 * The arithmetic of records, the same in every game. What counts as a
 * record (a practice run that does not, a score of zero) is the game's call.
 */
export type Better = 'higher' | 'lower';

export interface Best {
  value: number;
  /** The result beat the saved best; a tie does not. */
  improved: boolean;
}

export interface BestPerKey {
  values: Record<number, number>;
  /** The keys whose best the results beat, ascending. */
  improved: number[];
}

function beats(result: number, best: number, better: Better): boolean {
  return better === 'higher' ? result > best : result < best;
}

/** The better of the saved best and a new result. A result that is not a finite number never wins. */
export function keepBest(best: number, result: number, better: Better): Best {
  if (Number.isFinite(result) && beats(result, best, better)) return { value: result, improved: true };
  return { value: best, improved: false };
}

/**
 * The best of each key (a sector, a level) after a run. A key with no saved
 * best takes its result; the saved bests are not changed.
 */
export function bestPerKey(
  bests: Readonly<Record<number, number>>,
  results: Readonly<Record<number, number>>,
  better: Better
): BestPerKey {
  const values = { ...bests };
  const improved: number[] = [];
  for (const raw of Object.keys(results)) {
    const key = Number(raw);
    const result = results[key];
    if (!Number.isFinite(result)) continue;
    const saved = values[key];
    if (saved === undefined || beats(result, saved, better)) {
      values[key] = result;
      improved.push(key);
    }
  }
  improved.sort((a, b) => a - b);
  return { values, improved };
}
