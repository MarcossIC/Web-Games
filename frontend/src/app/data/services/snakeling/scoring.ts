/**
 * How Snakeling scores: apples, the combo of apples eaten in a row, and
 * the golden apple. Pure numbers, so the rules can be read in one place.
 */

/** Points of an apple before the combo multiplies them. */
export const POINTS_PER_APPLE = 8;

/**
 * Points of a golden apple. It is worth five apples, but the combo does
 * not multiply it: the combo is for the apples that make the snake grow.
 */
export const GOLDEN_APPLE_POINTS = 40;

/** The highest the combo multiplier goes, in tenths (x10). */
const MAX_MULTIPLIER_TENTHS = 100;
/** The multiplier of the second apple in a row, in tenths (x1.2). */
const SECOND_APPLE_TENTHS = 12;

/** Time to eat the next apple after the first of a combo. */
export const COMBO_BASE_WINDOW_MS = 4000;
/** Each apple of the combo gives this much more time for the next. */
export const COMBO_WINDOW_STEP_MS = 1000;
/** The longest the combo waits for the next apple. */
export const COMBO_MAX_WINDOW_MS = 8000;

/** How long a golden apple stays on the board. */
export const GOLDEN_APPLE_LIFE_MS = 5000;
/** In its last moments the golden apple blinks, to say it is leaving. */
export const GOLDEN_APPLE_WARNING_MS = 1500;
/**
 * Chance, at each step, that the apple on the board brings its golden
 * apple. With ~5.5 steps a second, most apples bring one if the snake
 * takes its time, and a quick snake often gets none: it is luck.
 */
export const GOLDEN_APPLE_CHANCE_PER_STEP = 0.035;

/**
 * The combo multiplier, in tenths, for the `combo`-th apple in a row:
 * x1 for the first, x1.2 for the second, then 0.1 more for each apple,
 * up to x10. Tenths keep the arithmetic exact.
 */
export function comboMultiplierTenths(combo: number): number {
  if (combo <= 1) return 10;
  return Math.min(MAX_MULTIPLIER_TENTHS, SECOND_APPLE_TENTHS + (combo - 2));
}

/** The combo multiplier for the `combo`-th apple in a row (1, 1.2 ... 10). */
export function comboMultiplier(combo: number): number {
  return comboMultiplierTenths(combo) / 10;
}

/** Points of the `combo`-th apple in a row. */
export function applePoints(combo: number): number {
  return Math.round((POINTS_PER_APPLE * comboMultiplierTenths(combo)) / 10);
}

/**
 * Time left to eat the next apple once `combo` apples were eaten in a
 * row: 4 s after the first, a second more for each apple after it, up to
 * 8 s.
 */
export function comboWindowMs(combo: number): number {
  return Math.min(
    COMBO_MAX_WINDOW_MS,
    COMBO_BASE_WINDOW_MS + Math.max(0, combo - 1) * COMBO_WINDOW_STEP_MS
  );
}
