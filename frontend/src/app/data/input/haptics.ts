/** What vibrate needs from navigator: only vibrate, which many browsers lack. */
export interface VibrationHost {
  vibrate?: (pattern: number | number[]) => boolean;
}

/**
 * Shakes the device: a number of milliseconds, or on/off times in turns.
 * Where it cannot (a desktop, iOS Safari, a page the user has not touched
 * yet) nothing happens. Returns whether the device took it.
 */
export function vibrate(
  pattern: number | number[],
  host: VibrationHost | undefined = typeof navigator === 'undefined' ? undefined : navigator
): boolean {
  try {
    return host?.vibrate?.(pattern) ?? false;
  } catch {
    return false;
  }
}
