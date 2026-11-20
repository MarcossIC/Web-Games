/**
 * Checks for a value read back from storage, where anything can be found: an
 * old shape, a hand edit, a NaN. A check returns the value when it is valid
 * and undefined when it is not, so the entry can fall back field by field.
 */
export type Check<T> = (value: unknown) => T | undefined;

export interface NumberRule {
  /** Lowest value allowed. */
  min?: number;
  /** The value must be greater than this one. */
  above?: number;
  integer?: boolean;
}

/** A finite number that keeps `rule`. */
export function number(rule: NumberRule = {}): Check<number> {
  return (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    if (rule.min !== undefined && value < rule.min) return undefined;
    if (rule.above !== undefined && value <= rule.above) return undefined;
    if (rule.integer && !Number.isInteger(value)) return undefined;
    return value;
  };
}

/** A whole number from `min` up: scores, levels, combos. */
export function count(min = 0): Check<number> {
  return number({ min, integer: true });
}

/** true or false: a "1" or a "true" written by hand does not count. */
export function flag(): Check<boolean> {
  return (value) => (typeof value === 'boolean' ? value : undefined);
}

export function text(): Check<string> {
  return (value) => (typeof value === 'string' ? value : undefined);
}

/** null, or what `check` takes. */
export function nullable<T>(check: Check<T>): Check<T | null> {
  return (value) => (value === null ? null : check(value));
}

/** An object whose every field passes its check; one bad field refuses it whole. */
export function object<T>(shape: { [K in keyof T]: Check<T[K]> }): Check<T> {
  return (value) => {
    if (!isPlainObject(value)) return undefined;
    const result = {} as T;
    for (const field of Object.keys(shape) as (keyof T)[]) {
      const checked = shape[field](value[field as string]);
      if (checked === undefined) return undefined;
      result[field] = checked;
    }
    return result;
  };
}

/** An object keyed by numbers (sector, level...): the bad entries are dropped one by one. */
export function recordOf<V>(key: Check<number>, item: Check<V>): Check<Record<number, V>> {
  return (value) => {
    if (!isPlainObject(value)) return undefined;
    const result: Record<number, V> = {};
    for (const raw of Object.keys(value)) {
      const k = key(Number(raw));
      const v = item(value[raw]);
      if (k !== undefined && v !== undefined) result[k] = v;
    }
    return result;
  };
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
