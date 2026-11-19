
/**
 * How Nova Breaker scores. Breaking bricks in a row builds a combo that
 * multiplies every brick's value; a pause of 3 s or a lost life breaks it.
 * Clearing a sector pays a bonus that rewards speed and a clean run.
 */
export const SCORE = {
  COMBO_WINDOW_MS: 3000,
  MULTIPLIER_PER_COMBO: 0.1,
  MAX_MULTIPLIER: 5,
  NOVA_FACTOR: 2,
  SECTOR_BONUS: 1000,
  /** Paid for each whole second the sector took under its par. */
  TIME_BONUS_PER_SECOND: 50,
  NO_MISS_BONUS: 2000,
  /** At 20000 a run gained about a life per sector from score alone and lives never ran short. */
  EXTRA_LIFE_EVERY: 40000,
  /** A Life capsule caught with every life already full pays this instead. */
  LIFE_AT_MAX_POINTS: 2500,
} as const;

/** The combo multiplier (x1 .. x5), doubled while nova burns. */
export function comboMultiplier(combo: number, nova: boolean): number {
  const base = Math.min(SCORE.MAX_MULTIPLIER, 1 + SCORE.MULTIPLIER_PER_COMBO * combo);
  return nova ? base * SCORE.NOVA_FACTOR : base;
}

/** What a brick worth `base` pays at this combo, in whole points. */
export function brickPoints(base: number, combo: number, nova: boolean): number {
  return Math.round(base * comboMultiplier(combo, nova));
}

export interface SectorBonus {
  sector: number;
  time: number;
  noMiss: number;
  total: number;
}

export function sectorBonus(sector: number, timeMs: number, parTimeMs: number, noMiss: boolean): SectorBonus {
  const base = SCORE.SECTOR_BONUS * sector;
  const time = Math.max(0, Math.floor((parTimeMs - timeMs) / 1000)) * SCORE.TIME_BONUS_PER_SECOND;
  const clean = noMiss ? SCORE.NO_MISS_BONUS : 0;
  return { sector: base, time, noMiss: clean, total: base + time + clean };
}

/** How many extra-life marks (every 40000 points) a score change crossed. */
export function extraLivesBetween(before: number, after: number): number {
  const every = SCORE.EXTRA_LIFE_EVERY;
  return Math.max(0, Math.floor(after / every) - Math.floor(before / every));
}

/**
 * The running combo. The engine feeds it every brick destroyed and the
 * time that passes; it says when the combo was lost and how long it was.
 */
export class ComboMeter {
  private current = 0;
  private remaining = 0;
  private longest = 0;

  get combo(): number {
    return this.current;
  }

  /** ms left before the combo is lost; 0 with no combo. */
  get remainingMs(): number {
    return this.remaining;
  }

  /** The longest combo since the meter was made. */
  get best(): number {
    return this.longest;
  }

  /** A brick was destroyed: the combo grows and its window restarts. */
  hit(): number {
    this.current++;
    this.remaining = SCORE.COMBO_WINDOW_MS;
    if (this.current > this.longest) this.longest = this.current;
    return this.current;
  }

  /** Lets time pass. Returns the combo that was lost, or 0. */
  tick(ms: number): number {
    if (this.current === 0) return 0;
    this.remaining -= ms;
    if (this.remaining > 0) return 0;
    return this.break();
  }

  /** Loses the combo now (a life lost). Returns how long it was, or 0. */
  break(): number {
    const lost = this.current;
    this.current = 0;
    this.remaining = 0;
    return lost;
  }
}
